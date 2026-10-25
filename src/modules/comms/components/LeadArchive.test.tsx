// @vitest-environment jsdom
//
// „Zamknięte sprawy" w wąskiej kolumnie listy: wiersz w kształcie otwartej sprawy (pojazd,
// kwota, wynik z powodem, data), jedna linia filtrów i BEZ drugiej wyszukiwarki - szuka
// się polem w nagłówku listy.
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { Lead } from '../types';
import { LeadArchive } from './LeadArchive';

const lead = (over: Partial<Lead>): Lead => ({
    id: 'l1', status: 'COMPLETED', vehicleBrand: 'Porsche', vehicleModel: 'Cayenne', customerName: 'Tomasz Lewandowski',
    contactIdentifier: 't@mail.pl', estimatedValue: 904000, lostReasonLabel: null, closedAt: '2026-10-12T10:00:00Z',
    createdAt: '2026-10-01T10:00:00Z', tagLabels: [], services: [],
    ...over,
} as Lead);

const renderArchive = (items: Lead[], extra: Partial<Parameters<typeof LeadArchive>[0]> = {}) => {
    const onOpen = vi.fn();
    const onStatusChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <LeadArchive
                bundle={{ items, total: items.length, isLoading: false, truncated: false }}
                query=""
                status={undefined}
                onStatusChange={onStatusChange}
                onOpen={onOpen}
                phone={false}
                {...extra}
            />
        </ThemeProvider>,
    );
    return { onOpen, onStatusChange };
};

describe('LeadArchive', () => {
    it('wiersz mówi, jak się skończyło - z powodem przegranej - i otwiera sprawę', async () => {
        const { onOpen } = renderArchive([
            lead({}),
            lead({ id: 'l2', status: 'LOST', vehicleBrand: 'BMW', vehicleModel: 'X3', lostReasonLabel: 'Za drogo', estimatedValue: 250000 }),
        ]);

        expect(screen.getByText('Porsche Cayenne')).toBeTruthy();
        expect(screen.getByText('Przegrany: Za drogo')).toBeTruthy();
        await userEvent.click(screen.getByText('BMW X3'));
        expect(onOpen).toHaveBeenCalledWith('l2');
    });

    it('nie ma własnej wyszukiwarki - szuka pole w nagłówku listy', () => {
        renderArchive([lead({})]);
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('filtr wyniku zmienia status, a wybrany jest zaznaczony', async () => {
        const { onStatusChange } = renderArchive([lead({})], { status: 'LOST' });

        expect(screen.getByRole('button', { name: 'Przegrane' }).getAttribute('aria-pressed')).toBe('true');
        await userEvent.click(screen.getByRole('button', { name: 'Wygrane' }));
        expect(onStatusChange).toHaveBeenCalledWith('COMPLETED');
    });

    it('pusta lista po wyszukaniu mówi, że nic nie pasuje', () => {
        renderArchive([], { query: 'audi' });
        expect(screen.getByText('Nic nie pasuje do tego wyszukiwania.')).toBeTruthy();
    });

    it('„Przegrane" to jedna liczba przy każdym filtrze - bez doliczania „Nie przyszli"', () => {
        // Odtworzenie z audytu: „Wszystkie" pokazywało 63 992 zł, „Przegrane" 61 100 zł.
        const item = (gross: number) => ({ id: `s${gross}`, status: 'ACCEPTED', totalGross: gross }) as Lead['services'][number];
        const items = [
            lead({ id: 'w', status: 'COMPLETED', services: [item(100000)] }),
            lead({ id: 'l', status: 'LOST', services: [item(50000)] }),
            lead({ id: 'n', status: 'NO_SHOW', services: [item(20000)] }),
        ];
        const total = (label: string) =>
            screen.getByText((_, element) => element?.tagName === 'SPAN' && new RegExp(`^${label}\\s`).test(element.textContent ?? '')).textContent;

        renderArchive(items);
        expect(total('Przegrane')).toBe('Przegrane 500 zł');
        expect(total('Nie przyszli')).toBe('Nie przyszli 200 zł');

        cleanup();
        renderArchive(items, { status: 'LOST' });
        expect(total('Przegrane')).toBe('Przegrane 500 zł');
        expect(screen.queryByText((_, element) => element?.tagName === 'SPAN' && /^Wygrane\s/.test(element.textContent ?? ''))).toBeNull();
    });
});
