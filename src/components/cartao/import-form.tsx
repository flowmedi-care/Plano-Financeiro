"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { confirmImport } from "@/lib/actions/imports";
import type { Account, ParseResult } from "@/types/database";
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

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [referenceMonth, setReferenceMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const acceptedType = selectedAccount?.bank === "nubank" ? ".csv" : ".pdf";

  async function handleParse() {
    if (!file || !selectedAccount) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bank", selectedAccount.bank);

    const response = await fetch("/api/imports/parse", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Erro ao processar arquivo");
      return;
    }

    setPreview(data);
    if (data.referenceMonth) {
      setReferenceMonth(data.referenceMonth);
    }
    toast.success(`${data.transactions.length} transações encontradas`);
  }

  function handleConfirm() {
    if (!preview || !file || !selectedAccount) return;

    startTransition(async () => {
      try {
        const result = await confirmImport({
          accountId,
          referenceMonth,
          fileName: file.name,
          fileType: selectedAccount.bank === "nubank" ? "csv" : "pdf",
          transactions: preview.transactions,
          installmentProjections: preview.installmentProjections,
        });
        toast.success(`${result.importedCount} transações importadas`);
        setPreview(null);
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
                  setPreview(null);
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!file || pending}>
              <Upload className="h-4 w-4" />
              Processar arquivo
            </Button>
            {preview ? (
              <Button onClick={handleConfirm} disabled={pending}>
                Confirmar importação
              </Button>
            ) : null}
          </div>

          {preview?.warnings.length ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {preview.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {preview.transactions.filter((t) => !t.isPayment).length} lançamentos
              {preview.installmentProjections.length
                ? ` · ${preview.installmentProjections.length} parcelas futuras`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.transactions
                  .filter((tx) => !tx.isPayment)
                  .slice(0, 50)
                  .map((tx, index) => (
                    <TableRow key={`${tx.date}-${tx.merchantKey}-${index}`}>
                      <TableCell>{tx.date}</TableCell>
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
                      <TableCell className="text-right">
                        {formatCurrency(tx.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
