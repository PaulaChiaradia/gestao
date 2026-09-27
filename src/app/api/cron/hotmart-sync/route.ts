import { NextResponse, type NextRequest } from "next/server";
import { syncRecent } from "@/lib/hotmart/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Chamado pelo agendamento do Vercel (vercel.json → crons), que envia "Authorization: Bearer <CRON_SECRET>"
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const stats = await syncRecent(createAdminClient());
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    const db = createAdminClient();
    await db.from("integrations").update({ status: "erro", updated_at: new Date().toISOString() }).eq("key", "hotmart");
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
