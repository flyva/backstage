import { asc } from "drizzle-orm";
import { Mail, Phone, Trash2 } from "lucide-react";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deleteContact } from "@/lib/guide-actions";
import { ContactForm } from "@/components/guide-forms";

export const metadata = { title: "Contacts de l'école" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = norm(typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const rows = await db.select().from(contacts).orderBy(asc(contacts.position), asc(contacts.id));
  const list = q ? rows.filter((c) => norm(`${c.name} ${c.role ?? ""} ${c.groupName} ${c.email ?? ""}`).includes(q)) : rows;
  const groups = Map.groupBy(list, (c) => c.groupName);
  const allGroups = [...new Set(rows.map((c) => c.groupName))];
  const admin = user.perms.administration;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Contacts de l&apos;école</h1>
        <p className="text-sm text-muted">Qui contacter, pour quoi. Les adresses viennent du guide de rentrée 2026-2027.</p>
      </header>

      <form role="search" className="flex gap-2">
        <input name="q" defaultValue={typeof sp.q === "string" ? sp.q : ""} placeholder="Rechercher un nom, une fonction (« stage », « informatique »…)" aria-label="Rechercher" className="input max-w-md" />
        <button className="btn-ghost">Rechercher</button>
      </form>

      {rows.length === 0 && (
        <p className="text-sm text-muted">L&apos;annuaire est vide.{admin ? " Importe le guide de rentrée depuis Administration → Général." : ""}</p>
      )}
      {rows.length > 0 && list.length === 0 && <p className="text-sm text-muted">Aucun contact ne correspond.</p>}

      {[...groups].map(([group, people]) => (
        <section key={group} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{group}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {people.map((c) => (
              <li key={c.id} className="card space-y-1.5 p-4">
                <div className="font-medium">{c.name}</div>
                {c.role && <div className="text-sm text-muted">{c.role}</div>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-accent hover:underline"><Mail size={14} /> {c.email}</a>}
                  {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-accent hover:underline"><Phone size={14} /> {c.phone}</a>}
                </div>
                {c.note && <p className="text-xs text-muted">{c.note}</p>}
                {admin && (
                  <details className="border-t border-line pt-2">
                    <summary className="cursor-pointer text-xs text-muted hover:text-fg">Modifier</summary>
                    <div className="space-y-3 pt-3">
                      <ContactForm groups={allGroups} contact={{ id: c.id, groupName: c.groupName, name: c.name, role: c.role ?? "", email: c.email ?? "", phone: c.phone ?? "", note: c.note ?? "" }} />
                      <form action={deleteContact} className="border-t border-line pt-3"><input type="hidden" name="id" value={c.id} /><button className="flex items-center gap-1 text-xs text-muted hover:text-danger"><Trash2 size={14} /> Supprimer</button></form>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {admin && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Ajouter un contact</h2>
          <ContactForm groups={allGroups} />
        </section>
      )}
    </div>
  );
}
