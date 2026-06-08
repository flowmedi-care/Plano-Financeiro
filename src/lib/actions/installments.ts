"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import { projectInstallmentsFromSchedules } from "@/lib/installments/project";

export async function getInstallmentProjections(monthsAhead = 12) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  let scheduleQuery = supabase.from("installment_schedules").select("*");

  if (scope === "household" && householdId) {
    scheduleQuery = scheduleQuery.eq("scope", "household").eq("household_id", householdId);
  } else {
    scheduleQuery = scheduleQuery.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data: schedules } = await scheduleQuery;

  return projectInstallmentsFromSchedules(schedules ?? [], monthsAhead);
}
