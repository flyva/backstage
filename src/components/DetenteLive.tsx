"use client";

import { useEffect, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { setDetentePresence } from "@/lib/detente-actions";

type Player = { userId: number; name: string };
type LiveScore = { userId: number; name: string; game: string; score: number; at: string };

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

export function DetenteLive({ meId }: { meId: number }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);

  useEffect(() => {
    void setDetentePresence(true);
    const onHide = () => void setDetentePresence(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onHide);

    const es = new EventSource("/api/detente/stream");
    es.addEventListener("roster", (e) => setPlayers(JSON.parse((e as MessageEvent<string>).data)));
    es.addEventListener("join", (e) => {
      const p = JSON.parse((e as MessageEvent<string>).data) as Player;
      setPlayers((cur) => (cur.some((x) => x.userId === p.userId) ? cur : [...cur, p]));
    });
    es.addEventListener("leave", (e) => {
      const { userId } = JSON.parse((e as MessageEvent<string>).data) as { userId: number };
      setPlayers((cur) => cur.filter((p) => p.userId !== userId));
    });
    es.addEventListener("score", (e) => {
      const s = JSON.parse((e as MessageEvent<string>).data) as LiveScore;
      setLiveScores((cur) => [s, ...cur].slice(0, 8));
    });

    return () => {
      es.close();
      document.removeEventListener("visibilitychange", onHide);
      void setDetentePresence(false);
    };
  }, []);

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Users size={15} className="text-accent" /> En ligne ({players.length})</h2>
        {players.length === 0 && <p className="text-xs text-muted">Personne d&apos;autre pour l&apos;instant.</p>}
        <ul className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <li key={p.userId} className={`rounded-full border border-line px-2.5 py-1 text-xs ${p.userId === meId ? "bg-accent/10 text-accent" : ""}`}>
              {p.userId === meId ? "Toi" : p.name}
            </li>
          ))}
        </ul>
      </section>

      {liveScores.length > 0 && (
        <section className="card space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Trophy size={15} className="text-accent" /> Scores en direct</h2>
          <ul className="space-y-1 text-sm">
            {liveScores.map((s, i) => (
              <li key={`${s.userId}-${s.at}-${i}`} className="flex items-center justify-between gap-2">
                <span>{s.userId === meId ? "Toi" : s.name}</span>
                <span className="tabular-nums text-muted">{s.score} · {timeFmt.format(new Date(s.at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
