// Thème personnel : clair/sombre uniquement (couleurs reprises de BDE, non personnalisables).
// Partagé entre serveur (cookies, layout) et client (bascule rapide).
export type ThemeMode = "light" | "dark";

export const skinFrom = (v: { theme?: string }) => ({
  // Sombre par défaut (aussi pour l'ancien réglage « system » et pour un visiteur sans préférence enregistrée).
  theme: (v.theme === "light" ? "light" : "dark") as ThemeMode,
});
