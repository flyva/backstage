"use client";

import { usePathname } from "next/navigation";

// Sur mobile, une seule colonne à la fois : la liste des conversations, ou la conversation ouverte (avec un lien
// « ← Messages » pour revenir). Sur grand écran, les deux colonnes restent visibles côte à côte en permanence.
export function ListPane({ children }: { children: React.ReactNode }) {
  const onList = usePathname() === "/messages";
  return <div className={onList ? "block" : "hidden lg:block"}>{children}</div>;
}

export function ContentPane({ children }: { children: React.ReactNode }) {
  const onList = usePathname() === "/messages";
  return <div className={onList ? "hidden lg:block" : "block"}>{children}</div>;
}
