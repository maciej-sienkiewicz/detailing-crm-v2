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
        fireEvent.click(screen.getByRole('button', { name: /Odśwież sugestie/ }));
        expect(mutate).toHaveBeenCalled();
    });

    it('po przeliczeniu pokazuje przyczynę i etap każdego kandydata', () => {
        renderPanel(actions({
            data: {
                lead: {},
                diagnostics: {
                    ranAt: '2026-10-04T10:00:00Z',
                    outcome: 'Kandydaci z cennika: 2, pokazanych: 1.',
                    intentStatus: 'MATCHED',
                    reasoning: 'Klient pyta o folię na szybę czołową.',
                    candidates: [
                        { serviceName: 'Oklejenie szyby czołowej folią PPF', stage: 'SHOWN', stageLabel: 'Pokazana jako sugestia', shown: true, quote: 'oklejanie szyby folią ochronną' },
                        { serviceName: 'Korekta lakieru', stage: 'FAMILY_MISMATCH', stageLabel: 'Inny rodzaj usługi niż w zapytaniu', shown: false, quote: null },
                    ],
                },
            },
        }));

        expect(screen.getByText('Kandydaci z cennika: 2, pokazanych: 1.')).toBeTruthy();
        expect(screen.getByText('Oklejenie szyby czołowej folią PPF')).toBeTruthy();
        expect(screen.getByText('Inny rodzaj usługi niż w zapytaniu')).toBeTruthy();
        expect(screen.getByText(/oklejanie szyby folią ochronną/)).toBeTruthy();
    });

    it('w trakcie przeliczania mówi, że to chwilę trwa', () => {
        renderPanel(actions({ isPending: true }));
        expect(screen.getByRole('button', { name: /Przeliczam sugestie/ })).toHaveProperty('disabled', true);
    });
});
