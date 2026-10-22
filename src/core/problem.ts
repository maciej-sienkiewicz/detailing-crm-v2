// src/core/problem.ts
//
// Jeden typ błędu API (audyt HTTP, P2-19). Backend odpowiada na każdy błąd problemem
// RFC 9457 (`application/problem+json`): `type`, `title`, `status`, zdanie dla człowieka
// w `detail`, ścieżka w `instance` i maszynowy `code`. Walidacja niesie `fieldErrors`,
// a dane potrzebne do decyzji (`visitId` istniejącego szkicu, `serviceNames` bez ceny,
// `missingFeatures` przy 402) leżą obok, jako pola tego samego obiektu.
//
// Wcześniej każdy ekran rzutował błąd na własny kształt (`{ response?: { data?: { message } } }`)
// i czytał z niego, co chciał. Teraz czyta się wyłącznie przez funkcje z tego pliku:
// decyzje zapadają po `code`, nigdy po treści komunikatu.

/** Typ treści błędu API. */
export const PROBLEM_MEDIA_TYPE = 'application/problem+json';

/** Błąd jednego pola formularza. */
export interface FieldError {
    field: string;
    message: string;
}

/** Problem RFC 9457 z odpowiedzi API. Pola poza standardowymi to dane do decyzji frontu. */
export interface ApiProblem {
    type: string;
    title: string;
    /** Status HTTP odpowiedzi. */
    status: number;
    /** Zdanie dla człowieka - to pokazuje dymek. */
    detail: string;
    instance?: string;
    /** Maszynowy kod problemu (`VISIT_NOT_STARTED`, `MODULE_REQUIRED`…). */
    code: string;
    fieldErrors: FieldError[];
    [extension: string]: unknown;
}

interface HttpErrorLike {
    response?: { status?: unknown; data?: unknown };
}

const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value : undefined;

const fieldErrorsOf = (value: unknown): FieldError[] =>
    Array.isArray(value)
        ? value.filter((item): item is FieldError =>
            !!item && typeof item === 'object'
            && typeof (item as FieldError).field === 'string'
            && typeof (item as FieldError).message === 'string')
        : [];

/** Status HTTP odpowiedzi, o ile błąd pochodzi z wywołania API. */
export function problemStatus(error: unknown): number | undefined {
    const status = (error as HttpErrorLike | null | undefined)?.response?.status;
    return typeof status === 'number' ? status : undefined;
}

/**
 * Problem z odpowiedzi API albo `null`, gdy błąd nie niesie treści (sieć, timeout, plik).
 *
 * `message`, `error` i `field` to pola dawnego ErrorResponse: backend wysyła je jeszcze
 * w okresie przejściowym, a parser bierze je tylko wtedy, gdy brakuje pól RFC 9457 -
 * front może więc wejść na produkcję przed backendem.
 */
export function problemOf(error: unknown): ApiProblem | null {
    const body = (error as HttpErrorLike | null | undefined)?.response?.data;
    if (!body || typeof body !== 'object' || body instanceof Blob || body instanceof ArrayBuffer) return null;
    const raw = body as Record<string, unknown>;
    const detail = text(raw.detail) ?? text(raw.message);
    const code = text(raw.code);
    const title = text(raw.title) ?? text(raw.error);
    if (detail === undefined && code === undefined && title === undefined) return null;
    const fieldErrors = fieldErrorsOf(raw.fieldErrors);
    const legacyField = text(raw.field);
    return {
        ...raw,
        type: text(raw.type) ?? 'about:blank',
        title: title ?? '',
        status: typeof raw.status === 'number' ? raw.status : problemStatus(error) ?? 0,
        detail: detail ?? '',
        instance: text(raw.instance),
        code: code ?? '',
        fieldErrors: fieldErrors.length === 0 && legacyField && detail
            ? [{ field: legacyField, message: detail }]
            : fieldErrors,
    };
}

/** Zdanie z serwera dla człowieka, o ile je przysłał. */
export function problemDetail(error: unknown): string | undefined;
/** Zdanie z serwera dla człowieka albo [fallback]. */
export function problemDetail(error: unknown, fallback: string): string;
export function problemDetail(error: unknown, fallback?: string): string | undefined {
    return text(problemOf(error)?.detail) ?? fallback;
}

/** Maszynowy kod problemu, o ile serwer go podał. */
export function problemCode(error: unknown): string | undefined {
    return text(problemOf(error)?.code);
}

/** Czy błąd to problem o tym kodzie. */
export function isProblem(error: unknown, code: string): boolean {
    return problemCode(error) === code;
}

/** Komunikat błędu konkretnego pola formularza. */
export function problemFieldError(error: unknown, field: string): string | undefined {
    return problemOf(error)?.fieldErrors.find(item => item.field === field)?.message;
}

/** Pierwsze pole, którego dotyczy błąd walidacji - gdy błąd dotyczy jednego pola. */
export function problemField(error: unknown): string | undefined {
    return problemOf(error)?.fieldErrors[0]?.field;
}
