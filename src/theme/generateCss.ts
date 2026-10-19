import { tokens as defaultTokens } from "./tokens.ts";

// Turns the design tokens into the CSS the app loads. Pure (no I/O), so the
// generate script, the tests and any future tooling can all call it.
//
// Output:
//   @theme          - the full palette as Tailwind colours (bg-blue-600, ...)
//   @theme inline   - semantic colours (bg-surface, text-text-muted, ...),
//                     referencing the variables below so dark mode applies
//   :root           - every token as a plain CSS variable (var(--blue-600),
//                     var(--text-muted), var(--fs-md), ...)
//   [data-theme="dark"] - the dark values of the semantic tokens

type Tokens = typeof defaultTokens;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const lines = (entries: [string, string][], indent = "  ") =>
  entries.map(([k, v]) => `${indent}${k}: ${v};`).join("\n");

export function tokensToCss(t: Tokens = defaultTokens): string {
  const paletteEntries = Object.entries(t.palette).flatMap(([family, scale]) =>
    Object.entries(scale).map(([step, hex]) => [`${family}-${step}`, hex as string] as [string, string]),
  );

  const semanticNames = Object.keys(t.semantic.light);
  const semanticVars = (set: Record<string, string>): [string, string][] =>
    semanticNames.map((n) => [`--${kebab(n)}`, set[n]]);

  const theme: [string, string][] = [
    ...paletteEntries.map(([n, v]) => [`--color-${n}`, v] as [string, string]),
    ["--font-sans", t.fontFamily.body],
  ];
  const themeInline = semanticNames.map((n) => [`--color-${kebab(n)}`, `var(--${kebab(n)})`] as [string, string]);

  const root: [string, string][] = [
    ...paletteEntries.map(([n, v]) => [`--${n}`, v] as [string, string]),
    ["--white", t.basics.white],
    ["--black", t.basics.black],
    ...semanticVars(t.semantic.light as unknown as Record<string, string>),
    ["--font-body", t.fontFamily.body],
    ["--font-heading", t.fontFamily.heading],
    ...Object.entries(t.fontSize).map(([n, v]) => [`--fs-${n}`, v] as [string, string]),
    ...Object.entries(t.radius).map(([n, v]) => [`--border-radius-${n}`, v] as [string, string]),
    ...Object.entries(t.shadow).map(([n, v]) => [`--shadow-${n}`, v] as [string, string]),
    ["--brand-whatsapp", t.brand.whatsapp],
    ["--brand-whatsapp-soft", t.brand.whatsappSoft],
    ["--brand-whatsapp-soft-hover", t.brand.whatsappSoftHover],
    ...(Object.entries(t.legacy) as [string, string][]),
  ];

  return [
    "/* GENERATED from src/theme/tokens.ts by scripts/generate-tokens.mjs (pnpm tokens) - do not edit. */",
    "",
    "@theme {",
    lines(theme),
    "}",
    "",
    "@theme inline {",
    lines(themeInline),
    "}",
    "",
    ":root {",
    lines(root),
    "}",
    "",
    '[data-theme="dark"] {',
    lines(semanticVars(t.semantic.dark as unknown as Record<string, string>)),
    "  color-scheme: dark;",
    "}",
    "",
  ].join("\n");
}
