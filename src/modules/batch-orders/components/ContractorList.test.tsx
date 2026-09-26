// src/modules/batch-orders/components/ContractorList.test.tsx
// @vitest-environment jsdom
//
// Nagłówek listy mówił „Czeka na zestawienie" i liczył tylko auta nierozliczone -
// użytkownik czytał to jak własną zaległość, a kwota malała po każdym zestawieniu.
// Teraz to podsumowanie wykonanej pracy: wszystkie auta okresu.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ContractorList } from './ContractorList';
import type { ContractorOverview } from '../types';

const now = '2026-09-25T10:00:00Z';
const item = (id: string, patch: Partial<ContractorOverview>): ContractorOverview => ({
    contractor: {
        id, name: `Kontrahent ${id}`, taxId: null, address: null, contactPersonName: null, email: null,
        phone: null, notes: null, isActive: true, entryCount: 0, createdAt: now, updatedAt: now,
    },
    openCount: 0, openNetCents: 0, openGrossCents: 0, settledCount: 0, lastSettledAt: null,
    ...patch,
});

function renderList(items: ContractorOverview[]) {
    render(
        <ThemeProvider theme={theme}>
            <ContractorList items={items} selectedId={null} onSelect={vi.fn()} onCreate={vi.fn()} />
        </ThemeProvider>,
    );
}

describe('ContractorList - nagłówek', () => {
    it('sumuje auta nierozliczone i te już w zestawieniach', () => {
        renderList([
            item('a', { openCount: 1, openNetCents: 154472, openGrossCents: 190000, settledCount: 1, settledNetCents: 154472, settledGrossCents: 190000 }),
            item('b', { settledCount: 2, settledNetCents: 100000, settledGrossCents: 123000 }),
            item('c', {}),
        ]);
        expect(screen.getByText('W tym okresie wykonałeś usługi na kwotę')).toBeInTheDocument();
        expect(screen.queryByText(/Czeka na zestawienie/)).toBeNull();
        expect(screen.getByText(/5030,00\s*zł/)).toBeInTheDocument();
        expect(screen.getByText('Brutto, u 2 z 3 kontrahentów')).toBeInTheDocument();
    });

    it('starszy serwer bez sum rozliczonych - liczy to, co ma', () => {
        renderList([item('a', { openCount: 1, openGrossCents: 61500, settledCount: 1 })]);
        const totals = screen.getByText('W tym okresie wykonałeś usługi na kwotę').parentElement!;
        expect(totals).toHaveTextContent(/615,00\s*zł/);
    });
});
