// Refs: SPEC.md §8 — WCAG AA
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  primary: "rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2",
  secondary: "rounded-lg border border-surface-warm px-6 py-3 text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2",
  ghost: "rounded-lg px-4 py-2 text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`${variantClass[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
