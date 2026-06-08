"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import { getOrCreateBudgetMonth } from "@/lib/actions/budget";
import { getAllCards } from "@/lib/actions/cards";
import { getTransactions } from "@/lib/actions/transactions";
import {
  buildMonthRange,
  projectCashFlow,
  type MonthInput,
} from "@/lib/cash-flow/project";
import type {
  CashFlowEntryType,
  CashFlowTemplateType,
  EstimationMethod,
} from "@/types/database";
import { toReferenceMonth } from "@/lib/utils";

async function getScopeContext() {
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");
  const { scope, householdId } = getActiveScope(profile);
  return { profile, scope, householdId };
}

export async function getOrCreateCashFlowSettings() {
  const supabase = await createClient();
  const { profile, scope, householdId } = await getScopeContext();

  let query = supabase.from("cash_flow_settings").select("*");
  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("cash_flow_settings")
    .insert({
      user_id: profile.id,
      household_id: scope === "household" ? householdId : null,
      scope,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCashFlowSettings(params: {
  openingBalanceCents?: number;
  projectionMonths?: number;
  defaultEstimationMethod?: EstimationMethod;
}) {
  const supabase = await createClient();
  const settings = await getOrCreateCashFlowSettings();

  const { error } = await supabase
    .from("cash_flow_settings")
    .update({
      opening_balance_cents: params.openingBalanceCents,
      projection_months: params.projectionMonths,
      default_estimation_method: params.defaultEstimationMethod,
    })
    .eq("id", settings.id);

  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function getCashFlowTemplates() {
  const supabase = await createClient();
  const { profile, scope, householdId } = await getScopeContext();

  let query = supabase.from("cash_flow_templates").select("*").order("label");
  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCashFlowTemplate(params: {
  type: CashFlowTemplateType;
  label: string;
  amountCents: number;
  recurrence?: "monthly" | "none";
}) {
  const supabase = await createClient();
  const { profile, scope, householdId } = await getScopeContext();

  const { error } = await supabase.from("cash_flow_templates").insert({
    user_id: profile.id,
    household_id: scope === "household" ? householdId : null,
    scope,
    type: params.type,
    label: params.label,
    amount_cents: params.amountCents,
    recurrence: params.recurrence ?? "monthly",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function deleteCashFlowTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cash_flow_templates")
    .delete()
    .eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

async function syncTemplatesForMonth(
  budgetMonthId: string,
  year: number,
  month: number
) {
  const supabase = await createClient();
  const templates = await getCashFlowTemplates();
  const ref = toReferenceMonth(year, month);

  for (const template of templates) {
    if (template.recurrence !== "monthly") continue;
    if (template.start_month && ref < template.start_month) continue;
    if (template.end_month && ref > template.end_month) continue;

    const { data: existing } = await supabase
      .from("cash_flow_entries")
      .select("id")
      .eq("budget_month_id", budgetMonthId)
      .eq("template_id", template.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("cash_flow_entries").insert({
        budget_month_id: budgetMonthId,
        template_id: template.id,
        type: template.type,
        label: template.label,
        amount_cents: template.amount_cents,
        source: "template",
        is_confirmed: true,
      });
    }
  }
}

export async function getCashFlowEntries(budgetMonthId: string, year: number, month: number) {
  await syncTemplatesForMonth(budgetMonthId, year, month);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_flow_entries")
    .select("*, category:categories(*), account:accounts(*)")
    .eq("budget_month_id", budgetMonthId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addCashFlowEntry(
  budgetMonthId: string,
  params: {
    type: CashFlowEntryType;
    label: string;
    amountCents: number;
    accountId?: string;
    makeRecurring?: boolean;
    recurringType?: CashFlowTemplateType;
  }
) {
  const supabase = await createClient();
  const { profile, scope, householdId } = await getScopeContext();

  let templateId: string | null = null;

  if (params.makeRecurring && params.recurringType) {
    const { data: template } = await supabase
      .from("cash_flow_templates")
      .insert({
        user_id: profile.id,
        household_id: scope === "household" ? householdId : null,
        scope,
        type: params.recurringType,
        label: params.label,
        amount_cents: params.amountCents,
        recurrence: "monthly",
      })
      .select()
      .single();

    templateId = template?.id ?? null;
  }

  const { error } = await supabase.from("cash_flow_entries").insert({
    budget_month_id: budgetMonthId,
    template_id: templateId,
    type: params.type,
    label: params.label,
    amount_cents: params.amountCents,
    account_id: params.accountId ?? null,
    source: templateId ? "template" : "manual",
    is_confirmed: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function deleteCashFlowEntry(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cash_flow_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function setVariableTracked(
  budgetMonthId: string,
  categoryId: string,
  tracked: boolean
) {
  const supabase = await createClient();

  if (tracked) {
    const { error } = await supabase.from("budget_variable_expenses").upsert(
      {
        budget_month_id: budgetMonthId,
        category_id: categoryId,
        amount_cents: null,
        is_tracked: true,
        estimation_method: "none",
      },
      { onConflict: "budget_month_id,category_id" }
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("budget_variable_expenses")
      .delete()
      .eq("budget_month_id", budgetMonthId)
      .eq("category_id", categoryId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/planejamento");
}

export async function setVariableExpense(
  budgetMonthId: string,
  categoryId: string,
  amountCents: number | null,
  estimationMethod?: EstimationMethod
) {
  const supabase = await createClient();

  const { error } = await supabase.from("budget_variable_expenses").upsert(
    {
      budget_month_id: budgetMonthId,
      category_id: categoryId,
      amount_cents: amountCents,
      is_tracked: true,
      estimation_method: estimationMethod ?? (amountCents ? "manual" : "none"),
    },
    { onConflict: "budget_month_id,category_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function applyEstimation(method: EstimationMethod) {
  await updateCashFlowSettings({ defaultEstimationMethod: method });

  const now = new Date();
  const { monthInputs, projections } = await getCashFlowProjection(
    now.getFullYear(),
    now.getMonth() + 1
  );

  for (let i = 0; i < monthInputs.length; i++) {
    const month = monthInputs[i];
    const proj = projections[i];
    const [year, monthNum] = month.referenceMonth.split("-").map(Number);
    const budgetMonth = await getOrCreateBudgetMonth(year, monthNum);
    const tracked = month.variableSlots.filter((s) => s.isTracked);
    if (tracked.length === 0) continue;

    const perCategory =
      proj.variableCents > 0
        ? Math.floor(proj.variableCents / tracked.length)
        : 0;

    for (const slot of tracked) {
      if (slot.amountCents !== null && slot.amountCents > 0) continue;
      await setVariableExpense(
        budgetMonth.id,
        slot.categoryId,
        perCategory > 0 ? perCategory : null,
        method
      );
    }
  }

  revalidatePath("/planejamento");
}

function sumEntriesByType(
  entries: { type: string; amount_cents: number | null }[],
  type: string
): number {
  return entries
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);
}

function sumCardProjections(
  entries: { type: string; amount_cents: number | null; card_id?: string | null }[]
): number {
  return entries
    .filter((e) => e.type === "card_installment" && e.card_id)
    .reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);
}

export async function setCardProjection(params: {
  cardId: string;
  referenceMonth: string;
  amountCents: number | null;
}) {
  const supabase = await createClient();
  const [year, month] = params.referenceMonth.split("-").map(Number);
  const budgetMonth = await getOrCreateBudgetMonth(year, month);

  const { data: card } = await supabase
    .from("cards")
    .select("id, name, last_digits, account_id")
    .eq("id", params.cardId)
    .single();

  if (!card) throw new Error("Cartão não encontrado");

  if (!params.amountCents || params.amountCents <= 0) {
    const { error } = await supabase
      .from("cash_flow_entries")
      .delete()
      .eq("budget_month_id", budgetMonth.id)
      .eq("card_id", params.cardId)
      .eq("type", "card_installment");

    if (error) throw new Error(error.message);
    revalidatePath("/planejamento");
    return;
  }

  const label = card.last_digits
    ? `${card.name} ${card.last_digits}`
    : card.name;

  const { data: existing } = await supabase
    .from("cash_flow_entries")
    .select("id")
    .eq("budget_month_id", budgetMonth.id)
    .eq("card_id", params.cardId)
    .eq("type", "card_installment")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cash_flow_entries")
      .update({
        label,
        amount_cents: params.amountCents,
        account_id: card.account_id,
        source: "manual",
        is_confirmed: true,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("cash_flow_entries").insert({
      budget_month_id: budgetMonth.id,
      type: "card_installment",
      label,
      amount_cents: params.amountCents,
      card_id: params.cardId,
      account_id: card.account_id,
      source: "manual",
      is_confirmed: true,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/planejamento");
}

export async function saveCardProjectionGrid(
  cells: { cardId: string; referenceMonth: string; amountCents: number | null }[]
) {
  if (cells.length === 0) return;

  const supabase = await createClient();
  const cards = await getAllCards();
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const monthRefs = [...new Set(cells.map((c) => c.referenceMonth))];
  const budgetMonthByRef = new Map<string, string>();

  for (const ref of monthRefs) {
    const [year, month] = ref.split("-").map(Number);
    const budgetMonth = await getOrCreateBudgetMonth(year, month);
    budgetMonthByRef.set(ref, budgetMonth.id);
  }

  const budgetMonthIds = [...budgetMonthByRef.values()];
  const { data: existingRows, error: fetchError } = await supabase
    .from("cash_flow_entries")
    .select("id, budget_month_id, card_id")
    .in("budget_month_id", budgetMonthIds)
    .eq("type", "card_installment")
    .not("card_id", "is", null);

  if (fetchError) throw new Error(fetchError.message);

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [`${row.budget_month_id}|${row.card_id}`, row.id])
  );

  const toDelete: string[] = [];
  const toInsert: {
    budget_month_id: string;
    type: "card_installment";
    label: string;
    amount_cents: number;
    card_id: string;
    account_id: string;
    source: "manual";
    is_confirmed: boolean;
  }[] = [];
  const toUpdate: {
    id: string;
    label: string;
    amount_cents: number;
    account_id: string;
  }[] = [];

  for (const cell of cells) {
    const card = cardMap.get(cell.cardId);
    if (!card) continue;

    const budgetMonthId = budgetMonthByRef.get(cell.referenceMonth);
    if (!budgetMonthId) continue;

    const existingId = existingMap.get(`${budgetMonthId}|${cell.cardId}`);

    if (!cell.amountCents || cell.amountCents <= 0) {
      if (existingId) toDelete.push(existingId);
      continue;
    }

    const label = card.last_digits
      ? `${card.name} ${card.last_digits}`
      : card.name;

    if (existingId) {
      toUpdate.push({
        id: existingId,
        label,
        amount_cents: cell.amountCents,
        account_id: card.account_id,
      });
    } else {
      toInsert.push({
        budget_month_id: budgetMonthId,
        type: "card_installment",
        label,
        amount_cents: cell.amountCents,
        card_id: cell.cardId,
        account_id: card.account_id,
        source: "manual",
        is_confirmed: true,
      });
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("cash_flow_entries")
      .delete()
      .in("id", toDelete);
    if (error) throw new Error(error.message);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("cash_flow_entries").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  for (const row of toUpdate) {
    const { error } = await supabase
      .from("cash_flow_entries")
      .update({
        label: row.label,
        amount_cents: row.amount_cents,
        account_id: row.account_id,
        source: "manual",
        is_confirmed: true,
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/planejamento");
}

export async function getCardProjectionGrid(startYear: number, startMonth: number) {
  const settings = await getOrCreateCashFlowSettings();
  const months = buildMonthRange(
    startYear,
    startMonth,
    settings.projection_months
  );
  const cards = await getAllCards();
  const supabase = await createClient();

  const values: Record<string, number> = {};
  const totalsByMonth: Record<string, number> = {};

  for (const ref of months) {
    totalsByMonth[ref] = 0;
    const [year, month] = ref.split("-").map(Number);
    const budgetMonth = await getOrCreateBudgetMonth(year, month);

    const { data: entries } = await supabase
      .from("cash_flow_entries")
      .select("card_id, amount_cents")
      .eq("budget_month_id", budgetMonth.id)
      .eq("type", "card_installment")
      .not("card_id", "is", null);

    for (const entry of entries ?? []) {
      if (!entry.card_id) continue;
      const cents = entry.amount_cents ?? 0;
      values[`${entry.card_id}|${ref}`] = cents;
      totalsByMonth[ref] += cents;
    }
  }

  return { months, cards, values, totalsByMonth, projectionMonths: settings.projection_months };
}

export async function getCashFlowProjection(startYear: number, startMonth: number) {
  const settings = await getOrCreateCashFlowSettings();
  const monthRefs = buildMonthRange(
    startYear,
    startMonth,
    settings.projection_months
  );

  const supabase = await createClient();

  const transactions = await getTransactions();

  const historicalByCategory = new Map<string, Map<string, number>>();
  for (const tx of transactions) {
    if (!tx.category_id) continue;
    const ref = tx.reference_month ?? tx.transaction_date.slice(0, 7);
    const catMap = historicalByCategory.get(tx.category_id) ?? new Map();
    catMap.set(ref, (catMap.get(ref) ?? 0) + tx.amount_cents);
    historicalByCategory.set(tx.category_id, catMap);
  }

  const monthInputs: MonthInput[] = [];

  for (const ref of monthRefs) {
    const [year, month] = ref.split("-").map(Number);
    const budgetMonth = await getOrCreateBudgetMonth(year, month);
    const entries = await getCashFlowEntries(budgetMonth.id, year, month);

    const { data: variables } = await supabase
      .from("budget_variable_expenses")
      .select("*")
      .eq("budget_month_id", budgetMonth.id);

    const incomeCents = sumEntriesByType(entries, "income");
    const fixedCents = sumEntriesByType(entries, "fixed_expense");
    const cardCents = sumCardProjections(entries);

    monthInputs.push({
      referenceMonth: ref,
      incomeCents,
      fixedCents,
      cardCents,
      variableSlots: (variables ?? [])
        .filter((v) => v.is_tracked ?? true)
        .map((v) => ({
          categoryId: v.category_id,
          amountCents: v.amount_cents,
          isTracked: v.is_tracked ?? true,
          estimationMethod: v.estimation_method ?? "none",
        })),
    });
  }

  const projections = projectCashFlow({
    months: monthInputs,
    openingBalanceCents: settings.opening_balance_cents,
    historicalByCategory,
    defaultEstimationMethod: settings.default_estimation_method,
  });

  const cardGrid = await getCardProjectionGrid(startYear, startMonth);

  return { settings, monthInputs, projections, cardGrid };
}
