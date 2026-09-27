// Simula eventos da Hotmart (formato 2.0.0) contra o webhook e confere o resultado no banco.
// Uso: node --env-file=.env.local scripts/test-hotmart-webhook.mjs <url-base> <hottok>
// Todos os dados de teste usam o prefixo TESTE- e são apagados ao final.
const [base = "http://localhost:3000", hottok] = process.argv.slice(2);
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const rest = (path, init = {}) =>
  fetch(`${SUPA}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers },
  });

const t0 = Date.now() - 3 * 86_400_000;
const product = { id: 990001, ucode: "teste-ucode", name: "TESTE Produto de Teste" };

function event(id, name, status, tx, when, extra = {}) {
  return {
    id,
    creation_date: when,
    event: name,
    version: "2.0.0",
    data: {
      product,
      buyer: extra.buyer,
      commissions: [
        { value: extra.price * 0.1, source: "MARKETPLACE", currency_value: "BRL" },
        { value: extra.price * 0.9, source: "PRODUCER", currency_value: "BRL" },
      ],
      purchase: {
        transaction: tx,
        status,
        order_date: t0,
        approved_date: t0 + 1000,
        price: { value: extra.price, currency_value: "BRL" },
        payment: { type: extra.payment ?? "CREDIT_CARD", installments_number: extra.installments ?? 1 },
        offer: { code: "teste" },
        origin: extra.origin ?? {},
      },
    },
  };
}

const buyerSP = {
  name: "TESTE Maria Souza",
  email: "teste-maria@example.com",
  checkout_phone: "12999990000",
  address: { city: "sao jose dos campos", state: "São Paulo", country: "Brasil", country_iso: "BR", zipcode: "12200000" },
};
const buyerSemEndereco = { name: "TESTE Ana Lima", email: "teste-ana@example.com", checkout_phone: "31988887777" };
const buyerRJ = {
  name: "TESTE Carla Dias",
  email: "teste-carla@example.com",
  address: { city: "Niterói", state: "RJ", country: "Brasil", country_iso: "BR" },
};

const cases = [
  ["venda SP com endereço", event("TESTE-e1", "PURCHASE_APPROVED", "APPROVED", "TESTE-HP1", t0 + 2000, { buyer: buyerSP, price: 297, installments: 12, origin: { src: "instagram-bio", sck: "desafio-verao" } }), hottok, 200],
  ["venda sem endereço (DDD 31)", event("TESTE-e2", "PURCHASE_APPROVED", "APPROVED", "TESTE-HP2", t0 + 3000, { buyer: buyerSemEndereco, price: 297, payment: "PIX" }), hottok, 200],
  ["venda RJ ebook", event("TESTE-e3", "PURCHASE_APPROVED", "APPROVED", "TESTE-HP3", t0 + 4000, { buyer: buyerRJ, price: 49.9, origin: { src: "whatsapp-grupo" } }), hottok, 200],
  ["reembolso da venda 1", event("TESTE-e4", "PURCHASE_REFUNDED", "REFUNDED", "TESTE-HP1", t0 + 86_400_000, { buyer: buyerSP, price: 297 }), hottok, 200],
  ["evento antigo fora de ordem", event("TESTE-e5", "PURCHASE_APPROVED", "APPROVED", "TESTE-HP1", t0 + 2500, { buyer: buyerSP, price: 297 }), hottok, 200],
  ["reenvio duplicado", event("TESTE-e3", "PURCHASE_APPROVED", "APPROVED", "TESTE-HP3", t0 + 4000, { buyer: buyerRJ, price: 49.9 }), hottok, 200],
  ["hottok inválido", event("TESTE-e6", "PURCHASE_APPROVED", "APPROVED", "TESTE-HP9", t0, { buyer: buyerRJ, price: 1 }), "errado", 401],
];

// Guarda o status da integração para restaurar depois (o teste marca como conectado)
const [integrationBefore] = await (await rest("integrations?key=eq.hotmart&select=status,last_event_at")).json();

let failures = 0;
for (const [name, body, token, expected] of cases) {
  const res = await fetch(`${base}/api/webhooks/hotmart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-HOTMART-HOTTOK": token },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const ok = res.status === expected;
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FALHA"} ${name}: ${res.status} ${text}`);
}

const send = (body, token = hottok) =>
  fetch(`${base}/api/webhooks/hotmart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-HOTMART-HOTTOK": token },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, json: await r.json() }));

// Vários eventos ao mesmo tempo de um produto que ainda não existe (como no "Enviar teste" da Hotmart)
const newProduct = { id: 990002, ucode: "teste-ucode-2", name: "TESTE Produto Simultâneo" };
const parallel = await Promise.all(
  [1, 2, 3, 4, 5].map((n) => {
    const body = event(`TESTE-p${n}`, "PURCHASE_APPROVED", "APPROVED", `TESTE-HPP${n}`, t0 + n, { buyer: buyerRJ, price: 10 });
    body.data.product = newProduct;
    return send(body);
  }),
);
const parallelOk = parallel.every((r) => r.status === 200 && r.json.status === "processado");
console.log(`${parallelOk ? "OK  " : "FALHA"} 5 eventos simultâneos de produto novo: ${parallel.map((r) => r.json.status ?? r.json.error).join(", ")}`);
if (!parallelOk) failures++;

// Evento de teste da Hotmart: confirma a conexão, mas não grava venda
const hotmartTest = event("TESTE-oficial", "PURCHASE_APPROVED", "APPROVED", "HP16015479281022", t0, { buyer: buyerRJ, price: 1500 });
hotmartTest.data.product = { id: 0, ucode: "fb056612", name: "Produto test postback2" };
const testRes = await send(hotmartTest);
const [testSale] = await (await rest("hotmart_sales?transaction=eq.HP16015479281022&select=transaction")).json();
const testOk = testRes.json.status === "ignorado" && !testSale;
console.log(`${testOk ? "OK  " : "FALHA"} evento de teste da Hotmart ignorado (${testRes.json.reason})`);
if (!testOk) failures++;

const sales = await (
  await rest("hotmart_sales?transaction=like.TESTE-HP_&select=transaction,status,state,city,geo_source,src,sck,refunded_at,producer_commission&order=transaction")
).json();
console.table(sales);

const expect = (cond, msg) => {
  console.log(`${cond ? "OK  " : "FALHA"} ${msg}`);
  if (!cond) failures++;
};
const by = Object.fromEntries(sales.map((s) => [s.transaction, s]));
expect(by["TESTE-HP1"]?.status === "REFUNDED" && by["TESTE-HP1"]?.refunded_at, "HP1 ficou reembolsada (evento antigo não sobrescreveu)");
expect(by["TESTE-HP1"]?.src === "instagram-bio" && by["TESTE-HP1"]?.sck === "desafio-verao", "HP1: origem mantida após o reembolso");
expect(by["TESTE-HP1"]?.state === "SP" && by["TESTE-HP1"]?.city === "Sao Jose dos Campos", "HP1: estado SP pelo nome completo, cidade formatada");
expect(by["TESTE-HP2"]?.state === "MG" && by["TESTE-HP2"]?.geo_source === "ddd", "HP2: estado MG pelo DDD 31");
expect(by["TESTE-HP3"]?.state === "RJ" && by["TESTE-HP3"]?.src === "whatsapp-grupo", "HP3: RJ e origem whatsapp-grupo");
expect(!by["TESTE-HP9"], "hottok inválido não gravou nada");

const contacts = await (await rest("contacts?email=like.teste-*&select=email,phone,state,tags")).json();
expect(contacts.length === 3, `3 contatos criados (${contacts.length})`);

// Limpeza
await rest("hotmart_sales?transaction=like.TESTE-*", { method: "DELETE" });
await rest("contacts?email=like.teste-*", { method: "DELETE" });
await rest("webhook_events?external_id=like.TESTE-*", { method: "DELETE" });
await rest(`hotmart_products?hotmart_id=in.(${product.id},${newProduct.id})`, { method: "DELETE" });
await rest("integrations?key=eq.hotmart", { method: "PATCH", body: JSON.stringify(integrationBefore) });
console.log(failures ? `\n${failures} falha(s)` : "\nTodos os testes passaram. Dados de teste removidos.");
process.exit(failures ? 1 : 0);
