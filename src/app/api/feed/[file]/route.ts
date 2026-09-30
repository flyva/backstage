import { buildFeed, userByFeedToken } from "@/lib/feed";

// Abonnement calendrier : accessible sans session (les applications de calendrier n'en ont pas), protégé par le jeton secret.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const user = await userByFeedToken(file);
  if (!user) return new Response("Introuvable", { status: 404 });
  return new Response(await buildFeed(user), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="backstage.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
