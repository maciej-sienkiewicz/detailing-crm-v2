import { pluralPl } from '@/common/utils/plural';
import type { BulkPaymentStatusResult, BulkPaymentStatusTarget } from '../types';

/**
 * Zdanie, które po operacji grupowej zobaczy użytkownik.
 *
 * Trzy liczby z odpowiedzi znaczą trzy różne rzeczy i nie wolno ich zsumować:
 * zaznaczając „wszystko" prawie zawsze trafia się w dokumenty mające już docelowy
 * status (to nie jest błąd) oraz - przy cofaniu - w opłacone dokumenty modułu
 * finansowego, których cofnąć się nie da (to jest informacja, nie awaria).
 * Komunikat „oznaczono 12" przy dwunastu zaznaczonych, z których zmieniły się trzy,
 * byłby po prostu nieprawdziwy.
 */
export interface BulkPaymentStatusMessage {
    /** true = nic się nie zmieniło; wołający pokazuje to jako informację, nie sukces. */
    nothingChanged: boolean;
    title: string;
    detail?: string;
}

const documentsWord = (n: number) => pluralPl(n, 'dokument', 'dokumenty', 'dokumentów');

const targetWord = (target: BulkPaymentStatusTarget, n: number) =>
    target === 'PAID'
        ? pluralPl(n, 'opłacony', 'opłacone', 'opłaconych')
        : pluralPl(n, 'oczekujący', 'oczekujące', 'oczekujących');

/** Powody pominięcia zwija do jednego zdania - te same powtarzają się dla wielu pozycji. */
const skippedDetail = (result: BulkPaymentStatusResult): string | undefined => {
    if (result.skipped.length === 0) return undefined;
    const reasons = Array.from(new Set(result.skipped.map((s) => s.reason)));
    return `Pominięto ${result.skipped.length} ${documentsWord(result.skipped.length)}: ${reasons.join('; ')}.`;
};

/** Orzeczenie idzie tą samą odmianą co rzeczownik: 1 miał, 2 miały, 9 miało. */
const unchangedNote = (count: number): string =>
    `${count} ${documentsWord(count)} ${pluralPl(count, 'miał', 'miały', 'miało')} już ten status.`;

export const describeBulkPaymentStatus = (
    result: BulkPaymentStatusResult,
    target: BulkPaymentStatusTarget,
): BulkPaymentStatusMessage => {
    const skipped = skippedDetail(result);

    if (result.updated === 0) {
        // Nic nie zapisano. Rozróżniamy „wszystko już było takie" od „nic nie wolno było ruszyć",
        // bo pierwsze nie wymaga żadnej reakcji, a drugie jest jedyną treścią komunikatu.
        if (result.unchanged > 0) {
            return {
                nothingChanged: true,
                title: 'Bez zmian',
                detail: [unchangedNote(result.unchanged), skipped].filter(Boolean).join(' '),
            };
        }
        return {
            nothingChanged: true,
            title: 'Nie zmieniono żadnego dokumentu',
            detail: skipped,
        };
    }

    const notes = [
        result.unchanged > 0 ? unchangedNote(result.unchanged) : undefined,
        skipped,
    ].filter(Boolean);

    return {
        nothingChanged: false,
        title:
            `Oznaczono ${result.updated} ${documentsWord(result.updated)} ` +
            `jako ${targetWord(target, result.updated)}`,
        detail: notes.length > 0 ? notes.join(' ') : undefined,
    };
};
