export const UF_NAMES = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
} as const;

export type UF = keyof typeof UF_NAMES;

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const NAME_TO_UF = new Map<string, UF>(
  Object.entries(UF_NAMES).map(([uf, name]) => [strip(name), uf as UF]),
);

/** Aceita "SP", "sp", "São Paulo", "Sao Paulo" → "SP". */
export function normalizeUF(value: string | null | undefined): UF | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper in UF_NAMES) return upper as UF;
  return NAME_TO_UF.get(strip(value)) ?? null;
}

const DDD_TO_UF: Record<string, UF> = {};
const DDD_RANGES: [UF, number[]][] = [
  ["SP", [11, 12, 13, 14, 15, 16, 17, 18, 19]],
  ["RJ", [21, 22, 24]],
  ["ES", [27, 28]],
  ["MG", [31, 32, 33, 34, 35, 37, 38]],
  ["PR", [41, 42, 43, 44, 45, 46]],
  ["SC", [47, 48, 49]],
  ["RS", [51, 53, 54, 55]],
  ["DF", [61]],
  ["GO", [62, 64]],
  ["TO", [63]],
  ["MT", [65, 66]],
  ["MS", [67]],
  ["AC", [68]],
  ["RO", [69]],
  ["BA", [71, 73, 74, 75, 77]],
  ["SE", [79]],
  ["PE", [81, 87]],
  ["AL", [82]],
  ["PB", [83]],
  ["RN", [84]],
  ["CE", [85, 88]],
  ["PI", [86, 89]],
  ["PA", [91, 93, 94]],
  ["AM", [92, 97]],
  ["RR", [95]],
  ["AP", [96]],
  ["MA", [98, 99]],
];
for (const [uf, ddds] of DDD_RANGES) for (const d of ddds) DDD_TO_UF[String(d)] = uf;

/** Normaliza telefone brasileiro para dígitos com DDI 55. Outros países ficam só com dígitos. */
export function normalizePhone(value: string | null | undefined, countryIso?: string | null): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const isBR = !countryIso || countryIso.toUpperCase() === "BR";
  if (isBR && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  return digits;
}

/** UF a partir do DDD de um telefone brasileiro já normalizado (55 + DDD + número). */
export function ufFromPhone(phone: string | null): UF | null {
  if (!phone || !phone.startsWith("55") || phone.length < 12) return null;
  return DDD_TO_UF[phone.slice(2, 4)] ?? null;
}

/**
 * Posição de cada UF numa grade (coluna, linha) que lembra o mapa do Brasil.
 * Grade de quadrados iguais: nenhum estado "pesa" mais pela área.
 */
export const UF_TILES: Record<UF, [number, number]> = {
  RR: [1, 0],
  AP: [3, 0],
  AC: [0, 1],
  AM: [1, 1],
  PA: [2, 1],
  MA: [3, 1],
  CE: [4, 1],
  RN: [5, 1],
  RO: [1, 2],
  MT: [2, 2],
  TO: [3, 2],
  PI: [4, 2],
  PB: [5, 2],
  MS: [1, 3],
  GO: [2, 3],
  DF: [3, 3],
  BA: [4, 3],
  PE: [5, 3],
  SP: [2, 4],
  MG: [3, 4],
  ES: [4, 4],
  AL: [5, 4],
  PR: [2, 5],
  RJ: [3, 5],
  SE: [5, 5],
  SC: [2, 6],
  RS: [2, 7],
};
