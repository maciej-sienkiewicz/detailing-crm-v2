/**
 * Przycina niewidoczne obrzeże logotypu marki - ta sama reguła, którą backend stosuje
 * do logo firmy (LogoTrim.kt): przezroczyste albo białe tło przycinamy do zera, widoczną
 * płytę w kolorze zostawiamy z marginesem 6% krótszego boku znaku.
 *
 * Miniatury z car-logos-dataset mają wokół znaku sporo pustego pola, a slot awatara skaluje
 * CAŁY obraz („contain") - znak marki wychodził więc wyraźnie mniejszy niż miejsce na niego.
 *
 * Przy jakiejkolwiek wątpliwości (różne narożniki, nic do przycięcia, błąd sieci albo
 * CORS) zwracamy null i zostaje oryginał: gorzej obciąć logo niż zostawić je za małe.
 */

export interface TrimBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Poniżej tej alfy piksel jest tłem, a nie tuszem. */
const ALPHA_VISIBLE = 8;
/** Tolerancja na kanał - kompresja rozjaśnia i przyciemnia jednolite tło o kilka poziomów. */
const CHANNEL_TOLERANCE = 6;
/** Poniżej tego zysku nie ma po co podmieniać obrazu. */
const MIN_GAIN = 0.02;
/** Od tej jasności każdego kanału tło jest białe - na jasnym awatarze go nie widać. */
const PAPER_WHITE_MIN = 245;
const VISIBLE_PLATE_PADDING_RATIO = 0.06;
const MIN_VISIBLE_PLATE_PADDING_PX = 3;

type Rgba = [number, number, number, number];

const pixelAt = (data: ArrayLike<number>, i: number): Rgba =>
    [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];

const near = (a: Rgba, b: Rgba) =>
    Math.abs(a[0] - b[0]) <= CHANNEL_TOLERANCE
    && Math.abs(a[1] - b[1]) <= CHANNEL_TOLERANCE
    && Math.abs(a[2] - b[2]) <= CHANNEL_TOLERANCE;

const transparent = (p: Rgba) => p[3] < ALPHA_VISIBLE;

/** Dwa przezroczyste piksele są tym samym tłem niezależnie od barwy pod alfą 0. */
const sameBackground = (p: Rgba, bg: Rgba) =>
    transparent(p) || transparent(bg) ? transparent(p) && transparent(bg) : near(p, bg);

const isBackground = (p: Rgba, bg: Rgba) => {
    if (transparent(p)) return true;
    if (transparent(bg)) return false;
    return near(p, bg);
};

const invisibleOnLightAvatar = (bg: Rgba) =>
    transparent(bg) || (bg[0] >= PAPER_WHITE_MIN && bg[1] >= PAPER_WHITE_MIN && bg[2] >= PAPER_WHITE_MIN);

/**
 * Prostokąt, do którego warto przyciąć obraz RGBA (`data` jak w ImageData), albo null,
 * gdy przycinać nie należy.
 */
export function findTrimBox(data: ArrayLike<number>, width: number, height: number): TrimBox | null {
    if (width < 2 || height < 2) return null;

    const corners = [0, width - 1, (height - 1) * width, height * width - 1].map(i => pixelAt(data, i));
    const bg = corners[0];
    // Narożniki różnią się od siebie -> nie wiadomo, co jest marginesem.
    if (corners.some(c => !sameBackground(c, bg))) return null;

    let left = width, right = -1, top = height, bottom = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBackground(pixelAt(data, y * width + x), bg)) continue;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
        }
    }
    if (right < left || bottom < top) return null;

    const padding = invisibleOnLightAvatar(bg)
        ? 0
        : Math.max(
            MIN_VISIBLE_PLATE_PADDING_PX,
            Math.round(Math.min(right - left + 1, bottom - top + 1) * VISIBLE_PLATE_PADDING_RATIO),
        );
    // Margines bierzemy z oryginału - nic nie dorysowujemy.
    const x = Math.max(0, left - padding);
    const y = Math.max(0, top - padding);
    const box = {
        x,
        y,
        width: Math.min(width - 1, right + padding) - x + 1,
        height: Math.min(height - 1, bottom + padding) - y + 1,
    };
    const gain = 1 - (box.width * box.height) / (width * height);
    return gain < MIN_GAIN ? null : box;
}

const pending = new Map<string, Promise<string | null>>();
const settled = new Map<string, string | null>();

async function trim(url: string): Promise<string | null> {
    if (typeof fetch !== 'function' || typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
        return null;
    }
    try {
        // Osobne żądanie CORS: <img> ładuje logo bez CORS, a z takiego obrazu canvas nie
        // pozwala czytać pikseli. jsDelivr odpowiada Access-Control-Allow-Origin: *.
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return null;
        const bitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        const box = findTrimBox(ctx.getImageData(0, 0, bitmap.width, bitmap.height).data, bitmap.width, bitmap.height);
        if (!box) return null;

        const out = document.createElement('canvas');
        out.width = box.width;
        out.height = box.height;
        out.getContext('2d')?.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
        const blob = await new Promise<Blob | null>(resolve => out.toBlob(resolve, 'image/png'));
        return blob ? URL.createObjectURL(blob) : null;
    } catch {
        return null;
    }
}

/**
 * Adres logo bez pustego obrzeża albo null (zostaje oryginał). Każde logo liczy się raz na
 * sesję - wynik jest współdzielony przez wszystkie awatary tej marki.
 */
export function trimmedLogoUrl(url: string): Promise<string | null> {
    let job = pending.get(url);
    if (!job) {
        job = trim(url).then(result => {
            settled.set(url, result);
            return result;
        });
        pending.set(url, job);
    }
    return job;
}

/** Wynik już policzony: string, null (zostaje oryginał) albo undefined, gdy jeszcze się liczy. */
export function trimmedLogoUrlSync(url: string): string | null | undefined {
    return settled.has(url) ? settled.get(url) : undefined;
}
