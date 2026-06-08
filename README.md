# Plano Financeiro

App de planejamento financeiro com importação de faturas Nubank (CSV) e Itaú (PDF), classificação automática de gastos e módulo de planejamento mensal.

## Stack

- Next.js 15 + React + TypeScript
- Supabase (Auth, Postgres, Storage, RLS)
- shadcn/ui + Recharts
- PapaParse (CSV) + pdf-parse (PDF)

## Deploy na Vercel

1. Importe o repositório na [Vercel](https://vercel.com)
2. **Framework Preset:** Next.js (detectado automaticamente via `vercel.json`)
3. **Output Directory:** deixe em branco — não use `public`
4. Adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Faça o deploy

Se aparecer o erro *"No Output Directory named public"*, vá em **Project Settings → Build & Development Settings** e limpe o campo **Output Directory**.

## Setup

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrations no SQL Editor, nesta ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_fix_signup_trigger.sql`
   - `supabase/migrations/003_add_cards.sql`
   - `supabase/migrations/004_people_and_splits.sql`
3. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave
```

4. Se o cadastro retornar erro 500, execute também `supabase/migrations/002_fix_signup_trigger.sql`

5. Instale e rode:

```bash
npm install
npm run dev
```

6. Acesse [http://localhost:3000](http://localhost:3000)

### Erro 500 ao criar usuário

Causa mais comum: trigger `handle_new_user` sem permissões corretas. Rode `002_fix_signup_trigger.sql` no SQL Editor.

Confira também:
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** deve ser a chave `anon` / `publishable` (não a `service_role` / `secret`)
- A migration `001_initial_schema.sql` foi executada por completo

## Funcionalidades

- **Importação**: CSV Nubank e PDF Itaú com preview antes de confirmar
- **Classificação**: bulk classify + regras por estabelecimento para auto-categorização
- **Reembolso por pessoa**: atribuir/dividir gastos para cobrar Pai, Namorada, etc. (sem alterar totais de categoria)
- **Planejamento**: receitas, despesas fixas, metas variáveis e limites de cartão
- **Dashboard**: gráficos de categorias, comparação planejado vs. realizado, projeção de parcelas
- **Multi-usuário**: dados pessoais + grupos compartilhados (households)

## Testes

```bash
npm test
```

Os testes de parser usam os arquivos de exemplo na sua área de trabalho.

## Estrutura

- `src/app/(auth)` — login e cadastro
- `src/app/(app)` — páginas autenticadas
- `src/lib/parsers` — parsers Nubank e Itaú
- `src/lib/actions` — server actions
- `supabase/migrations` — schema SQL + RLS
