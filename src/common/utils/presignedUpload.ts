/**
 * Wysyłka pliku prosto do S3 pod adres podpisany przez serwer.
 *
 * Dwie pułapki, na które wpadało kilka miejsc niezależnie:
 *
 *  1. `fetch` NIE rzuca przy 4xx/5xx. Bez sprawdzenia `response.ok` odrzucony upload
 *     (wygasły link, niezgodny Content-Type) kończył się „sukcesem": serwer miał już
 *     rekord zdjęcia albo dokumentu, a pliku pod nim nie było - pusty kafelek
 *     i link prowadzący donikąd.
 *  2. Content-Type jest częścią podpisu. Wysłanie innego nagłówka niż ten, który
 *     podpisał serwer, kończy się 403 SignatureDoesNotMatch.
 */

/** Błąd wysyłki pliku do S3 - jego treść da się pokazać użytkownikowi. */
export class PresignedUploadError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = 'PresignedUploadError';
    }
}

export const putToPresignedUrl = async (
    uploadUrl: string,
    body: Blob,
    contentType: string,
): Promise<void> => {
    let response: Response;
    try {
        response = await fetch(uploadUrl, {
            method: 'PUT',
            body,
            headers: { 'Content-Type': contentType },
        });
    } catch {
        throw new PresignedUploadError('Nie udało się wysłać pliku. Sprawdź połączenie z internetem i spróbuj ponownie.');
    }
    if (!response.ok) {
        throw new PresignedUploadError('Serwer plików odrzucił wysyłkę. Spróbuj ponownie.', response.status);
    }
};

/**
 * Content-Type, który serwer podpisuje dla zdjęć wizyty, pojazdu i zlecenia zbiorczego
 * (`PhotoSessionService.contentTypeFromFileName`): liczony z ROZSZERZENIA nazwy pliku,
 * z `image/jpeg` dla wszystkiego poza png i webp. Przeglądarka wysyłała `file.type`,
 * więc zdjęcie .heic, .gif czy plik bez rozszerzenia dostawało 403, a rekord zdjęcia
 * zostawał bez pliku. Obie strony muszą liczyć to samo - zmieniając jedną, zmień drugą.
 */
export const photoUploadContentType = (fileName: string): string => {
    const dot = fileName.lastIndexOf('.');
    const ext = dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
};

/** Błąd, którego globalny toast z `apiClient` nie pokazał - trzeba go pokazać na miejscu. */
export const isUnannouncedUploadError = (error: unknown): boolean =>
    error instanceof PresignedUploadError;
