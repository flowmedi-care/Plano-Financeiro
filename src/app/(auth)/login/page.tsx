import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse seu planejamento financeiro</CardDescription>
      </CardHeader>
      <CardContent>
        {params.error ? (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        {params.registered ? (
          <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
            Conta criada. Faça login para continuar.
          </p>
        ) : null}
        <form action={signIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

