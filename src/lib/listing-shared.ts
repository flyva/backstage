import type { ListingCategory } from "@/db/schema";

// Partagé entre serveur et client.
export const LISTING_LABEL: Record<ListingCategory, string> = {
  vente: "À vendre",
  logement: "Logement et colocation",
  mission: "Missions et extras",
  recherche: "Je recherche",
  don: "Don",
  autre: "Autre",
};

export const LISTING_TTL_DAYS = 60;
export const MAX_LISTING_PHOTO_BYTES = 400 * 1024;
export const LISTING_PHOTO_PREFIX = "/api/listing-photo/";
export const LISTING_PHOTO_NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

/** Une photo principale + des photos secondaires : 6 au total. */
export const MAX_LISTING_PHOTOS = 6;
