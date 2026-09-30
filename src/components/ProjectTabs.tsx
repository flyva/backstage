"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ base, tabs }: { base: string; tabs: { slug: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-1 border-b border-line" aria-label="Sections du projet">
      {tabs.map(({ slug, label }) => {
        const href = slug ? `${base}/${slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active ? "border-accent font-medium text-accent" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
