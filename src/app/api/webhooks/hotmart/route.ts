import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processHotmartEvent, type HotmartWebhook } from "@/lib/hotmart/webhook";

function validHottok(received: string | null) {
  const expected = process.env.HOTMART_HOTTOK;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Endereço cadastrado na Hotmart (Ferramentas → Webhook), versão 2.0.0
export async function POST(request: NextRequest) {
  let payload: HotmartWebhook;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const hottok = request.headers.get("x-hotmart-hottok") ?? payload.hottok ?? null;
  if (!validHottok(hottok)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const db = createAdminClient();
  // O hottok é um segredo: não fica gravado no banco
  const stored: HotmartWebhook = { ...payload };
  delete stored.hottok;

  const { data: logged, error: logError } = await db
    .from("webhook_events")
    .insert({ source: "hotmart", event: payload.event ?? null, external_id: payload.id ?? null, payload: stored })
    .select("id")
    .single();

  // Mesmo id já recebido: a Hotmart está reenviando, então só confirma
  if (logError?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (logError) return NextResponse.json({ error: "Falha ao registrar evento" }, { status: 500 });

  try {
    const result = await processHotmartEvent(db, stored);
    await db.from("webhook_events").update({ status: result.status, error: result.reason ?? null }).eq("id", logged.id);
    await db
      .from("integrations")
      .update({ status: "conectado", last_event_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("key", "hotmart");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("webhook_events").update({ status: "erro", error: message }).eq("id", logged.id);
    // 500 faz a Hotmart tentar de novo mais tarde
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }
}
