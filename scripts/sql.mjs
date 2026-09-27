// Executa SQL no banco pela Management API. Uso: node --env-file=.env.local scripts/sql.mjs "select 1"
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: process.argv[2] }),
});
console.log(res.status, JSON.stringify(await res.json(), null, 1));
