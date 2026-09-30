"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, HelpCircle, Plus, Trash2, X } from "lucide-react";
import type { FormState } from "@/lib/actions";
import type { PollAnswer } from "@/db/schema";
import { addPollInvites, closePoll, createPoll, deletePoll, reopenPoll, savePollVotes } from "@/lib/poll-actions";

export type PollPerson = { id: number; name: string; trackId: number | null; track: string | null };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-green-600 dark:text-green-400" role="status">{state.ok}</p>;
  return null;
}

// ---------- Choix des personnes à inviter ----------

export function InviteePicker({ people, myTrackId }: { people: PollPerson[]; myTrackId: number | null }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const shown = useMemo(() => {
    const n = norm(q.trim());
    return n ? people.filter((p) => norm(`${p.name} ${p.track ?? ""}`).includes(n)) : people;
  }, [people, q]);
  const toggle = (id: number) => setPicked((s) => { const c = new Set(s); if (c.has(id)) c.delete(id); else c.add(id); return c; });
  const setMany = (ids: number[]) => setPicked(new Set(ids));
  return (
    <div className="space-y-2">
      {[...picked].map((id) => <input key={id} type="hidden" name="invite" value={id} />)}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une personne ou une filière…" className="input max-w-xs flex-1" aria-label="Chercher une personne à inviter" />
        {myTrackId !== null && <button type="button" className="btn-ghost text-xs" onClick={() => setMany(people.filter((p) => p.trackId === myTrackId).map((p) => p.id))}>Ma filière</button>}
        <button type="button" className="btn-ghost text-xs" onClick={() => setMany(people.map((p) => p.id))}>Tout le monde</button>
        <button type="button" className="btn-ghost text-xs" onClick={() => setMany([])}>Personne</button>
        <span className="text-xs text-muted">{picked.size} invité{picked.size > 1 ? "s" : ""}</span>
      </div>
      <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1 text-sm">
        {shown.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-bg">
              <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.track && <span className="shrink-0 text-xs text-muted">{p.track}</span>}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-1 text-muted">Personne ne correspond.</li>}
      </ul>
      <p className="text-xs text-muted">Les personnes invitées reçoivent une notification. Toute personne connectée qui a le lien peut aussi répondre.</p>
    </div>
  );
}

// ---------- Création ----------

export function PollForm({ people, myTrackId }: { people: PollPerson[]; myTrackId: number | null }) {
  const [state, action, pending] = useActionState(createPoll, undefined);
  const [rows, setRows] = useState<number[]>([0]);
  const [next, setNext] = useState(1);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="p-title">Titre</label>
        <input id="p-title" name="title" required maxLength={150} placeholder="Ex. Réunion projet de fin d'année" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="p-desc">Description (facultatif)</label>
        <textarea id="p-desc" name="description" rows={2} maxLength={500} className="input" placeholder="Durée, lieu, ordre du jour…" />
      </div>
      <div className="space-y-2">
        <div className="label">Créneaux proposés</div>
        {rows.map((r) => (
          <div key={r} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
            <input type="datetime-local" name="optStart" required className="input" aria-label="Début du créneau" />
            <input type="datetime-local" name="optEnd" className="input" aria-label="Fin du créneau (facultatif)" title="Fin (facultatif)" />
            <button type="button" className="btn-ghost" disabled={rows.length === 1} onClick={() => setRows((x) => x.filter((y) => y !== r))} aria-label="Retirer ce créneau"><Trash2 size={15} /></button>
          </div>
        ))}
        <button type="button" className="btn-ghost" disabled={rows.length >= 20} onClick={() => { setRows((x) => [...x, next]); setNext((n) => n + 1); }}><Plus size={15} /> Ajouter un créneau</button>
      </div>
      <div className="space-y-2">
        <div className="label">Inviter des personnes (facultatif)</div>
        <InviteePicker people={people} myTrackId={myTrackId} />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Création…" : "Créer le sondage"}</button>
    </form>
  );
}

// ---------- Vote et résultats ----------

export type VoteOption = { id: number; label: string; yes: string[]; maybe: string[]; no: string[]; mine: PollAnswer | null; best: boolean; final: boolean };

const ANSWERS: { v: PollAnswer; label: string; Icon: typeof Check; on: string }[] = [
  { v: "yes", label: "Disponible", Icon: Check, on: "border-green-600 bg-green-600 text-white" },
  { v: "maybe", label: "Peut-être", Icon: HelpCircle, on: "border-[#f59e0b] bg-[#f59e0b] text-[#14110a]" },
  { v: "no", label: "Indisponible", Icon: X, on: "border-danger bg-danger text-white" },
];

export function PollVote({ pollId, options, closed }: { pollId: number; options: VoteOption[]; closed: boolean }) {
  const [state, action, pending] = useActionState(savePollVotes, undefined);
  const [mine, setMine] = useState<Record<number, PollAnswer | null>>(() => Object.fromEntries(options.map((o) => [o.id, o.mine])));
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="pollId" value={pollId} />
      {options.map((o) => (
        <div key={o.id} className={`rounded-xl border p-4 ${o.final ? "border-green-600 bg-green-600/10" : o.best && !closed ? "border-accent" : "border-line"}`}>
          {mine[o.id] && <input type="hidden" name={`a_${o.id}`} value={mine[o.id]!} />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{o.label}</span>
              {o.final && <span className="rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-semibold text-white">Créneau retenu</span>}
              {o.best && !closed && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">Le plus plébiscité</span>}
            </div>
            <div className="flex gap-3 text-sm tabular-nums" aria-label="Résultats du créneau">
              <span className="text-green-600 dark:text-green-400">✓ {o.yes.length}</span>
              <span className="text-[#b45309] dark:text-[#f59e0b]">? {o.maybe.length}</span>
              <span className="text-danger">✗ {o.no.length}</span>
            </div>
          </div>
          {(o.yes.length + o.maybe.length + o.no.length > 0) && (
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer">Voir qui a répondu</summary>
              <div className="mt-1 space-y-0.5">
                {o.yes.length > 0 && <p><strong className="text-fg">Disponibles :</strong> {o.yes.join(", ")}</p>}
                {o.maybe.length > 0 && <p><strong className="text-fg">Peut-être :</strong> {o.maybe.join(", ")}</p>}
                {o.no.length > 0 && <p><strong className="text-fg">Indisponibles :</strong> {o.no.join(", ")}</p>}
              </div>
            </details>
          )}
          {!closed && (
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Ta réponse pour ${o.label}`}>
              {ANSWERS.map(({ v, label, Icon, on }) => (
                <button
                  key={v} type="button" role="radio" aria-checked={mine[o.id] === v}
                  onClick={() => setMine((m) => ({ ...m, [o.id]: m[o.id] === v ? null : v }))}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${mine[o.id] === v ? on : "border-line hover:bg-bg"}`}
                >
                  <Icon size={14} aria-hidden /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {!closed && (
        <>
          <Feedback state={state} />
          <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer mes disponibilités"}</button>
        </>
      )}
    </form>
  );
}

// ---------- Gestion par l'auteur ----------

export function PollManage({ pollId, closed, options, people, myTrackId }: { pollId: number; closed: boolean; options: { id: number; label: string }[]; people: PollPerson[]; myTrackId: number | null }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Gérer le sondage</h2>
      {closed ? (
        <form action={reopenPoll}><input type="hidden" name="pollId" value={pollId} /><button className="btn-ghost">Rouvrir le sondage</button></form>
      ) : (
        <form action={closePoll} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="pollId" value={pollId} />
          <select name="finalOptionId" className="input w-auto" aria-label="Créneau retenu" defaultValue="">
            <option value="">Clore sans créneau retenu</option>
            {options.map((o) => <option key={o.id} value={o.id}>Retenir : {o.label}</option>)}
          </select>
          <button className="btn">Clore le sondage</button>
          <span className="text-xs text-muted">Avec un créneau retenu, les personnes concernées sont prévenues.</span>
        </form>
      )}
      {!closed && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">Inviter d&apos;autres personnes</summary>
          <form action={addPollInvites} className="mt-3 space-y-3">
            <input type="hidden" name="pollId" value={pollId} />
            <InviteePicker people={people} myTrackId={myTrackId} />
            <button className="btn">Envoyer les invitations</button>
          </form>
        </details>
      )}
      <form action={deletePoll} onSubmit={(e) => { if (!confirm("Supprimer ce sondage et toutes les réponses ?")) e.preventDefault(); }}>
        <input type="hidden" name="pollId" value={pollId} />
        <button className="text-sm text-danger underline">Supprimer le sondage</button>
      </form>
    </div>
  );
}
