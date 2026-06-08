import { TransactionTable } from "@/components/cartao/transaction-table";
import { getAccounts } from "@/lib/actions/accounts";
import { getAllCards } from "@/lib/actions/cards";
import { getPeople } from "@/lib/actions/people";
import { getCategories } from "@/lib/actions/categories";
import { getTransactions } from "@/lib/actions/transactions";

export default async function TransactionsPage() {
  const [transactions, categories, accounts, cards, people] = await Promise.all([
    getTransactions(),
    getCategories(),
    getAccounts(),
    getAllCards(),
    getPeople(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transações</h1>
        <p className="text-muted-foreground">
          Classifique seus gastos e crie regras para importações futuras.
        </p>
      </div>
      <TransactionTable
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        cards={cards}
        people={people}
      />
    </div>
  );
}
