import "server-only";
import { fetchPublicText } from "@/lib/ical";

export type InstaPost = {
  id: string;
  permalink: string;
  image: string;
  caption: string;
  isVideo: boolean;
  date: Date | null;
};

const TTL = 15 * 60e3;
const g = globalThis as unknown as { __instaCache?: Map<string, { at: number; posts: InstaPost[] }> };
const cache = (g.__instaCache ??= new Map());

const httpsUrl = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
};

const str = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (typeof o[k] === "string" && o[k]) return o[k] as string;
  return "";
};

/**
 * Lit un flux JSON public d'un service tiers (Behold, etc.). Le format est tolérant :
 * soit un tableau, soit { posts: [...] } / { data: [...] }, avec des clés en camelCase ou snake_case.
 */
export function parseFeed(text: string): InstaPost[] {
  const json: unknown = JSON.parse(text);
  const root = json as Record<string, unknown>;
  const list = Array.isArray(json) ? json : Array.isArray(root.posts) ? root.posts : Array.isArray(root.data) ? root.data : [];

  const posts: InstaPost[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const type = str(o, "mediaType", "media_type").toUpperCase();
    const isVideo = type === "VIDEO";
    const image = httpsUrl(isVideo ? str(o, "thumbnailUrl", "thumbnail_url") || str(o, "mediaUrl", "media_url") : str(o, "mediaUrl", "media_url", "thumbnailUrl", "thumbnail_url"));
    const permalink = httpsUrl(str(o, "permalink", "url"));
    if (!image || !permalink) continue; // on ignore toute entrée dont les liens ne sont pas en https
    const ts = str(o, "timestamp", "date", "created_time");
    const d = ts ? new Date(ts) : null;
    posts.push({
      id: str(o, "id") || permalink,
      permalink,
      image,
      caption: str(o, "caption", "prunedCaption", "text").slice(0, 500),
      isVideo,
      date: d && !Number.isNaN(d.getTime()) ? d : null,
    });
  }
  return posts.slice(0, 24);
}

export async function getInstaPosts(feedUrl: string): Promise<{ posts: InstaPost[]; error?: string }> {
  const hit = cache.get(feedUrl);
  if (hit && Date.now() - hit.at < TTL) return { posts: hit.posts };
  try {
    const posts = parseFeed(await fetchPublicText(feedUrl));
    cache.set(feedUrl, { at: Date.now(), posts });
    return { posts };
  } catch (e) {
    // Ancienne version plutôt qu'une page vide si le service tiers est momentanément indisponible.
    if (hit) return { posts: hit.posts };
    return { posts: [], error: e instanceof Error ? e.message : "erreur inconnue" };
  }
}
