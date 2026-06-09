"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import type { ProjectionScenarioType } from "@/types/database";

async function getScopeContext() {
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");
  const { scope, householdId } = getActiveScope(profile);
  return { profile, scope, householdId };
}

export async function listProjectionScenarios() {
  const supabase = await createClient();
  const { profile, scope, householdId } = await getScopeContext();

  let query = supabase
    .from("projection_scenarios")
    .select("*, projection_scenario_month_values(*)")
    .order("sort_order")
    .order("created_at");

  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { projection_scenario_month_values, ...scenario } = row;
    return {
      ...scenario,
      monthValues: projection_scenario_month_values ?? [],
    };
  });
}

export async function createProjectionScenario(params: {
  name: string;
  type: ProjectionScenarioType;
  fixedAmountCents?: number;
}) {
  const supabase = await createClient();
  const { profile, scope, householdId } = await getScopeContext();

  let orderQuery = supabase.from("projection_scenarios").select("sort_order");
  if (scope === "household" && householdId) {
    orderQuery = orderQuery.eq("scope", "household").eq("household_id", householdId);
  } else {
    orderQuery = orderQuery.eq("scope", "personal").eq("user_id", profile.id);
  }
  const { data: existing } = await orderQuery
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("projection_scenarios")
    .insert({
      user_id: profile.id,
      household_id: scope === "household" ? householdId : null,
      scope,
      name: params.name,
      type: params.type,
      fixed_amount_cents: params.type === "fixed" ? (params.fixedAmountCents ?? 0) : null,
      sort_order: nextOrder,
    })
    .select("*, projection_scenario_month_values(*)")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
  const { projection_scenario_month_values, ...scenario } = data;
  return { ...scenario, monthValues: projection_scenario_month_values ?? [] };
}

export async function updateProjectionScenario(params: {
  id: string;
  name?: string;
  type?: ProjectionScenarioType;
  fixedAmountCents?: number | null;
}) {
  const supabase = await createClient();

  const patch: Record<string, string | number | null> = {};
  if (params.name !== undefined) patch.name = params.name;
  if (params.type !== undefined) {
    patch.type = params.type;
    if (params.type === "monthly") {
      patch.fixed_amount_cents = null;
    }
  }
  if (params.fixedAmountCents !== undefined) {
    patch.fixed_amount_cents = params.fixedAmountCents;
  }

  const { error } = await supabase
    .from("projection_scenarios")
    .update(patch)
    .eq("id", params.id);

  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function deleteProjectionScenario(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projection_scenarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/planejamento");
}

export async function saveScenarioMonthValues(
  scenarioId: string,
  cells: { referenceMonth: string; amountCents: number | null }[]
) {
  const supabase = await createClient();

  const monthRefs = [...new Set(cells.map((c) => c.referenceMonth))];

  const { data: existingRows, error: fetchError } = await supabase
    .from("projection_scenario_month_values")
    .select("id, reference_month")
    .eq("scenario_id", scenarioId)
    .in("reference_month", monthRefs);

  if (fetchError) throw new Error(fetchError.message);

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [row.reference_month, row.id])
  );

  const toDelete: string[] = [];
  const toInsert: {
    scenario_id: string;
    reference_month: string;
    amount_cents: number;
  }[] = [];
  const toUpdate: { id: string; amount_cents: number }[] = [];

  for (const cell of cells) {
    const existingId = existingMap.get(cell.referenceMonth);

    if (!cell.amountCents || cell.amountCents <= 0) {
      if (existingId) toDelete.push(existingId);
      continue;
    }

    if (existingId) {
      toUpdate.push({ id: existingId, amount_cents: cell.amountCents });
    } else {
      toInsert.push({
        scenario_id: scenarioId,
        reference_month: cell.referenceMonth,
        amount_cents: cell.amountCents,
      });
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("projection_scenario_month_values")
      .delete()
      .in("id", toDelete);
    if (error) throw new Error(error.message);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("projection_scenario_month_values").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  for (const row of toUpdate) {
    const { error } = await supabase
      .from("projection_scenario_month_values")
      .update({ amount_cents: row.amount_cents })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/planejamento");
}
