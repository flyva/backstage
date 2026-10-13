import type { MetadataRoute } from "next";
import { siteIconVersion } from "@/lib/site-icon";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const v = await siteIconVersion();
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
    // La version « any » est en plein cadre ; la version « maskable » a une marge de sécurité (sinon Android rogne
    // le logo selon la forme de son launcher une fois l'app installée).
    icons: v
      ? [
          { src: `/icon-site?v=${v}`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `/icon-site/maskable?v=${v}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [
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
