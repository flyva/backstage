import "server-only";

// Fiche de révision générée par Mistral (API compatible « chat completions »). Clé dans MISTRAL_API_KEY ; sans clé, la fonction est masquée.
export const aiEnabled = () => !!process.env.MISTRAL_API_KEY?.trim();

const MODEL = process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest";
const MAX_INPUT_CHARS = 12000;

const SYSTEM = `Tu aides un étudiant à réviser. À partir de SES notes de cours, rédige une fiche de révision en français, en Markdown.
Règles : n'utilise que le contenu des notes, n'invente rien ; si une information manque, ne la complète pas. Structure : un titre, "Points clés" (liste), "À retenir" (définitions, formules, consignes), "À faire / à préparer" (seulement si les notes en parlent), puis 3 à 5 questions pour s'auto-tester. Reste concis.`;

export async function generateRevisionSheet(subject: string, notes: { date: string; text: string }[]): Promise<string> {
  const key = process.env.MISTRAL_API_KEY?.trim();
  if (!key) throw new Error("IA non configurée");
  let body = notes.map((n) => `### ${n.date}\n${n.text}`).join("\n\n");
  if (body.length > MAX_INPUT_CHARS) body = body.slice(-MAX_INPUT_CHARS); // les notes les plus récentes d'abord conservées
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Matière : ${subject}\n\nMes notes :\n\n${body}` },
      ],
    }),
    signal: AbortSignal.timeout(60000),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = ((await res.json().catch(() => null)) as { message?: string } | null)?.message;
    if (res.status === 429) throw new Error(`Mistral refuse pour l'instant (limite de ton compte atteinte, erreur 429)${detail ? ` : ${String(detail).slice(0, 160)}` : ". Attends une minute ; si ça persiste, vérifie ton plan et tes crédits sur console.mistral.ai"}`);
    if (res.status === 401 || res.status === 403) throw new Error(`Clé Mistral refusée (${res.status})${detail ? ` : ${String(detail).slice(0, 120)}` : ""}`);
    throw new Error(`Réponse ${res.status} de l'IA${detail ? ` : ${String(detail).slice(0, 120)}` : ""}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Réponse vide de l'IA");
  return text.slice(0, 20000);
}
