import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Mail, Phone } from "lucide-react";
import { getCard } from "@/lib/card";
import { LINK_LABEL } from "@/lib/people-shared";
import { Avatar } from "@/components/people-forms";

// Carte de visite publique : accessible sans compte avec le lien secret, jamais indexée par les moteurs de recherche.
export const metadata: Metadata = { title: "Carte de visite", robots: { index: false, follow: false } };

export default async function CardPage({ params }: PageProps<"/carte/[slug]">) {
  const { slug } = await params;
  const c = await getCard(slug);
  if (!c) notFound();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <div className="card space-y-5 p-6 text-center">
        <div className="flex justify-center"><Avatar name={c.name} url={c.avatar} size={112} /></div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          {c.headline && <p className="text-muted">{c.headline}</p>}
          {c.track && <span className="inline-block rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">{c.track}</span>}
        </div>
        <div className="space-y-2">
          {c.email && <a href={`mailto:${c.email}`} className="btn w-full"><Mail size={16} aria-hidden /> {c.email}</a>}
          {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="btn-ghost w-full"><Phone size={16} aria-hidden /> {c.phone}</a>}
        </div>
        {c.links.length > 0 && (
          <ul className="space-y-2">
            {c.links.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost w-full">{l.label || LINK_LABEL[l.kind]}</a>
              </li>
            ))}
          </ul>
        )}
        <a href={`/carte/${slug}/vcf`} className="inline-flex items-center gap-1.5 text-sm text-muted underline"><Download size={14} aria-hidden /> Ajouter à mes contacts</a>
      </div>
      <p className="text-center text-xs text-muted">Carte créée avec Backstage · le hub de la promo 3IS</p>
    </main>
  );
}
