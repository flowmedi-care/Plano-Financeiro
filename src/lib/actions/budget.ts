"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";

export async function getOrCreateBudgetMonth(year: number, month: number) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);

  let query = supabase
    .from("budget_months")
    .select("*")
    .eq("year", year)
    .eq("month", month);

  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("budget_months")
    .insert({
      user_id: profile.id,
      household_id: scope === "household" ? householdId : null,
      scope,
      year,
      month,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getBudgetDetails(year: number, month: number) {
  const budgetMonth = await getOrCreateBudgetMonth(year, month);
  const supabase = await createClient();

  const [incomes, fixed, variable, cards] = await Promise.all([
    supabase.from("budget_incomes").select("*").eq("budget_month_id", budgetMonth.id),
    supabase.from("budget_fixed_expenses").select("*").eq("budget_month_id", budgetMonth.id),
    supabase
      .from("budget_variable_expenses")
      .select("*, category:categories(*)")
      .eq("budget_month_id", budgetMonth.id),
    supabase
      .from("budget_card_targets")
      .select("*, account:accounts(*)")
      .eq("budget_month_id", budgetMonth.id),
  ]);

  return {
    budgetMonth,
    incomes: incomes.data ?? [],
    fixedExpenses: fixed.data ?? [],
    variableExpenses: variable.data ?? [],
    cardTargets: cards.data ?? [],
  };
}

export async function addBudgetIncome(budgetMonthId: string, label: string, amountCents: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("budget_incomes").insert({
    budget_month_id: budgetMonthId,
    label,
    amount_cents: amountCents,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function addBudgetFixedExpense(
  budgetMonthId: string,
  label: string,
  amountCents: number
) {
  const supabase = await createClient();
  const { error } = await supabase.from("budget_fixed_expenses").insert({
    budget_month_id: budgetMonthId,
    label,
    amount_cents: amountCents,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function setBudgetVariableExpense(
  budgetMonthId: string,
  categoryId: string,
  amountCents: number
) {
  const supabase = await createClient();
  const { error } = await supabase.from("budget_variable_expenses").upsert(
    {
      budget_month_id: budgetMonthId,
      category_id: categoryId,
      amount_cents: amountCents,
    },
    { onConflict: "budget_month_id,category_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function setBudgetCardTarget(
  budgetMonthId: string,
  accountId: string,
  amountCents: number
) {
  const supabase = await createClient();
  const { error } = await supabase.from("budget_card_targets").upsert(
    {
      budget_month_id: budgetMonthId,
      account_id: accountId,
      amount_cents: amountCents,
    },
    { onConflict: "budget_month_id,account_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function deleteBudgetItem(
  table: "budget_incomes" | "budget_fixed_expenses",
  id: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function copyPreviousBudget(year: number, month: number) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [current, previous] = await Promise.all([
    getBudgetDetails(year, month),
    getBudgetDetails(prevYear, prevMonth),
  ]);

  const supabase = await createClient();
  const budgetMonthId = current.budgetMonth.id;

  if (current.incomes.length === 0 && previous.incomes.length > 0) {
    await supabase.from("budget_incomes").insert(
      previous.incomes.map((item) => ({
        budget_month_id: budgetMonthId,
        label: item.label,
        amount_cents: item.amount_cents,
      }))
    );
  }

  if (current.fixedExpenses.length === 0 && previous.fixedExpenses.length > 0) {
    await supabase.from("budget_fixed_expenses").insert(
      previous.fixedExpenses.map((item) => ({
        budget_month_id: budgetMonthId,
        label: item.label,
        amount_cents: item.amount_cents,
      }))
    );
  }

  for (const item of previous.variableExpenses) {
    if (!current.variableExpenses.find((v) => v.category_id === item.category_id)) {
      await supabase.from("budget_variable_expenses").insert({
        budget_month_id: budgetMonthId,
        category_id: item.category_id,
        amount_cents: item.amount_cents,
      });
    }
  }

  for (const item of previous.cardTargets) {
    if (!current.cardTargets.find((c) => c.account_id === item.account_id)) {
      await supabase.from("budget_card_targets").insert({
        budget_month_id: budgetMonthId,
        account_id: item.account_id,
        amount_cents: item.amount_cents,
      });
    }
  }

  revalidatePath("/planejamento");
}
