"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import { buildDedupHash } from "@/lib/merchants/normalize";
import { splitsFromRule } from "@/lib/splits/calculate";
import type { ParsedTransaction, ParsedInstallmentProjection } from "@/types/database";

interface SplitRuleEntry {
  split_mode: "full" | "equal";
  person_ids: string[];
}

export async function confirmImport(params: {
  accountId: string;
  referenceMonth: string;
  fileName: string;
  fileType: "csv" | "pdf";
  filePath?: string;
  transactions: ParsedTransaction[];
  installmentProjections: ParsedInstallmentProjection[];
}) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);

  const { data: importRow, error: importError } = await supabase
    .from("statement_imports")
    .insert({
      user_id: profile.id,
      household_id: scope === "household" ? householdId : null,
      scope,
      account_id: params.accountId,
      reference_month: params.referenceMonth,
      file_name: params.fileName,
      file_path: params.filePath ?? null,
      file_type: params.fileType,
      status: "processing",
    })
    .select()
    .single();

  if (importError || !importRow) {
    throw new Error(importError?.message ?? "Erro ao criar importação");
  }

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
    const key = rule.account_id ? `${rule.merchant_key}|${rule.account_id}` : rule.merchant_key;
    ruleMap.set(key, rule.category_id);
    if (!ruleMap.has(rule.merchant_key)) {
      ruleMap.set(rule.merchant_key, rule.category_id);
    }
  }

  const splitRuleMap = new Map<string, SplitRuleEntry>();
  for (const rule of splitRules ?? []) {
    const key = rule.account_id ? `${rule.merchant_key}|${rule.account_id}` : rule.merchant_key;
    splitRuleMap.set(key, {
      split_mode: rule.split_mode,
      person_ids: rule.person_ids ?? [],
    });
    if (!splitRuleMap.has(rule.merchant_key)) {
      splitRuleMap.set(rule.merchant_key, {
        split_mode: rule.split_mode,
        person_ids: rule.person_ids ?? [],
      });
    }
  }

  const rows = params.transactions
    .filter((tx) => !tx.isPayment)
    .map((tx) => {
      const categoryId =
        ruleMap.get(`${tx.merchantKey}|${params.accountId}`) ??
        ruleMap.get(tx.merchantKey) ??
        null;

      return {
        user_id: profile.id,
        household_id: scope === "household" ? householdId : null,
        scope,
        account_id: params.accountId,
        card_id: tx.cardId ?? null,
        import_id: importRow.id,
        reference_month: params.referenceMonth,
        transaction_date: tx.date,
        description: tx.description,
        merchant_key: tx.merchantKey,
        amount_cents: tx.amountCents,
        installment_current: tx.installmentCurrent,
        installment_total: tx.installmentTotal,
        category_id: categoryId,
        is_payment: tx.isPayment,
        is_iof: tx.isIof,
        auto_categorized: Boolean(categoryId),
        dedup_hash: buildDedupHash({
          accountId: params.accountId,
          cardId: tx.cardId,
          date: tx.date,
          amountCents: tx.amountCents,
          merchantKey: tx.merchantKey,
          installmentCurrent: tx.installmentCurrent,
        }),
      };
    });

  let insertedTransactions: { id: string; merchant_key: string; amount_cents: number }[] = [];

  if (rows.length > 0) {
    const { data: inserted, error: txError } = await supabase
      .from("transactions")
      .insert(rows)
      .select("id, merchant_key, amount_cents");

    if (txError) {
      await supabase
        .from("statement_imports")
        .update({ status: "error", error_message: txError.message })
        .eq("id", importRow.id);
      throw new Error(txError.message);
    }

    insertedTransactions = inserted ?? [];

    const splitRows: {
      transaction_id: string;
      person_id: string;
      amount_cents: number;
    }[] = [];

    for (const tx of insertedTransactions) {
      const splitRule =
        splitRuleMap.get(`${tx.merchant_key}|${params.accountId}`) ??
        splitRuleMap.get(tx.merchant_key);

      if (!splitRule || splitRule.person_ids.length === 0) continue;

      const splits = splitsFromRule(
        tx.amount_cents,
        splitRule.split_mode,
        splitRule.person_ids
      );

      for (const split of splits) {
        splitRows.push({
          transaction_id: tx.id,
          person_id: split.personId,
          amount_cents: split.amountCents,
        });
      }
    }

    if (splitRows.length > 0) {
      await supabase.from("transaction_splits").insert(splitRows);
    }
  }

  const scheduleRows = [
    ...params.transactions
      .filter((tx) => tx.installmentCurrent && tx.installmentTotal && !tx.isPayment)
      .map((tx) => ({
        user_id: profile.id,
        household_id: scope === "household" ? householdId : null,
        scope,
        account_id: params.accountId,
        card_id: tx.cardId ?? null,
        transaction_id: null,
        merchant_key: tx.merchantKey,
        description: tx.description,
        installment_amount_cents: tx.amountCents,
        installment_current: tx.installmentCurrent!,
        installment_total: tx.installmentTotal!,
        reference_month: params.referenceMonth,
        source: "transaction" as const,
      })),
    ...params.installmentProjections.map((proj) => ({
      user_id: profile.id,
      household_id: scope === "household" ? householdId : null,
      scope,
      account_id: params.accountId,
      transaction_id: null,
      merchant_key: proj.merchantKey,
      description: proj.description,
      installment_amount_cents: proj.amountCents,
      installment_current: proj.installmentCurrent,
      installment_total: proj.installmentTotal,
      reference_month: params.referenceMonth,
      source: "itau_projection" as const,
    })),
  ];

  if (scheduleRows.length > 0) {
    await supabase.from("installment_schedules").insert(scheduleRows);
  }

  await supabase
    .from("statement_imports")
    .update({ status: "done" })
    .eq("id", importRow.id);

  revalidatePath("/cartao/transacoes");
  revalidatePath("/");
  revalidatePath("/planejamento");

  return { importId: importRow.id, importedCount: rows.length };
}
