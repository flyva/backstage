"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { users, faqItems, usefulLinks, settings } from "@/db/schema";
import {
  createSession, destroyOtherSessions, destroySession, hashPassword, verifyPassword,
  requireUser, requireAdmin, getSessionUser,
} from "@/lib/auth";
import { newUserRoleId } from "@/lib/roles";
import { SETTING_KEYS } from "@/lib/settings";
import { geocode } from "@/lib/mobility";
import { allow, clientIp } from "@/lib/rate-limit";
import { allowedDomainsFromEnv, emailInDomains } from "@/lib/email-domain";
import { joinName } from "@/lib/names";
import { skinFrom } from "@/lib/skin";
import { writeSkinCookies } from "@/lib/skin-cookies";
import { timingSafeEqual } from "node:crypto";
import { fetchIcal, clearIcalCache } from "@/lib/ical";
import { notifyPendingAccount } from "@/lib/admin-notify";
import { startVerifiedRegistration } from "@/lib/registration-verify";
import { verificationEnabled } from "@/lib/mail";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

// Prénom ou nom : au moins une lettre, 60 caractères maximum.
const personName = (label: string) =>
  z.string().trim().min(1, `${label} requis`).max(60, `${label} trop long (60 caractères max)`).regex(/\p{L}/u, `${label} invalide`);

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const keep = { email: String(fd.get("email") ?? "") };
  const parsed = credentials.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep };
  const ip = await clientIp();
  // Anti force brute : par couple IP+email, et par IP.
  if (!allow(`login:${ip}:${parsed.data.email}`, 8, 10 * 60e3) || !allow(`login-ip:${ip}`, 40, 10 * 60e3)) {
    return { error: "Trop de tentatives : réessaie dans quelques minutes", values: keep };
  }
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Même message que l'email ou le mot de passe soit faux.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return { error: "Identifiants incorrects", values: keep };
  if (user.status === "disabled") return { error: "Ce compte est désactivé. Contacte un administrateur.", values: keep };
  await createSession(user.id);
  await writeSkinCookies(skinFrom(user)); // retrouve son skin sur cet appareil
  redirect("/");
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  if (process.env.LOCAL_REGISTRATION === "off") return { error: "L'inscription se fait avec le compte Microsoft de l'école." };
  const keep = { firstName: String(fd.get("firstName") ?? ""), lastName: String(fd.get("lastName") ?? ""), email: String(fd.get("email") ?? "") };
  const parsed = credentials
    .extend({ firstName: personName("Prénom"), lastName: personName("Nom") })
    .safeParse({ email: fd.get("email"), password: fd.get("password"), firstName: fd.get("firstName"), lastName: fd.get("lastName") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep };
  const { email, password } = parsed.data;
  const firstName = parsed.data.firstName.replace(/\s+/g, " ");
  const lastName = parsed.data.lastName.replace(/\s+/g, " ");
  // Domaines autorisés (ex. 3is.fr) : aucune inscription avec une autre adresse.
  const domains = allowedDomainsFromEnv();
  if (domains.length > 0 && !emailInDomains(email, domains)) {
    return { error: `Seules les adresses ${domains.map((d) => `@${d}`).join(", ")} peuvent s'inscrire.`, values: keep };
  }
  if (String(fd.get("password2") ?? "") !== password) return { error: "Les deux mots de passe ne correspondent pas", values: keep };

  if (!allow(`register:${await clientIp()}`, 5, 60 * 60e3)) return { error: "Trop d'inscriptions depuis cette adresse : réessaie plus tard", values: keep };
  // Si REGISTRATION_CODE est défini, l'inscription est réservée aux personnes qui le connaissent.
  const required = process.env.REGISTRATION_CODE;
  if (required) {
    const given = Buffer.from(String(fd.get("code") ?? "").trim());
    const expected = Buffer.from(required);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { error: "Code d'invitation incorrect", values: keep };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "Un compte existe déjà avec cet email", values: keep };

  // Avec l'envoi de mails configuré, l'adresse doit être confirmée par un lien : le compte n'est créé qu'après le clic (sauf le tout premier, l'administrateur).
  if (verificationEnabled()) {
    const [{ active }] = await db.select({ active: count() }).from(users).where(eq(users.status, "active"));
    if (active > 0) {
      const result = await startVerifiedRegistration({ email, firstName, lastName, passwordHash: await hashPassword(password) });
      return result?.error ? { ...result, values: keep } : result;
    }
  }

  // Le tout premier compte devient administrateur.
  // Seuls les comptes ACTIFS comptent : un compte Google en attente ne doit pas empêcher le premier vrai compte de devenir administrateur.
  const [{ total }] = await db.select({ total: count() }).from(users).where(eq(users.status, "active"));
  const [res] = await db.insert(users).values({
    email, firstName, lastName, name: joinName(firstName, lastName), passwordHash: await hashPassword(password),
    roleId: await newUserRoleId(total === 0),
  });
  await createSession(res.insertId);
  redirect("/profil?bienvenue=1");
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(fd.get("currentPassword") ?? "");
  const next = String(fd.get("newPassword") ?? "");
  if (next.length < 8) return { error: "Le nouveau mot de passe doit faire 8 caractères minimum" };
  if (next.length > 200) return { error: "Mot de passe trop long" };
  if (next !== String(fd.get("newPassword2") ?? "")) return { error: "Les deux mots de passe ne correspondent pas" };
  // Anti force brute sur le mot de passe actuel.
  if (!allow(`chpw:${user.id}`, 6, 10 * 60e3)) return { error: "Trop de tentatives : réessaie dans quelques minutes" };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Le mot de passe actuel est incorrect" };
  if (next === current) return { error: "Le nouveau mot de passe doit être différent de l'actuel" };

  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
  // Les autres appareils connectés sont déconnectés ; celui-ci reste ouvert.
  await destroyOtherSessions(user.id);
  return { ok: "Mot de passe modifié. Les autres appareils ont été déconnectés." };
}

/** La cloche vient d'être ouverte : tout ce qui est plus ancien compte comme lu. */
export async function markNotificationsSeen() {
  const user = await requireUser();
  await db.update(users).set({ notifSeenAt: new Date() }).where(eq(users.id, user.id));
  // Pas de revalidatePath : la pastille est déjà à zéro côté navigateur, et on évite de recharger la page.
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** Enregistre le skin de la personne (cookie pour l'affichage immédiat, base pour le retrouver sur un autre appareil). */
export async function setSkin(patch: { theme?: string; accent?: string; sidebar?: string }) {
  const user = await requireUser();
  const next = skinFrom({ theme: patch.theme ?? user.theme, accent: patch.accent ?? user.accent, sidebar: patch.sidebar ?? user.sidebar });
  await db.update(users).set(next).where(eq(users.id, user.id));
  await writeSkinCookies(next);
}

const profileSchema = z.object({
  firstName: personName("Prénom"),
  lastName: personName("Nom"),
  homeAddress: z.string().trim().max(255),
  companyName: z.string().trim().max(120),
  companyAddress: z.string().trim().max(255),
  icalUrl: z
    .string().trim().max(1000)
    .refine((v) => v === "" || /^(https?|webcal):\/\//i.test(v), "Le lien doit commencer par https://"),
});

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: fd.get("firstName"),
    lastName: fd.get("lastName"),
    homeAddress: fd.get("homeAddress") ?? "",
    companyName: fd.get("companyName") ?? "",
    companyAddress: fd.get("companyAddress") ?? "",
    icalUrl: fd.get("icalUrl") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { homeAddress, companyName, companyAddress, icalUrl } = parsed.data;
  const firstName = parsed.data.firstName.replace(/\s+/g, " ");
  const lastName = parsed.data.lastName.replace(/\s+/g, " ");
  let place = null;
  if (homeAddress) {
    place = await geocode(homeAddress);
    if (!place) return { error: "Adresse introuvable : essaie avec numéro, rue et ville" };
  }
  let company = null;
  if (companyAddress) {
    company = await geocode(companyAddress);
    if (!company) return { error: "Adresse de l'entreprise introuvable : essaie avec numéro, rue et ville" };
  }
  // On vérifie que le lien iCal est bien lisible avant de l'enregistrer.
  const ical = icalUrl ? icalUrl.replace(/^webcal:/i, "https:") : "";
  if (ical) {
    try {
      await fetchIcal(ical, { force: true });
    } catch (e) {
      return { error: `Lien iCalendar inutilisable : ${e instanceof Error ? e.message : "erreur inconnue"}` };
    }
  }
  await db.update(users).set({
    firstName,
    lastName,
    name: joinName(firstName, lastName),
    homeAddress: place?.label ?? null,
    homeLat: place?.lat ?? null,
    homeLng: place?.lng ?? null,
    companyName: companyName || null,
    companyAddress: company?.label ?? null,
    companyLat: company?.lat ?? null,
    companyLng: company?.lng ?? null,
    icalUrl: ical || null,
    onboarded: true,
  }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: "Profil enregistré" };
}

/** Message d'une personne en attente de validation : il s'affiche à l'administrateur avec sa demande. */
export async function saveRequestNote(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser(); // requireUser renverrait la personne en attente vers /en-attente
  if (!user || user.status !== "pending") return { error: "Ton compte n'est pas en attente." };
  const note = String(fd.get("note") ?? "").trim();
  if (note.length > 500) return { error: "500 caractères maximum" };
  if (!allow(`note:${user.id}`, 10, 60 * 60e3)) return { error: "Trop de modifications : réessaie plus tard." };
  const [before] = await db.select({ note: users.requestNote }).from(users).where(eq(users.id, user.id)).limit(1);
  await db.update(users).set({ requestNote: note || null }).where(eq(users.id, user.id));
  if (note && !before?.note) await notifyPendingAccount({ name: user.name, email: user.email, note }); // premier message : l'administrateur est prévenu avec le texte
  revalidatePath("/admin");
  return { ok: "Message enregistré : l'administrateur le verra avec ta demande." };
}

// ---------- Administration ----------

export async function approveUser(fd: FormData) {
  await requireAdmin();
  await db.update(users).set({ status: "active" }).where(eq(users.id, Number(fd.get("id"))));
  revalidatePath("/admin");
}

/** Refuser un compte en attente = le supprimer (la personne pourra se reconnecter, et sera de nouveau mise en attente). */
export async function rejectUser(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const [u] = await db.select({ status: users.status }).from(users).where(eq(users.id, id)).limit(1);
  if (u?.status === "pending") await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin");
}

const faqSchema = z.object({
  category: z.string().trim().min(1).max(80),
  question: z.string().trim().min(3).max(255),
  answer: z.string().trim().min(1),
});

export async function addFaq(fd: FormData) {
  await requireAdmin();
  const p = faqSchema.safeParse(Object.fromEntries(fd));
  if (p.success) await db.insert(faqItems).values(p.data);
  revalidatePath("/faq");
  revalidatePath("/admin", "layout");
}

export async function deleteFaq(fd: FormData) {
  await requireAdmin();
  await db.delete(faqItems).where(eq(faqItems.id, Number(fd.get("id"))));
  revalidatePath("/faq");
  revalidatePath("/admin", "layout");
}

const linkSchema = z.object({
  category: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(1000),
  description: z.string().trim().max(255).optional(),
});

export async function addLink(fd: FormData) {
  await requireAdmin();
  const p = linkSchema.safeParse(Object.fromEntries(fd));
  if (p.success) await db.insert(usefulLinks).values(p.data);
  revalidatePath("/liens");
  revalidatePath("/admin", "layout");
}

export async function deleteLink(fd: FormData) {
  await requireAdmin();
  await db.delete(usefulLinks).where(eq(usefulLinks.id, Number(fd.get("id"))));
  revalidatePath("/liens");
  revalidatePath("/admin", "layout");
}

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const feed = String(fd.get("instagram_feed_url") ?? "").trim();
  if (feed && !feed.toLowerCase().startsWith("https://")) return { error: "Le flux Instagram doit être un lien https://" };
  for (const key of SETTING_KEYS) {
    if (key === "school_map_file" || !fd.has(key)) continue;
    const value = String(fd.get(key) ?? "").trim();
    await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
  }
  const schoolAddress = String(fd.get("school_address") ?? "").trim();
  if (schoolAddress) {
    const place = await geocode(schoolAddress);
    if (!place) return { error: "Adresse de l'école introuvable" };
    for (const [key, value] of [["school_lat", String(place.lat)], ["school_lng", String(place.lng)]]) {
      await db.insert(settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
    }
  }
  const map = fd.get("school_map");
  if (map instanceof File && map.size > 0) {
    const ext = IMAGE_TYPES[map.type];
    if (!ext) return { error: "Le plan doit être une image PNG, JPG ou WebP" };
    if (map.size > 8 * 1024 * 1024) return { error: "Image trop lourde (8 Mo max)" };
    const name = `plan-${randomBytes(6).toString("hex")}.${ext}`;
    const dir = path.join(process.cwd(), "data", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await map.arrayBuffer()));
    await db
      .insert(settings)
      .values({ key: "school_map_file", value: name })
      .onDuplicateKeyUpdate({ set: { value: name } });
  }
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés" };
}

export async function refreshAgenda() {
  const user = await requireUser();
  if (user.icalUrl) clearIcalCache(user.icalUrl);
  revalidatePath("/agenda");
  revalidatePath("/");
}
