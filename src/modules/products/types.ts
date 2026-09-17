// src/modules/products/types.ts
// Lustro kontraktu backendu (pl.detailing.crm.product). Kwoty w GROSZACH (integer).

export type UnitOfMeasure = 'ML' | 'L' | 'G' | 'KG' | 'PIECE' | 'PAIR' | 'M' | 'M2';

export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
    ML: 'ml', L: 'l', G: 'g', KG: 'kg', PIECE: 'szt.', PAIR: 'para', M: 'm', M2: 'm²',
};

export type ProductSource = 'MANUAL' | 'AI' | 'WEB' | 'GS1' | 'CURATED';

export type VerificationLevel =
    | 'UNVERIFIED'
    | 'AI_SUGGESTED'
    | 'GS1_VERIFIED'
    | 'STUDIO_CONFIRMED'
    | 'CURATED';

/** Kierunek, z którego człowiek wpisał cenę — źródło prawdy pary cenowej (CLAUDE.md §1). */
export type PriceDirection = 'NET' | 'GROSS';

/** Stawki VAT jak w reszcie systemu; -1 = zwolniony. */
export type VatRate = 0 | 5 | 8 | 23 | -1;

export interface Provenance {
    source: ProductSource;
    verificationLevel: VerificationLevel;
    confidence: number | null;
}

export interface ProductPrice {
    unitPriceNet: number;
    unitPriceGross: number;
    priceEnteredAs: PriceDirection;
    vatRate: VatRate;
}

export interface ProductRating {
    rating: number;
    justification: string | null;
    ratedByName: string;
    ratedAt: string;
}

export interface Product {
    id: string;
    gtin: string | null;
    name: string;
    brand: string;
    unitOfMeasure: UnitOfMeasure;
    packageSizeValue: string;
    packageSizeUnit: UnitOfMeasure;
    packageHeightMm: number | null;
    packageWidthMm: number | null;
    packageDepthMm: number | null;
    description: string | null;
    imageFileId: string | null;
    provenance: Provenance;
    internalName: string | null;
    internalNote: string | null;
    isFavourite: boolean;
    isHidden: boolean;
    /** null bez uprawnienia PRODUCTS_COSTS lub gdy studio nie podało ceny. */
    price: ProductPrice | null;
    rating: ProductRating | null;
    noteCount: number;
    isEditableInPlace: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProductListItem {
    id: string;
    gtin: string | null;
    name: string;
    brand: string;
    unitOfMeasure: UnitOfMeasure;
    packageSizeValue: string;
    packageSizeUnit: UnitOfMeasure;
    imageFileId: string | null;
    verificationLevel: VerificationLevel;
    isFavourite: boolean;
    isOurs: boolean;
    price: ProductPrice | null;
    ratingValue: number | null;
}

export interface ProductListFilters {
    search: string;
    onlyOurs?: boolean;
    onlyFavourite?: boolean;
    includeHidden?: boolean;
    page: number;
    limit: number;
    sortBy?: 'name' | 'brand';
    sortDirection?: 'asc' | 'desc';
}

export interface ProductPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export interface ProductListResponse {
    products: ProductListItem[];
    pagination: ProductPagination;
}

export interface PriceInput {
    unitPriceNet: number | null;
    unitPriceGross: number | null;
    priceEnteredAs: PriceDirection;
    vatRate: VatRate;
}

export interface CreateProductRequest {
    gtin?: string | null;
    /** Jedyne wymagane pole. */
    name: string;
    brand?: string | null;
    unitOfMeasure?: UnitOfMeasure | null;
    packageSizeValue?: string | null;
    packageSizeUnit?: UnitOfMeasure | null;
    packageHeightMm?: number | null;
    packageWidthMm?: number | null;
    packageDepthMm?: number | null;
    description?: string | null;
    internalName?: string | null;
    internalNote?: string | null;
    price?: PriceInput | null;
}

export interface UpdateProductRequest {
    name: string;
    brand?: string | null;
    unitOfMeasure?: UnitOfMeasure | null;
    packageSizeValue?: string | null;
    packageSizeUnit?: UnitOfMeasure | null;
    packageHeightMm?: number | null;
    packageWidthMm?: number | null;
    packageDepthMm?: number | null;
    description?: string | null;
}

export interface UpdateProductStudioRequest {
    internalName?: string | null;
    internalNote?: string | null;
    isFavourite: boolean;
    isHidden: boolean;
    price?: PriceInput | null;
}

/** Wstępnie wypełniony formularz po rozpoznaniu zewnętrznym (jeszcze nie w katalogu studia). */
export interface ProductDraft {
    gtin: string | null;
    name: string;
    brand: string;
    unitOfMeasure: UnitOfMeasure;
    packageSizeValue: string;
    packageSizeUnit: UnitOfMeasure;
    description: string | null;
    provenance: Provenance;
    /** Adres źródła rozpoznania — pokazywany jako klikalny link przy szkicu. */
    sourceUrl?: string | null;
}

export type LookupStatus = 'FOUND_LOCAL' | 'RESOLVED' | 'NOT_FOUND';

export interface LookupResponse {
    status: LookupStatus;
    product: Product | null;
    draft: ProductDraft | null;
    provenance: Provenance | null;
}

export interface ProductNote {
    id: string;
    content: string;
    visitId: string | null;
    createdByName: string;
    createdAt: string;
    updatedAt: string | null;
}

export interface VisitProductLink {
    id: string;
    productId: string;
    productName: string;
    brand: string | null;
    packageLabel: string | null;
    imageFileId: string | null;
    note: string | null;
    addedByName: string;
    addedAt: string;
}

export interface ScanSession {
    sessionId: string;
    handoffToken: string;
    handoffPath: string;
    status: 'OPEN' | 'CONSUMED' | 'EXPIRED';
    scannedCodes: string[];
    expiresAt: string;
}
