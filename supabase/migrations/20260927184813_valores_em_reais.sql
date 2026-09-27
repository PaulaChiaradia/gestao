-- Valores normalizados em reais para os painéis
-- gross_brl: preço da oferta (sem juros do parcelamento), convertido para reais
-- commission_brl: parte da conta (produtora) na venda, em reais
alter table public.hotmart_sales
  add column gross_brl numeric(12, 2),
  add column commission_brl numeric(12, 2);

comment on column public.hotmart_sales.price is 'Valor pago pelo comprador, na moeda da compra (inclui juros do parcelamento)';
comment on column public.hotmart_sales.gross_brl is 'Valor da venda em reais, sem juros (preço base da oferta ÷ taxa de conversão)';
comment on column public.hotmart_sales.commission_brl is 'Comissão da conta em reais';
