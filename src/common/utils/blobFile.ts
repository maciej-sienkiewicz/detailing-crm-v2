// src/common/utils/blobFile.ts
//
// Pobieranie plików z API (PDF, arkusze): odczyt błędu z odpowiedzi-bloba i zapis na dysk.

/**
 * Błąd z żądania o `responseType: 'blob'` też przychodzi jako Blob, więc treść
 * komunikatu trzeba z niego odczytać - inaczej użytkownik dostaje „[object Blob]".
 */
export async function readBlobErrorMessage(error: unknown): Promise<string | null> {
    const data = (error as { response?: { data?: unknown } })?.response?.data;
    if (!(data instanceof Blob)) {
        return (data as { message?: string } | undefined)?.message ?? null;
    }
    try {
        const parsed = JSON.parse(await data.text()) as { message?: string };
        return parsed.message ?? null;
    } catch {
        return null;
    }
}

/** Zapisuje pobrany plik na dysk użytkownika. */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
