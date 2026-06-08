"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";

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
    query = query.gte("transaction_date", start).lt("transaction_date", end);
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
    .select("id, merchant_key, account_id")
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
      const ruleQuery = supabase
        .from("merchant_rules")
        .select("id")
        .eq("merchant_key", tx.merchant_key)
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
          .update({ category_id: params.categoryId })
          .eq("id", existingRule.id);
      } else {
        await supabase.from("merchant_rules").insert({
          user_id: profile.id,
          household_id: scope === "household" ? householdId : null,
          scope,
          account_id: accountId,
          merchant_key: tx.merchant_key,
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
