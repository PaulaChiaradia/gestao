import "server-only";

// Cliente mínimo da API da Hotmart (credencial "API Hotmart" de produção)
const TOKEN_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";
export const API = "https://developers.hotmart.com";

let cached: { token: string; expiresAt: number } | null = null;

export async function hotmartToken() {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const { HOTMART_CLIENT_ID: id, HOTMART_CLIENT_SECRET: secret, HOTMART_BASIC: basic } = process.env;
  if (!id || !secret || !basic) throw new Error("Credenciais da Hotmart não configuradas");

  const res = await fetch(`${TOKEN_URL}?grant_type=client_credentials&client_id=${id}&client_secret=${secret}`, {
    method: "POST",
    headers: { Authorization: basic.startsWith("Basic ") ? basic : `Basic ${basic}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Hotmart: falha ao obter token (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

type Page<T> = { items?: T[]; page_info?: { next_page_token?: string; total_results?: number } };

/** Percorre todas as páginas de um endpoint de listagem (500 itens por página, o máximo aceito). */
export async function hotmartList<T>(path: string, params: Record<string, string | number | string[]>): Promise<T[]> {
  const token = await hotmartToken();
  const out: T[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams();
    q.set("max_results", "500");
    for (const [k, v] of Object.entries(params)) {
      for (const item of Array.isArray(v) ? v : [v]) q.append(k, String(item));
    }
    if (pageToken) q.set("page_token", pageToken);

    let res: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(`${API}${path}?${q}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt)); // limite de requisições: espera e tenta de novo
    }
    if (!res!.ok) throw new Error(`Hotmart ${path}: HTTP ${res!.status} ${await res!.text()}`);
    const page = (await res!.json()) as Page<T>;
    out.push(...(page.items ?? []));
    pageToken = page.page_info?.next_page_token;
  } while (pageToken);
  return out;
}
