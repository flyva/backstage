"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Affiché sur toutes les pages d'administration sauf le tableau de bord lui-même (rien à quoi revenir depuis là). */
export function AdminBackLink() {
  const pathname = usePathname();
  if (pathname === "/admin") return null;
  return <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Administration</Link>;
}
