import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autonome, à compiler sur le PC puis copier sur le Raspberry Pi.
  output: "standalone",
  // sharp n'a pas de binaire prêt pour ARM 32 bits : pas d'optimisation d'image.
  images: { unoptimized: true },
};

export default nextConfig;
