"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope";
import { getProfile } from "@/lib/actions/profile";

export async function getCategories() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { scope, householdId } = getActiveScope(profile);

  const { data: systemCategories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_system", true)
    .order("name");

  let customQuery = supabase.from("categories").select("*").eq("is_system", false);

  if (scope === "household" && householdId) {
    customQuery = customQuery.eq("scope", "household").eq("household_id", householdId);
  } else {
    customQuery = customQuery.eq("scope", "personal").eq("user_id", profile.id);
  }

  const { data: customCategories, error } = await customQuery.order("name");
  if (error) throw new Error(error.message);

  return [...(systemCategories ?? []), ...(customCategories ?? [])];
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) throw new Error("Não autenticado");

  const { scope, householdId } = getActiveScope(profile);
  const name = String(formData.get("name"));
  const color = String(formData.get("color") || "#64748b");

  const { error } = await supabase.from("categories").insert({
    user_id: scope === "personal" ? profile.id : null,
    household_id: scope === "household" ? householdId : null,
    scope,
    name,
    color,
    is_system: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/cartao/transacoes");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name"));
  const color = String(formData.get("color"));

  const { error } = await supabase
    .from("categories")
    .update({ name, color })
    .eq("id", categoryId)
    .eq("is_system", false);

  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
}
