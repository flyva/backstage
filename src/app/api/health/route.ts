import { databaseAlive } from "@/lib/health";

// Point de contrôle pour une surveillance externe : ne révèle rien (ni version, ni configuration).
export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await databaseAlive();
  return Response.json({ ok }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
