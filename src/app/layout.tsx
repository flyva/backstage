import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Backstage", template: "%s · Backstage" },
  description: "Le hub de travail et d'information de la promo 3IS.",
  appleWebApp: { capable: true, title: "Backstage", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#f59e0b" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("theme")?.value;
  const cls = theme === "dark" ? "dark" : theme === "light" ? "light" : "";
  return (
    <html lang="fr" className={`${geistSans.variable} ${cls} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
