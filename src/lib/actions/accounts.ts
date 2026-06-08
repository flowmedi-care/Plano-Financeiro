"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";
import type { BankProvider } from "@/types/database";

export async function getAccounts() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  let query = supabase.from("accounts").select("*").order("name");

  if (scope === "household" && householdId) {
    query = query.eq("scope", "household").eq("household_id", householdId);
  } else {
    query = query.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);
  const name = String(formData.get("name"));
  const bank = String(formData.get("bank")) as BankProvider;

  const { error } = await supabase.from("accounts").insert({
    user_id: profile.id,
    household_id: scope === "household" ? householdId : null,
    scope,
    name,
    bank,
    account_type: "credit_card",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/cartao/importar");
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
}
