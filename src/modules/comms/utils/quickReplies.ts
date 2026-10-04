/**
 * Gotowe odpowiedzi na zapytanie - dla sytuacji, w których studio najczęściej
 * nie odpisuje wcale: nie da się wycenić bez zdjęć, trzeba zobaczyć auto, albo
 * tej usługi po prostu się nie robi.
 *
 * Najtrudniejsza jest odmowa: niezręcznie napisać „nie robimy tego", więc nikt
 * nie pisze nic, a zapytanie wisi w kolejce tygodniami. Jedno kliknięcie zamienia
 * to w uprzejmą odpowiedź i zamyka zapytanie jako „Poza zakresem usług" - powód,
 * który nie liczy się jako strata.
 *
 * Treść to szkic do edycji, nie formularz: wskakuje do edytora, a wysyła człowiek.
 * Bez obietnic, których studio mogło nie składać (cen, bezpłatnych oględzin, terminów).
 * Pozdrowienie bez podpisu - podpis dokłada stopka.
 */
export interface QuickReply {
    id: 'photos' | 'inspection' | 'decline';
    label: string;
    text: string;
    /** Po wysłaniu zamknij zapytanie z tym powodem utraty. */
    closesWithReason?: string;
}

export const QUICK_REPLIES: readonly QuickReply[] = [
    {
        id: 'photos',
        label: 'Poproś o zdjęcia',
        text:
            'Dzień dobry,\n\n' +
            'dziękujemy za wiadomość. Żeby przygotować rzetelną wycenę, prosimy o kilka zdjęć auta: ' +
            'całego oraz miejsc, których dotyczy zapytanie, najlepiej w dziennym świetle. ' +
            'Jeśli w wiadomości nie było marki, modelu i rocznika, prosimy też o te dane.\n\n' +
            'Odezwiemy się z wyceną zaraz po otrzymaniu zdjęć.\n\n' +
            'Pozdrawiamy',
    },
    {
        id: 'inspection',
        label: 'Zaproś na oględziny',
        text:
            'Dzień dobry,\n\n' +
            'dziękujemy za wiadomość. Przy takim zakresie prac najuczciwszą wycenę przygotujemy ' +
            'po krótkich oględzinach auta u nas w studiu. Prosimy o informację, jaki dzień i godzina ' +
            'będą dla Państwa dogodne, a potwierdzimy termin.\n\n' +
            'Pozdrawiamy',
    },
    {
        id: 'decline',
        label: 'Nie robimy tego',
        text:
            'Dzień dobry,\n\n' +
            'dziękujemy za zapytanie. Niestety tej usługi nie wykonujemy, więc nie chcemy ' +
            'podawać wyceny na wyrost. Jeśli w przyszłości będą Państwo potrzebować pielęgnacji ' +
            'lub zabezpieczenia auta, chętnie pomożemy.\n\n' +
            'Pozdrawiamy',
        closesWithReason: 'OUT_OF_SCOPE',
    },
];
