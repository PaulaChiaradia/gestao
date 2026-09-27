-- Momento do último evento aplicado (a Hotmart pode enviar eventos fora de ordem)
alter table public.hotmart_sales add column event_at timestamptz;

-- Links com src/sck para identificar a origem de cada venda
create table public.tracked_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.hotmart_products (id),
  channel text not null,             -- valor de src (ex.: instagram-bio)
  campaign text,                     -- valor de sck (ex.: desafio-verao-2026)
  label text not null,
  target text not null check (target in ('pagina', 'checkout')),
  url text not null,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index tracked_links_channel_idx on public.tracked_links (channel, campaign);

alter table public.tracked_links enable row level security;

create policy "Vendas e marketing veem links" on public.tracked_links
  for select to authenticated
  using (public.has_role(array['admin', 'gestor', 'marketing', 'visualizador']::public.app_role[]));

create policy "Marketing cria links" on public.tracked_links
  for insert to authenticated
  with check (public.has_role(array['admin', 'gestor', 'marketing']::public.app_role[]));

create policy "Marketing remove links" on public.tracked_links
  for delete to authenticated
  using (public.has_role(array['admin', 'gestor', 'marketing']::public.app_role[]));
