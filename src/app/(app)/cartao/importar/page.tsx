import { ImportForm } from "@/components/cartao/import-form";
import { getAccounts } from "@/lib/actions/accounts";

export default async function ImportPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar fatura</h1>
        <p className="text-muted-foreground">
          Envie o CSV do Nubank ou o PDF do Itaú para importar os lançamentos.
        </p>
      </div>
      <ImportForm accounts={accounts} />
    </div>
  );
}
