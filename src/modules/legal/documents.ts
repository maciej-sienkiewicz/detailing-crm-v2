// Dokumenty prawne publikowane pod stałymi adresami (detailboost.pl/regulamin itd.).
// Te adresy wpisujemy w Google, Mecie, Przelewy24 i sklepach z aplikacjami, więc
// slugów nie wolno zmieniać. Treść każdego dokumentu leży w osobnym pliku w content/,
// wygenerowanym z wersji .docx uzgadnianej z prawnikiem - przy zmianie podmieniamy plik.

export type LegalBlock =
    | { t: 'h'; text: string }
    | { t: 'p'; n?: string; text: string }
    | { t: 'li'; n: string; text: string }
    | { t: 'table'; rows: string[][] };

export type LegalSlug =
    | 'regulamin'
    | 'polityka-prywatnosci'
    | 'klauzula-informacyjna'
    | 'umowa-powierzenia'
    | 'usuwanie-danych'
    | 'formularz-odstapienia';

export interface LegalDocument {
    slug: LegalSlug;
    title: string;
    updatedAt: string;
    load: () => Promise<{ default: LegalBlock[] }>;
}

/**
 * Wersja regulaminu i umowy powierzenia, którą użytkownik akceptuje przy rejestracji -
 * backend zapisuje ją jako dowód akceptacji (`LegalDocumentVersions.CURRENT`). Przy każdej
 * zmianie treści tych dokumentów podbij obie stałe naraz.
 */
export const LEGAL_VERSION = '2026-10-22';

const UPDATED_AT = '21 października 2026 r.';
const TERMS_UPDATED_AT = '22 października 2026 r.';
// Polityka i klauzula: opis plików cookies zgodny z tym, co Aplikacja naprawdę zapisuje
// (bez reklamowych cookies i baneru, których nie było). LEGAL_VERSION się nie zmienia -
// dotyczy tylko regulaminu i umowy powierzenia.
const PRIVACY_UPDATED_AT = '23 października 2026 r.';

export const LEGAL_DOCUMENTS: LegalDocument[] = [
    {
        slug: 'regulamin',
        title: 'Regulamin sprzedaży abonamentu',
        updatedAt: TERMS_UPDATED_AT,
        load: () => import('./content/regulamin.json') as Promise<{ default: LegalBlock[] }>,
    },
    {
        slug: 'polityka-prywatnosci',
        title: 'Polityka prywatności',
        updatedAt: PRIVACY_UPDATED_AT,
        load: () => import('./content/polityka-prywatnosci.json') as Promise<{ default: LegalBlock[] }>,
    },
    {
        slug: 'klauzula-informacyjna',
        title: 'Klauzula informacyjna dla Użytkowników',
        updatedAt: PRIVACY_UPDATED_AT,
        load: () => import('./content/klauzula-informacyjna.json') as Promise<{ default: LegalBlock[] }>,
    },
    {
        slug: 'umowa-powierzenia',
        title: 'Umowa powierzenia przetwarzania danych osobowych',
        updatedAt: UPDATED_AT,
        load: () => import('./content/umowa-powierzenia.json') as Promise<{ default: LegalBlock[] }>,
    },
    {
        slug: 'usuwanie-danych',
        title: 'Usuwanie danych',
        updatedAt: UPDATED_AT,
        load: () => import('./content/usuwanie-danych.json') as Promise<{ default: LegalBlock[] }>,
    },
    {
        slug: 'formularz-odstapienia',
        title: 'Formularz odstąpienia od umowy',
        updatedAt: TERMS_UPDATED_AT,
        load: () => import('./content/formularz-odstapienia.json') as Promise<{ default: LegalBlock[] }>,
    },
];

export const legalPath = (slug: LegalSlug) => `/${slug}`;
