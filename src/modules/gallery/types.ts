// src/modules/gallery/types.ts
import type { Page } from '@/core/page';

export type GalleryPhotoSource = 'VEHICLE' | 'VISIT' | 'BATCH_ORDER';

export interface GalleryPhoto {
    id: string;
    fileName: string;
    thumbnailUrl: string;
    /** Podgląd (~2048 px, kilkaset KB) do okna podglądu; oryginał, dopóki backend go nie wygeneruje. */
    previewUrl: string;
    /** Oryginał z aparatu (często kilka MB) - tylko do „Pełna rozdzielczość". */
    fullSizeUrl: string;
    description?: string;
    tags: string[];
    uploadedAt: string;
    uploadedBy: string;
    uploadedByName: string;
    source: GalleryPhotoSource;
    vehicleId?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleLicensePlate?: string;
    vehicleYear?: number;
    visitId?: string;
    visitNumber?: string;
    customerId?: string;
    customerName?: string;
    batchOrderEntryId?: string;
    contractorName?: string;
}

export interface GalleryFilters {
    tags: string[];
    brand: string;
    model: string;
    /** Tylko zdjęcia tego klienta (jego wizyty i auta) - wybór zdjęć w odpowiedzi mailowej. */
    customerId?: string;
    page: number;
    pageSize: number;
}

/** Strona galerii (`Page<GalleryPhoto>`, jak każda lista) z tagami do filtra obok. */
export interface GalleryPage extends Page<GalleryPhoto> {
    availableTags: string[];
}
