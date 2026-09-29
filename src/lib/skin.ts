// Skin personnel : partagé entre serveur (cookies, layout) et client (panneau de droite).
export const ACCENTS = ["ambre", "bleu", "indigo", "vert", "rose"] as const;
export type Accent = (typeof ACCENTS)[number];

export const ACCENT_INFO: Record<Accent, { label: string; light: string; dark: string }> = {
  ambre: { label: "Ambre (scène)", light: "#b45309", dark: "#f59e0b" },
  bleu: { label: "Bleu", light: "#0069d9", dark: "#4da3ff" },
  indigo: { label: "Indigo", light: "#4f46e5", dark: "#8b93ff" },
  vert: { label: "Émeraude", light: "#047857", dark: "#34d399" },
  rose: { label: "Rose", light: "#be185d", dark: "#f472b6" },
};

export type SidebarSkin = "dark" | "light";
export type ThemeMode = "light" | "dark";

export const isAccent = (v: unknown): v is Accent => typeof v === "string" && (ACCENTS as readonly string[]).includes(v);
export const skinFrom = (v: { theme?: string; accent?: string; sidebar?: string }) => ({
  // « system » (ancien réglage) est traité comme clair : le blanc est le thème par défaut.
  theme: (v.theme === "dark" ? "dark" : "light") as ThemeMode,
  accent: (isAccent(v.accent) ? v.accent : "ambre") as Accent,
  sidebar: (v.sidebar === "light" ? "light" : "dark") as SidebarSkin,
});
