import { buildFeed, userByFeedToken } from "@/lib/feed";

// Abonnement calendrier : accessible sans session (les applications de calendrier n'en ont pas), protégé par le jeton secret.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  let body: string;
  try {
    const user = await userByFeedToken(file);
    if (!user) return new Response("Introuvable", { status: 404 });
    body = await buildFeed(user);
  } catch (e) {
    console.error("[feed]", e); // visible avec : journalctl -u backstage | grep "\[feed\]"
    return new Response("Erreur temporaire", { status: 503 });
  }
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="backstage.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
