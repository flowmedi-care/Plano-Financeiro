"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";

export async function getPeople() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  let query = supabase.from("people").select("*").order("name");

  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPerson(name: string, color: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);

  const { error } = await supabase.from("people").insert({
    user_id: profile.id,
    household_id: scope === "household" ? householdId : null,
    scope,
    name,
    color,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/cartao/transacoes");
  revalidatePath("/");
}

export async function deletePerson(personId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("people").delete().eq("id", personId);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/cartao/transacoes");
  revalidatePath("/");
}
