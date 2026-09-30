import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome, à compiler sur le PC puis copier sur le Raspberry Pi.
  output: "standalone",
  // Développement : le navigateur intégré ouvre le site sur 127.0.0.1 (sinon Next bloque l'hydratation).
  allowedDevOrigins: ["127.0.0.1", "*.localhost"],
  // sharp n'a pas de binaire prêt pour ARM 32 bits : pas d'optimisation d'image.
  images: { unoptimized: true },
  // Lecture des calendriers PDF (pdfjs) : chargé tel quel côté serveur, avec son fichier « worker » inclus dans le build autonome.
  serverExternalPackages: ["pdfjs-dist"],
  // Le dossier dist/ (anciens paquets) et les caches ne doivent jamais se retrouver dans le paquet de déploiement.
  outputFileTracingIncludes: { "/api/alternance/calendar": ["./node_modules/pdfjs-dist/legacy/build/**"] },
};

export default nextConfig;
