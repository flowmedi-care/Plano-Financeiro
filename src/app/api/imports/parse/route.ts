import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseNubankCsv } from "@/lib/parsers/nubank-csv";
import { parseItauPdf } from "@/lib/parsers/itau-pdf";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bank = String(formData.get("bank"));

  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  try {
    if (bank === "nubank") {
      const content = await file.text();
      const result = parseNubankCsv(content);
      return NextResponse.json(result);
    }

    if (bank === "itau") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await parseItauPdf(buffer);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Banco não suportado" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar arquivo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
