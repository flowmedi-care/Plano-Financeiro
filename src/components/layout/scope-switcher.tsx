"use client";

import { useTransition } from "react";
import { switchScope } from "@/lib/actions/households";
import type { Household, Profile } from "@/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ScopeSwitcher({
  profile,
  households,
}: {
  profile: Profile;
  households: Household[];
}) {
  const [pending, startTransition] = useTransition();

  const currentValue =
    profile.active_scope === "household" && profile.active_household_id
      ? `household:${profile.active_household_id}`
      : "personal";

  return (
    <Select
      disabled={pending}
      value={currentValue}
      onValueChange={(value) => {
        startTransition(async () => {
          if (value === "personal") {
            await switchScope("personal");
          } else {
            const householdId = value.replace("household:", "");
            await switchScope("household", householdId);
          }
        });
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Escopo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="personal">Pessoal</SelectItem>
        {households.map((household) => (
          <SelectItem key={household.id} value={`household:${household.id}`}>
            {household.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
