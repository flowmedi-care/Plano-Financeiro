"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import { buildDedupHash } from "@/lib/merchants/normalize";
import type { ParsedTransaction, ParsedInstallmentProjection } from "@/types/database";

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

  const { data: rules } = await supabase
    .from("merchant_rules")
    .select("merchant_key, category_id, account_id")
    .eq(scope === "household" ? "household_id" : "user_id", scope === "household" ? householdId! : profile.id);

  const ruleMap = new Map<string, string>();
  for (const rule of rules ?? []) {
    const key = rule.account_id ? `${rule.merchant_key}|${rule.account_id}` : rule.merchant_key;
    ruleMap.set(key, rule.category_id);
    if (!ruleMap.has(rule.merchant_key)) {
      ruleMap.set(rule.merchant_key, rule.category_id);
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
        import_id: importRow.id,
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
          date: tx.date,
          amountCents: tx.amountCents,
          merchantKey: tx.merchantKey,
          installmentCurrent: tx.installmentCurrent,
        }),
      };
    });

  if (rows.length > 0) {
    const { error: txError } = await supabase
      .from("transactions")
      .upsert(rows, { onConflict: "account_id,dedup_hash", ignoreDuplicates: true });

    if (txError) {
      await supabase
        .from("statement_imports")
        .update({ status: "error", error_message: txError.message })
        .eq("id", importRow.id);
      throw new Error(txError.message);
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
