import { SettingsPanels } from "@/components/configuracoes/settings-panels";
import { getAccounts } from "@/lib/actions/accounts";
import { getCategories } from "@/lib/actions/categories";
import { getHouseholds, getPendingInvites } from "@/lib/actions/households";

export default async function ConfiguracoesPage() {
  const [accounts, categories, households, invites] = await Promise.all([
    getAccounts(),
    getCategories(),
    getHouseholds(),
    getPendingInvites(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie contas, categorias e compartilhamento em grupo.
        </p>
      </div>
      <SettingsPanels
        accounts={accounts}
        categories={categories}
        households={households}
        invites={invites}
      />
    </div>
  );
}
