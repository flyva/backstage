"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { pageStats } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const MOBILE_RE = /Mobi|Android|iPhone|iPod/i;

/** Enregistre une visite de page (pages les plus utilisées, en admin) : un compteur par page × type d'appareil, pas une trace nominative. */
export async function trackPageView(path: string) {
  const user = await getSessionUser();
  if (!user) return; // on ne suit que les pages consultées par une personne connectée
  const ua = (await headers()).get("user-agent") ?? "";
  const device = MOBILE_RE.test(ua) ? "mobile" : "desktop";
  const clean = path.slice(0, 255);
  await db
    .insert(pageStats)
    .values({ path: clean, device, visits: 1 })
    .onDuplicateKeyUpdate({ set: { visits: sql`${pageStats.visits} + 1`, lastVisitAt: new Date() } });
}

export async function topPages(limit = 20) {
  const rows = await db.select().from(pageStats);
  const byPath = new Map<string, { path: string; mobile: number; desktop: number; total: number; lastVisitAt: Date }>();
  for (const r of rows) {
    const cur = byPath.get(r.path) ?? { path: r.path, mobile: 0, desktop: 0, total: 0, lastVisitAt: r.lastVisitAt };
    cur[r.device] += r.visits;
    cur.total += r.visits;
    if (r.lastVisitAt > cur.lastVisitAt) cur.lastVisitAt = r.lastVisitAt;
    byPath.set(r.path, cur);
  }
  return [...byPath.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export async function deviceTotals() {
  const rows = await db.select({ device: pageStats.device, visits: pageStats.visits }).from(pageStats);
  let mobile = 0, desktop = 0;
  for (const r of rows) { if (r.device === "mobile") mobile += r.visits; else desktop += r.visits; }
  return { mobile, desktop };
}
