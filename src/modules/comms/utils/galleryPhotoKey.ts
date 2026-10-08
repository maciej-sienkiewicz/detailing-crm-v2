// src/modules/comms/utils/galleryPhotoKey.ts
import type { GalleryPhoto } from '@/modules/gallery/types';

/** Klucz zdjęcia z galerii - id są unikalne tylko w obrębie źródła (wizyta, pojazd, zlecenie). */
export const galleryPhotoKey = (photo: Pick<GalleryPhoto, 'source' | 'id'>): string => `${photo.source}:${photo.id}`;
