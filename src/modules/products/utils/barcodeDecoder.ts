// src/modules/products/utils/barcodeDecoder.ts
//
// Jeden interfejs dekodera kodu kreskowego z kadru (canvas), dwa silniki:
//  1. natywny `BarcodeDetector` (Chrome/Android) — zero kilobajtów w bundlu,
//  2. czysty JS `@zxing/library` — ładowany LENIWIE tylko tam, gdzie natywnego nie ma
//     (iOS Safari, Firefox). Dzięki temu „ta przeglądarka nie odczyta kodu" przestaje
//     istnieć jako stan: każda przeglądarka z aparatem czyta kod po stronie klienta.
//
// Oba silniki dostają ten sam <canvas> z klatką, więc pętla skanowania i ścieżka
// „zdjęcie z pliku" nie wiedzą, który silnik pracuje.

export interface BarcodeDecoder {
    readonly engine: 'native' | 'zxing';
    /** Zwraca surowy odczyt (np. "5901234123457") albo null, gdy w kadrze nie ma kodu. */
    detect(canvas: HTMLCanvasElement): Promise<string | null>;
}

// BarcodeDetector nie jest w standardowych typach DOM.
type DetectedBarcode = { rawValue: string };
interface NativeDetectorLike { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> }
type NativeDetectorCtor = new (opts?: { formats?: string[] }) => NativeDetectorLike;

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

export function hasNativeDetector(): boolean {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

let cached: Promise<BarcodeDecoder> | null = null;

/** Dekoder jest singletonem — ZXing ładuje się raz na sesję, nie przy każdym otwarciu aparatu. */
export function createBarcodeDecoder(): Promise<BarcodeDecoder> {
    if (!cached) cached = build().catch(e => { cached = null; throw e; });
    return cached;
}

async function build(): Promise<BarcodeDecoder> {
    if (hasNativeDetector()) {
        const Ctor = (window as unknown as { BarcodeDetector: NativeDetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: NATIVE_FORMATS });
        return {
            engine: 'native',
            async detect(canvas) {
                const found = await detector.detect(canvas);
                return found[0]?.rawValue ?? null;
            },
        };
    }

    const zx = await import('@zxing/library');
    const hints = new Map<import('@zxing/library').DecodeHintType, unknown>();
    hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [
        zx.BarcodeFormat.EAN_13, zx.BarcodeFormat.EAN_8, zx.BarcodeFormat.UPC_A, zx.BarcodeFormat.UPC_E,
        zx.BarcodeFormat.CODE_128, zx.BarcodeFormat.CODE_39, zx.BarcodeFormat.ITF,
    ]);
    // TRY_HARDER: kadr z ręki jest lekko krzywy i nieostry — warto zapłacić kilka ms więcej.
    hints.set(zx.DecodeHintType.TRY_HARDER, true);
    const reader = new zx.MultiFormatReader();
    reader.setHints(hints);

    return {
        engine: 'zxing',
        async detect(canvas) {
            const { width, height } = canvas;
            if (!width || !height) return null;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return null;
            const { data } = ctx.getImageData(0, 0, width, height);
            // RGBLuminanceSource z Uint8ClampedArray przyjmuje GOTOWĄ luminancję (Int32Array
            // traktuje jako piksele RGB) — liczymy szarość sami, wagami z Rec. 601.
            const gray = new Uint8ClampedArray(width * height);
            for (let i = 0, j = 0; i < data.length; i += 4, j++) {
                gray[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
            }
            const bitmap = new zx.BinaryBitmap(new zx.HybridBinarizer(new zx.RGBLuminanceSource(gray, width, height)));
            try {
                return reader.decode(bitmap).getText();
            } catch {
                // NotFound / Checksum / Format — dla nas to jedno: w tym kadrze nie ma kodu.
                return null;
            } finally {
                reader.reset();
            }
        },
    };
}
