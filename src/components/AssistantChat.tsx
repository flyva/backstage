"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, ExternalLink, SendHorizontal, User } from "lucide-react";
import Link from "next/link";
import { askAssistant } from "@/lib/assistant-actions";
import type { AssistantReply } from "@/lib/assistant";
import { Markdown } from "@/components/Markdown";

type Msg = { from: "me"; text: string } | { from: "bot"; reply: AssistantReply };

export function AssistantChat({ suggestions, compact = false }: { suggestions: string[]; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", reply: { text: "Salut ! Pose-moi une question sur l'école (Wi-Fi, absences, matériel, contacts…) ou sur toi (prochain cours, tâches, prêts). Je ne suis pas une IA : je cherche dans Backstage.", sources: [] } }]);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pending]);

  const send = (q: string) => {
    const question = q.trim();
    if (!question || pending) return;
    setMsgs((m) => [...m, { from: "me", text: question }]);
    setText("");
    start(async () => {
      const reply = await askAssistant(question).catch(() => ({ text: "Je n'ai pas réussi à répondre : réessaie dans un instant.", sources: [] }));
      setMsgs((m) => [...m, { from: "bot", reply }]);
    });
  };

  return (
    <div className={compact ? "flex h-[26rem] max-h-[70vh] flex-col" : "card flex min-h-[28rem] flex-col p-0"}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Conversation avec l'assistant">
        {msgs.map((m, i) =>
          m.from === "me" ? (
            <div key={i} className="flex justify-end gap-2">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-accent-fg">{m.text}</p>
              <User size={18} className="mt-2 shrink-0 text-muted" aria-hidden />
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <Bot size={18} className="mt-2 shrink-0 text-accent" aria-hidden />
              <div className="max-w-[92%] space-y-2 rounded-2xl rounded-bl-sm border border-line bg-bg px-4 py-3 text-sm">
                <Markdown breaks>{m.reply.text}</Markdown>
                {m.reply.sources.length > 0 && (
                  <ul className="flex flex-wrap gap-2 border-t border-line pt-2">
                    {m.reply.sources.map((s) => (
                      <li key={s.href + s.title}>
                        {s.external ? (
                          <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-xs text-accent hover:bg-surface">{s.title} <ExternalLink size={11} /></a>
                        ) : (
                          <Link href={s.href} className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-accent hover:bg-surface">{s.title}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {m.reply.suggestions && (
                  <div className="flex flex-wrap gap-2">{m.reply.suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full bg-accent/15 px-3 py-1 text-xs hover:bg-accent/25">{s}</button>)}</div>
                )}
              </div>
            </div>
          ),
        )}
        {pending && <p className="pl-7 text-xs text-muted" role="status">Je cherche…</p>}
        <div ref={end} />
      </div>

      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-fg">{s}</button>)}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-line p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Ta question…" aria-label="Ta question" autoComplete="off" className="input" />
        <button className="btn px-3" disabled={pending || text.trim().length < 2} aria-label="Envoyer"><SendHorizontal size={18} /></button>
      </form>
    </div>
  );
}
