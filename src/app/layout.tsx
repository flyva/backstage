import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { skinFrom } from "@/lib/skin";
import { PwaRegister } from "@/components/PwaRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Backstage", template: "%s · Backstage" },
  description: "Le hub de travail et d'information de la promo 3IS.",
  appleWebApp: { capable: true, title: "Backstage", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#f59e0b" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  // Skin lu dans les cookies : appliqué dès le premier affichage, sans clignotement.
  const skin = skinFrom({ theme: jar.get("theme")?.value, accent: jar.get("accent")?.value, sidebar: jar.get("sidebar")?.value });
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${skin.theme === "dark" ? "dark" : ""} h-full antialiased`}
      data-accent={skin.accent}
      data-sidebar={skin.sidebar}
      // Des extensions (LanguageTool, etc.) ajoutent des attributs sur <html>/<body> avant React : sans cela, alerte d'hydratation.
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
