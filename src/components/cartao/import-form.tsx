"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { confirmImport } from "@/lib/actions/imports";
import { normalizeMerchant } from "@/lib/merchants/normalize";
import type { Account, ParsedTransaction, ParseResult } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type EditableTransaction = ParsedTransaction & { _id: string };

function parseMoneyToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;

  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount)) return null;
  return Math.round(amount * 100);
}

function toEditable(transactions: ParsedTransaction[]): EditableTransaction[] {
  return transactions.map((tx) => ({
    ...tx,
    _id: crypto.randomUUID(),
  }));
}

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [referenceMonth, setReferenceMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [installmentProjections, setInstallmentProjections] = useState<
    ParseResult["installmentProjections"]
  >([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [expectedTotal, setExpectedTotal] = useState("");
  const [pending, startTransition] = useTransition();

  const [newDate, setNewDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newInstallmentCurrent, setNewInstallmentCurrent] = useState("");
  const [newInstallmentTotal, setNewInstallmentTotal] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const acceptedType = selectedAccount?.bank === "nubank" ? ".csv" : ".pdf";
  const hasPreview = transactions.length > 0;

  const importableTransactions = useMemo(
    () => transactions.filter((tx) => !tx.isPayment),
    [transactions]
  );

  const totalCents = useMemo(
    () => importableTransactions.reduce((sum, tx) => sum + tx.amountCents, 0),
    [importableTransactions]
  );

  const expectedTotalCents = parseMoneyToCents(expectedTotal);
  const totalDiffCents =
    expectedTotalCents !== null ? totalCents - expectedTotalCents : null;

  async function handleParse() {
    if (!file || !selectedAccount) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bank", selectedAccount.bank);

    const response = await fetch("/api/imports/parse", {
      method: "POST",
      body: formData,
    });

    const data: ParseResult = await response.json();
    if (!response.ok) {
      toast.error((data as { error?: string }).error ?? "Erro ao processar arquivo");
      return;
    }

    setTransactions(toEditable(data.transactions));
    setInstallmentProjections(data.installmentProjections);
    setWarnings(data.warnings);
    setExpectedTotal("");

    if (data.referenceMonth) {
      setReferenceMonth(data.referenceMonth);
    }

    toast.success(`${data.transactions.length} transações encontradas`);
  }

  function handleRemove(id: string) {
    setTransactions((prev) => prev.filter((tx) => tx._id !== id));
  }

  function handleAddTransaction() {
    const amountCents = parseMoneyToCents(newAmount);
    if (!newDate || !newDescription.trim() || amountCents === null) {
      toast.error("Preencha data, descrição e valor válido");
      return;
    }

    const installmentCurrent = newInstallmentCurrent
      ? Number(newInstallmentCurrent)
      : null;
    const installmentTotal = newInstallmentTotal ? Number(newInstallmentTotal) : null;

    const description = newDescription.trim();

    setTransactions((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        date: newDate,
        description,
        merchantKey: normalizeMerchant(description),
        amountCents,
        installmentCurrent,
        installmentTotal,
        isPayment: false,
        isIof: false,
      },
    ]);

    setNewDate("");
    setNewDescription("");
    setNewAmount("");
    setNewInstallmentCurrent("");
    setNewInstallmentTotal("");
    toast.success("Lançamento adicionado");
  }

  function handleConfirm() {
    if (!hasPreview || !file || !selectedAccount) return;

    if (importableTransactions.length === 0) {
      toast.error("Adicione ao menos um lançamento para importar");
      return;
    }

    startTransition(async () => {
      try {
        const result = await confirmImport({
          accountId,
          referenceMonth,
          fileName: file.name,
          fileType: selectedAccount.bank === "nubank" ? "csv" : "pdf",
          transactions: transactions.map(({ _id, ...tx }) => tx),
          installmentProjections,
        });
        toast.success(`${result.importedCount} transações importadas`);
        setTransactions([]);
        setInstallmentProjections([]);
        setWarnings([]);
        setExpectedTotal("");
        setFile(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro na importação");
      }
    });
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cadastre uma conta em Configurações antes de importar faturas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar fatura</CardTitle>
          <CardDescription>
            Nubank: CSV · Itaú: PDF. Selecione a conta e o mês de referência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.bank})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Arquivo ({acceptedType})</Label>
              <Input
                type="file"
                accept={acceptedType}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setTransactions([]);
                  setInstallmentProjections([]);
                  setWarnings([]);
                  setExpectedTotal("");
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!file || pending}>
              <Upload className="h-4 w-4" />
              Processar arquivo
            </Button>
            {hasPreview ? (
              <Button onClick={handleConfirm} disabled={pending}>
                Confirmar importação ({importableTransactions.length})
              </Button>
            ) : null}
          </div>

          {warnings.length ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {hasPreview ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  {importableTransactions.length} lançamentos para importar
                  {transactions.length !== importableTransactions.length
                    ? ` · ${transactions.length - importableTransactions.length} pagamentos ignorados`
                    : ""}
                  {installmentProjections.length
                    ? ` · ${installmentProjections.length} parcelas futuras`
                    : ""}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total calculado</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCents)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="space-y-2">
                <Label>Total da fatura (para conferir)</Label>
                <Input
                  placeholder="Ex: 1929,23"
                  value={expectedTotal}
                  onChange={(e) => setExpectedTotal(e.target.value)}
                  className="w-40"
                />
              </div>
              {expectedTotalCents !== null ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Diferença</p>
                  <p
                    className={`text-lg font-semibold ${
                      totalDiffCents === 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {totalDiffCents === 0
                      ? "Valores conferem"
                      : `${totalDiffCents! > 0 ? "+" : ""}${formatCurrency(totalDiffCents!)}`}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="max-h-[480px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importableTransactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell className="whitespace-nowrap">{tx.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{tx.description}</span>
                          {tx.isIof ? <Badge variant="warning">IOF</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.installmentCurrent && tx.installmentTotal
                          ? `${tx.installmentCurrent}/${tx.installmentTotal}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(tx.amountCents)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(tx._id)}
                          aria-label="Remover lançamento"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">Adicionar lançamento manualmente</p>
              <div className="grid gap-3 md:grid-cols-6">
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    placeholder="Estabelecimento"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    placeholder="0,00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parcela (opcional)</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="1"
                      value={newInstallmentCurrent}
                      onChange={(e) => setNewInstallmentCurrent(e.target.value)}
                      className="w-14"
                    />
                    <span className="self-center text-muted-foreground">/</span>
                    <Input
                      placeholder="3"
                      value={newInstallmentTotal}
                      onChange={(e) => setNewInstallmentTotal(e.target.value)}
                      className="w-14"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={handleAddTransaction}>
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
