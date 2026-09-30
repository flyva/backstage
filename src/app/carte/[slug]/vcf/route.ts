import { getCard, toVCard } from "@/lib/card";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCard(slug);
  if (!card) return new Response("Introuvable", { status: 404 });
  const file = card.name.normalize("NFD").replace(/[^\w -]/g, "").trim().replace(/\s+/g, "-") || "contact";
  return new Response(toVCard(card), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}.vcf"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
