/** Lê CSV exportado do Excel/Google Planilhas (separador ; ou , e campos entre aspas). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "nome completo", "cliente"],
  email: ["email", "e-mail", "e mail"],
  phone: ["telefone", "celular", "whatsapp", "phone", "fone"],
  city: ["cidade", "city", "municipio", "município"],
  state: ["estado", "uf", "state"],
  instagram_username: ["instagram", "@", "usuario instagram", "perfil"],
  tags: ["tags", "etiquetas", "etiqueta", "grupo"],
  notes: ["observacoes", "observações", "obs", "notas", "notes"],
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Converte as linhas em objetos usando o cabeçalho, reconhecendo nomes comuns de coluna em português. */
export function rowsToContacts(rows: string[][]) {
  const [header, ...data] = rows;
  if (!header) return { records: [], mapped: [] as string[] };
  const index: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.map(norm).includes(norm(h)))?.[0];
    if (key && !(key in index)) index[key] = i;
  });
  const records = data.map((r) => Object.fromEntries(Object.entries(index).map(([k, i]) => [k, (r[i] ?? "").trim()])));
  return { records, mapped: Object.keys(index) };
}
