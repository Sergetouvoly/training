"use client";
// Refs: color picker avancé — palette Holenek, roue HSL, HEX/RGB/HSL, opacité,
// récents, favoris, pipette, harmonies. Composant autonome et réutilisable.
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  hexToRgba, rgbaToHex, rgbToHsl, hslToRgb, isValidHex, normalizeHex,
  harmonies, readableTextColor, type HSL,
} from "../lib/color";
import { useColorHistory } from "../lib/useColorHistory";

// ── Palettes prédéfinies Holenek ──────────────────────────────────────────────

const HOLENEK_PALETTE: { label: string; colors: string[] }[] = [
  {
    label: "Marque",
    colors: ["#1a6c7a", "#153243", "#000f2b", "#BFD1FF", "#f3f9fb", "#87A8B9"],
  },
  {
    label: "Neutres",
    colors: ["#ffffff", "#f3f9fb", "#dddddd", "#87A8B9", "#595959", "#3a3a3a"],
  },
  {
    label: "Sémantiques",
    colors: ["#16a34a", "#d97706", "#dc2626", "#2563eb", "#7c3aed", "#0f172a"],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ColorPickerProps {
  /** Couleur courante (HEX, avec ou sans alpha) */
  readonly value: string;
  /** Appelé à chaque changement validé */
  readonly onChange: (hex: string) => void;
  /** Appelé en survol pour aperçu temps réel (optionnel) */
  readonly onPreview?: (hex: string | null) => void;
  /** Affiche le slider d'opacité */
  readonly allowAlpha?: boolean;
  /** Bouton "aucune couleur" (transparent / reset) */
  readonly allowNone?: boolean;
  readonly onNone?: () => void;
}

// ── Eyedropper API (Chrome/Edge uniquement) ──────────────────────────────────

interface EyeDropperResult { sRGBHex: string }
interface EyeDropperCtor { new (): { open: () => Promise<EyeDropperResult> } }
function getEyeDropper(): EyeDropperCtor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function ColorPicker({
  value, onChange, onPreview, allowAlpha = true, allowNone = false, onNone,
}: ColorPickerProps) {
  const { recent, favorites, pushRecent, toggleFavorite, isFavorite } = useColorHistory();

  // État interne en HSL + alpha pour la roue
  const rgba = useMemo(() => hexToRgba(value || "#1a6c7a"), [value]);
  const [hsl, setHsl] = useState<HSL>(() => rgbToHsl(rgba));
  const [alpha, setAlpha] = useState(rgba.a);
  const [hexInput, setHexInput] = useState(() => rgbaToHex(rgba, rgba.a < 1));
  const [tab, setTab] = useState<"palette" | "custom">("palette");
  const [eyedropperOk] = useState(() => getEyeDropper() !== null);

  // Resync si la prop value change de l'extérieur
  useEffect(() => {
    const r = hexToRgba(value || "#1a6c7a");
    setHsl(rgbToHsl(r));
    setAlpha(r.a);
    setHexInput(rgbaToHex(r, r.a < 1));
  }, [value]);

  const currentHex = useMemo(() => {
    const rgb = hslToRgb(hsl);
    return rgbaToHex({ ...rgb, a: alpha }, alpha < 1);
  }, [hsl, alpha]);

  // Émet le changement final
  const commit = useCallback((hex: string) => {
    const normalized = normalizeHex(hex);
    onChange(normalized);
    pushRecent(normalized);
  }, [onChange, pushRecent]);

  // ── Saturation/Luminosité — zone 2D ─────────────────────────────────────────
  const slRef = useRef<HTMLDivElement>(null);
  const draggingSL = useRef(false);

  const updateSL = useCallback((clientX: number, clientY: number) => {
    const el = slRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    // x = saturation, y = luminosité inversée
    setHsl((prev) => ({ ...prev, s: Math.round(x * 100), l: Math.round((1 - y) * 100) }));
  }, []);

  const onSLDown = useCallback((e: React.MouseEvent) => {
    draggingSL.current = true;
    updateSL(e.clientX, e.clientY);
    function move(ev: MouseEvent) { if (draggingSL.current) updateSL(ev.clientX, ev.clientY); }
    function up() {
      draggingSL.current = false;
      globalThis.removeEventListener("mousemove", move);
      globalThis.removeEventListener("mouseup", up);
    }
    globalThis.addEventListener("mousemove", move);
    globalThis.addEventListener("mouseup", up);
  }, [updateSL]);

  // ── Pipette ──────────────────────────────────────────────────────────────────
  async function pickWithEyedropper() {
    const Ctor = getEyeDropper();
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      commit(result.sRGBHex);
    } catch { /* annulé par l'utilisateur */ }
  }

  // ── Inputs HEX / RGB / HSL ──────────────────────────────────────────────────
  function applyHexInput() {
    if (isValidHex(hexInput)) commit(hexInput);
  }

  const rgb = hslToRgb(hsl);

  // Position du curseur dans la zone SL
  const slCursor = { left: `${hsl.s}%`, top: `${100 - hsl.l}%` };

  const harmoniesList = useMemo(() => harmonies(currentHex), [currentHex]);

  return (
    <div className="w-72 select-none rounded-xl border border-surface-warm bg-white shadow-xl overflow-hidden">

      {/* Onglets */}
      <div className="flex border-b border-surface-warm">
        {(["palette", "custom"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setTab(t); }}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-ink-soft hover:text-ink"
            }`}
          >
            {t === "palette" ? "Palette" : "Personnalisée"}
          </button>
        ))}
      </div>

      {/* ── Onglet PALETTE ── */}
      {tab === "palette" && (
        <div className="p-3 space-y-3">
          {HOLENEK_PALETTE.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.colors.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={normalizeHex(value) === normalizeHex(c)}
                    onPick={() => commit(c)}
                    onPreview={onPreview}
                    favorite={isFavorite(c)}
                    onToggleFav={() => toggleFavorite(c)}
                  />
                ))}
              </div>
            </div>
          ))}

          {favorites.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                ★ Favoris
              </p>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={normalizeHex(value) === normalizeHex(c)}
                    onPick={() => commit(c)}
                    onPreview={onPreview}
                    favorite
                    onToggleFav={() => toggleFavorite(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                Récentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={normalizeHex(value) === normalizeHex(c)}
                    onPick={() => commit(c)}
                    onPreview={onPreview}
                    favorite={isFavorite(c)}
                    onToggleFav={() => toggleFavorite(c)}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setTab("custom"); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
            Couleur personnalisée
          </button>
        </div>
      )}

      {/* ── Onglet PERSONNALISÉE ── */}
      {tab === "custom" && (
        <div className="p-3 space-y-3">
          {/* Zone saturation / luminosité */}
          <div
            ref={slRef}
            onMouseDown={onSLDown}
            className="relative h-32 w-full cursor-crosshair rounded-lg overflow-hidden"
            style={{
              background: `hsl(${hsl.h}, 100%, 50%)`,
              backgroundImage:
                "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
          >
            <div
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{ ...slCursor, background: currentHex }}
            />
          </div>

          {/* Slider de teinte */}
          <div>
            <input
              type="range"
              min={0}
              max={360}
              value={hsl.h}
              onChange={(e) => setHsl((p) => ({ ...p, h: Number(e.target.value) }))}
              aria-label="Teinte"
              className="h-3 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
            />
          </div>

          {/* Slider d'opacité */}
          {allowAlpha && (
            <div className="rounded-md" style={{
              background: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/12px 12px",
            }}>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(alpha * 100)}
                onChange={(e) => setAlpha(Number(e.target.value) / 100)}
                aria-label="Opacité"
                className="h-3 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, transparent, ${rgbaToHex({ ...rgb, a: 1 })})`,
                }}
              />
            </div>
          )}

          {/* Aperçu + HEX */}
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 shrink-0 rounded-lg border border-surface-warm"
              style={{
                background: currentHex,
                backgroundImage: alpha < 1
                  ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/8px 8px"
                  : undefined,
              }}
            >
              <div className="h-full w-full rounded-lg" style={{ background: currentHex }} />
            </div>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={applyHexInput}
              onKeyDown={(e) => { if (e.key === "Enter") applyHexInput(); }}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-surface-warm px-2 py-1.5 font-mono text-xs uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Code HEX"
            />
            {eyedropperOk && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); void pickWithEyedropper(); }}
                title="Pipette"
                aria-label="Pipette — choisir une couleur à l'écran"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-warm text-ink-soft hover:bg-surface hover:text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m2 22 1-1h3l9-9M3 21v-3l9-9"/>
                  <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Inputs RGB / HSL */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { label: "R", value: rgb.r, max: 255, set: (v: number) => setHsl(rgbToHsl({ ...rgb, r: v })) },
              { label: "G", value: rgb.g, max: 255, set: (v: number) => setHsl(rgbToHsl({ ...rgb, g: v })) },
              { label: "B", value: rgb.b, max: 255, set: (v: number) => setHsl(rgbToHsl({ ...rgb, b: v })) },
            ]).map((f) => (
              <NumberField key={f.label} {...f} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { label: "H", value: hsl.h, max: 360, set: (v: number) => setHsl((p) => ({ ...p, h: v })) },
              { label: "S", value: hsl.s, max: 100, set: (v: number) => setHsl((p) => ({ ...p, s: v })) },
              { label: "L", value: hsl.l, max: 100, set: (v: number) => setHsl((p) => ({ ...p, l: v })) },
            ]).map((f) => (
              <NumberField key={f.label} {...f} />
            ))}
          </div>

          {/* Harmonies */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              Suggestions harmonieuses
            </p>
            <div className="flex gap-1.5">
              {harmoniesList.map((h) => (
                <button
                  key={h.label}
                  type="button"
                  title={h.label}
                  onMouseDown={(e) => { e.preventDefault(); commit(h.color); }}
                  onMouseEnter={() => onPreview?.(h.color)}
                  onMouseLeave={() => onPreview?.(null)}
                  className="h-7 flex-1 rounded-md border border-surface-warm transition-transform hover:scale-105"
                  style={{ background: h.color }}
                />
              ))}
            </div>
          </div>

          {/* Action : appliquer */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(currentHex); }}
              className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-deep transition-colors"
            >
              Appliquer
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); toggleFavorite(currentHex); }}
              title={isFavorite(currentHex) ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-label={isFavorite(currentHex) ? "Retirer des favoris" : "Ajouter aux favoris"}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                isFavorite(currentHex)
                  ? "border-amber-300 bg-amber-50 text-amber-500"
                  : "border-surface-warm text-ink-soft hover:bg-surface"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isFavorite(currentHex) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bouton aucune couleur */}
      {allowNone && onNone && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onNone(); }}
          className="flex w-full items-center justify-center gap-1.5 border-t border-surface-warm py-2 text-xs font-medium text-ink-soft hover:bg-surface transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="5" y1="5" x2="19" y2="19"/>
          </svg>
          Aucune couleur
        </button>
      )}
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function ColorSwatch({
  color, selected, onPick, onPreview, favorite, onToggleFav,
}: {
  color: string; selected: boolean;
  onPick: () => void; onPreview?: (c: string | null) => void;
  favorite: boolean; onToggleFav: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        title={color}
        onMouseDown={(e) => { e.preventDefault(); onPick(); }}
        onMouseEnter={() => onPreview?.(color)}
        onMouseLeave={() => onPreview?.(null)}
        className={`h-7 w-7 rounded-md border-2 transition-transform hover:scale-110 ${
          selected ? "border-primary ring-2 ring-primary/30" : "border-surface-warm"
        }`}
        style={{ background: color }}
        aria-label={`Couleur ${color}${selected ? " (sélectionnée)" : ""}`}
      >
        {color.toLowerCase() === "#ffffff" && (
          <span className="block h-full w-full rounded-sm border border-surface-warm" aria-hidden="true" />
        )}
      </button>
      {/* Étoile favori — au survol */}
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
        aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow transition-opacity ${
          favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill={favorite ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="3" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    </div>
  );
}

function NumberField({
  label, value, max, set,
}: {
  label: string; value: number; max: number; set: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-lg border border-surface-warm px-1.5 py-1">
      <span className="text-[10px] font-bold text-ink-soft">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Math.min(max, Math.max(0, Number(e.target.value) || 0));
          set(v);
        }}
        className="w-full min-w-0 bg-transparent text-xs tabular-nums focus:outline-none"
        aria-label={label}
      />
    </label>
  );
}

// Helper exposé : indique si un fond clair/sombre va avec une couleur (accessibilité)
export { readableTextColor };
