"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import {
  projectInstallmentsFromSchedules,
  projectInstallmentsFromTransactions,
} from "@/lib/installments/project";

export async function getInstallmentProjections(monthsAhead = 12) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  let txQuery = supabase
    .from("transactions")
    .select("*")
    .eq("is_payment", false)
    .not("installment_current", "is", null);

  let scheduleQuery = supabase.from("installment_schedules").select("*");

  if (scope === "household" && householdId) {
    txQuery = txQuery.eq("scope", "household").eq("household_id", householdId);
    scheduleQuery = scheduleQuery.eq("scope", "household").eq("household_id", householdId);
  } else {
    txQuery = txQuery.eq("scope", "personal").eq("user_id", profile.id);
    scheduleQuery = scheduleQuery.eq("scope", "personal").eq("user_id", profile.id);
  }

  const [{ data: transactions }, { data: schedules }] = await Promise.all([
    txQuery,
    scheduleQuery,
  ]);

  const fromTransactions = projectInstallmentsFromTransactions(
    transactions ?? [],
    monthsAhead
  );
  const fromSchedules = projectInstallmentsFromSchedules(schedules ?? [], monthsAhead);

  const merged = new Map<string, number>();
  for (const item of [...fromTransactions, ...fromSchedules]) {
    merged.set(item.referenceMonth, (merged.get(item.referenceMonth) ?? 0) + item.amountCents);
  }

  return Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, monthsAhead)
    .map(([referenceMonth, amountCents]) => ({
      referenceMonth,
      label: referenceMonth,
      amountCents,
    }));
}
