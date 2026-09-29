import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Backstage",
    short_name: "Backstage",
    description: "Le hub de travail et d'information de la promo 3IS.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e0e13",
    theme_color: "#f59e0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", url: "/agenda" },
      { name: "Mobilité", url: "/mobilite" },
      { name: "Matériel", url: "/materiel" },
    ],
  };
}
