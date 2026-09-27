// Aplica uma migração no Supabase pela Management API.
// Uso: node --env-file=.env.local scripts/apply-migration.mjs supabase/migrations/<arquivo>.sql
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
if (!file) throw new Error("Informe o arquivo .sql");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const name = basename(file, ".sql").replace(/^\d+_/, "");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/migrations`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name, query: readFileSync(file, "utf8") }),
});

console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
