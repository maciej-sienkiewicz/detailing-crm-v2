// src/modules/batch-orders/utils/format.ts

import { pluralPl } from '@/common/utils/plural';

const money = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

export const formatMoney = (cents: number): string => money.format(cents / 100);

/** Kwota bez „zł" - do drugiej linii pod kwotą główną („3 000,00 netto"). */
export const formatAmount = (cents: number): string =>
    (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * „8 wpisów", „22 wpisy", „12 wpisów". Historia rozliczeń miała własną odmianę
 * (`< 5 ? 'wpisy' : 'wpisów'`), która pisała „12 wpisy" i „22 wpisów".
 */
export const entriesLabel = (count: number): string =>
    `${count} ${pluralPl(count, 'wpis', 'wpisy', 'wpisów')}`;

export const contractorsLabel = (count: number): string =>
    `${count} ${pluralPl(count, 'kontrahent', 'kontrahentów', 'kontrahentów')}`;

export const photosLabel = (count: number): string =>
    `${count} ${pluralPl(count, 'zdjęcie', 'zdjęcia', 'zdjęć')}`;

export const vatLabel = (rate: number): string => (rate === -1 ? 'ZW' : `${rate}%`);

/** Marka i model wpisu albo myślnik - wiersz tabeli nigdy nie zostaje pusty. */
export const vehicleName = (e: { vehicleMake: string | null; vehicleModel: string | null }): string =>
    [e.vehicleMake, e.vehicleModel].filter(Boolean).join(' ') || 'Pojazd bez nazwy';

/**
 * Komunikat błędu z odpowiedzi API albo zapasowy. Backend tłumaczy odmowy na ludzki
 * język („Wpis jest rozliczony…"), więc pokazujemy JEGO zdanie, a nie ogólnik.
 */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
    const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
};
