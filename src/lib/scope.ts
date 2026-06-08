import type { Profile, ScopeType } from "@/types/database";

export function getActiveScope(profile: Profile): {
  scope: ScopeType;
  householdId: string | null;
} {
  if (profile.active_scope === "household" && profile.active_household_id) {
    return {
      scope: "household",
      householdId: profile.active_household_id,
    };
  }

  return {
    scope: "personal",
    householdId: null,
  };
}
