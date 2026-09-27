// Importa o histórico da Hotmart para o banco.
// Uso: npx tsx --conditions=react-server --env-file=.env.local scripts/import-hotmart.mts [anos=10]
import { importHistory } from "@/lib/hotmart/import";
import { createAdminClient } from "@/lib/supabase/admin";

const years = Number(process.argv[2] ?? 10);
const started = Date.now();
const result = await importHistory(createAdminClient(), years, (msg) => console.log(msg));
console.log(`\n${result.total} vendas importadas, ${result.contacts} contatos novos, em ${Math.round((Date.now() - started) / 1000)}s`);
