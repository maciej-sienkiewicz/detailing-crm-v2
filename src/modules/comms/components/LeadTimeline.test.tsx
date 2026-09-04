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

/** Wątek ze zgłoszenia: pytanie, wycena, kontroferta — plus statusy między nimi. */
const conversation: LeadTimelineEntry[] = [
    entry({
        id: '1',
        kind: 'INBOUND_MESSAGE',
        actorName: 'Maciej Sienkiewicz',
        body: 'ile za oklejenie full body porsze panamera?',
    }),
    entry({ id: '2', kind: 'STATUS', toStatus: 'NEW', actorName: 'Maciej Sienkiewicz' }),
    entry({ id: '3', kind: 'OUTBOUND_MESSAGE', body: '1200 dla Ciebie' }),
    entry({ id: '4', kind: 'STATUS', toStatus: 'IN_PROGRESS' }),
    entry({ id: '5', kind: 'INBOUND_MESSAGE', actorName: 'Maciej Sienkiewicz', body: 'za drogo. 800 dam' }),
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
        // Statusy zostają — nowe zdarzenia mają je uzupełnić, a nie wyprzeć.
        expect(screen.getByText('Nowy')).toBeTruthy();
        expect(screen.getByText('W kontakcie')).toBeTruthy();
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
