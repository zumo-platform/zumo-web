/**
 * Short labels for product / order line units (shown beside qty steppers).
 * Keys are normalized: lowercase, no accents.
 */
const UNIT_ABBREVIATIONS: Readonly<Record<string, string>> = {
  // Weight
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogramo: "kg",
  kilogramos: "kg",
  g: "g",
  gr: "g",
  gramo: "g",
  gramos: "g",
  lb: "lb",
  lbs: "lb",
  libra: "lb",
  libras: "lb",
  ton: "t",
  tonelada: "t",
  toneladas: "t",

  // Volume
  l: "L",
  lt: "L",
  litro: "L",
  litros: "L",
  ml: "ml",
  mililitro: "ml",
  mililitros: "ml",
  cc: "ml",

  // Count / packaging
  unidad: "u",
  unidades: "u",
  unit: "u",
  units: "u",
  und: "u",
  u: "u",
  pieza: "u",
  piezas: "u",
  pza: "u",
  pzas: "u",

  caja: "Caja",
  cajas: "Caja",
  box: "Caja",
  boxes: "Caja",
  cx: "Caja",

  paquete: "Pqt",
  paquetes: "Pqt",
  pack: "Pqt",
  packs: "Pqt",
  pkg: "Pqt",
  pq: "Pqt",

  bolsa: "Bol",
  bolsas: "Bol",
  bag: "Bol",
  bags: "Bol",

  saco: "Saco",
  sacos: "Saco",
  sack: "Saco",
  sacks: "Saco",

  bandeja: "Bde",
  bandejas: "Bde",
  tray: "Bde",
  trays: "Bde",

  botella: "Bot",
  botellas: "Bot",
  bottle: "Bot",
  bottles: "Bot",

  garrafa: "Grf",
  garrafas: "Grf",

  tetra: "Tetra",
  tetrapack: "Tetra",

  docena: "doc",
  docenas: "doc",
  dozen: "doc",

  fardo: "Fdo",
  fardos: "Fdo",
  bundle: "Fdo",
  bundles: "Fdo",

  rollo: "Rll",
  rollos: "Rll",
  roll: "Rll",
  rolls: "Rll",

  galon: "Gal",
  galones: "Gal",
  gallon: "Gal",
  gallons: "Gal",
  gal: "Gal",
};

function normalizeUnitKey(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\./g, "");
}

/** Display abbreviation for a catalog or order line unit (e.g. `kg`, `L`, `Caja`). */
export function formatUnitAbbreviation(unit: string | null | undefined): string {
  const trimmed = unit?.trim();
  if (!trimmed) return "u";

  const key = normalizeUnitKey(trimmed);
  const mapped = UNIT_ABBREVIATIONS[key];
  if (mapped) return mapped;

  // Already short — keep supplier casing (kg, ml, L, etc.)
  if (trimmed.length <= 5) return trimmed;

  // Long unknown label: first word, max 4 chars, capitalize
  const first = trimmed.split(/\s+/u)[0] ?? trimmed;
  const slice = first.slice(0, 4);
  return slice.charAt(0).toUpperCase() + slice.slice(1).toLowerCase();
}
