// src/modules/comms/components/analytics/tokens.ts
// Paleta i formatowanie analityki — jedno miejsce, żeby wszystkie wykresy mówiły
// tym samym językiem kolorów.
//
// Para wygrane/przegrane to NIE zieleń i czerwień. Zieleń #16a34a przy czerwieni
// #dc2626 rozjeżdża się o ΔE 5,0 przy deuteranopii — dla mniej więcej jednego
// mężczyzny na dwunastu to są dwa słupki w tym samym kolorze, a cała treść tego
// wykresu siedzi właśnie w różnicy między nimi. Niebieski przy czerwieni daje
// ΔE 29,9 (protanopia) i 34,8 (tritanopia), więc zostaje czytelny dla każdego.
// Kolor i tak nie niesie tu sam znaczenia: każdy segment ma podpis obok.

/** Wygrane. Chłodny biegun pary rozbieżnej. */
export const WON = '#2563eb';

/** Przegrane i niedoszłe. Ciepły biegun — czerwień jest już tokenem błędu w aplikacji. */
export const LOST = '#dc2626';

/** Wciąż otwarte: brak rozstrzygnięcia to brak koloru, nie trzeci wynik. */
export const OPEN = '#cbd5e1';

/** Jedna seria wielkości (ile zapytań, ile z którego kanału). */
export const MAGNITUDE = '#2563eb';

/** Tło toru, po którym biegnie słupek. */
export const TRACK = '#eef2f7';

/** Kolumna, która nie jest tą najwyższą — kontekst dla wyróżnionej. */
export const MUTED_COLUMN = '#c7d7f5';

export const WEEKDAY_LABELS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'ndz'];
export const WEEKDAY_FULL = [
    'poniedziałki',
    'wtorki',
    'środy',
    'czwartki',
    'piątki',
    'soboty',
    'niedziele',
];

export const RESPONSE_LABELS: Record<string, string> = {
    UNDER_1H: 'do godziny',
    UNDER_4H: 'do 4 godzin',
    UNDER_24H: 'do doby',
    OVER_24H: 'po dobie',
    NO_REPLY: 'bez odpowiedzi',
};

export const SOURCE_LABELS: Record<string, string> = {
    PHONE: 'Telefon',
    EMAIL: 'E-mail',
    FORM: 'Formularz',
    MANUAL: 'Dodane ręcznie',
};

/** „62%" albo „—". Bez miejsc po przecinku: to nie jest pomiar laboratoryjny. */
export const percent = (value: number | null | undefined): string =>
    value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;

/** Różnica w punktach procentowych, zawsze ze znakiem. */
export const points = (value: number): string =>
    `${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value * 100))} pkt proc.`;

/** „35 min", „4 godz.", „2 dni" — jednostka dobrana do rzędu wielkości. */
export const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return '—';
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 24 * 60) return `${Math.round(minutes / 60)} godz.`;
    const days = Math.round(minutes / (24 * 60));
    return days === 1 ? '1 dzień' : `${days} dni`;
};

/** „1 dzień", „5 dni" — polska odmiana bez zaskoczeń przy 22 i 25. */
export const formatDays = (days: number | null): string => {
    if (days === null) return '—';
    if (days === 0) return 'tego samego dnia';
    if (days === 1) return '1 dzień';
    const rest = days % 10;
    const teens = days % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14) ? `${days} dni` : `${days} dni`;
};

/** „12 sierpnia" albo „sierpień 2026" — zależnie od tego, czy słupek to tydzień, czy miesiąc. */
const MONTHS = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
const MONTHS_NOMINATIVE = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

export const formatPeriod = (iso: string, monthly: boolean): string => {
    const date = new Date(`${iso}T00:00:00`);
    return monthly
        ? MONTHS_NOMINATIVE[date.getMonth()]
        : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

/** Skrót na oś: „12.08". Pełna data zostaje w podpowiedzi. */
export const formatPeriodTick = (iso: string, monthly: boolean): string => {
    const date = new Date(`${iso}T00:00:00`);
    return monthly
        ? MONTHS_NOMINATIVE[date.getMonth()].slice(0, 3)
        : `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
};
