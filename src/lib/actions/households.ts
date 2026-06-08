"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/actions/profile";
import { setActiveScope } from "@/lib/actions/profile";

export async function getHouseholds() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { data: owned } = await supabase
    .from("households")
    .select("*")
    .eq("created_by", profile.id);

  const { data: memberships } = await supabase
    .from("household_members")
    .select("household:households(*)")
    .eq("user_id", profile.id);

  const memberHouseholds =
    memberships?.map((m) => m.household).filter(Boolean) ?? [];

  const all = [...(owned ?? []), ...memberHouseholds];
  const unique = Array.from(new Map(all.map((h) => [h!.id, h])).values());

  return unique;
}

export async function createHousehold(name: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { data: household, error } = await supabase
    .from("households")
    .insert({ name, created_by: profile.id })
    .select()
    .single();

  if (error || !household) throw new Error(error?.message ?? "Erro ao criar grupo");

  await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: profile.id,
    role: "owner",
  });

  await setActiveScope("household", household.id);
  revalidatePath("/configuracoes");
  return household;
}

export async function inviteToHousehold(householdId: string, email: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { error } = await supabase.from("household_invites").insert({
    household_id: householdId,
    email: email.toLowerCase(),
    invited_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
}

export async function getPendingInvites() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { data } = await supabase
    .from("household_invites")
    .select("*, household:households(name)")
    .eq("email", profile.email)
    .eq("status", "pending");

  return data ?? [];
}

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { data: invite } = await supabase
    .from("household_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (!invite) throw new Error("Convite não encontrado");

  await supabase.from("household_members").insert({
    household_id: invite.household_id,
    user_id: profile.id,
    role: "member",
  });

  await supabase
    .from("household_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);

  revalidatePath("/configuracoes");
}

export async function getHouseholdMembers(householdId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("household_members")
    .select("*, profile:profiles(email, full_name)")
    .eq("household_id", householdId);

  return data ?? [];
}

export async function switchScope(scope: "personal" | "household", householdId?: string) {
  await setActiveScope(scope, householdId ?? null);
  revalidatePath("/", "layout");
}
