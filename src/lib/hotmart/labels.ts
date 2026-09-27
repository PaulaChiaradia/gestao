// Nomes em português dos códigos da Hotmart (usados na lista e na ficha da venda)

export const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovada",
  COMPLETE: "Concluída",
  REFUNDED: "Reembolsada",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  CHARGEBACK: "Chargeback",
  CANCELED: "Cancelada",
  CANCELLED: "Cancelada",
  OVERDUE: "Vencida",
  PRINTED_BILLET: "Boleto gerado",
  BILLET_PRINTED: "Boleto gerado",
  STARTED: "Iniciada",
  UNDER_ANALISYS: "Em análise",
  NO_FUNDS: "Sem saldo",
  BLOCKED: "Bloqueada",
  WAITING_PAYMENT: "Aguardando pagamento",
  EXPIRED: "Expirada",
  DELAYED: "Atrasada",
  PROTESTED: "Em disputa",
  PRE_ORDER: "Pré-venda",
};

export const PAID = ["APPROVED", "COMPLETE"];
export const REFUNDED = ["REFUNDED", "PARTIALLY_REFUNDED", "CHARGEBACK"];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  PIX: "Pix",
  BILLET: "Boleto",
  CREDIT_CARD_VISA: "Cartão Visa",
  CREDIT_CARD_MASTERCARD: "Cartão Mastercard",
  CREDIT_CARD_ELO: "Cartão Elo",
  CREDIT_CARD_AMERICAN_EXPRESS: "Cartão American Express",
  CREDIT_CARD_HIPERCARD: "Cartão Hipercard",
  CREDIT_CARD_DINERS: "Cartão Diners",
  UNKNOWN_CREDIT_CARD: "Cartão de crédito",
  CREDIT_CARD: "Cartão de crédito",
  PAYPAL: "PayPal",
  NUPAY: "NuPay",
  HOTMART: "Saldo Hotmart",
  WALLET: "Saldo Hotmart",
  GOOGLE_PAY: "Google Pay",
  APPLE_PAY: "Apple Pay",
  MULTIBANCO: "Multibanco (Portugal)",
  CASH_PAYMENT: "Pagamento em espécie (exterior)",
};

export const PAYMENT_MODE_LABEL: Record<string, string> = {
  UNIQUE_PAYMENT: "Pagamento único",
  PAY_IN_FULL: "Pagamento integral",
  SUBSCRIPTION: "Assinatura",
  INSTALLMENT: "Parcelamento Hotmart",
};

export const COMMISSION_SOURCE_LABEL: Record<string, string> = {
  PRODUCER: "Sua parte (produtora)",
  COPRODUCER: "Coprodução",
  AFFILIATE: "Afiliado",
  ADDON: "Adicional (ADDON)",
};

export const LOCALE_LABEL: Record<string, string> = {
  PT_BR: "Português (Brasil)",
  PT: "Português",
  PT_PT: "Português (Portugal)",
  ES: "Espanhol",
  EN: "Inglês",
};

export const label = (map: Record<string, string>, code: string | null | undefined) =>
  code ? (map[code] ?? code) : "—";
