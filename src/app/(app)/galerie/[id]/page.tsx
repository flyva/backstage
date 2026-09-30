import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { galleryAlbums, galleryItems, users } from "@/db/schema";
import { requireModule } from "@/lib/auth";
import { deleteAlbum } from "@/lib/gallery-actions";
import { GalleryGrid } from "@/components/GalleryGrid";
import { GalleryUploader } from "@/components/GalleryUploader";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function AlbumPage({ params }: PageProps<"/galerie/[id]">) {
  const user = await requireModule("galerie");
  const { id } = await params;
  const albumId = Number(id);
  if (!Number.isInteger(albumId)) notFound();

  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId)).limit(1);
  if (!album) notFound();

  const rows = await db
    .select({ item: galleryItems, uploader: users.name })
    .from(galleryItems)
    .innerJoin(users, eq(users.id, galleryItems.uploaderId))
    .where(eq(galleryItems.albumId, albumId))
    .orderBy(desc(galleryItems.createdAt), desc(galleryItems.id));

  const staff = user.perms.galerie;
  const items = rows.map(({ item, uploader }) => ({
    id: item.id,
    kind: item.kind,
    file: item.file,
    thumb: item.thumb,
    caption: item.caption,
    uploader,
    canDelete: item.uploaderId === user.id || staff,
  }));

  return (
    <div className="space-y-6">
      <Link href="/galerie" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Albums</Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{album.title}</h1>
        {album.description && <p className="text-sm text-muted">{album.description}</p>}
      </header>

      <GalleryUploader albumId={album.id} />

      {items.length === 0 ? <p className="text-sm text-muted">Cet album est vide.</p> : <GalleryGrid items={items} />}

      {(album.createdBy === user.id || staff) && (
        <form action={deleteAlbum} className="pt-4">
          <input type="hidden" name="albumId" value={album.id} />
          <ConfirmButton message="Supprimer cet album et tout son contenu ?" className="text-xs text-muted hover:text-danger">Supprimer l&apos;album</ConfirmButton>
        </form>
      )}
    </div>
  );
}
