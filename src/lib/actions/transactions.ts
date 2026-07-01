"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import {
  computeMonthOverMonthComparison,
  computeSpendingByCategoryDetailed,
  getTransactionReferenceMonth,
} from "@/lib/transactions/summary";
import { getProfile } from "@/lib/actions/profile";
import {
  lookupInRuleMap,
  merchantKeyFromDescription,
  merchantKeysForRuleLookup,
  stableMerchantKeyFromNormalized,
} from "@/lib/merchants/normalize";
import { splitsFromRule } from "@/lib/splits/calculate";

export async function getTransactions(filters?: {
  referenceMonth?: string;
  accountId?: string;
  uncategorizedOnly?: boolean;
}) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  let query = supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*), card:cards(*), splits:transaction_splits(*, person:people(*))")
    .eq("is_payment", false)
    .order("transaction_date", { ascending: false });

  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  if (filters?.accountId) {
    query = query.eq("account_id", filters.accountId);
  }

  if (filters?.referenceMonth) {
    const [year, month] = filters.referenceMonth.split("-").map(Number);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    query = query.or(
      `reference_month.eq.${filters.referenceMonth},and(reference_month.is.null,transaction_date.gte.${start},transaction_date.lt.${end})`
    );
  }

  if (filters?.uncategorizedOnly) {
    query = query.is("category_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function classifyTransactions(params: {
  transactionIds: string[];
  categoryId: string;
  remember: boolean;
  accountId?: string;
}) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, merchant_key, account_id, description")
    .in("id", params.transactionIds);

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: params.categoryId,
      auto_categorized: false,
    })
    .in("id", params.transactionIds);

  if (error) throw new Error(error.message);

  if (params.remember && transactions) {
    for (const tx of transactions) {
      const accountId = params.accountId ?? tx.account_id;
      const ruleMerchantKey = merchantKeyFromDescription(tx.description);
      const candidateKeys = merchantKeysForRuleLookup({
        merchantKey: tx.merchant_key,
        description: tx.description,
      });
      const ruleQuery = supabase
        .from("merchant_rules")
        .select("id")
        .in("merchant_key", candidateKeys)
        .eq("scope", scope);

      if (scope === "household" && householdId) {
        ruleQuery.eq("household_id", householdId);
      } else {
        ruleQuery.eq("user_id", profile.id);
      }

      if (accountId) {
        ruleQuery.eq("account_id", accountId);
      }

      const { data: existingRule } = await ruleQuery.maybeSingle();

      if (existingRule) {
        await supabase
          .from("merchant_rules")
          .update({ category_id: params.categoryId, merchant_key: ruleMerchantKey })
          .eq("id", existingRule.id);
      } else {
        await supabase.from("merchant_rules").insert({
          user_id: profile.id,
          household_id: scope === "household" ? householdId : null,
          scope,
          account_id: accountId,
          merchant_key: ruleMerchantKey,
          category_id: params.categoryId,
        });
      }
    }
  }

  revalidatePath("/cartao/transacoes");
  revalidatePath("/");
}

export async function getSpendingByCategory(referenceMonth?: string) {
  const transactions = await getTransactions({ referenceMonth });
  const map = new Map<string, { name: string; color: string; total: number }>();

  const UNCATEGORIZED_KEY = "__uncategorized__";

  for (const tx of transactions) {
    const key = tx.category_id ?? UNCATEGORIZED_KEY;
    const current = map.get(key) ?? {
      name: tx.category?.name ?? "Sem categoria",
      color: tx.category?.color ?? "#94a3b8",
      total: 0,
    };
    current.total += tx.amount_cents;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getAccountTotals(referenceMonth?: string) {
  const transactions = await getTransactions({ referenceMonth });
  const map = new Map<string, { name: string; total: number }>();

  for (const tx of transactions) {
    if (!tx.account) continue;
    const current = map.get(tx.account_id) ?? {
      name: tx.account.name,
      total: 0,
    };
    current.total += tx.amount_cents;
    map.set(tx.account_id, current);
  }

  return Array.from(map.values());
}

export async function getReferenceMonths(): Promise<string[]> {
  const transactions = await getTransactions();
  const months = new Set(
    transactions.map((tx) => getTransactionReferenceMonth(tx))
  );
  return Array.from(months).sort();
}

export async function getMonthOverMonthCategoryComparison() {
  const months = await getReferenceMonths();
  if (months.length < 2) return null;

  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];

  const [currentTransactions, previousTransactions] = await Promise.all([
    getTransactions({ referenceMonth: currentMonth }),
    getTransactions({ referenceMonth: previousMonth }),
  ]);

  const current = computeSpendingByCategoryDetailed(currentTransactions);
  const previous = computeSpendingByCategoryDetailed(previousTransactions);

  return {
    currentMonth,
    previousMonth,
    items: computeMonthOverMonthComparison(current, previous),
  };
}

interface SplitRuleEntry {
  split_mode: "full" | "equal";
  person_ids: string[];
}

export async function applySavedRulesToUncategorized() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return;

  const { scope, householdId } = getActiveScope(profile);
  const uncategorized = await getTransactions({ uncategorizedOnly: true });
  if (!uncategorized.length) return;

  const scopeFilter = scope === "household" ? "household_id" : "user_id";
  const scopeId = scope === "household" ? householdId! : profile.id;

  const [{ data: rules }, { data: splitRules }] = await Promise.all([
    supabase
      .from("merchant_rules")
      .select("merchant_key, category_id, account_id")
      .eq(scopeFilter, scopeId),
    supabase
      .from("merchant_split_rules")
      .select("merchant_key, split_mode, person_ids, account_id")
      .eq(scopeFilter, scopeId),
  ]);

  const ruleMap = new Map<string, string>();
  for (const rule of rules ?? []) {
    const merchantKeys = new Set([
      rule.merchant_key,
      stableMerchantKeyFromNormalized(rule.merchant_key),
    ]);
    for (const merchantKey of merchantKeys) {
      const key = rule.account_id ? `${merchantKey}|${rule.account_id}` : merchantKey;
      ruleMap.set(key, rule.category_id);
      if (!ruleMap.has(merchantKey)) {
        ruleMap.set(merchantKey, rule.category_id);
      }
    }
  }

  const splitRuleMap = new Map<string, SplitRuleEntry>();
  for (const rule of splitRules ?? []) {
    const merchantKeys = new Set([
      rule.merchant_key,
      stableMerchantKeyFromNormalized(rule.merchant_key),
    ]);
    const entry = {
      split_mode: rule.split_mode,
      person_ids: rule.person_ids ?? [],
    };
    for (const merchantKey of merchantKeys) {
      const key = rule.account_id ? `${merchantKey}|${rule.account_id}` : merchantKey;
      splitRuleMap.set(key, entry);
      if (!splitRuleMap.has(merchantKey)) {
        splitRuleMap.set(merchantKey, entry);
      }
    }
  }

  let updated = false;

  for (const tx of uncategorized) {
    const categoryId = lookupInRuleMap(
      ruleMap,
      tx.merchant_key,
      tx.account_id,
      tx.description
    );
    if (!categoryId) continue;

    await supabase
      .from("transactions")
      .update({ category_id: categoryId, auto_categorized: true })
      .eq("id", tx.id);

    updated = true;

    if ((tx.splits?.length ?? 0) > 0) continue;

    const splitRule = lookupInRuleMap(
      splitRuleMap,
      tx.merchant_key,
      tx.account_id,
      tx.description
    );
    if (!splitRule || splitRule.person_ids.length === 0) continue;

    const splits = splitsFromRule(
      tx.amount_cents,
      splitRule.split_mode,
      splitRule.person_ids
    );

    if (splits.length > 0) {
      await supabase.from("transaction_splits").insert(
        splits.map((split) => ({
          transaction_id: tx.id,
          person_id: split.personId,
          amount_cents: split.amountCents,
        }))
      );
    }
  }

  if (updated) {
    revalidatePath("/cartao/transacoes");
    revalidatePath("/");
  }
}
