/**
 * Category + source colors. Tailwind-friendly HSL strings so we can use them
 * inline for SVG, CSS, and custom style attributes. Keep the palette short so
 * categories stay visually distinct.
 */
export const PALETTE = [
  { name: "Slate",   hex: "#64748b", hsl: "215 16% 47%" },
  { name: "Red",     hex: "#ef4444", hsl: "0 84% 60%" },
  { name: "Orange",  hex: "#f97316", hsl: "24 95% 53%" },
  { name: "Amber",   hex: "#f59e0b", hsl: "38 92% 50%" },
  { name: "Lime",    hex: "#84cc16", hsl: "84 81% 44%" },
  { name: "Green",   hex: "#22c55e", hsl: "142 71% 45%" },
  { name: "Teal",    hex: "#14b8a6", hsl: "173 80% 40%" },
  { name: "Sky",     hex: "#0ea5e9", hsl: "199 89% 48%" },
  { name: "Blue",    hex: "#3b82f6", hsl: "217 91% 60%" },
  { name: "Indigo",  hex: "#6366f1", hsl: "239 84% 67%" },
  { name: "Violet",  hex: "#8b5cf6", hsl: "258 90% 66%" },
  { name: "Pink",    hex: "#ec4899", hsl: "330 81% 60%" },
] as const;

export type PaletteColor = typeof PALETTE[number]["hex"];

/** Deterministic default color for seeded items, based on a stable index. */
export function defaultColorFor(index: number): string {
  return PALETTE[index % PALETTE.length].hex;
}
