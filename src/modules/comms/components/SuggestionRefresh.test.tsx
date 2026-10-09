// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import { SuggestionRefresh } from './SuggestionRefresh';
import type { SuggestionActions } from './SuggestedServiceRows';

const idle: { isPending: boolean; isError: boolean; data: unknown; mutate: () => void } = {
    isPending: false, isError: false, data: undefined, mutate: vi.fn(),
};

const actions = (refresh: Partial<typeof idle>) =>
    ({ accept: idle, reject: idle, refresh: { ...idle, ...refresh } }) as unknown as SuggestionActions;

const renderPanel = (a: SuggestionActions) =>
    render(
        <ThemeProvider theme={theme}>
            <SuggestionRefresh actions={a} />
        </ThemeProvider>
    );

describe('SuggestionRefresh', () => {
    it('przycisk przelicza dobór od nowa', () => {
        const mutate = vi.fn();
        renderPanel(actions({ mutate }));
        fireEvent.click(screen.getByRole('button', { name: /Znajdź ponownie/ }));
        expect(mutate).toHaveBeenCalled();
    });

    it('po przeliczeniu: zdanie dla człowieka, powód przy każdej pozycji, bez szczegółów technicznych', () => {
        renderPanel(actions({
            data: {
                lead: {},
                diagnostics: {
                    ranAt: '2026-10-04T10:00:00Z',
                    outcome: 'Dobrano z cennika 1 pozycję. Pozostałe nie pasowały - powody niżej.',
                    intentStatus: 'MATCHED',
                    candidates: [
                        { serviceName: 'Oklejenie szyby czołowej folią PPF', stage: 'SHOWN', stageLabel: 'Zaproponowana w wycenie', shown: true, quote: 'oklejanie szyby folią ochronną' },
                        { serviceName: 'Korekta lakieru', stage: 'FAMILY_MISMATCH', stageLabel: 'Pominięta - to inny rodzaj usługi niż ten, o który pyta klient', shown: false, quote: null },
                    ],
                },
            },
        }));

        expect(screen.getByText(/Dobrano z cennika 1 pozycję/)).toBeTruthy();
        expect(screen.getByText('Oklejenie szyby czołowej folią PPF')).toBeTruthy();
        expect(screen.getByText('Pominięta - to inny rodzaj usługi niż ten, o który pyta klient')).toBeTruthy();
        expect(screen.getByText('Klient pisze: „oklejanie szyby folią ochronną”')).toBeTruthy();
        // Uzasadnienie asystenta z nazwami z kodu trafia tylko do logu serwera - na
        // ekranie nie ma po nim śladu, także zwiniętego.
        expect(screen.queryByText(/Szczegóły techniczne/)).toBeNull();
        expect(document.querySelector('details')).toBeNull();
        expect(document.body.textContent).not.toMatch(/MATCHED|FAMILY_MISMATCH|SHOWN/);
    });

    it('w trakcie przeliczania mówi, że to chwilę trwa', () => {
        renderPanel(actions({ isPending: true }));
        expect(screen.getByRole('button', { name: /Szukam usług od nowa/ })).toHaveProperty('disabled', true);
    });
});
