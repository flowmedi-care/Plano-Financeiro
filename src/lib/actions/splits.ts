"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import { merchantKeyFromDescription, merchantKeysForRuleLookup } from "@/lib/merchants/normalize";
import {
  validateSplits,
  type SplitInput,
} from "@/lib/splits/calculate";
import type { SplitMode } from "@/types/database";

export async function assignSplits(params: {
  transactionIds: string[];
  splits: SplitInput[];
  remember?: boolean;
  splitMode?: SplitMode;
  personIds?: string[];
  merchantKey?: string;
  accountId?: string;
}) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount_cents, merchant_key, account_id, description")
    .in("id", params.transactionIds);

  if (!transactions?.length) throw new Error("Transações não encontradas");

  for (const tx of transactions) {
    const validation = validateSplits(tx.amount_cents, params.splits);
    if (!validation.valid) {
      throw new Error(validation.error ?? "Divisão inválida");
    }
  }

  await supabase
    .from("transaction_splits")
    .delete()
    .in("transaction_id", params.transactionIds);

  if (params.splits.length > 0) {
    const rows = transactions.flatMap((tx) =>
      params.splits.map((split) => ({
        transaction_id: tx.id,
        person_id: split.personId,
        amount_cents: split.amountCents,
      }))
    );

    const { error } = await supabase.from("transaction_splits").insert(rows);
    if (error) throw new Error(error.message);
  }

  if (
    params.remember &&
    params.splitMode &&
    params.personIds &&
    params.personIds.length > 0 &&
    transactions.length === 1
  ) {
    const tx = transactions[0];
    const merchantKey = merchantKeyFromDescription(tx.description);
    const candidateKeys = merchantKeysForRuleLookup({
      merchantKey: tx.merchant_key,
      description: tx.description,
    });
    const accountId = params.accountId ?? tx.account_id;

    let ruleQuery = supabase
      .from("merchant_split_rules")
      .select("id")
      .in("merchant_key", candidateKeys)
      .eq("scope", scope);

    if (scope === "household" && householdId) {
      ruleQuery = ruleQuery.eq("household_id", householdId);
    } else {
      ruleQuery = ruleQuery.eq("user_id", profile.id);
    }

    if (accountId) {
      ruleQuery = ruleQuery.eq("account_id", accountId);
    } else {
      ruleQuery = ruleQuery.is("account_id", null);
    }

    const { data: existingRule } = await ruleQuery.maybeSingle();

    const rulePayload = {
      split_mode: params.splitMode,
      person_ids: params.personIds,
      merchant_key: merchantKey,
    };

    if (existingRule) {
      await supabase
        .from("merchant_split_rules")
        .update(rulePayload)
        .eq("id", existingRule.id);
    } else {
      await supabase.from("merchant_split_rules").insert({
        user_id: profile.id,
        household_id: scope === "household" ? householdId : null,
        scope,
        account_id: accountId,
        ...rulePayload,
      });
    }
  }

  revalidatePath("/cartao/transacoes");
  revalidatePath("/");
}

export async function clearSplits(transactionIds: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transaction_splits")
    .delete()
    .in("transaction_id", transactionIds);

  if (error) throw new Error(error.message);
  revalidatePath("/cartao/transacoes");
  revalidatePath("/");
}

export async function getAmountsOwedByPerson(referenceMonth?: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  let txQuery = supabase
    .from("transactions")
    .select("id")
    .eq("is_payment", false);

  if (scope === "household" && householdId) {
    txQuery = txQuery.eq("scope", "household").eq("household_id", householdId);
  } else {
    txQuery = txQuery.eq("scope", "personal").eq("user_id", profile.id);
  }

  if (referenceMonth) {
    const [year, month] = referenceMonth.split("-").map(Number);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    txQuery = txQuery.or(
      `reference_month.eq.${referenceMonth},and(reference_month.is.null,transaction_date.gte.${start},transaction_date.lt.${end})`
    );
  }

  const { data: transactions } = await txQuery;
  if (!transactions?.length) return [];

  const txIds = transactions.map((t) => t.id);

  const { data: splits, error } = await supabase
    .from("transaction_splits")
    .select("amount_cents, person:people(id, name, color)")
    .in("transaction_id", txIds);

  if (error) throw new Error(error.message);

  const map = new Map<string, { name: string; color: string; total: number }>();

  for (const split of splits ?? []) {
    const rawPerson = split.person;
    const person = Array.isArray(rawPerson) ? rawPerson[0] : rawPerson;
    if (!person?.id) continue;

    const current = map.get(person.id) ?? {
      name: person.name,
      color: person.color,
      total: 0,
    };
    current.total += split.amount_cents;
    map.set(person.id, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
