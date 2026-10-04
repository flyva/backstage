import { getUser } from "@/lib/auth";
import { loadSubjects } from "@/lib/subjects";

// Export Markdown des notes de cours, par matière (une matière ou toutes).
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const slug = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "fiches";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const only = new URL(req.url).searchParams.get("matiere");
  const subjects = (await loadSubjects(user.id)).filter((s) => s.noted.length > 0 && (!only || s.key === only));
  const md = subjects
    .map((s) => `# ${s.name}\n\n` + s.noted.map((c) => `## ${dayFmt.format(c.startsAt)} · ${c.allDay ? "journée" : `${timeFmt.format(c.startsAt)}–${timeFmt.format(c.endsAt)}`}${c.location ? ` · ${c.location}` : ""}\n\n${c.note}\n`).join("\n"))
    .join("\n");
  return new Response(md || "Aucune note.\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="fiches-${subjects.length === 1 ? slug(subjects[0].name) : "cours"}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}
