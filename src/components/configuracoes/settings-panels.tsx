"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  acceptInvite,
  createHousehold,
  inviteToHousehold,
} from "@/lib/actions/households";
import { createAccount, deleteAccount } from "@/lib/actions/accounts";
import { createCard, deleteCard } from "@/lib/actions/cards";
import { createCategory } from "@/lib/actions/categories";
import { createPerson, deletePerson } from "@/lib/actions/people";
import type { Account, Category, Household, HouseholdInvite, Person } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsPanels({
  accounts,
  categories,
  households,
  invites,
  people,
}: {
  accounts: Account[];
  categories: Category[];
  households: Household[];
  invites: HouseholdInvite[];
  people: Person[];
}) {
  const [pending, startTransition] = useTransition();
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedHousehold, setSelectedHousehold] = useState(households[0]?.id ?? "");
  const [accountName, setAccountName] = useState("");
  const [accountBank, setAccountBank] = useState<"nubank" | "itau">("nubank");
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#64748b");
  const [cardAccountId, setCardAccountId] = useState(accounts[0]?.id ?? "");
  const [cardName, setCardName] = useState("");
  const [cardLastDigits, setCardLastDigits] = useState("");
  const [personName, setPersonName] = useState("");
  const [personColor, setPersonColor] = useState("#8b5cf6");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contas de cartão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {account.name} ({account.bank})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteAccount(account.id);
                      toast.success("Conta removida");
                    })
                  }
                >
                  Remover conta
                </Button>
              </div>
              {(account.cards ?? []).length > 0 ? (
                <div className="mt-2 space-y-1 pl-2">
                  {account.cards!.map((card) => (
                    <div key={card.id} className="flex items-center justify-between text-sm">
                      <span>
                        {card.name}
                        {card.last_digits ? ` (final ${card.last_digits})` : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteCard(card.id);
                            toast.success("Cartão removido");
                          })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 pl-2 text-xs text-muted-foreground">Nenhum cartão cadastrado</p>
              )}
            </div>
          ))}
          <div className="grid gap-2">
            <Input
              placeholder="Nome da conta"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
            <Select value={accountBank} onValueChange={(v) => setAccountBank(v as "nubank" | "itau")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nubank">Nubank (CSV)</SelectItem>
                <SelectItem value="itau">Itaú (PDF)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={pending || !accountName}
              onClick={() => {
                const formData = new FormData();
                formData.set("name", accountName);
                formData.set("bank", accountBank);
                startTransition(async () => {
                  await createAccount(formData);
                  setAccountName("");
                  toast.success("Conta criada com cartão principal");
                });
              }}
            >
              Adicionar conta
            </Button>
          </div>

          {accounts.length > 0 ? (
            <div className="grid gap-2 border-t pt-4">
              <Label>Adicionar cartão</Label>
              <Select value={cardAccountId} onValueChange={setCardAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nome do cartão (ex: Adicional)"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
              <Input
                placeholder="Final 4 dígitos (ex: 6587)"
                value={cardLastDigits}
                onChange={(e) => setCardLastDigits(e.target.value)}
                maxLength={4}
              />
              <Button
                disabled={pending || !cardName || !cardAccountId}
                onClick={() =>
                  startTransition(async () => {
                    await createCard({
                      accountId: cardAccountId,
                      name: cardName,
                      lastDigits: cardLastDigits || undefined,
                    });
                    setCardName("");
                    setCardLastDigits("");
                    toast.success("Cartão adicionado");
                  })
                }
              >
                Adicionar cartão
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pessoas (reembolso)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cadastre quem deve reembolsar gastos (ex: Pai, Namorada). Isso não altera suas categorias nem seu total de gastos.
          </p>
          {people.map((person) => (
            <div key={person.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: person.color }}
                />
                <span>{person.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await deletePerson(person.id);
                    toast.success("Pessoa removida");
                  })
                }
              >
                Remover
              </Button>
            </div>
          ))}
          <div className="grid gap-2">
            <Input
              placeholder="Nome (ex: Pai, Namorada)"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
            />
            <Input
              type="color"
              value={personColor}
              onChange={(e) => setPersonColor(e.target.value)}
            />
            <Button
              disabled={pending || !personName}
              onClick={() =>
                startTransition(async () => {
                  await createPerson(personName, personColor);
                  setPersonName("");
                  toast.success("Pessoa adicionada");
                })
              }
            >
              Adicionar pessoa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.name}</span>
              {category.is_system ? (
                <span className="text-xs text-muted-foreground">(padrão)</span>
              ) : null}
            </div>
          ))}
          <div className="grid gap-2">
            <Input
              placeholder="Nova categoria"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <Input
              type="color"
              value={categoryColor}
              onChange={(e) => setCategoryColor(e.target.value)}
            />
            <Button
              disabled={pending || !categoryName}
              onClick={() => {
                const formData = new FormData();
                formData.set("name", categoryName);
                formData.set("color", categoryColor);
                startTransition(async () => {
                  await createCategory(formData);
                  setCategoryName("");
                  toast.success("Categoria criada");
                });
              }}
            >
              Adicionar categoria
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupos / Família</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {households.map((household) => (
            <div key={household.id} className="rounded-md border p-3">
              <p className="font-medium">{household.name}</p>
            </div>
          ))}
          <div className="grid gap-2">
            <Input
              placeholder="Nome do grupo"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
            />
            <Button
              disabled={pending || !householdName}
              onClick={() =>
                startTransition(async () => {
                  await createHousehold(householdName);
                  setHouseholdName("");
                  toast.success("Grupo criado");
                })
              }
            >
              Criar grupo
            </Button>
          </div>

          {households.length > 0 ? (
            <div className="grid gap-2 border-t pt-4">
              <Label>Convidar para grupo</Label>
              <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {households.map((household) => (
                    <SelectItem key={household.id} value={household.id}>
                      {household.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button
                disabled={pending || !inviteEmail || !selectedHousehold}
                onClick={() =>
                  startTransition(async () => {
                    await inviteToHousehold(selectedHousehold, inviteEmail);
                    setInviteEmail("");
                    toast.success("Convite enviado");
                  })
                }
              >
                Enviar convite
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convites pendentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
          ) : (
            invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between">
                <span>Convite para grupo</span>
                <Button
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      await acceptInvite(invite.id);
                      toast.success("Convite aceito");
                    })
                  }
                >
                  Aceitar
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
