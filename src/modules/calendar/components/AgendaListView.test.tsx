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
import { AgendaListView, visibleServices, type AgendaListViewProps } from './AgendaListView';

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

// Na telefonie po prawej stronie karty było puste miejsce - stoją tam teraz nazwy usług
// (bez cen), sterowane przełącznikiem „Pokaż listę usług" w zębatce listy.
describe('AgendaListView - lista usług na karcie', () => {
    const visit = (serviceNames: string[]) => ({
        id: 'v1',
        title: 'Jan Kowalski',
        start: new Date(2026, 9, 13, 9, 0).toISOString(),
        end: new Date(2026, 9, 13, 15, 0).toISOString(),
        extendedProps: {
            id: 'v1', type: 'VISIT', title: 'Jan Kowalski', customerName: 'Jan Kowalski',
            vehicleInfo: 'BMW M3', licensePlate: 'PO 12345', status: 'IN_PROGRESS',
            visitNumber: 'W/1', serviceNames, totalPrice: 190000, colorHex: '#0ea5e9',
            startTime: '', endTime: '',
        },
    }) as unknown as AgendaListViewProps['events'][number];

    it('pokazuje nazwy usług, gdy ustawienie jest włączone - bez kwot', () => {
        const { getByLabelText } = renderList(props({
            events: [visit(['Powłoka ceramiczna', 'Pranie tapicerki'])],
            showServices: true,
        }));
        const aside = getByLabelText('Usługi');
        expect(aside.textContent).toContain('Powłoka ceramiczna');
        expect(aside.textContent).toContain('Pranie tapicerki');
        expect(aside.textContent).not.toMatch(/zł|1900/);
    });

    it('wyłączone ustawienie albo wizyta bez usług - bez kolumny', () => {
        const off = renderList(props({ events: [visit(['Powłoka ceramiczna'])], showServices: false }));
        expect(off.queryByLabelText('Usługi')).toBeNull();
        cleanup();

        const empty = renderList(props({ events: [visit([])], showServices: true }));
        expect(empty.queryByLabelText('Usługi')).toBeNull();
    });
});

describe('visibleServices', () => {
    it('mieszczące się usługi idą w całości', () => {
        expect(visibleServices(['A', 'B', 'C'])).toEqual({ shown: ['A', 'B', 'C'], more: 0 });
    });

    it('nadmiar zamienia ostatnią linię na „+N"', () => {
        expect(visibleServices(['A', 'B', 'C', 'D', 'E'])).toEqual({ shown: ['A', 'B'], more: 3 });
    });

    it('puste nazwy i brak listy nie tworzą linii', () => {
        expect(visibleServices(['  ', 'A'])).toEqual({ shown: ['A'], more: 0 });
        expect(visibleServices(undefined)).toEqual({ shown: [], more: 0 });
    });
});
