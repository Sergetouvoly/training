"use client";
// Extension TipTap — image redimensionnable + upload intégré dans le flux texte
// Refs: SPEC-CONTENT.md §3.1, §4
import { Node, mergeAttributes, nodeInputRule, type NodeViewRendererProps } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useCallback, useEffect } from "react";

// ── Augmentation de type ──────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (attrs: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        align?: "left" | "center" | "right";
      }) => ReturnType;
    };
  }
}

// ── NodeView React — l'image dans l'éditeur ───────────────────────────────────

type Align = "left" | "center" | "right";

const ALIGN_LABELS: Record<Align, string> = { left: "Gauche", center: "Centrer", right: "Droite" };

function AlignIcon({ a }: { readonly a: Align }) {
  if (a === "left")   return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>;
  if (a === "center") return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>;
  return                   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>;
}

function wrapperStyle(align: Align, width: number): React.CSSProperties {
  const base: React.CSSProperties = { width, maxWidth: "100%" };
  if (align === "left")  return { ...base, float: "left",  marginRight: "1.5rem", marginBottom: "0.5rem", marginTop: 0 };
  if (align === "right") return { ...base, float: "right", marginLeft:  "1.5rem", marginBottom: "0.5rem", marginTop: 0 };
  // centré : block centré, sans float
  return { ...base, display: "block", marginLeft: "auto", marginRight: "auto", marginTop: "1rem", marginBottom: "1rem", clear: "both" };
}

type ResizableImageViewProps = NodeViewRendererProps & {
  selected: boolean;
  updateAttributes: (attrs: Record<string, unknown>) => void;
};

function ResizableImageView({ node, updateAttributes, selected }: ResizableImageViewProps) {
  const { src, alt, title, width = 480, align = "center" } = node.attrs as {
    src: string; alt: string | null; title: string | null;
    width: number; align: Align;
  };
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startW.current = width;
    setResizing(true);

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX.current;
      const next = Math.max(80, Math.min(startW.current + delta, 1200));
      updateAttributes({ width: Math.round(next) });
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
  }, [width, updateAttributes]);

  return (
    <NodeViewWrapper
      style={wrapperStyle(align, width)}
      data-drag-handle
    >
      <figure className="relative m-0">
      <img
        src={src}
        alt={alt ?? ""}
        title={title ?? undefined}
        draggable={false}
        className={`block w-full h-auto rounded-lg border-2 transition-colors ${selected ? "border-primary" : "border-transparent"}`}
        style={{ userSelect: "none", cursor: "default" }}
      />

      {/* Barre d'outils alignement + taille */}
      {selected && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-lg border border-surface-warm bg-white shadow-lg px-1 py-1 z-30 whitespace-nowrap">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); updateAttributes({ align: a }); }}
              title={ALIGN_LABELS[a]}
              aria-label={ALIGN_LABELS[a]}
              className={`flex h-6 w-6 items-center justify-center rounded text-xs transition-colors ${align === a ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"}`}
            >
              <AlignIcon a={a} />
            </button>
          ))}
          <div className="w-px h-4 bg-surface-warm mx-0.5" aria-hidden="true" />
          <span className="px-1.5 text-[10px] text-ink-soft tabular-nums">{width}px</span>
        </div>
      )}

      {/* Poignée de resize — bord droit */}
      {selected && (
        <button
          type="button"
          aria-label="Redimensionner l'image"
          onMouseDown={onResizeStart}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-10 w-3 cursor-ew-resize rounded-full bg-primary/80 shadow-md flex items-center justify-center z-20"
        >
          <div className="w-0.5 h-5 bg-white/70 rounded-full" aria-hidden="true" />
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

const IMAGE_INPUT_REGEX = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

export const ResizableImage = Node.create({
  name: "resizableImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: null },
      title: { default: null },
      width: { default: 480 },
      align: { default: "center" },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setResizableImage:
        (attrs: { src: string; alt?: string; title?: string; width?: number; align?: Align }) =>
        ({ commands }: { commands: any }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: IMAGE_INPUT_REGEX,
        type: this.type,
        getAttributes: (match: RegExpMatchArray) => ({ src: match[2], alt: match[1], title: match[3] }),
      }),
    ];
  },
});

// ── Bouton toolbar : upload ou URL ────────────────────────────────────────────

export function ImageToolbarButton({
  editor,
  moduleId,
}: {
  readonly editor: any;
  readonly moduleId: string;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/media/upload/${moduleId}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Erreur upload");
      editor.chain().focus().setResizableImage({ src: data.url, alt: file.name }).run();
      setOpen(false);
      setUrl("");
      setAlt("");
    } catch (e: any) {
      setUploadError(e?.message ?? "Erreur");
    } finally {
      setUploading(false);
    }
  }

  function handleUrl() {
    if (!url) return;
    editor.chain().focus().setResizableImage({ src: url, alt }).run();
    setOpen(false);
    setUrl("");
    setAlt("");
  }

  function close() {
    setOpen(false);
    setUrl("");
    setAlt("");
    setUploadError("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Insérer une image"
        className="rounded px-2 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
      >
        🖼 Image
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 w-72 rounded-xl border border-surface-warm bg-white shadow-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-ink">Insérer une image</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 py-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {uploading
              ? <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Envoi…</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>Uploader depuis l'ordinateur</>
            }
          </button>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

          <div className="flex items-center gap-2 text-xs text-ink-soft" aria-hidden="true">
            <div className="flex-1 h-px bg-surface-warm" />
            ou
            <div className="flex-1 h-px bg-surface-warm" />
          </div>

          <input
            type="url"
            placeholder="https://exemple.com/image.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrl(); } }}
            className="w-full rounded-lg border border-surface-warm px-3 py-2 text-xs focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="Texte alternatif (accessibilité)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full rounded-lg border border-surface-warm px-3 py-2 text-xs focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUrl}
              disabled={!url}
              className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-deep transition-colors disabled:opacity-40"
            >
              Insérer
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-surface-warm px-3 py-2 text-xs text-ink hover:bg-surface transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
