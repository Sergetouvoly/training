"use client";
// Refs: SPEC-CONTENT.md — bloc forme flottante avec drag-resize, texte, couleurs Holenek
import { useState, useRef, useCallback } from "react";
import type { ShapeBlock, ShapeType } from "@elearning/api-client";

// ── Palettes couleurs Holenek ──────────────────────────────────────────────────

const FILL_COLORS = [
  { label: "Teal",          value: "#1a6c7a" },
  { label: "Navy",          value: "#153243" },
  { label: "Navy profond",  value: "#000f2b" },
  { label: "Periwinkle",    value: "#BFD1FF" },
  { label: "Teal clair",    value: "#f3f9fb" },
  { label: "Bleu-gris",     value: "#87A8B9" },
  { label: "Blanc",         value: "#ffffff" },
  { label: "Gris doux",     value: "#dddddd" },
  { label: "Vert",          value: "#16a34a" },
  { label: "Ambre",         value: "#d97706" },
  { label: "Rouge",         value: "#dc2626" },
  { label: "Noir texte",    value: "#3a3a3a" },
];

// ── SVG formes ────────────────────────────────────────────────────────────────

export function ShapeSvg({
  shape, fill, border = "transparent", borderWidth = 0, width = 100, height = 100, label, labelColor = "#ffffff", labelSize = 14,
}: {
  shape: ShapeType; fill: string; border?: string; borderWidth?: number;
  width?: number; height?: number; label?: string; labelColor?: string; labelSize?: number;
}) {
  const sw = borderWidth;
  const half = sw / 2;

  const shapeEl = (() => {
    switch (shape) {
      case "square":
      case "rectangle":
        return <rect x={half} y={half} width={width - sw} height={height - sw} fill={fill} stroke={border} strokeWidth={sw} rx="4" />;
      case "circle":
        return <ellipse cx={width / 2} cy={height / 2} rx={(width - sw) / 2} ry={(height - sw) / 2} fill={fill} stroke={border} strokeWidth={sw} />;
      case "triangle":
        return <polygon points={`${width / 2},${half} ${width - half},${height - half} ${half},${height - half}`} fill={fill} stroke={border} strokeWidth={sw} />;
      case "diamond":
        return <polygon points={`${width / 2},${half} ${width - half},${height / 2} ${width / 2},${height - half} ${half},${height / 2}`} fill={fill} stroke={border} strokeWidth={sw} />;
      case "star": {
        const cx = width / 2, cy = height / 2;
        const outerR = Math.min(width, height) / 2 - half;
        const innerR = outerR * 0.42;
        const pts = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
        return <polygon points={pts} fill={fill} stroke={border} strokeWidth={sw} />;
      }
      case "arrow": {
        const ah = height * 0.4, aw = width * 0.35;
        const pts = [
          `${half},${(height - ah) / 2 + half}`,
          `${width - aw - half},${(height - ah) / 2 + half}`,
          `${width - aw - half},${half}`,
          `${width - half},${height / 2}`,
          `${width - aw - half},${height - half}`,
          `${width - aw - half},${(height + ah) / 2 - half}`,
          `${half},${(height + ah) / 2 - half}`,
        ].join(" ");
        return <polygon points={pts} fill={fill} stroke={border} strokeWidth={sw} />;
      }
    }
  })();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {shapeEl}
      {label && (
        <text
          x={width / 2} y={height / 2}
          dominantBaseline="middle" textAnchor="middle"
          fill={labelColor} fontSize={labelSize} fontWeight="600"
          style={{ userSelect: "none" }}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

// ── Catalogue des formes ──────────────────────────────────────────────────────

const SHAPE_CATALOGUE: { type: ShapeType; label: string }[] = [
  { type: "square",    label: "Carré" },
  { type: "rectangle", label: "Rectangle" },
  { type: "circle",    label: "Rond" },
  { type: "triangle",  label: "Triangle" },
  { type: "diamond",   label: "Losange" },
  { type: "star",      label: "Étoile" },
  { type: "arrow",     label: "Flèche" },
];

// ── Composant éditeur ─────────────────────────────────────────────────────────

interface Props {
  readonly block: ShapeBlock;
  readonly onChange: (b: ShapeBlock) => void;
}

export function ShapeBlockEditor({ block, onChange }: Props) {
  const [tab, setTab] = useState<"forme" | "couleurs" | "texte">("forme");

  // Drag-resize
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, w: block.width, h: block.height };

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      onChange({
        ...block,
        width:  Math.max(40, Math.round(dragStart.current.w + dx)),
        height: Math.max(40, Math.round(dragStart.current.h + dy)),
      });
    }
    function onUp() {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [block, onChange]);

  return (
    <div className="rounded-xl border border-surface-warm bg-white overflow-hidden">
      {/* Onglets */}
      <div className="flex border-b border-surface-warm bg-surface">
        {(["forme", "couleurs", "texte"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-primary text-primary" : "text-ink-soft hover:text-ink"}`}
          >
            {t === "forme" ? "Forme" : t === "couleurs" ? "Couleurs" : "Texte"}
          </button>
        ))}

        {/* Alignement */}
        <div className="ml-auto flex items-center gap-1 px-3">
          {(["left", "center", "right"] as const).map(a => (
            <button
              key={a}
              type="button"
              title={a === "left" ? "Aligné à gauche" : a === "center" ? "Centré" : "Aligné à droite"}
              onClick={() => onChange({ ...block, align: a })}
              className={`rounded p-1 transition-colors ${block.align === a ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-surface"}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {a === "left"   && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></>}
                {a === "center" && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>}
                {a === "right"  && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></>}
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex gap-6 flex-wrap">
        {/* Panneau de config */}
        <div className="flex-1 min-w-48 space-y-4">
          {tab === "forme" && (
            <>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Choisir une forme</p>
              <div className="grid grid-cols-4 gap-2">
                {SHAPE_CATALOGUE.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    title={label}
                    onClick={() => onChange({ ...block, shape: type })}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all ${block.shape === type ? "border-primary bg-primary/5" : "border-surface-warm hover:border-primary/40"}`}
                  >
                    <ShapeSvg shape={type} fill={block.shape === type ? "#1a6c7a" : "#87A8B9"} width={32} height={32} />
                    <span className="text-[9px] text-ink-soft">{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "couleurs" && (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold text-ink-soft uppercase tracking-wide">Couleur de remplissage</p>
                <div className="flex flex-wrap gap-1.5">
                  {FILL_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => onChange({ ...block, fill_color: c.value })}
                      className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c.value, borderColor: block.fill_color === c.value ? "#1a6c7a" : "#dddddd" }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-ink-soft uppercase tracking-wide">Bordure</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange({ ...block, border_color: undefined, border_width: 0 })}
                    className={`rounded-full border-2 px-3 py-0.5 text-[10px] transition-colors ${!block.border_color ? "border-primary text-primary" : "border-surface-warm text-ink-soft"}`}
                  >
                    Aucune
                  </button>
                  {FILL_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => onChange({ ...block, border_color: c.value, border_width: block.border_width || 2 })}
                      className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c.value, borderColor: block.border_color === c.value ? "#1a6c7a" : "#dddddd" }}
                    />
                  ))}
                </div>
                {block.border_color && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-ink-soft">Épaisseur</label>
                    <input
                      type="range" min={1} max={8} value={block.border_width ?? 2}
                      onChange={e => onChange({ ...block, border_width: Number(e.target.value) })}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-xs text-ink-soft w-6">{block.border_width ?? 2}px</span>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "texte" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft uppercase tracking-wide">
                  Texte dans la forme
                </label>
                <input
                  type="text"
                  value={block.label ?? ""}
                  onChange={e => onChange({ ...block, label: e.target.value || undefined })}
                  placeholder="Texte optionnel…"
                  className="w-full rounded-lg border border-surface-warm px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {block.label && (
                <>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink-soft uppercase tracking-wide">Couleur du texte</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FILL_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => onChange({ ...block, label_color: c.value })}
                          className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                          style={{ background: c.value, borderColor: (block.label_color ?? "#ffffff") === c.value ? "#1a6c7a" : "#dddddd" }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-ink-soft">Taille</label>
                    <input
                      type="range" min={10} max={48} value={block.label_size ?? 14}
                      onChange={e => onChange({ ...block, label_size: Number(e.target.value) })}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-xs text-ink-soft w-8">{block.label_size ?? 14}px</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Prévisualisation avec drag-resize */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-ink-soft">Aperçu</p>
          <div
            ref={containerRef}
            className="relative select-none"
            style={{ width: block.width, height: block.height }}
          >
            <ShapeSvg
              shape={block.shape}
              fill={block.fill_color}
              border={block.border_color}
              borderWidth={block.border_width}
              width={block.width}
              height={block.height}
              label={block.label}
              labelColor={block.label_color ?? "#ffffff"}
              labelSize={block.label_size ?? 14}
            />
            {/* Poignée resize coin bas-droit */}
            <div
              onMouseDown={onResizeMouseDown}
              className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl-lg bg-primary/20 hover:bg-primary/40 transition-colors flex items-center justify-center"
              title="Redimensionner"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                <path d="M1 7L7 1M4 7L7 4M7 7L7 7" stroke="#1a6c7a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-ink-soft">{block.width} × {block.height} px</p>
        </div>
      </div>
    </div>
  );
}
