-- Mais detalhes de cada venda Hotmart, para análise e para a ficha da venda
alter table public.hotmart_sales
  add column payment_method text,            -- ex.: CREDIT_CARD_VISA, PIX, BILLET, NUPAY
  add column offer_payment_mode text,        -- UNIQUE_PAYMENT, PAY_IN_FULL, SUBSCRIPTION…
  add column recurrency_number int,          -- nº da cobrança em assinaturas
  add column warranty_expire_date timestamptz,
  add column buyer_ucode text,               -- identificador único do comprador na Hotmart
  add column buyer_locale text,              -- idioma do comprador (PT_BR, ES, EN…)
  add column external_code text,             -- xcod da origem
  add column conversion_rate numeric(14, 6), -- moeda da compra → real
  add column total_paid_brl numeric(12, 2),  -- total pago pelo comprador (com juros), em reais
  add column installment_fee_brl numeric(12, 2), -- juros/taxa de parcelamento pagos pelo comprador
  add column hotmart_fee_brl numeric(12, 2), -- taxa da Hotmart, em reais
  add column hotmart_fee_percentage numeric(6, 2),
  add column commissions jsonb;              -- divisão do valor: [{source, name, value_brl}]

create index hotmart_sales_buyer_email_idx on public.hotmart_sales (buyer_email);
create index hotmart_sales_payment_method_idx on public.hotmart_sales (payment_method);
