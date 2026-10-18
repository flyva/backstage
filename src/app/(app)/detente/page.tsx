import { notFound } from "next/navigation";
import { Gamepad2, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { loadScores } from "@/lib/detente-actions";
import { Tetris } from "@/components/Tetris";
import { DetenteLive } from "@/components/DetenteLive";

export const metadata = { title: "Détente" };

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function DetentePage() {
  const user = await requireUser();
  if (!user.perms.sections.detente) notFound();
  const { top, mine } = await loadScores("tetris");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Gamepad2 size={24} className="text-accent" /> Détente</h1>
        <p className="text-sm text-muted">Une petite pause, entre deux cours. Tetris pour l&apos;instant — d&apos;autres jeux viendront peut-être.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[auto_1fr]">
        <div className="card space-y-2">
          <Tetris />
          {mine && <p className="text-center text-xs text-muted">Ton dernier score : <strong className="text-fg">{mine.score}</strong> · {dateFmt.format(mine.createdAt)}</p>}
        </div>

        <div className="space-y-4">
          <DetenteLive meId={user.id} />
          <section className="card space-y-3">
            <h2 className="font-semibold">Meilleurs scores (Tetris)</h2>
            {top.length === 0 && <p className="text-sm text-muted">Personne n&apos;a encore joué.</p>}
            {top[0] && (
              <div className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3">
                <Trophy size={28} className="shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted">Meilleur score</p>
                  <p className="truncate font-semibold">{top[0].userId === user.id ? "Toi" : top[0].name}</p>
                </div>
                <p className="shrink-0 text-2xl font-bold tabular-nums">{top[0].score}</p>
              </div>
            )}
            {top.length > 1 && (
              <ol className="space-y-1 text-sm">
                {top.slice(1).map((s, i) => (
                  <li key={`${s.userId}-${s.createdAt.toISOString()}`} className={`flex items-center justify-between gap-2 ${s.userId === user.id ? "font-semibold text-accent" : ""}`}>
                    <span>{i + 2}. {s.userId === user.id ? "Toi" : s.name}</span>
                    <span className="tabular-nums text-muted">{s.score} · {dateFmt.format(s.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
