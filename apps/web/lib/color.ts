// Refs: utilitaires de conversion couleur — HEX / RGB / HSL / alpha
// Aucune dépendance externe, pur calcul.

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface RGBA extends RGB { a: number }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ── HEX ↔ RGBA ────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string): RGBA {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 6) h += "ff";
  if (h.length !== 8) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: parseInt(h.slice(6, 8), 16) / 255,
  };
}

export function rgbaToHex({ r, g, b, a }: RGBA, withAlpha = false): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (withAlpha && a < 1) return `${base}${toHex(a * 255)}`;
  return base;
}

// ── RGB ↔ HSL ─────────────────────────────────────────────────────────────────

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn)      h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else                 h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn = 0, gn = 0, bn = 0;
  if      (h < 60)  { rn = c; gn = x; bn = 0; }
  else if (h < 120) { rn = x; gn = c; bn = 0; }
  else if (h < 180) { rn = 0; gn = c; bn = x; }
  else if (h < 240) { rn = 0; gn = x; bn = c; }
  else if (h < 300) { rn = x; gn = 0; bn = c; }
  else              { rn = c; gn = 0; bn = x; }
  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function isValidHex(hex: string): boolean {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const rgba = hexToRgba(hex);
  return rgbaToHex(rgba, rgba.a < 1);
}

// ── Suggestions harmonieuses ──────────────────────────────────────────────────

export function harmonies(hex: string): { label: string; color: string }[] {
  const { r, g, b, a } = hexToRgba(hex);
  const hsl = rgbToHsl({ r, g, b });
  const make = (h: number) => rgbaToHex({ ...hslToRgb({ ...hsl, h: (h + 360) % 360 }), a });
  return [
    { label: "Complémentaire",  color: make(hsl.h + 180) },
    { label: "Analogue −30°",   color: make(hsl.h - 30) },
    { label: "Analogue +30°",   color: make(hsl.h + 30) },
    { label: "Triade +120°",    color: make(hsl.h + 120) },
    { label: "Triade −120°",    color: make(hsl.h - 120) },
  ];
}

// ── Contraste (accessibilité — choix texte clair/sombre sur un fond) ─────────

export function readableTextColor(bgHex: string): "#ffffff" | "#153243" {
  const { r, g, b } = hexToRgba(bgHex);
  // Luminance relative WCAG
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? "#153243" : "#ffffff";
}
