// @vitest-environment jsdom
//
// Zgłoszenie z produkcji: lead po wymianie trzech maili pokazywał w historii dwie
// linijki — „Nowy" i „W kontakcie". Cała treść sprawy (o co klient pytał, co
// odpowiedzieliśmy, jak się targował) istniała w wątku poczty, czyli wszędzie, byle
// nie tam, gdzie użytkownik jej szukał.
//
// Te testy pilnują tego, co z tej zmiany widać na ekranie: że zdarzenia kontaktu są
// nazwane po ludzku, że pierwsze pytanie klienta odróżnia się od kolejnych i że
// treść wiadomości daje się rozwinąć bez wychodzenia do skrzynki.
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

    it('treść wiadomości jest ukryta, dopóki nikt o nią nie poprosi', async () => {
        renderTimeline(conversation);

        expect(screen.queryByText('1200 dla Ciebie')).toBeNull();

        await userEvent.click(screen.getAllByRole('button', { name: /Pokaż wiadomość/ })[1]);

        expect(screen.getByText('1200 dla Ciebie')).toBeTruthy();
    });

    it('podgląd wiadomości jest przyciskiem, nie zdaniem do przeczytania', () => {
        // Sama ikona bez widocznej etykiety — nazwa dostępnościowa jest wtedy jedynym,
        // co ma czytnik ekranu, więc nie może zniknąć razem z tekstem.
        renderTimeline(conversation);

        const toggles = screen.getAllByRole('button', { name: /Pokaż wiadomość/ });
        expect(toggles).toHaveLength(3);
        expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
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

    it('rozwinięcie jednej wiadomości nie rozwija pozostałych', async () => {
        // Trzy wiadomości otwarte naraz zamieniają oś czasu w drugi przebieg wątku.
        renderTimeline(conversation);

        await userEvent.click(screen.getAllByRole('button', { name: /Pokaż wiadomość/ })[0]);

        expect(screen.getByText('ile za oklejenie full body porsze panamera?')).toBeTruthy();
        expect(screen.queryByText('za drogo. 800 dam')).toBeNull();
    });

    it('zmiana statusu nie oferuje podglądu wiadomości, bo nie ma czego pokazać', () => {
        renderTimeline([entry({ id: '1', kind: 'STATUS', toStatus: 'NEW' })]);

        expect(screen.queryByRole('button', { name: /Pokaż wiadomość/ })).toBeNull();
    });

    it('telefon pokazuje notatkę od razu, bez rozwijania', () => {
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

        expect(screen.getByText('Oddzwoniliśmy')).toBeTruthy();
        expect(screen.getByText('prosił o kontakt po 15')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Pokaż wiadomość/ })).toBeNull();
    });

    it('telefon bez notatki nadal jest zdarzeniem', () => {
        renderTimeline([entry({ id: '1', kind: 'CALLBACK', actorName: 'Maciej Sienkiewicz' })]);

        expect(screen.getByText('Oddzwoniliśmy')).toBeTruthy();
    });

    it('pusta oś mówi wprost, że nic się nie wydarzyło', () => {
        renderTimeline([]);

        expect(screen.getByText('Nic się jeszcze nie wydarzyło.')).toBeTruthy();
    });
});
