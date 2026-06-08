# Plano Financeiro

App de planejamento financeiro com importação de faturas Nubank (CSV) e Itaú (PDF), classificação automática de gastos e módulo de planejamento mensal.

## Stack

- Next.js 15 + React + TypeScript
- Supabase (Auth, Postgres, Storage, RLS)
- shadcn/ui + Recharts
- PapaParse (CSV) + pdf-parse (PDF)

## Setup

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute a migration em `supabase/migrations/001_initial_schema.sql` no SQL Editor
3. Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave
```

4. Instale e rode:

```bash
npm install
npm run dev
```

5. Acesse [http://localhost:3000](http://localhost:3000)

## Funcionalidades

- **Importação**: CSV Nubank e PDF Itaú com preview antes de confirmar
- **Classificação**: bulk classify + regras por estabelecimento para auto-categorização
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
