// src/modules/products/utils/imageTools.ts
//
// Zdjęcie z aparatu telefonu ma 3–5 MB i 4000 px — do odczytu kodu kreskowego to
// zbędne. Skalujemy do ~1600 px po dłuższym boku: dekoder w przeglądarce dostaje kadr,
// który przetworzy w ułamku sekundy, a jeśli trzeba wysłać go do modelu wizyjnego, płacimy
// za kilkaset KB zamiast kilku MB. <img> honoruje orientację EXIF, więc zdjęcie z iPhone'a
// nie przyjdzie obrócone o 90°.

export function loadImage(file: Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie udało się wczytać zdjęcia.')); };
        img.src = url;
    });
}

export async function fileToCanvas(file: Blob, maxSide = 1600): Promise<HTMLCanvasElement> {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
}

export function canvasToJpegFile(canvas: HTMLCanvasElement, name = 'barcode.jpg', quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => (blob ? resolve(new File([blob], name, { type: 'image/jpeg' })) : reject(new Error('toBlob'))),
            'image/jpeg',
            quality,
        );
    });
}
