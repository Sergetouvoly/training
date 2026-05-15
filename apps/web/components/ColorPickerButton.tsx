"use client";
// Refs: wrapper popover du ColorPicker — bouton compact réutilisable
// (toolbar TipTap, BubbleMenu, menus contextuels…)
import { useState, useRef, useEffect } from "react";
import { ColorPicker } from "./ColorPicker";

interface Props {
  /** Couleur courante (HEX) */
  readonly value: string;
  readonly onChange: (hex: string) => void;
  readonly onPreview?: (hex: string | null) => void;
  readonly allowAlpha?: boolean;
  readonly allowNone?: boolean;
  readonly onNone?: () => void;
  /** Icône affichée dans le bouton (ex: "A" pour couleur texte) */
  readonly icon?: React.ReactNode;
  readonly title?: string;
  /** Position du popover */
  readonly align?: "left" | "right";
}

export function ColorPickerButton({
  value, onChange, onPreview, allowAlpha, allowNone, onNone, icon, title, align = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onPreview?.(null);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); onPreview?.(null); }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onPreview]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title={title}
        aria-label={title}
        aria-expanded={open}
        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
      >
        {icon}
        {/* Pastille de la couleur courante */}
        <span
          className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-black/15"
          style={{
            background: value,
            backgroundImage: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50%/6px 6px",
          }}
        >
          <span className="block h-full w-full rounded-sm" style={{ background: value }} />
        </span>
        <svg width="8" height="8" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute top-full z-40 mt-1.5 ${align === "right" ? "right-0" : "left-0"}`}
          style={{ animation: "color-pop 120ms ease-out" }}
        >
          <ColorPicker
            value={value}
            onChange={(hex) => { onChange(hex); }}
            onPreview={onPreview}
            allowAlpha={allowAlpha}
            allowNone={allowNone}
            onNone={onNone ? () => { onNone(); setOpen(false); } : undefined}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes color-pop {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
