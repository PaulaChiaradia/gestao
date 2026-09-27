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

/** Região principal de cada DDD, para agrupar vendas quando o comprador não informa a cidade. */
export const DDD_REGION: Record<string, string> = {
  "11": "São Paulo e Grande SP", "12": "Vale do Paraíba e Litoral Norte (SP)", "13": "Baixada Santista (SP)",
  "14": "Bauru e Marília (SP)", "15": "Sorocaba (SP)", "16": "Ribeirão Preto e Franca (SP)",
  "17": "São José do Rio Preto (SP)", "18": "Presidente Prudente e Araçatuba (SP)", "19": "Campinas e Piracicaba (SP)",
  "21": "Rio de Janeiro e Grande Rio", "22": "Campos e Região dos Lagos (RJ)", "24": "Petrópolis e Sul Fluminense (RJ)",
  "27": "Vitória e Grande Vitória (ES)", "28": "Sul do Espírito Santo",
  "31": "Belo Horizonte e região (MG)", "32": "Juiz de Fora (MG)", "33": "Governador Valadares (MG)",
  "34": "Uberlândia e Triângulo (MG)", "35": "Sul de Minas (MG)", "37": "Divinópolis (MG)", "38": "Montes Claros e Norte de MG",
  "41": "Curitiba e região (PR)", "42": "Ponta Grossa (PR)", "43": "Londrina (PR)", "44": "Maringá (PR)",
  "45": "Cascavel e Foz do Iguaçu (PR)", "46": "Sudoeste do Paraná",
  "47": "Joinville, Blumenau e Itajaí (SC)", "48": "Florianópolis e Sul de SC", "49": "Oeste de Santa Catarina",
  "51": "Porto Alegre e região (RS)", "53": "Pelotas (RS)", "54": "Caxias do Sul e Serra (RS)", "55": "Santa Maria e Oeste do RS",
  "61": "Brasília (DF)", "62": "Goiânia e região (GO)", "63": "Tocantins", "64": "Sul de Goiás",
  "65": "Cuiabá (MT)", "66": "Interior de Mato Grosso", "67": "Mato Grosso do Sul", "68": "Acre", "69": "Rondônia",
  "71": "Salvador e região (BA)", "73": "Sul da Bahia", "74": "Norte da Bahia", "75": "Feira de Santana (BA)", "77": "Oeste da Bahia",
  "79": "Sergipe", "81": "Recife e região (PE)", "82": "Alagoas", "83": "Paraíba", "84": "Rio Grande do Norte",
  "85": "Fortaleza e região (CE)", "86": "Teresina (PI)", "87": "Sertão de Pernambuco", "88": "Interior do Ceará",
  "89": "Interior do Piauí", "91": "Belém e região (PA)", "92": "Manaus (AM)", "93": "Oeste do Pará", "94": "Sudeste do Pará",
  "95": "Roraima", "96": "Amapá", "97": "Interior do Amazonas", "98": "São Luís (MA)", "99": "Interior do Maranhão",
};

export function dddOf(phone: string | null) {
  return phone && phone.startsWith("55") && phone.length >= 12 ? phone.slice(2, 4) : null;
}

/** Coordenadas (lat, lng) da cidade principal de cada DDD — posição aproximada da região no mapa. */
export const DDD_COORDS: Record<string, [number, number]> = {
  "11": [-23.55, -46.63], "12": [-23.18, -45.88], "13": [-23.96, -46.33], "14": [-22.31, -49.06], "15": [-23.5, -47.46],
  "16": [-21.18, -47.81], "17": [-20.82, -49.38], "18": [-22.12, -51.39], "19": [-22.91, -47.06],
  "21": [-22.91, -43.17], "22": [-21.75, -41.32], "24": [-22.51, -43.18], "27": [-20.32, -40.34], "28": [-20.85, -41.11],
  "31": [-19.92, -43.94], "32": [-21.76, -43.35], "33": [-18.85, -41.95], "34": [-18.92, -48.28], "35": [-21.55, -45.43],
  "37": [-20.14, -44.89], "38": [-16.73, -43.86],
  "41": [-25.43, -49.27], "42": [-25.09, -50.16], "43": [-23.31, -51.16], "44": [-23.42, -51.94], "45": [-24.96, -53.46],
  "46": [-26.23, -52.67], "47": [-26.3, -48.85], "48": [-27.6, -48.55], "49": [-27.1, -52.62],
  "51": [-30.03, -51.23], "53": [-31.77, -52.34], "54": [-29.17, -51.18], "55": [-29.69, -53.81],
  "61": [-15.79, -47.88], "62": [-16.69, -49.26], "63": [-10.18, -48.33], "64": [-17.8, -50.93], "65": [-15.6, -56.1],
  "66": [-16.47, -54.64], "67": [-20.47, -54.62], "68": [-9.97, -67.81], "69": [-8.76, -63.9],
  "71": [-12.97, -38.51], "73": [-14.79, -39.05], "74": [-9.41, -40.5], "75": [-12.27, -38.97], "77": [-12.15, -45.0],
  "79": [-10.91, -37.07], "81": [-8.05, -34.88], "82": [-9.67, -35.74], "83": [-7.12, -34.86], "84": [-5.79, -35.21],
  "85": [-3.73, -38.53], "86": [-5.09, -42.8], "87": [-9.39, -40.5], "88": [-7.21, -39.32], "89": [-7.08, -41.47],
  "91": [-1.46, -48.49], "92": [-3.12, -60.02], "93": [-2.44, -54.71], "94": [-5.37, -49.12], "95": [2.82, -60.67],
  "96": [0.03, -51.07], "97": [-3.35, -64.71], "98": [-2.53, -44.3], "99": [-5.52, -47.47],
};
