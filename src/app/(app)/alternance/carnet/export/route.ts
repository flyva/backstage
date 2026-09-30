import { and, asc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { workLogs } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { fmtHours, isMonth } from "@/lib/alternance";

// Export CSV du carnet de liaison (un mois ou tout), pour le bilan d'alternance.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const m = new URL(req.url).searchParams.get("m");
  const month = isMonth(m) ? m : null;
  const rows = await db
    .select()
    .from(workLogs)
    .where(and(eq(workLogs.userId, user.id), month ? like(workLogs.day, `${month}-%`) : undefined))
    .orderBy(asc(workLogs.day), asc(workLogs.id));
  const csv = toCsv(
    ["Date", "Lieu", "Durée", "Minutes", "Missions", "Compétences"],
    rows.map((r) => [r.day, r.place === "ecole" ? "École" : "Entreprise", fmtHours(r.minutes), r.minutes, r.mission, (r.skills ?? "").replaceAll(",", ", ")]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="carnet-de-liaison${month ? `-${month}` : ""}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
