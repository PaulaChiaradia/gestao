# Gestão — Paula Chiaradia Imagem & Estilo

Plataforma única de indicadores, atendimento e CRM, integrada a Hotmart, Meta Ads, Instagram, WhatsApp Business e e-mail.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase: Auth, Postgres com RLS, Edge Functions e agendamentos
- Hospedagem: Vercel (deploy automático a partir do GitHub)

## Rodando localmente

1. Crie `.env.local` na raiz (nunca versionado):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://civqptnwlmybamsunpah.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```

2. `npm install` e `npm run dev` → http://localhost:3000

## Banco de dados

As migrações ficam em `supabase/migrations/` e são aplicadas em ordem.

## Perfis de acesso

| Perfil | Acesso |
|---|---|
| admin | Tudo, incluindo usuários e integrações |
| gestor | Todos os painéis, atendimento e robô |
| marketing | Anúncios e Instagram |
| atendimento | Atendimento, pipeline e contatos |
| visualizador | Painéis em modo leitura |

A matriz fica em `src/lib/roles.ts`, e as policies de RLS do banco replicam as mesmas regras.

## Etapas

0. Fundação: login, perfis e layout ← **em andamento**
1. Hotmart: webhooks, histórico e painel de vendas por estado e cidade
2. Meta Ads: insights diários por estado, público e posicionamento
3. Instagram: métricas de conteúdo e público
4. WhatsApp + robô com IA + pipeline de palestras
5. Direct do Instagram + e-mail na caixa de atendimento
