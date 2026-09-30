import { asc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { users, faqItems, usefulLinks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/forms";
import { addFaq, deleteFaq, addLink, deleteLink, setRole, approveUser, rejectUser } from "@/lib/actions";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [settings, allUsers, faq, links] = await Promise.all([
    getSettings(),
    db.select().from(users).orderBy(asc(users.createdAt)),
    db.select().from(faqItems).orderBy(asc(faqItems.category), asc(faqItems.id)),
    db.select().from(usefulLinks).orderBy(asc(usefulLinks.category), asc(usefulLinks.id)),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Administration</h1>

      <section className="card space-y-3">
        <h2 className="font-semibold">Paramètres de l&apos;école</h2>
        <SettingsForm values={settings as Record<string, string>} />
      </section>

      {allUsers.some((u) => u.status === "pending") && (
        <section className="card space-y-3 border-accent">
          <h2 className="font-semibold">En attente de validation ({allUsers.filter((u) => u.status === "pending").length})</h2>
          <p className="text-sm text-muted">
            Comptes Google personnels (adresse hors école) : ils n&apos;ont accès à rien tant que tu ne les as pas validés.
          </p>
          <ul className="divide-y divide-line text-sm">
            {allUsers.filter((u) => u.status === "pending").map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="truncate text-xs text-muted">{u.email}</div>
                </div>
                <form action={approveUser}><input type="hidden" name="id" value={u.id} /><button className="btn">Valider</button></form>
                <form action={rejectUser}><input type="hidden" name="id" value={u.id} /><button className="btn-ghost">Refuser</button></form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Utilisateurs ({allUsers.filter((u) => u.status === "active").length})</h2>
        <ul className="divide-y divide-line text-sm">
          {allUsers.filter((u) => u.status === "active").map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.name}</div>
                <div className="truncate text-xs text-muted">{u.email}</div>
              </div>
              {u.id === admin.id ? (
                <span className="text-xs text-muted">Toi (admin)</span>
              ) : (
                <form action={setRole} className="flex gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="input w-auto">
                    <option value="member">Membre</option>
                    <option value="materiel">Référent matériel</option>
                    <option value="bde">BDE</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn-ghost">OK</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">FAQ ({faq.length})</h2>
        <form action={addFaq} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <input name="category" placeholder="Catégorie" defaultValue="Général" required className="input" />
          <input name="question" placeholder="Question" required className="input" />
          <textarea name="answer" placeholder="Réponse" required rows={3} className="input sm:col-span-2" />
          <button className="btn sm:col-span-2 sm:justify-self-start">Ajouter</button>
        </form>
        <ul className="divide-y divide-line text-sm">
          {faq.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 truncate"><span className="text-muted">{f.category} · </span>{f.question}</span>
              <form action={deleteFaq}>
                <input type="hidden" name="id" value={f.id} />
                <button className="text-muted hover:text-danger" aria-label="Supprimer"><Trash2 size={16} /></button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Liens utiles ({links.length})</h2>
        <form action={addLink} className="grid gap-2 sm:grid-cols-2">
          <input name="category" placeholder="Catégorie" defaultValue="École" required className="input" />
          <input name="label" placeholder="Titre" required className="input" />
          <input name="url" type="url" placeholder="https://…" required className="input" />
          <input name="description" placeholder="Description (optionnel)" className="input" />
          <button className="btn sm:justify-self-start">Ajouter</button>
        </form>
        <ul className="divide-y divide-line text-sm">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 truncate"><span className="text-muted">{l.category} · </span>{l.label}</span>
              <form action={deleteLink}>
                <input type="hidden" name="id" value={l.id} />
                <button className="text-muted hover:text-danger" aria-label="Supprimer"><Trash2 size={16} /></button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
