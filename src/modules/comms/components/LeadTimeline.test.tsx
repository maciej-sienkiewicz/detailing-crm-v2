// @vitest-environment jsdom
//
// Zgłoszenie z produkcji: lead po wymianie trzech maili pokazywał w historii dwie
// linijki — „Nowy" i „W kontakcie". Cała treść sprawy (o co klient pytał, co
// odpowiedzieliśmy, jak się targował) istniała w wątku poczty, czyli wszędzie, byle
// nie tam, gdzie użytkownik jej szukał.
//
// Te testy pilnują tego, co z tej zmiany widać na ekranie: że zdarzenia kontaktu są
// nazwane po ludzku, że pierwsze pytanie klienta odróżnia się od kolejnych i że
// treść wiadomości jest czytelna bez wychodzenia do skrzynki.
//
// Zmiana domyślnego stanu (wrzesień 2026): oś czasu przestała być przypisem pod
// wyceną i stała się główną treścią panelu szczegółów, więc wiadomości stoją na niej
// rozwinięte, a przycisk służy do CHOWANIA. Wcześniejsze testy opisywały stan
// odwrotny — zostały tu przepisane celowo, nie dopasowane do kodu po fakcie.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import { LeadTimeline } from './LeadTimeline';
import type { LeadTimelineEntry } from '../types';

const entry = (over: Partial<LeadTimelineEntry> & Pick<LeadTimelineEntry, 'id' | 'kind'>): LeadTimelineEntry => ({
    at: '2026-09-04T13:23:23Z',
    actorName: null,
    toStatus: null,
    fromStatus: null,
    lostReasonLabel: null,
    subject: null,
    body: null,
    note: null,
    ...over,
});

/**
 * Wątek ze zgłoszenia: pytanie, wycena, kontroferta i rezerwacja na koniec.
 *
 * Bez „Nowy" i „W kontakcie" — te odsiewa serwer, bo są echem stojących obok
 * wiadomości. Zostaje status, który jest decyzją człowieka i którego korespondencja
 * nie widzi; komponent musi umieć pokazać jedno i drugie.
 */
const conversation: LeadTimelineEntry[] = [
    entry({
        id: '1',
        kind: 'INBOUND_MESSAGE',
        actorName: 'Maciej Sienkiewicz',
        body: 'ile za oklejenie full body porsze panamera?',
    }),
    entry({ id: '2', kind: 'OUTBOUND_MESSAGE', body: '1200 dla Ciebie' }),
    entry({ id: '3', kind: 'INBOUND_MESSAGE', actorName: 'Maciej Sienkiewicz', body: 'za drogo. 800 dam' }),
    entry({ id: '4', kind: 'STATUS', toStatus: 'CONFIRMED', actorName: 'Maciej Sienkiewicz' }),
];

/**
 * Nazwa przycisku podglądu zależy od stanu wiersza („Ukryj" / „Pokaż"), więc tam,
 * gdzie test sprawdza BRAK przycisku, musi łapać obie — inaczej przechodziłby dlatego,
 * że szuka nieistniejącej etykiety, a nie dlatego, że przycisku nie ma.
 */
const MESSAGE_TOGGLE = /(Pokaż|Ukryj) wiadomość/;

const renderTimeline = (entries: LeadTimelineEntry[]) =>
    render(
        <ThemeProvider theme={theme}>
            <LeadTimeline entries={entries} />
        </ThemeProvider>
    );

describe('LeadTimeline', () => {
    it('opowiada przebieg sprawy, a nie samą wędrówkę po statusach', () => {
        renderTimeline(conversation);

        expect(screen.getByText('Pierwszy kontakt klienta')).toBeTruthy();
        expect(screen.getByText('Odpisaliśmy')).toBeTruthy();
        expect(screen.getByText('Klient odpisał')).toBeTruthy();
        // Statusy niosące własną treść zostają — nowe zdarzenia mają je uzupełnić,
        // a nie wyprzeć.
        expect(screen.getByText('Rezerwacja')).toBeTruthy();
    });

    it('pierwsze pytanie klienta ma inną nazwę niż jego kolejne wiadomości', () => {
        // „Klient odpisał" na samej górze osi brzmiałoby jak odpowiedź na coś,
        // czego nie było.
        renderTimeline(conversation);

        expect(screen.getAllByText('Klient odpisał')).toHaveLength(1);
        expect(screen.getAllByText('Pierwszy kontakt klienta')).toHaveLength(1);
    });

    it('treść wiadomości stoi na osi od razu, bez proszenia o nią', async () => {
        // Sedno zmiany: „Klient odpisał · 6 dni temu" nie mówi, o co klient pytał,
        // więc żeby dowiedzieć się czegokolwiek, trzeba było rozkliknąć każdy wiersz.
        renderTimeline(conversation);

        expect(screen.getByText('1200 dla Ciebie')).toBeTruthy();

        await userEvent.click(screen.getAllByRole('button', { name: /Ukryj wiadomość/ })[1]);

        expect(screen.queryByText('1200 dla Ciebie')).toBeNull();
    });

    it('podgląd wiadomości jest przyciskiem, nie zdaniem do przeczytania', () => {
        // Sama ikona bez widocznej etykiety — nazwa dostępnościowa jest wtedy jedynym,
        // co ma czytnik ekranu, więc nie może zniknąć razem z tekstem. Nazwa mówi, co
        // przycisk ZROBI, więc przy treści na wierzchu brzmi „Ukryj".
        renderTimeline(conversation);

        const toggles = screen.getAllByRole('button', { name: /Ukryj wiadomość/ });
        expect(toggles).toHaveLength(3);
        expect(toggles[0].getAttribute('aria-expanded')).toBe('true');
    });

    it('przycisk podglądu jest dzieckiem wiersza, nie jego treści', () => {
        // Na tym stoi spójność, o którą poszło zgłoszenie: przycisk wpięty w treść
        // płynął za tekstem i lądował w innym miejscu w każdym wierszu — raz w linii
        // daty, raz pod nią. Jako bezpośrednie dziecko wiersza trafia w stałą kolumnę
        // siatki i stoi wszędzie tak samo. Układu nie zmierzy jsdom, ale strukturę,
        // od której on zależy, owszem.
        const { container } = renderTimeline(conversation);

        container.querySelectorAll('li').forEach((row) => {
            const button = row.querySelector('button');
            if (button) expect(button.parentElement).toBe(row);
        });
    });

    it('zwinięcie jednej wiadomości nie zwija pozostałych', async () => {
        // Schowanie długiego maila nie może kasować kontekstu, dla którego się go chowa.
        renderTimeline(conversation);

        // [0] to wiersz najnowszy, czyli kontroferta klienta - patrz test kolejności.
        await userEvent.click(screen.getAllByRole('button', { name: /Ukryj wiadomość/ })[0]);

        expect(screen.queryByText('za drogo. 800 dam')).toBeNull();
        expect(screen.getByText('ile za oklejenie full body porsze panamera?')).toBeTruthy();
    });

    it('najnowsze zdarzenie stoi na górze osi', () => {
        // Backend oddaje oś rosnąco, a pytanie brzmi „co się wydarzyło ostatnio".
        // Przy dłuższej sprawie porządek rosnący kazał przewinąć całą korespondencję,
        // żeby zobaczyć stan, po który się tu przyszło.
        const { container } = renderTimeline(conversation);

        const headlines = [...container.querySelectorAll('li')].map(
            (row) => row.querySelector('strong')?.textContent
        );

        expect(headlines).toEqual([
            'Rezerwacja',
            'Klient odpisał',
            'Odpisaliśmy',
            'Pierwszy kontakt klienta',
        ]);
    });

    it('nazwa „Pierwszy kontakt klienta" trzyma się chronologii, nie kolejności na ekranie', () => {
        // Po odwróceniu osi pierwsza wiadomość klienta W TABLICY jest jego ostatnią
        // wiadomością — etykieta liczona z porządku wyświetlania trafiłaby w zły wiersz.
        const { container } = renderTimeline(conversation);

        const rows = [...container.querySelectorAll('li')];
        const first = rows.find((row) => row.textContent?.includes('Pierwszy kontakt klienta'));

        expect(first?.textContent).toContain('ile za oklejenie full body porsze panamera?');
    });

    it('zmiana statusu nie oferuje podglądu wiadomości, bo nie ma czego pokazać', () => {
        renderTimeline([entry({ id: '1', kind: 'STATUS', toStatus: 'NEW' })]);

        expect(screen.queryByRole('button', { name: MESSAGE_TOGGLE })).toBeNull();
    });

    it('kontakt poza pocztą pokazuje notatkę od razu, bez rozwijania', () => {
        // Notatka z rozmowy to jedno zdanie — chowanie go za przyciskiem byłoby
        // kliknięciem za nic.
        renderTimeline([
            entry({
                id: '1',
                kind: 'CALLBACK',
                actorName: 'Maciej Sienkiewicz',
                note: 'prosił o kontakt po 15',
            }),
        ]);

        expect(screen.getByText('Kontakt poza pocztą')).toBeTruthy();
        expect(screen.getByText('prosił o kontakt po 15')).toBeTruthy();
        expect(screen.queryByRole('button', { name: MESSAGE_TOGGLE })).toBeNull();
    });

    it('kontakt bez notatki nadal jest zdarzeniem', () => {
        renderTimeline([entry({ id: '1', kind: 'CALLBACK', actorName: 'Maciej Sienkiewicz' })]);

        expect(screen.getByText('Kontakt poza pocztą')).toBeTruthy();
    });

    it('pusta oś mówi wprost, że nic się nie wydarzyło', () => {
        renderTimeline([]);

        expect(screen.getByText('Nic się jeszcze nie wydarzyło.')).toBeTruthy();
    });
});
