// Refs: SPEC.md §8 — WCAG AA
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: "article" | "section" | "div";
}

export function Card({ as: Tag = "div", className = "", children, ...props }: CardProps) {
  return (
    <Tag className={`rounded-xl border border-surface-warm bg-white p-6 shadow-sm ${className}`} {...props}>
      {children}
    </Tag>
  );
}
