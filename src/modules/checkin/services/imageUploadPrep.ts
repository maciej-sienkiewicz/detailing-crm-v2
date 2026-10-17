// src/modules/checkin/services/imageUploadPrep.ts
//
// Normalises images picked on a phone before they are queued for upload.
//
// Two things routinely break a "dodaj z galerii" pick that a camera capture never
// hits, because the gallery hands over the ORIGINAL file:
//   • HEIC/HEIF - the default iPhone format, which the backend rejects,
//   • originals above the 10 MB upload limit (12 Mpx phone photos regularly are).
// Both are re-encoded here to a JPEG that the backend accepts, instead of being
// refused with an error the operator cannot act on.

/** Content types the backend accepts (CheckinPhotoService.ALLOWED_CONTENT_TYPES). */
export const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Backend hard limit for a single check-in photo. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Long edge the re-encoded photo is scaled down to - plenty for damage documentation. */
const MAX_EDGE_PX = 2560;

/** Tried in order until the encoded photo fits under MAX_UPLOAD_BYTES. */
const JPEG_QUALITIES = [0.85, 0.75, 0.6];

/**
 * Long edge of a photo sent for VIN reading. The vision model reads it at no more than
 * 2048 px (detail=high on the backend), so every pixel above that is upload time the
 * operator waits through for nothing - a 12 Mpx original is 3-10 MB, the same frame
 * at 2048 px is a few hundred KB.
 */
const VIN_MAX_EDGE_PX = 2048;

/** A VIN photo this small is sent untouched - re-encoding would cost more than it saves. */
const VIN_UNTOUCHED_MAX_BYTES = 700 * 1024;

const EXTENSION_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tif: 'image/tiff',
    tiff: 'image/tiff',
};

/** Raised when a picked file cannot be turned into something uploadable. */
export class UnsupportedImageError extends Error {}

/**
 * The MIME type of a picked file. Some Android gallery providers hand over an empty
 * `type`, so fall back to the file extension before giving up.
 */
export const resolveFileType = (file: File): string => {
    if (file.type) return file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase();
    return (ext && EXTENSION_TYPES[ext]) || '';
};

/** True when the file can go to the backend untouched - no re-encoding needed. */
export const isUploadReady = (file: File): boolean =>
    ACCEPTED_UPLOAD_TYPES.includes(resolveFileType(file)) && file.size <= MAX_UPLOAD_BYTES;

const swapExtension = (fileName: string): string => {
    const base = fileName.replace(/\.[^./\\]+$/, '') || 'zdjecie';
    return `${base}.jpg`;
};

interface DecodedImage {
    source: CanvasImageSource;
    width: number;
    height: number;
    release: () => void;
}

/** Decodes the file, preferring createImageBitmap (honours the EXIF orientation). */
const decode = async (file: File): Promise<DecodedImage> => {
    if (typeof createImageBitmap === 'function') {
        for (const options of [{ imageOrientation: 'from-image' } as ImageBitmapOptions, undefined]) {
            try {
                const bitmap = options
                    ? await createImageBitmap(file, options)
                    : await createImageBitmap(file);
                return {
                    source: bitmap,
                    width: bitmap.width,
                    height: bitmap.height,
                    release: () => bitmap.close(),
                };
            } catch {
                // Older Safari rejects the options argument; no engine decodes HEIC this
                // way - both cases fall through to the <img> path below.
            }
        }
    }

    // Safari decodes HEIC through an <img>, so this is the path that saves iPhone picks
    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new UnsupportedImageError('decode failed'));
            el.src = objectUrl;
        });
        return {
            source: img,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            release: () => URL.revokeObjectURL(objectUrl),
        };
    } catch (err) {
        URL.revokeObjectURL(objectUrl);
        throw err;
    }
};

const toJpegBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
    new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

/**
 * Returns a file the backend will accept: the original when it already qualifies,
 * otherwise a downscaled JPEG re-encode.
 *
 * @throws {UnsupportedImageError} when the browser cannot decode the picked file
 *         (e.g. a HEIC photo copied to an Android phone).
 */
export const prepareImageForUpload = async (file: File): Promise<File> => {
    if (isUploadReady(file)) return file;
    return reencodeAsJpeg(file, MAX_EDGE_PX, JPEG_QUALITIES);
};

/**
 * A photo for VIN reading: always scaled down to what the model actually reads, because
 * here the operator waits for the result. Falls back to the regular upload preparation
 * (and finally to the original) rather than failing - a slower read beats no read.
 */
export const prepareImageForVin = async (file: File): Promise<File> => {
    if (ACCEPTED_UPLOAD_TYPES.includes(resolveFileType(file)) && file.size <= VIN_UNTOUCHED_MAX_BYTES) return file;
    try {
        return await reencodeAsJpeg(file, VIN_MAX_EDGE_PX, [0.85]);
    } catch {
        return prepareImageForUpload(file).catch(() => file);
    }
};

const reencodeAsJpeg = async (file: File, maxEdgePx: number, qualities: number[]): Promise<File> => {
    const decoded = await decode(file);
    const canvas = document.createElement('canvas');
    try {
        const { width, height } = decoded;
        if (!width || !height) throw new UnsupportedImageError('empty image');

        const scale = Math.min(1, maxEdgePx / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new UnsupportedImageError('no 2d context');
        ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    } finally {
        decoded.release();
    }

    for (const quality of qualities) {
        const blob = await toJpegBlob(canvas, quality);
        if (!blob) throw new UnsupportedImageError('encode failed');
        if (blob.size <= MAX_UPLOAD_BYTES) {
            return new File([blob], swapExtension(file.name), {
                type: 'image/jpeg',
                lastModified: file.lastModified,
            });
        }
    }

    throw new UnsupportedImageError('still too large after re-encoding');
};

/**
 * Prepares a picked file and maps any failure to a message that tells the operator
 * what to do next. Returns `null` for `file` when the pick has to be dropped.
 */
export const prepareImageOrExplain = async (
    file: File,
    prepare: (file: File) => Promise<File> = prepareImageForUpload,
): Promise<{ file: File; error?: undefined } | { file: null; error: string }> => {
    try {
        return { file: await prepare(file) };
    } catch {
        const type = resolveFileType(file);
        if (type && !ACCEPTED_UPLOAD_TYPES.includes(type)) {
            return {
                file: null,
                error: `Nie da się użyć pliku „${file.name}”. Zrób zdjęcie aparatem albo wybierz JPG lub PNG.`,
            };
        }
        return {
            file: null,
            error: `Nie udało się przygotować zdjęcia „${file.name}”. Spróbuj wybrać je ponownie.`,
        };
    }
};
