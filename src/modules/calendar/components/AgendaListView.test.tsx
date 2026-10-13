// @vitest-environment jsdom
//
// Zgłoszenie biznesu: na widoku „Lista" przewijam dni w dół, klikam wizytę, zamykam
// popover - i lista wraca do dzisiejszego dnia. Popover przerysowuje kalendarz, a lista
// dostawała `focusDate={new Date().toISOString()}`: nowy napis przy każdym renderze
// odpalał przewijanie „do dziś" od nowa. Przewija się tylko przy wejściu na listę
// i przy zmianie zakresu albo dnia, a nie przy każdym przerysowaniu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { AgendaListView, type AgendaListViewProps } from './AgendaListView';

const TODAY = new Date(2026, 9, 13, 12, 0);
/** Nagłówek dzisiejszego dnia leży 600 px poniżej górnej krawędzi listy. */
const TODAY_OFFSET = 600;

const props = (overrides: Partial<AgendaListViewProps> = {}): AgendaListViewProps => ({
    events: [],
    rangeStart: new Date(2026, 9, 1).toISOString(),
    rangeEnd: new Date(2026, 10, 1).toISOString(),
    onEventClick: () => {},
    ...overrides,
});

const renderList = (p: AgendaListViewProps) => render(
    <ThemeProvider theme={theme}><AgendaListView {...p} /></ThemeProvider>,
);

/** jsdom nie liczy układu - nagłówek dzisiejszego dnia dostaje stałe położenie. */
const scroller = (container: HTMLElement) => {
    const today = container.querySelector('#agenda-day-2026-10-13') as HTMLElement;
    const area = today.parentElement as HTMLElement;
    vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(today, 'getBoundingClientRect').mockImplementation(
        () => ({ top: TODAY_OFFSET - area.scrollTop } as DOMRect),
    );
    return area;
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('AgendaListView - przewijanie do dzisiejszego dnia', () => {
    it('przerysowanie (np. zamknięcie popovera) nie przewija listy z powrotem do dziś', () => {
        const { container, rerender } = renderList(props());
        const area = scroller(container);

        // Użytkownik przewinął dni w dół.
        area.scrollTop = 1500;

        // Kalendarz przerysowuje się po zamknięciu popovera - z nowym `focusDate` tego samego dnia.
        vi.setSystemTime(new Date(TODAY.getTime() + 4_000));
        rerender(
            <ThemeProvider theme={theme}>
                <AgendaListView {...props({ focusDate: new Date().toISOString() })} />
            </ThemeProvider>,
        );

        expect(area.scrollTop).toBe(1500);
    });

    it('zmiana zakresu dalej przewija do wskazanego dnia', () => {
        const { container, rerender } = renderList(props());
        const area = scroller(container);
        area.scrollTop = 1500;

        rerender(
            <ThemeProvider theme={theme}>
                <AgendaListView {...props({ rangeEnd: new Date(2026, 10, 2).toISOString() })} />
            </ThemeProvider>,
        );

        expect(area.scrollTop).toBe(TODAY_OFFSET);
    });
});
