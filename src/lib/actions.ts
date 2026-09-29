"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { users, faqItems, usefulLinks, settings } from "@/db/schema";
import {
  createSession, destroySession, hashPassword, verifyPassword,
  requireUser, requireAdmin,
} from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/settings";
import { geocode } from "@/lib/mobility";
import { allow, clientIp } from "@/lib/rate-limit";
import { timingSafeEqual } from "node:crypto";
import { fetchIcal, clearIcalCache } from "@/lib/ical";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

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
  await createSession(user.id);
  redirect("/");
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const keep = { name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? "") };
  const parsed = credentials
    .extend({ name: z.string().trim().min(2, "Nom trop court").max(120) })
    .safeParse({ email: fd.get("email"), password: fd.get("password"), name: fd.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: keep };
  const { email, password, name } = parsed.data;

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

  // Le tout premier compte devient administrateur.
  const [{ total }] = await db.select({ total: count() }).from(users);
  const [res] = await db.insert(users).values({
    email, name, passwordHash: await hashPassword(password),
    role: total === 0 ? "admin" : "member",
  });
  await createSession(res.insertId);
  redirect("/profil?bienvenue=1");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setTheme(theme: "system" | "light" | "dark") {
  (await cookies()).set("theme", theme, { path: "/", maxAge: 31536000, sameSite: "lax" });
  const user = await requireUser();
  await db.update(users).set({ theme }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  homeAddress: z.string().trim().max(255),
  icalUrl: z
    .string().trim().max(1000)
    .refine((v) => v === "" || /^(https?|webcal):\/\//i.test(v), "Le lien doit commencer par https://"),
});

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: fd.get("name"),
    homeAddress: fd.get("homeAddress") ?? "",
    icalUrl: fd.get("icalUrl") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, homeAddress, icalUrl } = parsed.data;
  let place = null;
  if (homeAddress) {
    place = await geocode(homeAddress);
    if (!place) return { error: "Adresse introuvable : essaie avec numéro, rue et ville" };
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
    name,
    homeAddress: place?.label ?? null,
    homeLat: place?.lat ?? null,
    homeLng: place?.lng ?? null,
    icalUrl: ical || null,
    onboarded: true,
  }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: "Profil enregistré" };
}

// ---------- Administration ----------

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
  revalidatePath("/admin");
}

export async function deleteFaq(fd: FormData) {
  await requireAdmin();
  await db.delete(faqItems).where(eq(faqItems.id, Number(fd.get("id"))));
  revalidatePath("/faq");
  revalidatePath("/admin");
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
  revalidatePath("/admin");
}

export async function deleteLink(fd: FormData) {
  await requireAdmin();
  await db.delete(usefulLinks).where(eq(usefulLinks.id, Number(fd.get("id"))));
  revalidatePath("/liens");
  revalidatePath("/admin");
}

export async function setRole(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  const role = z.enum(["admin", "materiel", "bde", "member"]).safeParse(fd.get("role"));
  // Un admin ne peut pas se retirer ses propres droits par erreur.
  if (role.success && id !== admin.id)
    await db.update(users).set({ role: role.data }).where(eq(users.id, id));
  revalidatePath("/admin");
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
