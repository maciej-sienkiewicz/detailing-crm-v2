// src/modules/comms/utils/signatureImage.ts
// Przygotowanie zdjęcia i logo do stopki w przeglądarce, zanim pójdą na serwer.
//
// Serwer i tak re-enkoduje każdy plik i przycina zdjęcie do kwadratu - tu chodzi o to,
// żeby 12-megapikselowe zdjęcie z telefonu nie szło przez sieć w całości, i o kadr:
// środek kadru wybiera człowiek, bo automatyczne cięcie ze środka ucina czoło
// na portretach robionych z góry.

/**
 * Adres absolutny obrazka stopki z domeny, na której działa aplikacja.
 *
 * Backend zwraca ścieżkę (/api/public/mail-signature/...), bo tylko przeglądarka wie na
 * pewno, pod jakim adresem API jest osiągalne - to ten sam, przez który apiClient woła
 * `/api`. Pierwsza wersja brała adres z konfiguracji backendu, której wdrożenie nie
 * ustawiało, i obrazki nie wyświetlały się nigdzie.
 */
export const appAssetUrl = (path: string, origin: string = window.location.origin): string =>
    new URL(path, origin).toString().replace(/\/+$/, '');

export const SIGNATURE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Surowy plik przed zmniejszeniem - telefonowe zdjęcia bywają spore, serwer i tak dostaje mniej. */
export const SIGNATURE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/** Kadr kwadratu w pikselach oryginału. */
export interface SquareCrop { x: number; y: number; size: number }

const PHOTO_OUTPUT_PX = 600;
const LOGO_MAX_EDGE_PX = 1200;

export function validateSignatureImageFile(file: File): string | null {
    if (!SIGNATURE_IMAGE_TYPES.includes(file.type)) return 'Dozwolone formaty: JPG, PNG, WebP';
    if (file.size > SIGNATURE_IMAGE_MAX_BYTES) return 'Plik jest za duży (maksymalnie 20 MB)';
    return null;
}

export const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Nie udało się odczytać obrazka'));
        img.src = src;
    });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> =>
    new Promise((resolve, reject) =>
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Nie udało się przygotować obrazka'))), type, 0.9)
    );

/** Wycięty kwadrat, najwyżej 600 px - trzykrotny zapas nad największym zdjęciem w motywach. */
export async function cropSquare(image: HTMLImageElement, crop: SquareCrop, sourceType: string): Promise<Blob> {
    const side = Math.max(1, Math.min(PHOTO_OUTPUT_PX, Math.round(crop.size)));
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Przeglądarka nie obsługuje kadrowania');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, side, side);
    // PNG zostaje PNG-iem (przezroczystość), resztę zapisujemy jako JPEG - zdjęcie w PNG waży kilka razy więcej.
    return canvasToBlob(canvas, sourceType === 'image/png' ? 'image/png' : 'image/jpeg');
}

/** Logo zmniejszone do 1200 px dłuższego boku, z zachowaniem przezroczystości. */
export async function shrinkLogo(file: File): Promise<Blob> {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        const scale = Math.min(1, LOGO_MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale === 1) return file;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvasToBlob(canvas, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png');
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Geometria kadrowania w oknie: obraz „cover" w kwadratowej scenie, powiększenie
 * i przesunięcie środka. Czysta funkcja - tę samą matematykę widzi test i okno.
 *
 * @param offsetX przesunięcie środka obrazu względem środka sceny, w pikselach sceny
 */
export function cropGeometry(
    naturalWidth: number,
    naturalHeight: number,
    stage: number,
    zoom: number,
    offsetX: number,
    offsetY: number
) {
    const scale = (stage / Math.min(naturalWidth, naturalHeight)) * zoom;
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    const maxX = (width - stage) / 2;
    const maxY = (height - stage) / 2;
    const x = Math.max(-maxX, Math.min(maxX, offsetX));
    const y = Math.max(-maxY, Math.min(maxY, offsetY));
    const crop: SquareCrop = {
        x: (maxX - x) / scale,
        y: (maxY - y) / scale,
        size: stage / scale,
    };
    return {
        /** Rozmiar i położenie obrazu w scenie. */
        width,
        height,
        left: (stage - width) / 2 + x,
        top: (stage - height) / 2 + y,
        /** Przesunięcie po ograniczeniu - obraz nie może odsłonić pustego rogu sceny. */
        offsetX: x,
        offsetY: y,
        crop,
    };
}
