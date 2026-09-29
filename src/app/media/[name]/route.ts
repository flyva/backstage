import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getUser } from "@/lib/auth";
import { galleryDir, MEDIA_NAME, MIME } from "@/lib/gallery";

export async function GET(req: Request, ctx: { params: Promise<{ name: string }> }) {
  if (!(await getUser())) return new Response("Non autorisé", { status: 401 });
  const { name } = await ctx.params;
  if (!MEDIA_NAME.test(name)) return new Response("Introuvable", { status: 404 });

  const file = path.join(galleryDir(), name);
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("Introuvable", { status: 404 });

  const type = MIME[name.split(".")[1]];
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    // Les noms sont aléatoires et uniques : un fichier ne change jamais.
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  // Lecture partielle (Range) : indispensable pour avancer dans une vidéo.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : info.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : info.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, info.size - 1);
    if (start > end || start >= info.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: { ...headers, "Content-Length": String(info.size) },
  });
}
