"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getCardsByAccount(accountId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("account_id", accountId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllCards() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cards").select("*, account:accounts(*)").order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCard(params: {
  accountId: string;
  name: string;
  lastDigits?: string;
  holderName?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").insert({
    account_id: params.accountId,
    name: params.name,
    last_digits: params.lastDigits || null,
    holder_name: params.holderName || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/cartao/importar");
}

export async function deleteCard(cardId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracoes");
  revalidatePath("/cartao/importar");
}
