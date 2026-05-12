"use client";
// Refs: SPEC-CONTENT.md §4, SPEC.md §8 — admin édite le contenu sans déploiement
import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import type { Module, ModuleContent, Lesson, Block } from "@elearning/api-client";

// ── Conversion TipTap JSON → blocs Holenek ───────────────────────────────────
// TipTap produit son propre format JSON. On stocke directement ce JSON dans
// les blocs de type "paragraph"/"heading" etc. en conservant la compatibilité.

function tiptapToBlocks(doc: any): Block[] {
  if (!doc?.content) return [];
  return doc.content.map((node: any): Block => {
    const id = Math.random().toString(36).slice(2, 9);
    const textAlign = node.attrs?.textAlign ?? undefined;
    switch (node.type) {
      case "heading": {
        const rawLevel: number = node.attrs?.level ?? 2;
        const level = (rawLevel < 2 ? 2 : rawLevel > 4 ? 4 : rawLevel) as 2 | 3 | 4;
        return { id, type: "heading", level, content: inlineFromTiptap(node.content), textAlign };
      }
      case "bulletList":
        return { id, type: "bullet_list", items: (node.content ?? []).map((li: any) => inlineFromTiptap(li.content?.[0]?.content)) };
      case "orderedList":
        return { id, type: "ordered_list", items: (node.content ?? []).map((li: any) => inlineFromTiptap(li.content?.[0]?.content)) };
      case "blockquote":
        return { id, type: "blockquote", content: inlineFromTiptap(node.content?.[0]?.content) };
      case "image":
        return { id, type: "image", url: node.attrs?.src ?? "", alt: node.attrs?.alt ?? "", caption: node.attrs?.title };
      case "codeBlock":
        return { id, type: "code", language: node.attrs?.language ?? "text", code: node.content?.[0]?.text ?? "" };
      case "horizontalRule":
        return { id, type: "divider" };
      default:
        return { id, type: "paragraph", content: inlineFromTiptap(node.content), textAlign };
    }
  }).filter(Boolean);
}

function inlineFromTiptap(nodes: any[] = []) {
  return nodes.map((n: any) => {
    if (n.type === "text") {
      const marks = (n.marks ?? []).map((m: any) => m.type);
      const attrs: Record<string, string> = {};
      for (const m of n.marks ?? []) {
        if (m.type === "textStyle") {
          if (m.attrs?.color) attrs.color = m.attrs.color;
          if (m.attrs?.fontFamily) attrs.fontFamily = m.attrs.fontFamily;
        }
        if (m.type === "highlight" && m.attrs?.color) attrs.highlightColor = m.attrs.color;
      }
      return { type: "text" as const, text: n.text ?? "", marks, attrs };
    }
    if (n.type === "link") return { type: "link" as const, href: n.attrs?.href ?? "", text: n.content?.[0]?.text ?? "" };
    return { type: "text" as const, text: n.text ?? "" };
  });
}

function mapInline(items: any[] = []): any[] {
  return items.map(inlineToTiptap).filter(Boolean);
}

function blocksToTiptap(blocks: Block[]): any {
  return {
    type: "doc",
    content: blocks.map((b) => {
      const align = (b as any).textAlign;
      switch (b.type) {
        case "paragraph":   return { type: "paragraph", attrs: align ? { textAlign: align } : {}, content: mapInline(b.content) };
        case "heading":     return { type: "heading", attrs: { level: b.level, ...(align ? { textAlign: align } : {}) }, content: mapInline(b.content) };
        case "bullet_list": return { type: "bulletList", content: b.items.map((item) => ({ type: "listItem", content: [{ type: "paragraph", content: mapInline(item) }] })) };
        case "ordered_list":return { type: "orderedList", content: b.items.map((item) => ({ type: "listItem", content: [{ type: "paragraph", content: mapInline(item) }] })) };
        case "blockquote":  return { type: "blockquote", content: [{ type: "paragraph", content: mapInline(b.content) }] };
        case "image":       return { type: "image", attrs: { src: b.url, alt: b.alt, title: b.caption } };
        case "code":        return { type: "codeBlock", attrs: { language: b.language }, content: b.code ? [{ type: "text", text: b.code }] : [] };
        case "divider":     return { type: "horizontalRule" };
        default:            return { type: "paragraph", content: [] };
      }
    }),
  };
}

function inlineToTiptap(n: any): any | null {
  if (n.type === "link") {
    if (!n.text) return null;
    return { type: "text", text: n.text, marks: [{ type: "link", attrs: { href: n.href } }] };
  }
  // TipTap interdit les nœuds text vides → on les filtre
  if (!n.text) return null;
  const marks: any[] = [];
  for (const m of (n.marks ?? []) as string[]) {
    if (m === "textStyle") {
      const attrs: Record<string, string> = {};
      if (n.attrs?.color) attrs.color = n.attrs.color;
      if (n.attrs?.fontFamily) attrs.fontFamily = n.attrs.fontFamily;
      if (Object.keys(attrs).length > 0) marks.push({ type: "textStyle", attrs });
      continue;
    }
    if (m === "highlight") {
      const color = n.attrs?.highlightColor;
      if (color) marks.push({ type: "highlight", attrs: { color } });
      continue;
    }
    marks.push({ type: m });
  }
  return { type: "text", text: n.text, marks };
}

// ── Barre d'outils TipTap ────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { label: "Sans-serif", value: "Inter, ui-sans-serif, sans-serif" },
  { label: "Serif", value: "Georgia, ui-serif, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
];

const TEXT_COLORS = [
  { label: "Noir", value: "#0f172a" },
  { label: "Gris", value: "#64748b" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Jaune", value: "#ca8a04" },
  { label: "Vert", value: "#16a34a" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#db2777" },
];

const HIGHLIGHT_COLORS = [
  { label: "Jaune", value: "#fef08a" },
  { label: "Vert", value: "#bbf7d0" },
  { label: "Bleu", value: "#bfdbfe" },
  { label: "Rose", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Violet", value: "#e9d5ff" },
];

function ToolbarBtn({
  label, action, active = false, title,
}: {
  readonly label: React.ReactNode;
  readonly action: () => void;
  readonly active?: boolean;
  readonly title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      title={title}
      aria-label={title ?? (typeof label === "string" ? label : undefined)}
      className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${active ? "bg-primary text-white" : "text-ink hover:bg-surface"}`}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-surface-warm shrink-0 mx-0.5" />;
}

function ColorPicker({
  colors, onSelect, current, title, icon,
}: {
  readonly colors: { label: string; value: string }[];
  readonly onSelect: (v: string) => void;
  readonly current?: string;
  readonly title: string;
  readonly icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title={title}
        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
      >
        {icon}
        <span className="w-3 h-1.5 rounded-sm inline-block border border-black/10" style={{ background: current ?? "#0f172a" }} />
        <svg width="8" height="8" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-surface-warm rounded-xl shadow-lg p-2 flex flex-wrap gap-1.5 w-44">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onMouseDown={(e) => { e.preventDefault(); onSelect(c.value); setOpen(false); }}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c.value, borderColor: current === c.value ? "#6366f1" : "transparent" }}
            />
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(""); setOpen(false); }}
            title="Supprimer"
            className="w-6 h-6 rounded-full border border-surface-warm bg-white flex items-center justify-center text-[10px] text-ink-soft hover:bg-surface"
          >✕</button>
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor }: { readonly editor: any }) {
  if (!editor) return null;

  const currentColor = editor.getAttributes("textStyle")?.color;
  const currentHighlight = editor.getAttributes("highlight")?.color;
  const currentFont = editor.getAttributes("textStyle")?.fontFamily;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-surface-warm px-3 py-2 bg-white sticky top-0 z-10">

      {/* Police */}
      <select
        value={currentFont ?? ""}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.preventDefault();
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="rounded px-1.5 py-1 text-xs text-ink border border-surface-warm hover:border-primary focus:outline-none focus:border-primary bg-white max-w-[90px]"
        title="Police"
        aria-label="Police"
      >
        <option value="">Police</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
        ))}
      </select>

      <ToolbarDivider />

      {/* Style de texte */}
      <ToolbarBtn label={<strong>G</strong>} action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras" />
      <ToolbarBtn label={<em>I</em>} action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique" />
      <ToolbarBtn label={<span style={{ textDecoration: "underline" }}>S</span>} action={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligné" />
      <ToolbarBtn label={<span style={{ textDecoration: "line-through" }}>B</span>} action={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barré" />
      <ToolbarBtn label="</>" action={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code inline" />

      <ToolbarDivider />

      {/* Couleurs */}
      <ColorPicker
        colors={TEXT_COLORS}
        current={currentColor}
        onSelect={(v) => v ? editor.chain().focus().setColor(v).run() : editor.chain().focus().unsetColor().run()}
        title="Couleur du texte"
        icon={<span className="font-bold text-xs" style={{ color: currentColor ?? "#0f172a" }}>A</span>}
      />
      <ColorPicker
        colors={HIGHLIGHT_COLORS}
        current={currentHighlight}
        onSelect={(v) => v ? editor.chain().focus().setHighlight({ color: v }).run() : editor.chain().focus().unsetHighlight().run()}
        title="Surlignage"
        icon={<span className="text-xs">🖊</span>}
      />

      <ToolbarDivider />

      {/* Titres */}
      <ToolbarBtn label="H1" action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titre 1" />
      <ToolbarBtn label="H2" action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titre 2" />
      <ToolbarBtn label="H3" action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titre 3" />

      <ToolbarDivider />

      {/* Alignement */}
      <ToolbarBtn
        label={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>}
        action={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Aligner à gauche"
      />
      <ToolbarBtn
        label={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>}
        action={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Centrer"
      />
      <ToolbarBtn
        label={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>}
        action={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Aligner à droite"
      />
      <ToolbarBtn
        label={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
        action={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justifier"
      />

      <ToolbarDivider />

      {/* Listes */}
      <ToolbarBtn label="• Liste" action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste à puces" />
      <ToolbarBtn label="1. Liste" action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numérotée" />
      <ToolbarBtn label='" Citation' action={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citation" />

      <ToolbarDivider />

      {/* Blocs */}
      <ToolbarBtn label="{ } Code" action={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Bloc de code" />
      <ToolbarBtn label="—" action={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur" />
      <TableInsertButton editor={editor} />

      <ToolbarDivider />

      <ImageUrlButton editor={editor} />
      <LinkButton editor={editor} />
    </div>
  );
}

function TableInsertButton({ editor }: { readonly editor: any }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  function insert() {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Insérer un tableau"
        className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${editor.isActive("table") ? "bg-primary text-white" : "text-ink hover:bg-surface"}`}
      >
        ⊞ Tableau
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-surface-warm rounded-xl shadow-lg p-4 w-52 space-y-3">
          <p className="text-xs font-semibold text-ink">Dimensions</p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-soft w-16">Lignes</label>
            <input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(Number(e.target.value))}
              className="flex-1 rounded border border-surface-warm px-2 py-1 text-xs focus:border-primary focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-soft w-16">Colonnes</label>
            <input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(Number(e.target.value))}
              className="flex-1 rounded border border-surface-warm px-2 py-1 text-xs focus:border-primary focus:outline-none" />
          </div>
          {editor.isActive("table") && (
            <div className="border-t border-surface-warm pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-ink mb-1">Tableau sélectionné</p>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); setOpen(false); }}
                className="w-full text-left text-xs text-ink hover:text-primary px-1 py-0.5">+ Ligne après</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); setOpen(false); }}
                className="w-full text-left text-xs text-ink hover:text-primary px-1 py-0.5">+ Colonne après</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); setOpen(false); }}
                className="w-full text-left text-xs text-red-500 hover:text-red-700 px-1 py-0.5">Suppr. ligne</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); setOpen(false); }}
                className="w-full text-left text-xs text-red-500 hover:text-red-700 px-1 py-0.5">Suppr. colonne</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); setOpen(false); }}
                className="w-full text-left text-xs text-red-500 hover:text-red-700 px-1 py-0.5">Supprimer le tableau</button>
            </div>
          )}
          {!editor.isActive("table") && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); insert(); }}
              className="w-full rounded-lg bg-primary text-white py-1.5 text-xs font-semibold hover:bg-primary-deep transition-colors">
              Insérer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ImageUrlButton({ editor }: { readonly editor: any }) {
  function insert() {
    const url = window.prompt("URL de l'image :");
    if (!url) return;
    const alt = window.prompt("Texte alternatif (description) :") ?? "";
    editor.chain().focus().setImage({ src: url, alt }).run();
  }
  return (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); insert(); }} className="rounded px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors" title="Insérer une image">
      🖼 Image
    </button>
  );
}

function LinkButton({ editor }: { readonly editor: any }) {
  function insert() {
    const url = window.prompt("URL du lien :");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  }
  return (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); insert(); }} className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${editor.isActive("link") ? "bg-primary text-white" : "text-ink hover:bg-surface"}`} title="Lien">
      🔗 Lien
    </button>
  );
}

// ── Blocs spéciaux (non-éditables via TipTap) ────────────────────────────────

type SpecialBlockType = "callout" | "audio" | "video_embed" | "file" | "scenario" | "key_takeaway" | "mini_quiz";

function SpecialBlockAdder({ onAdd, onAddText }: {
  readonly onAdd: (b: Block) => void;
  readonly onAddText: () => void;
}) {
  const [open, setOpen] = useState(false);

  const types: { type: SpecialBlockType; label: string; icon: string }[] = [
    { type: "callout",      label: "Encadré (info / warning / danger)",   icon: "💡" },
    { type: "audio",        label: "Audio",                                icon: "🎵" },
    { type: "video_embed",  label: "Vidéo YouTube / Vimeo",               icon: "▶️" },
    { type: "file",         label: "Fichier à télécharger",               icon: "📎" },
    { type: "scenario",     label: "Scénario réel",                       icon: "📋" },
    { type: "key_takeaway", label: "Points clés à retenir",               icon: "⭐" },
    { type: "mini_quiz",    label: "Mini-quiz interactif",                 icon: "❓" },
  ];

  function createBlock(type: SpecialBlockType): Block {
    const id = Math.random().toString(36).slice(2, 9);
    switch (type) {
      case "callout":      return { id, type, variant: "info", title: "", content: [{ type: "text", text: "Votre message ici." }] };
      case "audio":        return { id, type, url: "", title: "Audio", duration_seconds: 0 };
      case "video_embed":  return { id, type, provider: "youtube", video_id: "", caption: "" };
      case "file":         return { id, type, url: "", filename: "document.pdf" };
      case "scenario":     return { id, type, title: "Scénario", context: "", events: ["Événement 1"], lessons: ["Leçon 1"] };
      case "key_takeaway": return { id, type, points: ["Point clé 1", "Point clé 2"] };
      case "mini_quiz":    return { id, type, question: "Votre question ?", choices: [{ label: "Réponse A", is_correct: true }, { label: "Réponse B", is_correct: false }], explanation: "Explication ici." };
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-surface-warm px-5 py-3 text-sm font-medium text-ink-soft hover:border-primary hover:text-primary transition-colors w-full justify-center"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter un bloc
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-surface-warm shadow-lg z-20 overflow-hidden">
          {/* Éditeur de texte en premier */}
          <button
            type="button"
            onClick={() => { onAddText(); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-ink hover:bg-primary/5 transition-colors text-left border-b-2 border-surface-warm font-medium"
          >
            <span className="text-base">✏️</span>
            Éditeur de texte
          </button>
          {types.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => { onAdd(createBlock(t.type)); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-ink hover:bg-surface transition-colors text-left border-b border-surface-warm last:border-0"
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Éditeur des blocs spéciaux ────────────────────────────────────────────────

function SpecialBlockEditor({ block, onChange, onDelete, onDuplicate }: {
  readonly block: Block;
  readonly onChange: (b: Block) => void;
  readonly onDelete: () => void;
  readonly onDuplicate?: () => void;
}) {
  const input = (label: string, value: string, onCh: (v: string) => void, placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-ink-soft mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onCh(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-surface-warm px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </div>
  );
  const textarea = (label: string, value: string, onCh: (v: string) => void, rows = 3) => (
    <div>
      <label className="block text-xs font-medium text-ink-soft mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onCh(e.target.value)} rows={rows}
        className="w-full rounded-lg border border-surface-warm px-3 py-2 text-sm text-ink font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </div>
  );

  function renderFields() {
    switch (block.type) {
      case "callout": return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Variante</label>
            <select value={block.variant} onChange={(e) => onChange({ ...block, variant: e.target.value as any })}
              className="w-full rounded-lg border border-surface-warm px-3 py-2 text-sm focus:border-primary focus:outline-none">
              {["info","warning","danger","success","tip"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {input("Titre (optionnel)", block.title ?? "", (v) => onChange({ ...block, title: v }))}
          {textarea("Contenu", block.content.map((c) => ("text" in c ? c.text : "")).join(""), (v) => onChange({ ...block, content: [{ type: "text", text: v }] }))}
        </div>
      );
      case "audio": return (
        <div className="space-y-3">
          {input("URL du fichier audio", block.url, (v) => onChange({ ...block, url: v }), "https://...")}
          {input("Titre", block.title, (v) => onChange({ ...block, title: v }))}
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Durée (secondes)</label>
            <input type="number" value={block.duration_seconds ?? 0} onChange={(e) => onChange({ ...block, duration_seconds: Number(e.target.value) })}
              className="w-full rounded-lg border border-surface-warm px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
      );
      case "video_embed": return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Plateforme</label>
            <select value={block.provider} onChange={(e) => onChange({ ...block, provider: e.target.value as any })}
              className="w-full rounded-lg border border-surface-warm px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
            </select>
          </div>
          {input("ID de la vidéo", block.video_id, (v) => onChange({ ...block, video_id: v }), "ex: dQw4w9WgXcQ")}
          {input("Légende (optionnel)", block.caption ?? "", (v) => onChange({ ...block, caption: v }))}
        </div>
      );
      case "file": return (
        <div className="space-y-3">
          {input("URL du fichier", block.url, (v) => onChange({ ...block, url: v }), "https://...")}
          {input("Nom affiché", block.filename, (v) => onChange({ ...block, filename: v }))}
        </div>
      );
      case "scenario": return (
        <div className="space-y-3">
          {input("Titre du scénario", block.title, (v) => onChange({ ...block, title: v }))}
          {textarea("Contexte", block.context, (v) => onChange({ ...block, context: v }))}
          {textarea("Déroulement (un événement par ligne)", block.events.join("\n"), (v) => onChange({ ...block, events: v.split("\n").filter(Boolean) }), 4)}
          {textarea("Leçons apprises (une par ligne)", block.lessons.join("\n"), (v) => onChange({ ...block, lessons: v.split("\n").filter(Boolean) }), 4)}
        </div>
      );
      case "key_takeaway": return (
        <div className="space-y-3">
          {textarea("Points clés (un par ligne)", block.points.join("\n"), (v) => onChange({ ...block, points: v.split("\n").filter(Boolean) }), 5)}
        </div>
      );
      case "mini_quiz": return (
        <div className="space-y-3">
          {input("Question", block.question, (v) => onChange({ ...block, question: v }))}
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Réponses (cochez la bonne)</label>
            {block.choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <input type="radio" name={`quiz-${block.id}`} checked={c.is_correct}
                  onChange={() => onChange({ ...block, choices: block.choices.map((ch, j) => ({ ...ch, is_correct: j === i })) })}
                  className="accent-primary" />
                <input type="text" value={c.label}
                  onChange={(e) => onChange({ ...block, choices: block.choices.map((ch, j) => j === i ? { ...ch, label: e.target.value } : ch) })}
                  className="flex-1 rounded-lg border border-surface-warm px-3 py-1.5 text-sm focus:border-primary focus:outline-none" />
                {block.choices.length > 2 && (
                  <button type="button" onClick={() => onChange({ ...block, choices: block.choices.filter((_, j) => j !== i) })}
                    className="text-red-400 hover:text-red-600 text-xs">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => onChange({ ...block, choices: [...block.choices, { label: "", is_correct: false }] })}
              className="text-xs text-primary hover:text-primary-deep font-medium mt-1">+ Ajouter une réponse</button>
          </div>
          {textarea("Explication (affichée après réponse)", block.explanation, (v) => onChange({ ...block, explanation: v }), 2)}
        </div>
      );
      default: return null;
    }
  }

  const typeLabels: Record<string, string> = {
    callout: "💡 Encadré", audio: "🎵 Audio", video_embed: "▶️ Vidéo",
    file: "📎 Fichier", scenario: "📋 Scénario", key_takeaway: "⭐ Points clés", mini_quiz: "❓ Mini-quiz",
  };

  return (
    <div className="rounded-xl border border-surface-warm bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-surface border-b border-surface-warm">
        <span className="text-sm font-semibold text-primary-deep">{typeLabels[block.type] ?? block.type}</span>
      </div>
      <div className="px-5 py-4">{renderFields()}</div>
    </div>
  );
}

// ── Segments : découpage de la liste de blocs en zones texte / blocs spéciaux ──
// Un "segment" est soit un éditeur TipTap (blocs texte consécutifs) soit un bloc spécial isolé.
// Cela permet d'intercaler du texte avant et après chaque bloc spécial.

const SPECIAL_TYPES = new Set(["callout","audio","video_embed","file","scenario","key_takeaway","mini_quiz"]);

type Segment =
  | { kind: "text";    segId: string; blocks: Block[] }
  | { kind: "special"; segId: string; block: Block };

function toSegments(blocks: Block[]): Segment[] {
  const segs: Segment[] = [];
  let textBuf: Block[] = [];
  for (const b of blocks) {
    if (SPECIAL_TYPES.has(b.type)) {
      if (textBuf.length > 0) { segs.push({ kind: "text", segId: `t-${textBuf[0].id}`, blocks: textBuf }); textBuf = []; }
      segs.push({ kind: "special", segId: `s-${b.id}`, block: b });
    } else {
      textBuf.push(b);
    }
  }
  if (textBuf.length > 0) segs.push({ kind: "text", segId: `t-${textBuf[0].id}`, blocks: textBuf });
  return segs;
}

function fromSegments(segs: Segment[]): Block[] {
  return segs.flatMap((s) => s.kind === "text" ? s.blocks : [s.block]);
}

// ── Wrapper commun pour chaque segment (drag + actions) ──────────────────────

function SegmentWrapper({ children, onDelete, onDuplicate, dragProps }: {
  readonly children: React.ReactNode;
  readonly onDelete?: () => void;
  readonly onDuplicate?: () => void;
  readonly dragProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { className: dragClass, draggable, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, ...restDragProps } = dragProps as any;

  function handleDelete() {
    onDelete?.();
    setConfirmDelete(false);
  }

  return (
    <div
      className={`relative ${dragClass ?? ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      {...restDragProps}
    >
      {/* Barre d'actions superposée en haut à droite */}
      <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`} style={{ pointerEvents: hovered ? "auto" : "none" }}>

        {confirmDelete ? (
          /* Zone de confirmation */
          <span className="flex items-center gap-1 rounded-lg bg-white border border-red-200 shadow-md px-2 py-1">
            <span className="text-xs text-red-600 font-medium pr-1">Supprimer ?</span>
            <button type="button" onClick={handleDelete}
              className="rounded px-2 py-0.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
              Oui
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)}
              className="rounded px-2 py-0.5 border border-surface-warm text-xs text-ink hover:bg-surface transition-colors">
              Non
            </button>
          </span>
        ) : (
          <>
            {/* Poignée drag — draggable uniquement sur la poignée pour ne pas interférer avec TipTap */}
            <span
              draggable={draggable}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-surface-warm text-ink-soft hover:text-ink hover:border-primary/30 transition-colors shadow-sm"
              title="Glisser pour déplacer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
              </svg>
            </span>
            {/* Dupliquer */}
            {onDuplicate && (
              <button type="button" onClick={onDuplicate} title="Dupliquer"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-surface-warm text-ink-soft hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            )}
            {/* Supprimer — demande confirmation */}
            {onDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)} title="Supprimer"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-surface-warm text-ink-soft hover:text-red-500 hover:border-red-200 transition-colors shadow-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
          </>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Éditeur d'un segment texte ────────────────────────────────────────────────

function TextSegmentEditor({ segId, lessonId, blocks, onSave }: {
  readonly segId: string;
  readonly lessonId: string;
  readonly blocks: Block[];
  readonly onSave: (lessonId: string, segId: string, blocks: Block[]) => void;
}) {
  // IDs gelés au montage : onBlur écrit toujours dans la bonne leçon/segment,
  // même si activeLessonId a changé entre le montage et le blur.
  const savedLessonId = useRef(lessonId);
  const savedSegId = useRef(segId);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Contenu courant maintenu en ref : évite de lire ed.getJSON() au démontage.
  // dirtyRef passe à true uniquement si l'utilisateur tape réellement.
  const currentBlocksRef = useRef<Block[]>(blocks);
  const dirtyRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
        codeBlock: { HTMLAttributes: { class: "language-text" } },
      }),
      Image.configure({ allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: "Écrivez ici…" }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }), TableRow, TableCell, TableHeader,
    ],
    content: blocksToTiptap(blocks),
    onUpdate({ editor: ed, transaction }) {
      // Ignore les normalisations automatiques au montage (transaction sans userInput)
      if (!transaction.docChanged || !transaction.steps.length) return;
      try {
        const converted = tiptapToBlocks(ed.getJSON());
        if (converted.length > 0) {
          currentBlocksRef.current = converted;
          dirtyRef.current = true;
        }
      } catch {
        // Contenu non convertible (ex: paste Word avec images) — on garde l'ancien
      }
    },
    editorProps: { attributes: { class: "prose prose-holenek max-w-none min-h-[120px] px-8 py-6 focus:outline-none" } },
  }, []);

  // Flush vers le state parent au démontage uniquement si l'utilisateur a tapé.
  // Évite d'écraser une leçon non modifiée avec un contenu "normalisé" par TipTap.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        onSaveRef.current(savedLessonId.current, savedSegId.current, currentBlocksRef.current);
      }
    };
  }, []);

  const prevSegId = useRef(segId);
  useEffect(() => {
    if (!editor || prevSegId.current === segId) return;
    prevSegId.current = segId;
    editor.commands.setContent(blocksToTiptap(blocks));
  }, [segId, editor]);

  return (
    <div className="rounded-xl border border-surface-warm bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ── Composant principal AdminModuleEditor ─────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Item de leçon dans le panneau gauche ─────────────────────────────────────

function LessonItem({
  lesson, index, isActive, canDelete, isDragOver,
  onSelect, onDuplicate, onDelete,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: {
  readonly lesson: Lesson;
  readonly index: number;
  readonly isActive: boolean;
  readonly canDelete: boolean;
  readonly isDragOver: boolean;
  readonly onSelect: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
  readonly onDragStart: () => void;
  readonly onDragOver: () => void;
  readonly onDragLeave: () => void;
  readonly onDrop: () => void;
  readonly onDragEnd: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative rounded-lg transition-colors ${isDragOver ? "ring-2 ring-primary" : ""} ${isActive ? "bg-primary/8" : "hover:bg-surface"}`}
    >
      {/* Ligne principale */}
      <div className="flex items-center gap-1.5 px-2 py-2">

        {/* Poignée drag */}
        <span className="shrink-0 cursor-grab active:cursor-grabbing text-ink-soft/40 hover:text-ink-soft" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
          </svg>
        </span>

        {/* Numéro */}
        <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isActive ? "bg-primary text-white" : "bg-surface-warm text-ink-soft"}`}>
          {index + 1}
        </span>

        {/* Titre — cliquable pour sélectionner */}
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 text-left"
        >
          <span className={`block truncate text-xs font-medium ${isActive ? "text-primary-deep" : "text-ink"}`}>
            {lesson.title_fr}
          </span>
        </button>

        {/* Bouton ⋯ menu actions */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); setConfirmDelete(false); }}
            title="Actions"
            aria-label="Actions sur cette leçon"
            className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-surface-warm text-ink-soft hover:border-primary/40 hover:text-primary hover:bg-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>

          {/* Menu déroulant */}
          {menuOpen && !confirmDelete && (
            <div
              className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-surface-warm bg-white shadow-lg py-1 overflow-hidden"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-surface hover:text-primary transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Dupliquer
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="absolute inset-x-0 bottom-0 top-0 z-20 flex items-center justify-center gap-1 rounded-lg bg-white/97 border border-red-100 shadow-sm px-2">
          <span className="text-[11px] text-red-600 font-medium">Supprimer ?</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); setConfirmDelete(false); }}
            className="rounded px-2 py-0.5 bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition-colors"
          >
            Oui
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
            className="rounded px-2 py-0.5 border border-surface-warm text-[11px] text-ink hover:bg-surface transition-colors"
          >
            Non
          </button>
        </div>
      )}
    </li>
  );
}

export function AdminModuleEditor({ module }: { readonly module: Module }) {
  const initial: ModuleContent = module.content_fr ?? {
    lessons: [],
    quiz_unlock_condition: "all_lessons_read",
    estimated_duration_minutes: 30,
  };

  const [content, setContent] = useState<ModuleContent>(initial);
  const [activeLessonId, setActiveLessonId] = useState<string>(initial.lessons[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [lessonPanelCollapsed, setLessonPanelCollapsed] = useState(false);

  // drag refs — segment level (text or special)
  const segDragIdx = useRef<number | null>(null);
  const [segDragOverIdx, setSegDragOverIdx] = useState<number | null>(null);

  // drag refs — lesson level
  const lessonDragIdx = useRef<number | null>(null);
  const [lessonDragOver, setLessonDragOver] = useState<number | null>(null);

  const activeLesson = content.lessons.find((l) => l.id === activeLessonId);

  // ── helpers de base ──

  function setLesson(lesson: Lesson) {
    setContent((prev) => ({ ...prev, lessons: prev.lessons.map((l) => l.id === lesson.id ? lesson : l) }));
    setSaved(false);
  }

  function setSegments(segs: Segment[]) {
    if (!activeLesson) return;
    setLesson({ ...activeLesson, blocks: fromSegments(segs) });
  }

  // ── opérations sur les segments ──

  function getSegs(): Segment[] {
    return activeLesson ? toSegments(activeLesson.blocks) : [];
  }

  function updateTextSeg(lessonId: string, segId: string, blocks: Block[]) {
    setContent((prev) => {
      const lesson = prev.lessons.find((l) => l.id === lessonId);
      if (!lesson) return prev;
      const segs = toSegments(lesson.blocks);
      const next = segs.map((s) => s.kind === "text" && s.segId === segId ? { ...s, blocks } : s);
      const updatedLesson = { ...lesson, blocks: fromSegments(next) };
      return { ...prev, lessons: prev.lessons.map((l) => l.id === lessonId ? updatedLesson : l) };
    });
    setSaved(false);
  }

  function deleteSegment(idx: number) {
    const segs = getSegs();
    const next = segs.filter((_, i) => i !== idx);
    setSegments(next);
  }

  function duplicateSegment(idx: number) {
    const segs = getSegs();
    const seg = segs[idx];
    let copy: Segment;
    if (seg.kind === "text") {
      copy = { kind: "text", segId: `t-${uid()}`, blocks: seg.blocks.map((b) => ({ ...b, id: uid() })) };
    } else {
      copy = { kind: "special", segId: `s-${uid()}`, block: { ...seg.block, id: uid() } };
    }
    const next = [...segs];
    next.splice(idx + 1, 0, copy);
    setSegments(next);
  }

  function moveSegment(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const segs = [...getSegs()];
    const [moved] = segs.splice(fromIdx, 1);
    segs.splice(toIdx, 0, moved);
    setSegments(segs);
  }

  function updateSpecialInSeg(block: Block) {
    setSegments(getSegs().map((s) => s.kind === "special" && s.block.id === block.id ? { ...s, block } : s));
  }

  function addSpecialBlock(block: Block) {
    if (!activeLesson) return;
    setLesson({ ...activeLesson, blocks: [...activeLesson.blocks, block] });
  }

  function addTextSegment() {
    if (!activeLesson) return;
    const emptyParagraph: Block = { id: uid(), type: "paragraph", content: [] };
    const newSeg: Segment = { kind: "text", segId: `t-${emptyParagraph.id}`, blocks: [emptyParagraph] };
    const current = toSegments(activeLesson.blocks);
    setSegments([...current, newSeg]);
  }

  // ── opérations sur les leçons ──

  function addLesson() {
    const id = uid();
    const lesson: Lesson = { id, title_fr: `Leçon ${content.lessons.length + 1}`, blocks: [] };
    setContent((prev) => ({ ...prev, lessons: [...prev.lessons, lesson] }));
    setActiveLessonId(id);
    setSaved(false);
  }

  function deleteLesson(id: string) {
    if (content.lessons.length <= 1) return;
    const remaining = content.lessons.filter((l) => l.id !== id);
    setContent((prev) => ({ ...prev, lessons: remaining }));
    if (activeLessonId === id) setActiveLessonId(remaining[0]?.id ?? "");
    setSaved(false);
  }

  function duplicateLesson(id: string) {
    const src = content.lessons.find((l) => l.id === id);
    if (!src) return;
    const newId = uid();
    const copy: Lesson = { ...src, id: newId, title_fr: `${src.title_fr} (copie)`, blocks: src.blocks.map((b) => ({ ...b, id: uid() })) };
    setContent((prev) => {
      const idx = prev.lessons.findIndex((l) => l.id === id);
      const next = [...prev.lessons];
      next.splice(idx + 1, 0, copy);
      return { ...prev, lessons: next };
    });
    setActiveLessonId(newId);
    setSaved(false);
  }

  function moveLessons(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setContent((prev) => {
      const next = [...prev.lessons];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, lessons: next };
    });
    setSaved(false);
  }

  function renameLessonInline(id: string, title: string) {
    setContent((prev) => ({ ...prev, lessons: prev.lessons.map((l) => l.id === id ? { ...l, title_fr: title } : l) }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      const res = await fetch(`/api/learning/modules/${module.id}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_fr: content }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const segs = activeLesson ? toSegments(activeLesson.blocks) : [];

  return (
    <div className="flex gap-0 -mx-8 -mb-8 min-h-[calc(100vh-200px)] border-t border-surface-warm">

      {/* ── Panneau gauche : leçons (sticky, scroll indépendant) ── */}
      <div className={`${lessonPanelCollapsed ? "w-12" : "w-64"} shrink-0 border-r border-surface-warm bg-white flex flex-col transition-[width] duration-200 overflow-hidden`}>
        <div className="sticky top-0 flex flex-col h-[calc(100vh-56px)]">
        <div className="flex items-center gap-1.5 px-3 py-3 border-b border-surface-warm">
          {!lessonPanelCollapsed && (
            <p className="flex-1 text-xs font-bold uppercase tracking-widest text-ink-soft truncate">Leçons</p>
          )}
          <button
            type="button"
            onClick={() => setLessonPanelCollapsed((v) => !v)}
            title={lessonPanelCollapsed ? "Développer" : "Réduire"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-surface hover:text-ink transition-colors mx-auto"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {lessonPanelCollapsed
                ? <><polyline points="9 18 15 12 9 6"/><polyline points="15 18 21 12 15 6"/></>
                : <><polyline points="15 18 9 12 15 6"/><polyline points="9 18 3 12 9 6"/></>
              }
            </svg>
          </button>
        </div>
        {!lessonPanelCollapsed && (
          <>
            <div className="p-3 border-b border-surface-warm">
              <button type="button" onClick={addLesson}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-dashed border-surface-warm px-3 py-2 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nouvelle leçon
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ol className="p-2 space-y-1">
                {content.lessons.map((lesson, i) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
                    index={i}
                    isActive={lesson.id === activeLessonId}
                    canDelete={content.lessons.length > 1}
                    isDragOver={lessonDragOver === i}
                    onSelect={() => setActiveLessonId(lesson.id)}
                    onDuplicate={() => duplicateLesson(lesson.id)}
                    onDelete={() => deleteLesson(lesson.id)}
                    onDragStart={() => { lessonDragIdx.current = i; }}
                    onDragOver={() => setLessonDragOver(i)}
                    onDragLeave={() => setLessonDragOver(null)}
                    onDrop={() => {
                      if (lessonDragIdx.current !== null) moveLessons(lessonDragIdx.current, i);
                      lessonDragIdx.current = null; setLessonDragOver(null);
                    }}
                    onDragEnd={() => { lessonDragIdx.current = null; setLessonDragOver(null); }}
                  />
                ))}
              </ol>
            </div>
          </>
        )}
        {lessonPanelCollapsed && (
          <div className="flex flex-col items-center gap-2 py-2">
            {content.lessons.map((lesson, i) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setActiveLessonId(lesson.id)}
                title={lesson.title_fr}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${lesson.id === activeLessonId ? "bg-primary text-white" : "bg-surface-warm text-ink-soft hover:bg-primary/10 hover:text-primary"}`}
              >
                {i + 1}
              </button>
            ))}
            <button type="button" onClick={addLesson} title="Nouvelle leçon"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-surface-warm text-ink-soft hover:border-primary hover:text-primary transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        )}
        </div>
      </div>

      {/* ── Zone d'édition centrale ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Barre d'actions */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-surface-warm bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {activeLesson && (
              <input type="text" value={activeLesson.title_fr}
                onChange={(e) => renameLessonInline(activeLesson.id, e.target.value)}
                className="text-lg font-bold text-primary-deep bg-transparent border-b border-transparent hover:border-surface-warm focus:border-primary focus:outline-none transition-colors px-0 py-0.5 min-w-0"
                aria-label="Titre de la leçon" />
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saved && <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Sauvegardé
            </span>}
            {saveError && <span className="text-xs text-red-600 font-medium">Erreur — réessayez</span>}
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-soft">Durée estimée</label>
              <input type="number" min={1} max={480} value={content.estimated_duration_minutes}
                onChange={(e) => { setContent((prev) => ({ ...prev, estimated_duration_minutes: Number(e.target.value) })); setSaved(false); }}
                className="w-16 rounded-lg border border-surface-warm px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none" />
              <span className="text-xs text-ink-soft">min</span>
            </div>
            <a href={`/preview/module/${module.id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-surface-warm px-5 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Prévisualiser
            </a>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-deep transition-colors disabled:opacity-60 shadow-sm">
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sauvegarde…</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Sauvegarder</>
              }
            </button>
          </div>
        </div>

        {/* Éditeur — segments */}
        {activeLesson ? (
          <div key={activeLessonId} className="flex-1 overflow-y-auto px-8 py-8 space-y-4">
            {segs.map((seg, idx) => {
              const dragProps: React.HTMLAttributes<HTMLDivElement> = {
                draggable: true,
                onDragStart: () => { segDragIdx.current = idx; },
                onDragOver: (e) => { e.preventDefault(); setSegDragOverIdx(idx); },
                onDragLeave: () => setSegDragOverIdx(null),
                onDrop: () => {
                  if (segDragIdx.current !== null && segDragIdx.current !== idx) moveSegment(segDragIdx.current, idx);
                  segDragIdx.current = null; setSegDragOverIdx(null);
                },
                onDragEnd: () => { segDragIdx.current = null; setSegDragOverIdx(null); },
                className: segDragOverIdx === idx ? "ring-2 ring-primary rounded-xl" : "",
              };

              if (seg.kind === "text") {
                return (
                  <SegmentWrapper
                    key={seg.segId}
                    dragProps={dragProps}
                    onDuplicate={() => duplicateSegment(idx)}
                    onDelete={() => deleteSegment(idx)}
                  >
                    <TextSegmentEditor
                      segId={seg.segId}
                      lessonId={activeLessonId}
                      blocks={seg.blocks}
                      onSave={updateTextSeg}
                    />
                  </SegmentWrapper>
                );
              }

              return (
                <SegmentWrapper
                  key={seg.segId}
                  dragProps={dragProps}
                  onDuplicate={() => duplicateSegment(idx)}
                  onDelete={() => deleteSegment(idx)}
                >
                  <SpecialBlockEditor
                    block={seg.block}
                    onChange={updateSpecialInSeg}
                    onDelete={() => deleteSegment(idx)}
                    onDuplicate={() => duplicateSegment(idx)}
                  />
                </SegmentWrapper>
              );
            })}

            <SpecialBlockAdder onAdd={addSpecialBlock} onAddText={addTextSegment} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-semibold text-ink">Aucune leçon</p>
              <p className="mt-1 text-sm text-ink-soft">Créez une première leçon dans le panneau de gauche.</p>
              <button type="button" onClick={addLesson}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-deep transition-colors">
                Créer la première leçon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
