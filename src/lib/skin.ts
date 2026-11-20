// Thème personnel : clair/sombre + couleur d'accent (mêmes 7 couleurs que BDE, voir src/lib/accents.ts de BDE).
// Partagé entre serveur (cookies, layout) et client (bascule rapide, panneau Apparence du profil).
export type ThemeMode = "light" | "dark";

export const ACCENTS = ["blue", "violet", "green", "red", "amber", "cyan", "white"] as const;
export type Accent = (typeof ACCENTS)[number];

export const ACCENT_INFO: Record<Accent, { label: string; hex: string }> = {
  blue: { label: "Bleu", hex: "#1d4ed8" },
  violet: { label: "Violet", hex: "#7c3aed" },
  green: { label: "Vert", hex: "#059669" },
  red: { label: "Rouge", hex: "#dc2626" },
  amber: { label: "Ambre", hex: "#d97706" },
  cyan: { label: "Cyan", hex: "#0891b2" },
  white: { label: "Blanc / Noir", hex: "#ffffff" },
};

export const isAccent = (v: unknown): v is Accent => typeof v === "string" && (ACCENTS as readonly string[]).includes(v);

export const skinFrom = (v: { theme?: string; accent?: string }) => ({
  // Sombre par défaut (aussi pour l'ancien réglage « system » et pour un visiteur sans préférence enregistrée).
  theme: (v.theme === "light" ? "light" : "dark") as ThemeMode,
  accent: (isAccent(v.accent) ? v.accent : "blue") as Accent,
});
