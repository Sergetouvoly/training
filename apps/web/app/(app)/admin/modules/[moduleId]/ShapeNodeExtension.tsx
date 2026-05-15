"use client";
// Extension TipTap — forme insérable dans le flux texte (resize, drag, copier/coller natifs)
// Refs: SPEC-CONTENT.md §3, §4 — modèle calqué sur ResizableImageExtension
import { Node, mergeAttributes, type NodeViewRendererProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useCallback, useEffect } from "react";
import type { ShapeType } from "@elearning/api-client";
import { ColorPickerButton } from "../../../../../components/ColorPickerButton";

// ── Augmentation de type ──────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    shapeNode: {
      setShapeNode: (attrs: {
        shape: ShapeType;
        fillColor?: string;
        borderColor?: string | null;
        borderWidth?: number;
        width?: number;
        height?: number;
        align?: "left" | "center" | "right";
        label?: string;
        labelColor?: string;
        labelSize?: number;
      }) => ReturnType;
    };
  }
}

type Align = "left" | "center" | "right";

// ── Palette couleurs Holenek ──────────────────────────────────────────────────

const COLORS = [
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

const SHAPE_CATALOGUE: { type: ShapeType; label: string }[] = [
  { type: "square",    label: "Carré" },
  { type: "rectangle", label: "Rectangle" },
  { type: "circle",    label: "Rond" },
  { type: "triangle",  label: "Triangle" },
  { type: "diamond",   label: "Losange" },
  { type: "star",      label: "Étoile" },
  { type: "arrow",     label: "Flèche" },
];

// ── SVG d'une forme ───────────────────────────────────────────────────────────

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
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
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

// ── Helpers de positionnement ─────────────────────────────────────────────────

function wrapperStyle(align: Align, width: number): React.CSSProperties {
  const base: React.CSSProperties = { width, maxWidth: "100%" };
  if (align === "left")  return { ...base, float: "left",  marginRight: "1.5rem", marginBottom: "0.5rem", marginTop: 0 };
  if (align === "right") return { ...base, float: "right", marginLeft:  "1.5rem", marginBottom: "0.5rem", marginTop: 0 };
  return { ...base, display: "block", marginLeft: "auto", marginRight: "auto", marginTop: "1rem", marginBottom: "1rem", clear: "both" };
}

function AlignIcon({ a }: { readonly a: Align }) {
  if (a === "left")   return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>;
  if (a === "center") return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
  return                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>;
}

// ── Mini sélecteur de couleur ─────────────────────────────────────────────────

function ColorDots({ current, onPick, allowNone = false }: {
  current?: string; onPick: (v: string | null) => void; allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1 max-w-[168px]">
      {allowNone && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onPick(null); }}
          className={`rounded-full border-2 px-2 py-0.5 text-[9px] transition-colors ${!current ? "border-primary text-primary" : "border-surface-warm text-ink-soft"}`}
        >
          Aucune
        </button>
      )}
      {COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onMouseDown={(e) => { e.preventDefault(); onPick(c.value); }}
          className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{ background: c.value, borderColor: current === c.value ? "#1a6c7a" : "#dddddd" }}
        />
      ))}
    </div>
  );
}

// ── NodeView React — la forme dans l'éditeur ─────────────────────────────────

type ShapeViewProps = NodeViewRendererProps & {
  selected: boolean;
  updateAttributes: (attrs: Record<string, unknown>) => void;
};

function ShapeNodeView({ node, updateAttributes, selected }: ShapeViewProps) {
  const attrs = node.attrs as {
    shape: ShapeType; fillColor: string; borderColor: string | null; borderWidth: number;
    width: number; height: number; align: Align;
    label: string | null; labelColor: string; labelSize: number;
  };
  const { shape, fillColor, borderColor, borderWidth, width, height, align, label, labelColor, labelSize } = attrs;

  const [resizing, setResizing] = useState(false);
  const [panel, setPanel] = useState<null | "forme" | "couleurs" | "texte">(null);
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);
  // Ferme le panneau si la forme est désélectionnée
  useEffect(() => { if (!selected) setPanel(null); }, [selected]);

  // Resize proportionnel — poignée coin bas-droit
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    setResizing(true);

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - start.current.x;
      const dy = ev.clientY - start.current.y;
      updateAttributes({
        width:  Math.max(40, Math.min(Math.round(start.current.w + dx), 800)),
        height: Math.max(40, Math.min(Math.round(start.current.h + dy), 800)),
      });
    }
    function onUp() {
      setResizing(false);
      globalThis.removeEventListener("mousemove", onMove);
      globalThis.removeEventListener("mouseup", onUp);
      cleanupRef.current = null;
    }
    cleanupRef.current = () => {
      globalThis.removeEventListener("mousemove", onMove);
      globalThis.removeEventListener("mouseup", onUp);
    };
    globalThis.addEventListener("mousemove", onMove);
    globalThis.addEventListener("mouseup", onUp);
  }, [width, height, updateAttributes]);

  return (
    <NodeViewWrapper style={wrapperStyle(align, width)} data-drag-handle>
      <figure className="relative m-0">
        {/* La forme */}
        <div
          className={`rounded-lg border-2 transition-colors ${selected ? "border-primary" : "border-transparent"}`}
          style={{ width, height, cursor: "move" }}
        >
          <ShapeSvg
            shape={shape}
            fill={fillColor}
            border={borderColor ?? "transparent"}
            borderWidth={borderColor ? borderWidth : 0}
            width={width}
            height={height}
            label={label ?? undefined}
            labelColor={labelColor}
            labelSize={labelSize}
          />
        </div>

        {/* Barre d'outils — visible quand sélectionnée */}
        {selected && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-lg border border-surface-warm bg-white shadow-lg px-1 py-1 z-30 whitespace-nowrap">
            {/* Onglets config */}
            {(["forme", "couleurs", "texte"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setPanel(panel === p ? null : p); }}
                className={`rounded px-2 py-1 text-[10px] font-medium capitalize transition-colors ${panel === p ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"}`}
              >
                {p}
              </button>
            ))}
            <div className="w-px h-4 bg-surface-warm mx-0.5" aria-hidden="true" />
            {/* Alignement */}
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); updateAttributes({ align: a }); }}
                title={a}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${align === a ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"}`}
              >
                <AlignIcon a={a} />
              </button>
            ))}
            <div className="w-px h-4 bg-surface-warm mx-0.5" aria-hidden="true" />
            <span className="px-1.5 text-[10px] text-ink-soft tabular-nums">{width}×{height}</span>
          </div>
        )}

        {/* Panneau de config déroulant */}
        {selected && panel && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-xl border border-surface-warm bg-white shadow-lg p-3 z-30 w-56">
            {panel === "forme" && (
              <div className="grid grid-cols-4 gap-1.5">
                {SHAPE_CATALOGUE.map(({ type, label: lbl }) => (
                  <button
                    key={type}
                    type="button"
                    title={lbl}
                    onMouseDown={(e) => { e.preventDefault(); updateAttributes({ shape: type }); }}
                    className={`flex items-center justify-center rounded-lg border p-1.5 transition-all ${shape === type ? "border-primary bg-primary/5" : "border-surface-warm hover:border-primary/40"}`}
                  >
                    <ShapeSvg shape={type} fill={shape === type ? "#1a6c7a" : "#87A8B9"} width={26} height={26} />
                  </button>
                ))}
              </div>
            )}

            {panel === "couleurs" && (
              <div className="space-y-2.5">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-ink-soft uppercase">Remplissage</p>
                    <ColorPickerButton
                      value={fillColor}
                      onChange={(hex) => updateAttributes({ fillColor: hex })}
                      allowAlpha
                      title="Couleur de remplissage avancée"
                      align="right"
                      icon={<span className="text-[9px] font-semibold text-primary">+</span>}
                    />
                  </div>
                  <ColorDots current={fillColor} onPick={(v) => v && updateAttributes({ fillColor: v })} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-ink-soft uppercase">Bordure</p>
                    <ColorPickerButton
                      value={borderColor ?? "#153243"}
                      onChange={(hex) => updateAttributes({ borderColor: hex, borderWidth: borderWidth || 2 })}
                      title="Couleur de bordure avancée"
                      align="right"
                      icon={<span className="text-[9px] font-semibold text-primary">+</span>}
                    />
                  </div>
                  <ColorDots
                    current={borderColor ?? undefined}
                    allowNone
                    onPick={(v) => updateAttributes({ borderColor: v, borderWidth: v ? (borderWidth || 2) : 0 })}
                  />
                  {borderColor && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-ink-soft">Épaisseur</span>
                      <input
                        type="range" min={1} max={8} value={borderWidth}
                        onChange={(e) => updateAttributes({ borderWidth: Number(e.target.value) })}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-[10px] text-ink-soft w-6">{borderWidth}px</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {panel === "texte" && (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={label ?? ""}
                  onChange={(e) => updateAttributes({ label: e.target.value || null })}
                  placeholder="Texte dans la forme…"
                  className="w-full rounded-lg border border-surface-warm px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {label && (
                  <>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-ink-soft uppercase">Couleur du texte</p>
                      <ColorDots current={labelColor} onPick={(v) => v && updateAttributes({ labelColor: v })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-soft">Taille</span>
                      <input
                        type="range" min={10} max={48} value={labelSize}
                        onChange={(e) => updateAttributes({ labelSize: Number(e.target.value) })}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-[10px] text-ink-soft w-7">{labelSize}px</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Poignée resize — coin bas-droit */}
        {selected && (
          <button
            type="button"
            aria-label="Redimensionner la forme"
            onMouseDown={onResizeStart}
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 h-4 w-4 cursor-se-resize rounded-full bg-primary shadow-md flex items-center justify-center z-20"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path d="M1 7L7 1M4 7L7 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {resizing && (
          <div className="absolute inset-0 rounded-lg bg-primary/10 pointer-events-none" aria-hidden="true" />
        )}
      </figure>
    </NodeViewWrapper>
  );
}

// ── Extension TipTap ──────────────────────────────────────────────────────────

export const ShapeNode = Node.create({
  name: "shapeNode",
  group: "block",
  atom: true,
  draggable: true,  // copier/coller + glisser gérés nativement par TipTap

  addAttributes() {
    return {
      shape:       { default: "circle" },
      fillColor:   { default: "#1a6c7a" },
      borderColor: { default: null },
      borderWidth: { default: 2 },
      width:       { default: 120 },
      height:      { default: 120 },
      align:       { default: "center" },
      label:       { default: null },
      labelColor:  { default: "#ffffff" },
      labelSize:   { default: 14 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-shape-node]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-shape-node": "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ShapeNodeView);
  },

  addCommands() {
    return {
      setShapeNode:
        (attrs) =>
        ({ commands }: { commands: any }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

// ── Bouton toolbar : insérer une forme ────────────────────────────────────────

export function ShapeToolbarButton({ editor }: { readonly editor: any }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Insérer une forme"
        className="rounded px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
      >
        🔷 Forme
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 rounded-xl border border-surface-warm bg-white shadow-lg p-3 w-52">
          <p className="mb-2 text-xs font-semibold text-ink">Choisir une forme</p>
          <div className="grid grid-cols-4 gap-1.5">
            {SHAPE_CATALOGUE.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                title={label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setShapeNode({ shape: type }).run();
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-1 rounded-lg border border-surface-warm p-2 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <ShapeSvg shape={type} fill="#1a6c7a" width={28} height={28} />
                <span className="text-[8px] text-ink-soft">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
