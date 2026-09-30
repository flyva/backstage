"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, faqItems, settings, usefulLinks, wikiPages, wikiRevisions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { geocode } from "@/lib/mobility";
import { GUIDE_CONTACTS, GUIDE_FAQ, GUIDE_LINKS, GUIDE_PAGES, GUIDE_SETTINGS } from "@/lib/guide-data";
import type { FormState } from "@/lib/actions";

/**
 * Importe le guide de rentrée 2026-2027 dans Backstage : annuaire, FAQ, liens utiles, pages du wiki et réglages de l'école.
 * Sans danger si on le relance : ce qui existe déjà n'est jamais écrasé ni dupliqué.
 */
export async function importGuide(): Promise<FormState> {
  const admin = await requireAdmin();
  const n = { contacts: 0, faq: 0, links: 0, pages: 0, settings: 0 };

  const existingContacts = await db.select().from(contacts);
  const key = (c: { groupName: string; name: string; email: string | null }) => `${c.groupName}|${c.name}|${c.email ?? ""}`.toLowerCase();
  const have = new Set(existingContacts.map(key));
  let position = existingContacts.length;
  for (const c of GUIDE_CONTACTS) {
    const row = { groupName: c.group, name: c.name, role: c.role, email: c.email ?? null, phone: c.phone ?? null, note: c.note ?? null, position: position++ };
    if (have.has(key(row))) continue;
    await db.insert(contacts).values(row);
    n.contacts++;
  }

  const faqCategoryCount = new Map<string, number>();
  const haveFaq = new Set((await db.select({ q: faqItems.question, c: faqItems.category }).from(faqItems)).map((f) => { faqCategoryCount.set(f.c, (faqCategoryCount.get(f.c) ?? 0) + 1); return f.q.toLowerCase(); }));
  for (const f of GUIDE_FAQ) {
    if (haveFaq.has(f.question.toLowerCase())) continue;
    const pos = faqCategoryCount.get(f.category) ?? 0;
    faqCategoryCount.set(f.category, pos + 1);
    await db.insert(faqItems).values({ ...f, position: pos });
    n.faq++;
  }

  const haveLinks = new Set((await db.select({ u: usefulLinks.url }).from(usefulLinks)).map((l) => l.u.toLowerCase()));
  let lp = haveLinks.size;
  for (const l of GUIDE_LINKS) {
    if (haveLinks.has(l.url.toLowerCase())) continue;
    await db.insert(usefulLinks).values({ ...l, position: lp++ });
    n.links++;
  }

  const now = new Date();
  const idBySlug = new Map((await db.select({ id: wikiPages.id, slug: wikiPages.slug }).from(wikiPages)).map((p) => [p.slug, p.id]));
  for (const p of GUIDE_PAGES) {
    if (idBySlug.has(p.slug)) continue;
    const parentId = p.parent ? (idBySlug.get(p.parent) ?? null) : null;
    const [res] = await db.insert(wikiPages).values({ slug: p.slug, title: p.title, category: p.category, parentId, body: p.body, createdBy: admin.id, updatedBy: admin.id, createdAt: now, updatedAt: now });
    await db.insert(wikiRevisions).values({ pageId: res.insertId, title: p.title, body: p.body, editorId: admin.id, createdAt: now });
    idBySlug.set(p.slug, res.insertId);
    n.pages++;
  }

  // Réglages : seulement s'ils sont vides (on ne remplace jamais ce qu'un admin a saisi).
  const current = new Map((await db.select().from(settings)).map((s) => [s.key, s.value]));
  const put = async (k: string, v: string) => { await db.insert(settings).values({ key: k, value: v }).onDuplicateKeyUpdate({ set: { value: v } }); n.settings++; };
  if (!current.get("school_address")) {
    const place = await geocode(GUIDE_SETTINGS.school_address).catch(() => null);
    await put("school_address", GUIDE_SETTINGS.school_address);
    if (place) { await put("school_lat", String(place.lat)); await put("school_lng", String(place.lng)); }
  }
  if (!current.get("wifi_ssid")) {
    await put("wifi_ssid", GUIDE_SETTINGS.wifi_ssid);
    await put("wifi_security", GUIDE_SETTINGS.wifi_security);
  }

  revalidatePath("/", "layout");
  const total = n.contacts + n.faq + n.links + n.pages + n.settings;
  return { ok: total === 0 ? "Tout est déjà à jour : rien à ajouter." : `Ajouté : ${n.contacts} contact(s), ${n.faq} question(s) FAQ, ${n.links} lien(s), ${n.pages} page(s) du wiki, ${n.settings} réglage(s).` };
}

// ---------- Annuaire ----------

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

export async function saveContact(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = clean(fd.get("name"), 120);
  const groupName = clean(fd.get("groupName"), 80);
  if (!name || !groupName) return { error: "Le nom et le groupe sont requis" };
  const email = clean(fd.get("email"), 190);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse e-mail invalide" };
  const values = { name, groupName, role: clean(fd.get("role"), 160), email, phone: clean(fd.get("phone"), 30), note: clean(fd.get("note"), 300) };
  const raw = Number(fd.get("id") || 0);
  if (raw) await db.update(contacts).set(values).where(eq(contacts.id, raw));
  else {
    const same = await db.select({ i: contacts.id }).from(contacts).where(and(eq(contacts.groupName, groupName)));
    await db.insert(contacts).values({ ...values, position: same.length + 1000 });
  }
  revalidatePath("/contacts");
  return { ok: raw ? "Contact enregistré" : "Contact ajouté" };
}

export async function deleteContact(fd: FormData) {
  await requireAdmin();
  await db.delete(contacts).where(eq(contacts.id, Number(fd.get("id"))));
  revalidatePath("/contacts");
}
