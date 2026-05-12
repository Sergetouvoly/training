"use client";
// Refs: SPEC-CONTENT.md §5, SPEC.md §8 US-1.2
import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { useSession } from "next-auth/react";
import type {
  Module, Lesson, Block, InlineContent,
  EvaluationItem, MiniQuizBlock as MiniQuizBlockType,
  VideoBlock as VideoBlockType,
} from "@elearning/api-client";

// ── Utilitaires ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, token: string | undefined, options?: RequestInit) {
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

// ── Rendu inline (texte enrichi) ─────────────────────────────────────────────

function renderInline(nodes: InlineContent[]): React.ReactNode {
  return nodes.map((node, i) => {
    if (node.type === "link") {
      return (
        <a
          key={i}
          href={node.href}
          target={node.external ? "_blank" : undefined}
          rel={node.external ? "noopener noreferrer" : undefined}
          className="text-primary underline underline-offset-2 hover:text-primary-deep transition-colors"
        >
          {node.text}
        </a>
      );
    }
    const marks = node.marks ?? [];
    const attrs = node.type === "text" ? node.attrs : undefined;
    const style: React.CSSProperties = {};
    if (attrs?.color) style.color = attrs.color;
    if (attrs?.fontFamily) style.fontFamily = attrs.fontFamily;

    let el: React.ReactNode = node.text;
    if (marks.includes("code"))      el = <code key={i} className="rounded bg-surface px-1.5 py-0.5 text-[0.85em] font-mono text-primary-deep">{el}</code>;
    if (marks.includes("bold"))      el = <strong key={i} className="font-semibold text-primary-deep">{el}</strong>;
    if (marks.includes("italic"))    el = <em key={i}>{el}</em>;
    if (marks.includes("underline")) el = <u key={i}>{el}</u>;
    if (marks.includes("strike"))    el = <s key={i}>{el}</s>;
    if (marks.includes("highlight")) {
      const bg = attrs?.highlightColor ?? undefined;
      el = <mark key={i} className="rounded px-0.5" style={bg ? { backgroundColor: bg } : { backgroundColor: "rgb(var(--accent-bright) / 0.4)" }}>{el}</mark>;
    }
    const hasStyle = Object.keys(style).length > 0;
    return <span key={i} style={hasStyle ? style : undefined}>{el}</span>;
  });
}

// ── Placeholder pour les médias non configurés ─────────────────────────────
// Évite les crash <source src=""> et les iframes vides qui rechargent la page.

function MediaPlaceholder({ label }: { readonly label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-surface-warm bg-surface px-5 py-6 text-center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-ink-soft" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="3" x2="21" y2="21"/>
      </svg>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}

// ── Rendus des blocs ──────────────────────────────────────────────────────────

function BlockRenderer({ block }: { readonly block: Block }) {
  switch (block.type) {

    case "paragraph":
      return (
        <p style={block.textAlign ? { textAlign: block.textAlign } : undefined}>
          {renderInline(block.content)}
        </p>
      );

    case "heading": {
      const Tag = (`h${block.level}`) as "h2" | "h3" | "h4";
      return <Tag style={block.textAlign ? { textAlign: block.textAlign } : undefined}>{renderInline(block.content)}</Tag>;
    }

    case "bullet_list":
      return (
        <ul className="my-4 space-y-2 pl-0">
          {block.items.map((item: InlineContent[], i: number) => (
            <li key={i} className="flex items-start gap-3 text-[17px] leading-[1.8] text-ink">
              <span className="mt-[0.6em] h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "ordered_list":
      return (
        <ol className="my-4 space-y-2 pl-0">
          {block.items.map((item: InlineContent[], i: number) => (
            <li key={i} className="flex items-start gap-3 text-[17px] leading-[1.8] text-ink">
              <span className="mt-[0.15em] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );

    case "blockquote":
      return (
        <blockquote className="border-l-4 border-primary bg-surface px-6 py-4 rounded-r-xl my-6">
          <p className="text-[17px] leading-[1.8] text-ink-soft italic">{renderInline(block.content)}</p>
        </blockquote>
      );

    case "image": {
      const imgWidth = (block as any).width as number | undefined;
      const imgAlign = (block as any).align as "left" | "center" | "right" | undefined ?? "center";
      const figStyle: React.CSSProperties = imgWidth
        ? { width: imgWidth, maxWidth: "100%" }
        : { maxWidth: "100%" };
      if (imgAlign === "left")        { figStyle.float = "left";  figStyle.marginRight = "1.5rem"; figStyle.marginBottom = "0.5rem"; }
      else if (imgAlign === "right")  { figStyle.float = "right"; figStyle.marginLeft  = "1.5rem"; figStyle.marginBottom = "0.5rem"; }
      else                            { figStyle.marginLeft = "auto"; figStyle.marginRight = "auto"; figStyle.display = "block"; }
      return (
        <figure style={figStyle}>
          <img
            src={block.url}
            alt={block.alt}
            loading="lazy"
            className="w-full h-auto rounded-xl border border-surface-warm"
          />
          {block.caption && (
            <figcaption className="mt-2 text-center text-sm text-ink-soft italic">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "audio":
      if (!block.url) return <MediaPlaceholder label="Audio non configuré" />;
      return (
        <div className="rounded-xl border border-surface-warm bg-surface px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-primary-deep text-sm">{block.title}</p>
              {block.duration_seconds && (
                <p className="text-xs text-ink-soft">
                  {Math.floor(block.duration_seconds / 60)}:{String(block.duration_seconds % 60).padStart(2, "0")}
                </p>
              )}
            </div>
          </div>
          <audio controls preload="none" className="w-full" aria-label={block.title} src={block.url}>
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>
      );

    case "video": {
      const vb = block as unknown as VideoBlockType;
      if (!vb.url) return <MediaPlaceholder label="Vidéo non configurée" />;
      return (
        <figure>
          <video
            controls
            preload="metadata"
            src={vb.url}
            className="w-full rounded-xl border border-surface-warm bg-black"
            style={{ maxHeight: "480px" }}
            aria-label={vb.title}
          />
          {(vb.title || vb.caption) && (
            <figcaption className="mt-2 text-center text-sm text-ink-soft italic">
              {vb.caption ?? vb.title}
            </figcaption>
          )}
        </figure>
      );
    }

    case "video_embed": {
      if (!block.video_id) return <MediaPlaceholder label="Vidéo non configurée" />;
      const src = block.provider === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${block.video_id}`
        : `https://player.vimeo.com/video/${block.video_id}`;
      return (
        <figure>
          <div className="relative w-full overflow-hidden rounded-xl border border-surface-warm" style={{ aspectRatio: "16/9" }}>
            <iframe
              src={src}
              title={block.caption ?? "Vidéo intégrée"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              className="absolute inset-0 h-full w-full"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-2 text-center text-sm text-ink-soft italic">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "file":
      if (!block.url) return <MediaPlaceholder label="Fichier non configuré" />;
      return (
        <a
          href={block.url}
          download={block.filename}
          className="flex items-center gap-3 rounded-xl border border-surface-warm bg-white px-5 py-4 hover:border-primary/40 hover:bg-surface transition-colors group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-warm group-hover:bg-accent-bright/20 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink truncate">{block.filename}</p>
            {block.size_bytes && (
              <p className="text-xs text-ink-soft">{(block.size_bytes / 1024).toFixed(0)} Ko</p>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft group-hover:text-primary transition-colors" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </a>
      );

    case "callout": {
      type CalloutStyle = { border: string; bg: string; icon: string; iconPath: React.ReactNode };
      const stylesMap: Record<string, CalloutStyle> = {
        info:    { border: "border-primary/30",       bg: "bg-primary/5",   icon: "text-primary",    iconPath: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></> },
        warning: { border: "border-orange-300",       bg: "bg-orange-50",   icon: "text-orange-600", iconPath: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
        danger:  { border: "border-red-300",          bg: "bg-red-50",      icon: "text-red-600",    iconPath: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></> },
        success: { border: "border-green-300",        bg: "bg-green-50",    icon: "text-green-600",  iconPath: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> },
        tip:     { border: "border-accent-bright/60", bg: "bg-accent-soft", icon: "text-primary",    iconPath: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
      };
      const styles = stylesMap[block.variant] ?? stylesMap.info;
      return (
        <div className={`rounded-xl border ${styles.border} ${styles.bg} px-5 py-4`}>
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${styles.icon} shrink-0 mt-0.5`} aria-hidden="true">
              {styles.iconPath}
            </svg>
            <div className="min-w-0">
              {block.title && <p className="font-semibold text-primary-deep mb-1">{block.title}</p>}
              <p className="text-[15px] leading-relaxed text-ink">{renderInline(block.content)}</p>
            </div>
          </div>
        </div>
      );
    }

    case "code":
      return (
        <div className="rounded-xl overflow-hidden border border-surface-warm">
          {(block.filename || block.language) && (
            <div className="flex items-center justify-between bg-primary-deep px-4 py-2">
              <span className="text-xs font-mono text-white/70">{block.filename ?? block.language}</span>
              <CopyButton text={block.code} />
            </div>
          )}
          <pre className="overflow-x-auto bg-[#1e2430] p-5">
            <code className="text-sm font-mono leading-relaxed text-[#e2e8f0] whitespace-pre">
              {block.code}
            </code>
          </pre>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-surface-warm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                {block.headers.map((h: string, i: number) => (
                  <th key={i} className="border-b border-surface-warm px-4 py-3 text-left font-semibold text-primary-deep">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row: string[], ri: number) => (
                <tr key={ri} className={ri % 2 === 1 ? "bg-surface/50" : ""}>
                  {row.map((cell: string, ci: number) => (
                    <td key={ci} className="border-t border-surface-warm px-4 py-3 text-ink align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "divider":
      return <hr className="border-surface-warm" />;

    case "scenario":
      return (
        <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-primary/10 bg-primary/10 px-5 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Scénario réel</span>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">Contexte</p>
              <p className="text-[15px] leading-relaxed text-ink">{block.context}</p>
            </div>
            {block.events.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-3">Déroulement</p>
                <ol className="space-y-2">
                  {block.events.map((event, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-ink">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      {event}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {block.lessons.length > 0 && (
              <div className="border-t border-primary/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-3">Ce que cela nous apprend</p>
                <ul className="space-y-2">
                  {block.lessons.map((lesson, i) => (
                    <li key={i} className="flex items-start gap-2 text-[15px] text-ink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-primary" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {lesson}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );

    case "key_takeaway":
      return (
        <div className="rounded-xl border-2 border-accent-bright bg-accent-soft px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <p className="font-bold text-primary uppercase tracking-wide text-sm">À retenir</p>
          </div>
          <ul className="space-y-2.5">
            {block.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] text-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      );

    case "mini_quiz":
      return <MiniQuizBlock block={block} />;

    default:
      return null;
  }
}

// ── Bouton copier (blocs code) ────────────────────────────────────────────────

function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs font-mono text-white/50 hover:text-white transition-colors"
      aria-label="Copier le code"
    >
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

// ── Mini-quiz inline ──────────────────────────────────────────────────────────

function MiniQuizBlock({ block }: { readonly block: MiniQuizBlockType }) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const correct = block.choices.find((c) => c.is_correct)?.label;

  return (
    <div className="rounded-xl border-2 border-accent-bright/40 bg-accent-soft overflow-hidden">
      <div className="flex items-center gap-2 border-b border-accent-bright/30 px-5 py-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Vérifiez votre compréhension</span>
      </div>
      <div className="px-5 py-5">
        <p className="font-semibold text-primary-deep mb-4">{block.question}</p>
        <div className="space-y-2">
          {block.choices.map((choice) => {
            let cls = "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ";
            if (!answered) {
              cls += "border-surface-warm bg-white hover:border-primary/40 hover:bg-white text-ink cursor-pointer";
            } else if (choice.label === correct) {
              cls += "border-green-400 bg-green-50 text-green-800 font-medium";
            } else if (choice.label === selected) {
              cls += "border-red-300 bg-red-50 text-red-700";
            } else {
              cls += "border-surface-warm bg-white/60 text-ink-soft";
            }
            return (
              <button
                key={choice.label}
                type="button"
                disabled={answered}
                onClick={() => setSelected(choice.label)}
                className={cls}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${selected === correct ? "bg-green-50 text-green-800 border border-green-200" : "bg-orange-50 text-orange-800 border border-orange-200"}`}>
            <span className="font-semibold mr-1">{selected === correct ? "Bonne réponse !" : "Pas tout à fait."}</span>
            {block.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Rendu segmenté (texte groupé dans prose-holenek, blocs spéciaux isolés) ──

// Blocs rendus hors du wrapper prose-holenek (ont leur propre style)
const READER_SPECIAL_TYPES = new Set([
  "callout","audio","video","video_embed","file","scenario","key_takeaway","mini_quiz",
  "code","table",
]);

function renderBlocks(blocks: Block[]): React.ReactNode {
  const segs: Array<{ kind: "text"; items: Block[] } | { kind: "special"; block: Block }> = [];
  let textBuf: Block[] = [];
  for (const b of blocks) {
    if (READER_SPECIAL_TYPES.has(b.type)) {
      if (textBuf.length > 0) { segs.push({ kind: "text", items: textBuf }); textBuf = []; }
      segs.push({ kind: "special", block: b });
    } else {
      textBuf.push(b);
    }
  }
  if (textBuf.length > 0) segs.push({ kind: "text", items: textBuf });

  return segs.map((seg, si) => {
    if (seg.kind === "special") return <BlockRenderer key={`s-${si}`} block={seg.block} />;
    return (
      <div key={`t-${si}`} className="prose-holenek" style={{ overflow: "hidden" }}>
        {seg.items.map((block) => <BlockRenderer key={block.id} block={block} />)}
      </div>
    );
  });
}


// ── Quiz final ────────────────────────────────────────────────────────────────

interface QuizProps {
  readonly items: EvaluationItem[];
  readonly moduleId: string;
  readonly moduleVersionHash: string;
  readonly pathId: string;
  readonly onComplete: (score: number) => void;
}

function Quiz({ items, moduleId, moduleVersionHash, pathId, onComplete }: QuizProps) {
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const choose = useCallback((itemId: string, label: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [itemId]: label }));
  }, [submitted]);

  async function handleSubmit() {
    if (Object.keys(answers).length < items.length) return;
    setLoading(true);
    setError(false);
    try {
      const token = (session as any)?.accessToken as string | undefined;
      const learnerId = (session as any)?.userId as string | undefined ?? "unknown";

      const res = await apiFetch("/assessment/evaluate", token, {
        method: "POST",
        body: JSON.stringify({
          learner_id: learnerId,
          module_id: moduleId,
          module_version_hash: moduleVersionHash,
          answers: Object.entries(answers).map(([item_id, answer]) => ({ item_id, answer })),
        }),
      });
      if (!res.ok) throw new Error("evaluate failed");
      const result = await res.json();
      const pct = Math.round(result.performance_score);
      setScore(pct);
      setSubmitted(true);
      onComplete(pct);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === items.length;

  if (submitted && score !== null) {
    const passed = score >= 70;
    return (
      <div className={`rounded-2xl border-2 p-10 text-center ${passed ? "border-green-300 bg-green-50" : "border-orange-300 bg-orange-50"}`}>
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${passed ? "bg-green-100" : "bg-orange-100"}`}>
          {passed ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          )}
        </div>
        <p className={`text-5xl font-extrabold ${passed ? "text-green-700" : "text-orange-700"}`}>{score}%</p>
        <p className={`mt-2 text-lg font-semibold ${passed ? "text-green-700" : "text-orange-700"}`}>
          {passed ? "Compétence validée !" : "Score insuffisant — seuil : 70%"}
        </p>
        <p className="mt-2 text-sm text-ink-soft max-w-sm mx-auto">
          {passed
            ? "Votre certification a été mise à jour dans votre passeport de compétences."
            : "Révisez les leçons et retentez le quiz quand vous êtes prêt."}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href={`/parcours/${pathId}`} className="rounded-lg border border-surface-warm px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface transition-colors">
            Retour au parcours
          </a>
          {!passed && (
            <button
              type="button"
              onClick={() => { setSubmitted(false); setScore(null); setAnswers({}); }}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
            >
              Retenter le quiz
            </button>
          )}
        </div>
        <div className="mt-10 text-left space-y-4 max-w-xl mx-auto">
          <h3 className="font-bold text-primary-deep text-lg">Corrections détaillées</h3>
          {items.map((item, qi) => {
            const chosen = answers[item.id];
            const correct = item.content.choices?.find((c) => c.is_correct)?.label;
            const isOk = chosen === correct;
            return (
              <div key={item.id} className={`rounded-xl border p-5 text-sm ${isOk ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <p className="font-semibold text-ink mb-2">Q{qi + 1}. {item.content.question_fr}</p>
                <p className={`text-xs font-medium ${isOk ? "text-green-700" : "text-red-700"}`}>
                  {isOk ? "✓ Bonne réponse" : `✗ Votre réponse : ${chosen} — Bonne réponse : ${correct}`}
                </p>
                {item.content.explanation_fr && (
                  <p className="mt-2 text-xs text-ink-soft leading-relaxed">{item.content.explanation_fr}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl rounded-2xl border border-dashed border-surface-warm bg-surface p-10 text-center">
        <p className="text-base font-semibold text-primary-deep">Quiz indisponible</p>
        <p className="mt-2 text-sm text-ink-soft">
          Aucune question n'a été créée pour ce module.
          Contactez votre formateur ou administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <p className="text-sm text-ink-soft">{answeredCount} / {items.length} questions répondues</p>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-warm">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(answeredCount / items.length) * 100}%` }} />
        </div>
      </div>
      <ol className="space-y-8">
        {items.map((item, qi) => (
          <li key={item.id} className="rounded-2xl border border-surface-warm bg-white p-6 shadow-sm">
            <p className="mb-5 font-semibold text-primary-deep flex items-start gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{qi + 1}</span>
              {item.content.question_fr}
            </p>
            <div className="space-y-2">
              {item.content.choices?.map((choice) => {
                const selected = answers[item.id] === choice.label;
                return (
                  <button
                    key={choice.label}
                    type="button"
                    onClick={() => choose(item.id, choice.label)}
                    className={`w-full rounded-xl border px-5 py-3 text-left text-sm transition-all ${
                      selected
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-surface-warm bg-white text-ink hover:border-primary/40 hover:bg-surface"
                    }`}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          Une erreur est survenue. Veuillez réessayer.
        </p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allAnswered || loading}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-deep disabled:opacity-40"
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Évaluation en cours…
          </>
        ) : "Soumettre mes réponses →"}
      </button>
    </div>
  );
}

// ── ModuleReader principal ────────────────────────────────────────────────────

interface Props {
  readonly pathId: string;
  readonly module: Module;
  readonly quizItems: EvaluationItem[];
}

export function ModuleReader({ pathId, module, quizItems }: Props) {
  const { data: session } = useSession();
  const lessons = module.content_fr?.lessons ?? [];
  const totalLessons = lessons.length;
  const unlockMode = module.content_fr?.lesson_unlock_mode ?? "free";

  // En mode libre, "voir = lu" → la leçon courante est marquée d'office.
  // En mode séquentiel, rien n'est lu : l'apprenant doit scroller + cliquer "Marquer comme lu".
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readLessons, setReadLessons] = useState<Set<number>>(
    () => unlockMode === "sequential" ? new Set() : new Set([0]),
  );
  const [showQuiz, setShowQuiz] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const lessonEndRef = useRef<HTMLDivElement>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const allRead = totalLessons > 0 && readLessons.size >= totalLessons;
  const quizAvailable = quizItems.length > 0;
  const canTakeQuiz = allRead && quizAvailable;
  const currentLesson = lessons[currentIndex] as Lesson | undefined;
  const progressPct = Math.round((readLessons.size / Math.max(totalLessons, 1)) * 100);

  function isLocked(i: number): boolean {
    return unlockMode === "sequential" && i > 0 && !readLessons.has(i - 1);
  }

  async function saveProgress(pct: number) {
    const token = (session as any)?.accessToken as string | undefined;
    const learnerId = (session as any)?.userId as string | undefined;
    if (!learnerId) return;
    await apiFetch("/learning/progress", token, {
      method: "POST",
      body: JSON.stringify({
        learner_id: learnerId,
        module_id: module.id,
        module_version_hash: module.version_hash,
        progress_percent: pct,
      }),
    }).catch(() => {});
  }

  function goTo(index: number) {
    if (isLocked(index)) return;
    setCurrentIndex(index);
    setScrolledToEnd(false);
    // Mode libre uniquement : voir = lu (rétrocompat).
    // Mode séquentiel : on attend le clic explicite "Marquer comme lu".
    if (unlockMode === "free") {
      setReadLessons((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set([...prev, index]);
        const pct = Math.round((next.size / Math.max(totalLessons, 1)) * 100);
        void saveProgress(pct);
        return next;
      });
    }
    // Le scroll reset est géré par un useEffect dépendant de currentIndex,
    // pour s'exécuter APRÈS le re-render du nouveau contenu (sinon on scrolle
    // sur l'ancienne leçon avant le swap).
  }

  function markCurrentAsRead() {
    setReadLessons((prev) => {
      if (prev.has(currentIndex)) return prev;
      const next = new Set([...prev, currentIndex]);
      const pct = Math.round((next.size / Math.max(totalLessons, 1)) * 100);
      void saveProgress(pct);
      return next;
    });
  }

  function next() {
    if (currentIndex < totalLessons - 1) goTo(currentIndex + 1);
  }

  // Reset du scroll quand on change de leçon. Le scroller réel est window
  // (le layout n'impose pas de hauteur fixe à contentRef, donc flex-1
  // overflow-y-auto ne crée pas de scroller — c'est <html>/<body> qui scrolle).
  // useLayoutEffect garantit l'exécution après commit DOM et avant paint.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [currentIndex, showQuiz]);

  // Détection scroll en bas : IntersectionObserver sur une sentinelle placée
  // après le contenu. Plus robuste que scrollTop + clientHeight (gère zoom,
  // marges, sticky footer). En complément : si le contenu tient sur 1 écran
  // (scrollHeight ≤ clientHeight + 50px), on débloque d'emblée.
  useEffect(() => {
    setScrolledToEnd(false);
    if (unlockMode !== "sequential") return;
    if (readLessons.has(currentIndex)) { setScrolledToEnd(true); return; }

    const sentinel = lessonEndRef.current;
    if (!sentinel) return;

    // Contenu court : pas besoin de scroller. On compare la hauteur totale
    // du document au viewport (puisque le scroll est sur window).
    const shortContent = document.documentElement.scrollHeight <= window.innerHeight + 50;
    if (shortContent) { setScrolledToEnd(true); return; }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.9 || entry.isIntersecting) {
            setScrolledToEnd(true);
            observer.disconnect();
            return;
          }
        }
      },
      { root: null, threshold: [0.9, 1] }, // null = viewport
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentIndex, unlockMode, readLessons]);

  function prev() {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }

  function handleQuizComplete(score: number) {
    // Quiz passé : progression à 100%
    void saveProgress(100);
  }

  return (
    <div className="-mx-6 -my-8 flex min-h-screen bg-bg">

      {/* ── Sidebar ── */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? "w-20" : "w-72 xl:w-80"} shrink-0 border-r border-surface-warm bg-white sticky top-14 self-start h-[calc(100vh-56px)] pl-6 transition-[width] duration-200`}>
        {sidebarCollapsed ? (
          <>
            <div className="px-2 py-4 border-b border-surface-warm flex justify-center">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                title="Développer la barre"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:text-primary hover:bg-surface transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <nav aria-label="Modules du parcours" className="flex-1 overflow-y-auto py-3">
              <ol className="space-y-1 flex flex-col items-center">
                {lessons.map((lesson, i) => {
                  const isActive = i === currentIndex && !showQuiz;
                  const isDone = readLessons.has(i) && i !== currentIndex;
                  const locked = isLocked(i);
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => { if (!locked) { setShowQuiz(false); goTo(i); } }}
                        title={locked ? "Terminez la leçon précédente pour débloquer" : lesson.title_fr}
                        disabled={locked}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                          locked ? "text-ink-soft/40 cursor-not-allowed" : isActive ? "bg-primary text-white" : isDone ? "bg-primary/10 text-primary" : "text-ink-soft hover:bg-surface"
                        }`}
                      >
                        {locked ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        ) : isDone ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (i + 1)}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-surface-warm">
              <div className="flex items-center justify-between mb-3">
                <a
                  href={`/parcours/${pathId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-primary transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  Retour au parcours
                </a>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Réduire la barre"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:text-primary hover:bg-surface transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              </div>
              <p className="text-xs font-semibold text-ink leading-snug line-clamp-2 mb-3">{module.title_fr}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-warm">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs font-bold text-primary tabular-nums">{progressPct}%</span>
              </div>
            </div>

            <nav aria-label="Modules du parcours" className="flex-1 overflow-y-auto px-4 py-3">
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                Contenu — {totalLessons} module{totalLessons > 1 ? "s" : ""}
              </p>
              <ol className="space-y-0.5">
                {lessons.map((lesson, i) => {
                  const isActive = i === currentIndex && !showQuiz;
                  const isDone = readLessons.has(i) && i !== currentIndex;
                  const locked = isLocked(i);
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => { if (!locked) { setShowQuiz(false); goTo(i); } }}
                        disabled={locked}
                        title={locked ? "Terminez la leçon précédente pour débloquer" : undefined}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-xs leading-snug transition-colors flex items-start gap-2.5 ${
                          locked
                            ? "opacity-50 cursor-not-allowed text-ink"
                            : isActive
                              ? "bg-primary text-white font-semibold"
                              : "text-ink hover:bg-surface"
                        }`}
                      >
                        <span className="shrink-0 mt-0.5">
                          {locked ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          ) : isDone ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold ${isActive ? "border-white text-white" : "border-ink-soft/40 text-ink-soft"}`}>{i + 1}</span>
                          )}
                        </span>
                        <span className="break-words">{lesson.title_fr}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="px-4 py-4 border-t border-surface-warm">
              <button
                type="button"
                onClick={() => canTakeQuiz && setShowQuiz(true)}
                disabled={!canTakeQuiz}
                title={!quizAvailable ? "Aucune question n'a été créée pour ce module" : undefined}
                className={`w-full rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  canTakeQuiz
                    ? "bg-primary text-white hover:bg-primary-deep shadow-sm"
                    : "bg-surface text-ink-soft cursor-not-allowed"
                }`}
              >
                {!quizAvailable
                  ? "Quiz indisponible"
                  : allRead
                    ? "Passer le quiz final →"
                    : `Quiz — ${readLessons.size} / ${totalLessons} modules lus`}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── Zone principale ── */}
      <div className="flex-1 flex flex-col min-w-0">

        <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-warm px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {!showQuiz && currentLesson && (
              <p className="text-xs text-ink-soft truncate">
                Module {currentIndex + 1} / {totalLessons} — {currentLesson.title_fr}
              </p>
            )}
            {showQuiz && (
              <p className="text-xs text-ink-soft">Quiz d'évaluation final</p>
            )}
          </div>
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <div className="w-24 h-1.5 overflow-hidden rounded-full bg-surface-warm">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-xs font-bold text-primary">{progressPct}%</span>
          </div>
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 py-8 sm:py-12">

            {showQuiz ? (
              <>
                <div className="mb-10">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Évaluation finale</p>
                  <h1 className="text-3xl font-extrabold text-primary-deep">{module.title_fr}</h1>
                  <p className="mt-3 text-ink-soft">{quizItems.length} questions · Seuil de validation : 70%</p>
                </div>
                <Quiz
                  items={quizItems}
                  moduleId={module.id}
                  moduleVersionHash={module.version_hash}
                  pathId={pathId}
                  onComplete={handleQuizComplete}
                />
              </>
            ) : currentLesson ? (
              <>
                <div className="mb-10">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                    Module {currentIndex + 1} / {totalLessons}
                  </p>
                  <h1 className="text-3xl font-extrabold text-primary-deep leading-tight">
                    {currentLesson.title_fr}
                  </h1>
                </div>

                <div className="space-y-6">
                  {renderBlocks(
                    // Supprime le premier bloc s'il est un heading dont le texte est identique au titre de la leçon
                    (() => {
                      const blocks = currentLesson.blocks;
                      const first = blocks[0];
                      if (
                        first &&
                        (first.type === "heading" || first.type === "paragraph") &&
                        first.content.map((c) => ("text" in c ? c.text : "")).join("").trim() === currentLesson.title_fr.trim()
                      ) {
                        return blocks.slice(1);
                      }
                      return blocks;
                    })()
                  )}
                </div>

                {/* Sentinelle de fin de contenu — observée par IntersectionObserver */}
                <div ref={lessonEndRef} aria-hidden="true" className="h-px w-full" />

                <div className="mt-10 flex items-center justify-between gap-4 border-t border-surface-warm pt-8">
                  <button
                    type="button"
                    onClick={prev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 rounded-xl border border-surface-warm px-5 py-3 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    Précédent
                  </button>

                  {(() => {
                    // En séquentiel : pas de passage avant d'avoir cliqué "Marquer comme lu".
                    const currentIsRead = readLessons.has(currentIndex);
                    const blocked = unlockMode === "sequential" && !currentIsRead;
                    const blockedTitle = "Marquez d'abord cette leçon comme lue";

                    if (currentIndex < totalLessons - 1) {
                      return (
                        <button
                          type="button"
                          onClick={next}
                          disabled={blocked}
                          title={blocked ? blockedTitle : undefined}
                          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition shadow-sm ${
                            blocked
                              ? "bg-surface-warm text-ink-soft cursor-not-allowed"
                              : "bg-primary text-white hover:bg-primary-deep"
                          }`}
                        >
                          Module suivant
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                      );
                    }
                    if (quizAvailable) {
                      return (
                        <button
                          type="button"
                          onClick={() => !blocked && setShowQuiz(true)}
                          disabled={blocked}
                          title={blocked ? blockedTitle : undefined}
                          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition shadow-sm ${
                            blocked
                              ? "bg-surface-warm text-ink-soft cursor-not-allowed"
                              : "bg-primary text-white hover:bg-primary-deep"
                          }`}
                        >
                          Terminer &amp; passer le quiz
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        </button>
                      );
                    }
                    return <span className="text-xs italic text-ink-soft">Module terminé · quiz indisponible</span>;
                  })()}
                </div>

                {canTakeQuiz && (
                  <div className="mt-4 md:hidden">
                    <button type="button" onClick={() => setShowQuiz(true)} className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">
                      Passer le quiz →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-surface-warm bg-surface p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-primary-deep mb-1">Ce module n'a pas encore de contenu</p>
                <p className="text-sm text-ink-soft mb-5 max-w-sm mx-auto">
                  L'administrateur doit ajouter des leçons via l'éditeur de contenu.
                </p>
                <a
                  href={`/admin/modules/${module.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep transition-colors"
                >
                  Ouvrir l'éditeur
                </a>
              </div>
            )}
          </div>

          {/* Barre sticky "Marquer comme lu" — mode séquentiel uniquement, hors quiz */}
          {!showQuiz && currentLesson && unlockMode === "sequential" && (
            <MarkAsReadBar
              isRead={readLessons.has(currentIndex)}
              ready={scrolledToEnd}
              onMark={markCurrentAsRead}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Barre sticky "Marquer comme lu" ─────────────────────────────────────────
// Ancrée en bas de la zone de lecture, change d'état selon la progression.

function MarkAsReadBar({
  isRead, ready, onMark,
}: {
  readonly isRead: boolean;
  readonly ready: boolean;
  readonly onMark: () => void;
}) {
  // État terminé — bandeau succès discret
  if (isRead) {
    return (
      <div className="sticky bottom-0 z-30 mt-4 border-t border-green-200 bg-gradient-to-r from-green-50 via-green-50 to-green-50/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2.5 px-4 py-3 sm:px-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-sm font-semibold text-green-800">Leçon terminée</p>
          <span className="text-sm text-green-700/70 hidden sm:inline">— Passez à la suivante quand vous voulez.</span>
        </div>
      </div>
    );
  }

  // États en cours — barre principale
  return (
    <div className="sticky bottom-0 z-30 mt-4 border-t border-surface-warm bg-white/90 backdrop-blur-md shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.08)]">
      {/* Liseré de progression visuelle */}
      <div className="h-1 w-full bg-surface-warm/60">
        <div
          className={`h-full transition-all duration-500 ${ready ? "bg-primary" : "bg-primary/40"}`}
          style={{ width: ready ? "100%" : "35%" }}
          aria-hidden="true"
        />
      </div>

      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8 sm:py-4">
        {/* Texte + icône d'état */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            ready ? "bg-primary/10 text-primary" : "bg-surface-warm text-ink-soft"
          }`}>
            {ready ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v17H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>
            )}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-tight ${ready ? "text-primary-deep" : "text-ink"}`}>
              {ready ? "Vous êtes au bout de la leçon" : "Continuez votre lecture"}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft leading-snug">
              {ready
                ? "Cliquez pour terminer et débloquer la leçon suivante."
                : "Scrollez jusqu'en bas pour pouvoir terminer la leçon."}
            </p>
          </div>
        </div>

        {/* Bouton principal */}
        <button
          type="button"
          onClick={onMark}
          disabled={!ready}
          aria-disabled={!ready}
          title={ready ? "Terminer cette leçon" : "Scrollez jusqu'en bas pour activer"}
          className={`group relative shrink-0 inline-flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
            ready
              ? "bg-primary text-white shadow-md hover:bg-primary-deep hover:shadow-lg active:scale-[0.98]"
              : "bg-surface-warm text-ink-soft cursor-not-allowed"
          }`}
        >
          {ready ? (
            <>
              <span className="absolute inset-0 -z-0 animate-pulse bg-primary/0 group-hover:bg-white/10" aria-hidden="true" />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Terminer la leçon
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Validation verrouillée
            </>
          )}
        </button>
      </div>
    </div>
  );
}
