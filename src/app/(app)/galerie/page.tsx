import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Images } from "lucide-react";
import { db } from "@/db";
import { galleryAlbums, galleryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AlbumForm } from "@/components/AlbumForm";

export const metadata = { title: "Galerie" };

export default async function GalleryPage() {
  await requireUser();
  const albums = await db
    .select({
      album: galleryAlbums,
      count: sql<number>`(select count(*) from ${galleryItems} where ${galleryItems.albumId} = ${galleryAlbums.id})`,
      cover: sql<string | null>`(select coalesce(gi.thumb, gi.file) from ${galleryItems} gi where gi.album_id = ${galleryAlbums.id} and gi.kind = 'image' order by gi.created_at desc, gi.id desc limit 1)`,
    })
    .from(galleryAlbums)
    .orderBy(desc(galleryAlbums.createdAt));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Galerie</h1>
        <p className="text-sm text-muted">Les photos et vidéos de la promo, rangées par album.</p>
      </header>

      {albums.length === 0 && <p className="text-sm text-muted">Aucun album pour le moment.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map(({ album, count, cover }) => (
          <Link key={album.id} href={`/galerie/${album.id}`} className="card overflow-hidden p-0 hover:border-accent">
            <div className="grid aspect-[4/3] place-items-center bg-bg">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/media/${cover}`} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <Images size={32} className="text-muted" />
              )}
            </div>
            <div className="p-3">
              <h2 className="font-semibold leading-snug">{album.title}</h2>
              <p className="text-xs text-muted">{Number(count)} élément{Number(count) > 1 ? "s" : ""}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Nouvel album</h2>
        <AlbumForm />
      </section>
    </div>
  );
}

