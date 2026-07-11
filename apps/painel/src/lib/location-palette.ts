export const LOCATION_PALETTE = [
  { id: "sage",     label: "Sálvia",  hex: "#61D836" },
  { id: "lima",     label: "Lima",    hex: "#D7FF5B" },
  { id: "sky",      label: "Céu",     hex: "#7ECEF4" },
  { id: "coral",    label: "Coral",   hex: "#F08080" },
  { id: "amber",    label: "Âmbar",   hex: "#F5C842" },
  { id: "lavender", label: "Lavanda", hex: "#B0A4E3" },
  { id: "peach",    label: "Pêssego", hex: "#F4A460" },
  { id: "mint",     label: "Menta",   hex: "#80CBC4" },
  { id: "rose",     label: "Rosa",    hex: "#F48FB1" },
  { id: "slate",    label: "Ardósia", hex: "#90A4AE" },
] as const;

// Cores de locais são texto livre no banco (dado antigo pode ser #ff0000 puro,
// que fica horrível nos badges). Normaliza qualquer cor pra mais próxima da
// paleta curada, por distância RGB. Inválida/vazia cai na primeira (sálvia).
export function normalizeLocationColor(color: string | null | undefined): string {
  if (!color) return LOCATION_PALETTE[0].hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return LOCATION_PALETTE[0].hex;
  const hex = m[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  let best: string = LOCATION_PALETTE[0].hex;
  let bestDist = Infinity;
  for (const p of LOCATION_PALETTE) {
    const pr = parseInt(p.hex.slice(1, 3), 16);
    const pg = parseInt(p.hex.slice(3, 5), 16);
    const pb = parseInt(p.hex.slice(5, 7), 16);
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) { bestDist = dist; best = p.hex; }
  }
  return best;
}
