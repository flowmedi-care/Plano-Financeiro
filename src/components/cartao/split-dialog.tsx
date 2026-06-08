"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { assignSplits, clearSplits } from "@/lib/actions/splits";
import { splitEqually, splitFull, validateSplits } from "@/lib/splits/calculate";
import type { Person, Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type SplitMode = "none" | "full" | "equal" | "custom";

export function SplitDialog({
  open,
  onOpenChange,
  transactions,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  people: Person[];
}) {
  const [mode, setMode] = useState<SplitMode>("full");
  const [fullPersonId, setFullPersonId] = useState(people[0]?.id ?? "");
  const [equalPersonIds, setEqualPersonIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const singleTx = transactions.length === 1 ? transactions[0] : null;
  const totalCents = transactions.reduce((sum, tx) => sum + tx.amount_cents, 0);

  const preview = useMemo(() => {
    if (mode === "none") return [];
    if (mode === "full" && fullPersonId && singleTx) {
      return splitFull(fullPersonId, singleTx.amount_cents);
    }
    if (mode === "full" && fullPersonId && transactions.length > 1) {
      return [{ personId: fullPersonId, amountCents: totalCents }];
    }
    if (mode === "equal" && equalPersonIds.length > 0 && singleTx) {
      return splitEqually(singleTx.amount_cents, equalPersonIds);
    }
    if (mode === "custom" && singleTx) {
      return people
        .filter((p) => customAmounts[p.id])
        .map((p) => ({
          personId: p.id,
          amountCents: Math.round(Number.parseFloat(customAmounts[p.id].replace(",", ".")) * 100) || 0,
        }))
        .filter((s) => s.amountCents > 0);
    }
    return [];
  }, [mode, fullPersonId, equalPersonIds, customAmounts, singleTx, transactions.length, totalCents, people]);

  function toggleEqualPerson(personId: string, checked: boolean) {
    setEqualPersonIds((prev) =>
      checked ? [...prev, personId] : prev.filter((id) => id !== personId)
    );
  }

  function handleSave() {
    startTransition(async () => {
      try {
        if (mode === "none") {
          await clearSplits(transactions.map((t) => t.id));
          toast.success("Reembolso removido");
          onOpenChange(false);
          return;
        }

        if (transactions.length > 1) {
          if (mode === "custom") {
            toast.error("Divisão customizada só funciona com uma transação");
            return;
          }
          if (mode === "full") {
            if (!fullPersonId) {
              toast.error("Selecione uma pessoa");
              return;
            }
            for (const tx of transactions) {
              await assignSplits({
                transactionIds: [tx.id],
                splits: splitFull(fullPersonId, tx.amount_cents),
              });
            }
          } else if (mode === "equal") {
            if (equalPersonIds.length === 0) {
              toast.error("Selecione ao menos uma pessoa");
              return;
            }
            for (const tx of transactions) {
              await assignSplits({
                transactionIds: [tx.id],
                splits: splitEqually(tx.amount_cents, equalPersonIds),
              });
            }
          }
          toast.success("Reembolso atribuído");
          onOpenChange(false);
          return;
        }

        if (!singleTx) return;

        let splits = preview;
        const validation = validateSplits(singleTx.amount_cents, splits);
        if (!validation.valid) {
          toast.error(validation.error ?? "Divisão inválida");
          return;
        }

        if (mode === "full" && fullPersonId) {
          splits = splitFull(fullPersonId, singleTx.amount_cents);
        } else if (mode === "equal" && equalPersonIds.length > 0) {
          splits = splitEqually(singleTx.amount_cents, equalPersonIds);
        }

        await assignSplits({ transactionIds: [singleTx.id], splits });
        toast.success("Reembolso atribuído");
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atribuir");
      }
    });
  }

  if (people.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir reembolso</DialogTitle>
            <DialogDescription>
              Cadastre pessoas em Configurações antes de atribuir reembolsos.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir reembolso</DialogTitle>
          <DialogDescription>
            {transactions.length === 1
              ? `${transactions[0].description} — ${formatCurrency(transactions[0].amount_cents)}`
              : `${transactions.length} transações selecionadas`}
            <br />
            O valor continua no seu gasto total. Isso é só para controle de quem deve reembolsar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Modo</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as SplitMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (só eu)</SelectItem>
                <SelectItem value="full">100% para uma pessoa</SelectItem>
                <SelectItem value="equal">Divisão igual</SelectItem>
                {transactions.length === 1 ? (
                  <SelectItem value="custom">Valores customizados</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>

          {mode === "full" ? (
            <div className="space-y-2">
              <Label>Pessoa</Label>
              <Select value={fullPersonId} onValueChange={setFullPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {mode === "equal" ? (
            <div className="space-y-2">
              <Label>Dividir entre</Label>
              {people.map((person) => (
                <div key={person.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={equalPersonIds.includes(person.id)}
                    onCheckedChange={(checked) =>
                      toggleEqualPerson(person.id, Boolean(checked))
                    }
                  />
                  <span>{person.name}</span>
                </div>
              ))}
            </div>
          ) : null}

          {mode === "custom" && singleTx ? (
            <div className="space-y-2">
              <Label>Valor por pessoa</Label>
              {people.map((person) => (
                <div key={person.id} className="flex items-center gap-2">
                  <span className="w-24 text-sm">{person.name}</span>
                  <Input
                    placeholder="0,00"
                    value={customAmounts[person.id] ?? ""}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({
                        ...prev,
                        [person.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          {preview.length > 0 ? (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">Preview</p>
              {preview.map((split) => {
                const person = people.find((p) => p.id === split.personId);
                return (
                  <p key={split.personId}>
                    {person?.name}: {formatCurrency(split.amountCents)}
                  </p>
                );
              })}
            </div>
          ) : null}

          <Button onClick={handleSave} disabled={pending} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
