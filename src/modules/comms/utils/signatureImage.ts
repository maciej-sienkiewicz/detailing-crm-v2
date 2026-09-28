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

export interface ContentBounds { x: number; y: number; width: number; height: number }

/** Różnica koloru, poniżej której piksel uznajemy za tło (szum JPEG-a przy białym tle). */
const BACKGROUND_TOLERANCE = 12;

/**
 * Prostokąt, w którym leży treść logo, bez jednolitego marginesu dookoła.
 *
 * Logo z przezroczystością: tłem są tylko piksele (prawie) przezroczyste - białe logo na
 * przezroczystym tle nie może zniknąć jako „białe tło". Logo bez przezroczystości (JPEG):
 * tłem jest kolor lewego górnego rogu. Null = obraz jest samym tłem albo nie ma czego ciąć.
 *
 * Czysta funkcja na pikselach RGBA - test nie potrzebuje canvasa.
 */
export function logoContentBounds(data: Uint8ClampedArray, width: number, height: number): ContentBounds | null {
    let transparent = false;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) { transparent = true; break; }
    }
    const [r0, g0, b0] = [data[0], data[1], data[2]];
    const isBackground = (i: number) => transparent
        ? data[i + 3] < 16
        : Math.abs(data[i] - r0) <= BACKGROUND_TOLERANCE
            && Math.abs(data[i + 1] - g0) <= BACKGROUND_TOLERANCE
            && Math.abs(data[i + 2] - b0) <= BACKGROUND_TOLERANCE;

    let top = height, left = width, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBackground((y * width + x) * 4)) continue;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
        }
    }
    if (right < 0) return null;
    const bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
    // Odrobina oddechu, żeby krawędź znaku nie stykała się z krawędzią obrazka.
    const pad = Math.max(2, Math.round(Math.max(bounds.width, bounds.height) * 0.02));
    const x = Math.max(0, bounds.x - pad);
    const y = Math.max(0, bounds.y - pad);
    const padded = {
        x, y,
        width: Math.min(width, bounds.x + bounds.width + pad) - x,
        height: Math.min(height, bounds.y + bounds.height + pad) - y,
    };
    return padded.width === width && padded.height === height ? null : padded;
}

/**
 * Logo do stopki: bez pustego marginesu i zmniejszone do 1200 px dłuższego boku,
 * z zachowaniem przezroczystości.
 *
 * Margines to najczęstszy powód, dla którego logo w stopce wygląda źle: plik eksportowany
 * z programu graficznego ma wokół znaku dużo przezroczystego albo białego tła, a stopka
 * dopasowuje do ramki cały plik - sam znak wychodzi mały i przesunięty.
 */
export async function shrinkLogo(file: File): Promise<Blob> {
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        const source = document.createElement('canvas');
        source.width = img.naturalWidth;
        source.height = img.naturalHeight;
        const sourceCtx = source.getContext('2d');
        if (!sourceCtx) return file;
        sourceCtx.drawImage(img, 0, 0);
        const bounds = logoContentBounds(
            sourceCtx.getImageData(0, 0, source.width, source.height).data, source.width, source.height
        ) ?? { x: 0, y: 0, width: source.width, height: source.height };

        const scale = Math.min(1, LOGO_MAX_EDGE_PX / Math.max(bounds.width, bounds.height));
        const trimmed = bounds.width !== source.width || bounds.height !== source.height;
        if (scale === 1 && !trimmed) return file;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bounds.width * scale));
        canvas.height = Math.max(1, Math.round(bounds.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, canvas.width, canvas.height);
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
