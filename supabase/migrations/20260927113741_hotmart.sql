-- Etapa 1: contatos unificados, integrações e Hotmart

-- Status das integrações (exibido no painel)
create table public.integrations (
  key text primary key,
  name text not null,
  status text not null default 'desconectado' check (status in ('desconectado', 'conectado', 'erro')),
  last_event_at timestamptz,
  last_sync_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.integrations (key, name) values
  ('hotmart', 'Hotmart'),
  ('meta_ads', 'Meta Ads'),
  ('instagram', 'Instagram'),
  ('whatsapp', 'WhatsApp Business'),
  ('email', 'E-mail');

-- Ficha única de cada pessoa, alimentada por todos os canais
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,              -- somente dígitos, com DDI (ex.: 5519981774841)
  document text,
  city text,
  state char(2),           -- UF
  country text,
  zipcode text,
  instagram_username text,
  first_source text,       -- hotmart, whatsapp, instagram, email, manual
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index contacts_email_key on public.contacts (lower(email)) where email is not null;
create index contacts_phone_idx on public.contacts (phone) where phone is not null;
create index contacts_state_idx on public.contacts (state);

-- Produtos da Hotmart
create table public.hotmart_products (
  id uuid primary key default gen_random_uuid(),
  hotmart_id bigint unique,          -- data.product.id do webhook
  ucode text unique,                 -- data.product.ucode
  checkout_code text unique,         -- código do link pay.hotmart.com/<código>
  default_offer_code text,
  name text not null,
  short_name text,
  kind text,                         -- curso, ebook, mentoria...
  list_price numeric(12, 2),
  sales_page_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.hotmart_products (checkout_code, default_offer_code, name, short_name, kind, list_price, sales_page_url) values
  ('U97785575Y', 'rbzd56p2', 'Do Básico ao Expert em Combinações de Acessórios', 'Curso Combinações', 'curso', 297.00,
   'https://pv.paulachiaradia.com.br/la'),
  ('E99222512V', '3dq0djhp', 'Guia Prático de Combinações de Acessórios', 'Ebook Guia Prático', 'ebook', 49.90,
   'https://pv.paulachiaradia.com.br/guiapratico');

-- Uma linha por transação; atualizada a cada evento (aprovada → reembolsada etc.)
create table public.hotmart_sales (
  transaction text primary key,
  product_id uuid references public.hotmart_products (id),
  contact_id uuid references public.contacts (id) on delete set null,
  status text not null,              -- APPROVED, COMPLETE, REFUNDED, CANCELED, CHARGEBACK, WAITING_PAYMENT...
  last_event text not null,
  offer_code text,
  coupon_code text,
  price numeric(12, 2),              -- valor pago pelo comprador
  currency text,
  producer_commission numeric(12, 2),-- valor líquido para a produtora
  payment_type text,
  installments int,
  is_order_bump boolean not null default false,
  is_subscription boolean not null default false,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  city text,
  state char(2),
  country text,
  zipcode text,
  geo_source text,                   -- endereco, ddd, nenhum
  src text,
  sck text,
  affiliate_name text,
  order_date timestamptz,
  approved_date timestamptz,
  refunded_at timestamptz,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hotmart_sales_order_date_idx on public.hotmart_sales (order_date desc);
create index hotmart_sales_status_idx on public.hotmart_sales (status);
create index hotmart_sales_state_idx on public.hotmart_sales (state);
create index hotmart_sales_product_idx on public.hotmart_sales (product_id);

-- Registro bruto de tudo o que a Hotmart envia (auditoria e reprocessamento)
create table public.webhook_events (
  id bigint generated always as identity primary key,
  source text not null,
  event text,
  external_id text,
  payload jsonb not null,
  status text not null default 'recebido' check (status in ('recebido', 'processado', 'ignorado', 'erro')),
  error text,
  received_at timestamptz not null default now()
);

create index webhook_events_source_idx on public.webhook_events (source, received_at desc);
create unique index webhook_events_dedupe on public.webhook_events (source, external_id) where external_id is not null;

-- RLS: leitura conforme o perfil; escrita somente pelo servidor (secret key)
alter table public.integrations enable row level security;
alter table public.contacts enable row level security;
alter table public.hotmart_products enable row level security;
alter table public.hotmart_sales enable row level security;
alter table public.webhook_events enable row level security;

create policy "Usuários ativos veem integrações" on public.integrations
  for select to authenticated using (public.current_app_role() is not null);

create policy "Perfis de vendas veem produtos" on public.hotmart_products
  for select to authenticated using (public.current_app_role() is not null);

create policy "Perfis de vendas veem vendas" on public.hotmart_sales
  for select to authenticated
  using (public.has_role(array['admin', 'gestor', 'visualizador']::public.app_role[]));

create policy "Perfis de relacionamento veem contatos" on public.contacts
  for select to authenticated
  using (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]));

create policy "Relacionamento edita contatos" on public.contacts
  for all to authenticated
  using (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]))
  with check (public.has_role(array['admin', 'gestor', 'atendimento']::public.app_role[]));

create policy "Admin vê eventos recebidos" on public.webhook_events
  for select to authenticated using (public.has_role(array['admin']::public.app_role[]));

create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.touch_updated_at();
create trigger hotmart_sales_updated_at before update on public.hotmart_sales
  for each row execute function public.touch_updated_at();
