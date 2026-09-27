// Aplica uma migração no Supabase pela Management API.
// Uso: node --env-file=.env.local scripts/apply-migration.mjs supabase/migrations/<arquivo>.sql
import { readFileSync, renameSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const file = process.argv[2];
if (!file) throw new Error("Informe o arquivo .sql");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const name = basename(file, ".sql").replace(/^\d+_/, "");
const api = `https://api.supabase.com/v1/projects/${ref}/database/migrations`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const res = await fetch(api, {
  method: "POST",
  headers,
  body: JSON.stringify({ name, query: readFileSync(file, "utf8") }),
});

console.log(res.status, await res.text());
if (!res.ok) process.exit(1);

// Renomeia o arquivo local para a versão registrada no Supabase (mantém o histórico alinhado)
const list = await fetch(api, { headers }).then((r) => r.json());
const applied = list.filter((m) => m.name === name).at(-1);
if (applied) {
  const target = join(dirname(file), `${applied.version}_${name}.sql`);
  if (target !== file) renameSync(file, target);
  console.log("arquivo:", target);
}
