import type { ContactButton, DmThread, GoogleReview, OwnPeriod } from '../../accountsTypes';

/**
 * Logika zakładki „Moje konta" bez Reacta: zmiany do poprzednich 30 dni, godziny
 * aktywności, kolejność wiadomości i opinii, komunikaty po powrocie z logowania.
 * Osobno, bo to od tych liczb i zdań zależy, czy właściciel coś zrobi - a to daje
 * się sprawdzić testem.
 */

// ─── Zmiana do poprzedniego okresu ────────────────────────────────────────────

/**
 * Zmiana w procentach. Null, gdy nie ma z czym porównać - także przy zerze
 * w poprzednim okresie: „+∞%" z 0 do 4 telefonów nic nie mówi, a 4 telefony mówią.
 */
export const percentChange = (current: number | null | undefined, previous: number | null | undefined): number | null => {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    if (previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 100);
};

/**
 * „+28", „−5", „0" - przy liczbie netto znak JEST treścią. Minus typograficzny,
 * bo łącznik „-5" w dużej cyfrze wygląda jak kreska oddzielająca.
 */
export const formatSigned = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    const digits = String(Math.abs(Math.trunc(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
    if (value > 0) return `+${digits}`;
    if (value < 0) return `\u2212${digits}`;
    return digits;
};

/** Obserwujący netto: nowi minus ci, którzy przestali obserwować. */
export const netFollowers = (period: OwnPeriod | null | undefined): number | null => {
    if (!period || period.follows === null || period.follows === undefined) return null;
    return period.follows - (period.unfollows ?? 0);
};

/** Wszystkie kliknięcia przycisków kontaktu na profilu: zadzwoń, trasa, e-mail... */
export const contactTotal = (period: OwnPeriod | null | undefined): number | null => {
    if (!period) return null;
    return Object.values(period.contactTaps ?? {}).reduce<number>((sum, value) => sum + (value ?? 0), 0);
};

/** Przyciski kontaktu w kolejności, w jakiej właściciel o nie pyta: telefon pierwszy. */
export const CONTACT_BUTTONS: { key: ContactButton; label: string }[] = [
    { key: 'CALL', label: 'Zadzwoń' },
    { key: 'DIRECTION', label: 'Trasa' },
    { key: 'BOOK_NOW', label: 'Rezerwuj' },
    { key: 'EMAIL', label: 'E-mail' },
    { key: 'TEXT', label: 'Wiadomość' },
];

// ─── Godziny aktywności obserwujących ─────────────────────────────────────────

/**
 * Trzy godziny z największą liczbą obserwujących online - te podświetlamy na wykresie
 * i podajemy słownie. Przy remisie wcześniejsza godzina: w tej samej liczbie
 * obserwujących post opublikowany wcześniej ma więcej czasu na zasięg.
 */
export const topHours = (hours: number[], count = 3): number[] =>
    hours
        .map((value, hour) => ({ value, hour }))
        .filter(h => h.value > 0)
        .sort((a, b) => b.value - a.value || a.hour - b.hour)
        .slice(0, count)
        .map(h => h.hour)
        .sort((a, b) => a - b);

export const formatHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

// ─── Kolejność list ───────────────────────────────────────────────────────────

/** Najpierw rozmowy, w których klient czeka na odpowiedź, potem najświeższe. */
export const sortThreads = (threads: DmThread[]): DmThread[] =>
    [...threads].sort((a, b) =>
        Number(b.awaitingReply) - Number(a.awaitingReply)
        || new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

/** Najpierw opinie bez odpowiedzi - to z nimi właściciel ma coś zrobić. */
export const sortReviews = (reviews: GoogleReview[]): GoogleReview[] =>
    [...reviews].sort((a, b) =>
        Number(a.replyComment !== null) - Number(b.replyComment !== null)
        || new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

/**
 * „odpisz do 14:30" albo „odpisz do 17 paź, 9:15", gdy termin wypada innego dnia.
 * Meta przyjmuje odpowiedź z CRM tylko w 24 h od wiadomości klienta.
 */
export const replyDeadlineLabel = (iso: string, now: Date = new Date()): string => {
    const deadline = new Date(iso);
    const time = deadline.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const sameDay = deadline.toDateString() === now.toDateString();
    if (sameDay) return `odpisz do ${time}`;
    const day = deadline.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    return `odpisz do ${day}, ${time}`;
};

// ─── Powrót z logowania (Facebook, Google) ────────────────────────────────────

export type ResultTone = 'ok' | 'info' | 'danger';

export interface ConnectionResult {
    tone: ResultTone;
    title: string;
    text: string;
}

/** Parametry, które backend dokleja do adresu po powrocie z logowania. */
export const RESULT_PARAMS = ['polaczenie', 'google', 'powod'] as const;

const FAILURE_TEXT: Record<string, string> = {
    wygaslo: 'Logowanie trwało za długo. Spróbuj jeszcze raz.',
    anulowano: 'Połączenie przerwane. Nic nie zostało zmienione.',
    'brak-konta': 'Na tym koncie Facebook nie ma strony połączonej z firmowym kontem Instagram.',
    'brak-wizytowki': 'To konto Google nie zarządza żadną wizytówką firmy.',
    'brak-zgody': 'Google nie dał stałego dostępu. Połącz jeszcze raz i zaznacz wszystkie zgody.',
};

/**
 * Zdanie po powrocie z logowania. Bez niego właściciel wracał na ten sam ekran
 * i nie wiedział, czy coś się udało - a błąd z Facebooka nie ma innego miejsca,
 * w którym można go pokazać.
 */
export const connectionResult = (params: URLSearchParams): ConnectionResult | null => {
    const instagram = params.get('polaczenie');
    const google = params.get('google');
    const reason = params.get('powod') ?? '';
    if (instagram) {
        if (instagram === 'ok') return { tone: 'ok', title: 'Instagram połączony', text: 'Pierwsze statystyki pojawią się za kilka minut.' };
        if (instagram === 'wybierz') return { tone: 'info', title: 'Wybierz konto', text: 'Masz kilka kont Instagram. Wskaż konto studia.' };
        return {
            tone: 'danger',
            title: 'Nie udało się połączyć Instagrama',
            text: FAILURE_TEXT[reason] ?? 'Meta nie potwierdziła połączenia. Spróbuj ponownie za chwilę.',
        };
    }
    if (google) {
        if (google === 'ok') return { tone: 'ok', title: 'Wizytówka Google połączona', text: 'Telefony i opinie pojawią się za kilka minut.' };
        if (google === 'wybierz') return { tone: 'info', title: 'Wybierz wizytówkę', text: 'To konto zarządza kilkoma wizytówkami. Wskaż wizytówkę studia.' };
        return {
            tone: 'danger',
            title: 'Nie udało się połączyć wizytówki',
            text: FAILURE_TEXT[reason] ?? 'Google nie potwierdził połączenia. Spróbuj ponownie za chwilę.',
        };
    }
    return null;
};

/** Adres bez parametrów wyniku - po pokazaniu komunikatu odświeżenie strony nie powtarza go. */
export const withoutResultParams = (params: URLSearchParams): URLSearchParams => {
    const next = new URLSearchParams(params);
    RESULT_PARAMS.forEach(key => next.delete(key));
    return next;
};

/** „przed chwilą", „15 min temu", „3 godz. temu", „wczoraj", „14 paź" - kiedy odświeżono. */
export const sinceLabel = (iso: string | null | undefined, now: Date = new Date()): string | null => {
    if (!iso) return null;
    const then = new Date(iso);
    const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
    if (minutes < 2) return 'przed chwilą';
    if (minutes < 60) return `${minutes} min temu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24 && then.toDateString() === now.toDateString()) return `${hours} godz. temu`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (then.toDateString() === yesterday.toDateString()) return 'wczoraj';
    return then.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};
