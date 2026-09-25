// src/modules/batch-orders/components/EntriesTable.test.tsx
// @vitest-environment jsdom
//
// Zgłoszenie biznesu: „nie da się edytować cen - klikaliśmy w cały rekord, klikaliśmy
// w kolumnę z ceną i nic się nie działo". Wiersz ustawiał wpis do edycji, ale nie
// otwierał edytora, a ⋮ było niewidoczne do czasu najechania.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { EntriesTable } from './EntriesTable';
import type { BatchOrderEntry } from '../types';

const entry = (patch: Partial<BatchOrderEntry> = {}): BatchOrderEntry => ({
    id: 'e-1',
    serviceDate: '2026-09-23',
    vehicleMake: 'Audi',
    vehicleModel: 'A6',
    vehicleLicensePlate: 'WI 7730P',
    vehicleVin: null,
    services: [{ name: 'Mycie detailingowe premium', netAmountCents: 50000, grossAmountCents: 61500, vatRate: 23 }],
    netAmountCents: 50000,
    grossAmountCents: 61500,
    notes: null,
    isClosed: false,
    isCorrection: false,
    closeHistoryId: null,
    photoCount: 4,
    createdAt: '2026-09-23T10:00:00Z',
    updatedAt: '2026-09-23T10:00:00Z',
    ...patch,
});

function renderTable(entries: BatchOrderEntry[], isDesktop = true) {
    const handlers = { onOpen: vi.fn(), onDelete: vi.fn(), onReopen: vi.fn() };
    render(
        <ThemeProvider theme={theme}>
            <EntriesTable entries={entries} isDesktop={isDesktop} {...handlers} />
        </ThemeProvider>,
    );
    return handlers;
}

describe('EntriesTable', () => {
    it('kliknięcie w wiersz otwiera edytor wpisu', () => {
        const e = entry();
        const { onOpen } = renderTable([e]);
        fireEvent.click(screen.getByText('Mycie detailingowe premium'));
        expect(onOpen).toHaveBeenCalledWith(e);
    });

    it('Enter na wierszu otwiera edytor - bez myszy też', () => {
        const e = entry();
        const { onOpen } = renderTable([e]);
        const row = screen.getByRole('row', { name: /Audi A6.*Otwórz wpis/ });
        fireEvent.keyDown(row, { key: 'Enter' });
        expect(onOpen).toHaveBeenCalledWith(e);
    });

    it('kliknięcie w cenę otwiera edytor z kursorem w cenie, raz', () => {
        const e = entry();
        const { onOpen } = renderTable([e]);
        fireEvent.click(screen.getByRole('button', { name: /Zmień cenę: 615,00/ }));
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onOpen).toHaveBeenCalledWith(e, 'price');
    });

    it('menu akcji jest przyciskiem widocznym bez najechania i ma „Usuń wpis"', () => {
        const e = entry();
        const { onDelete } = renderTable([e]);
        const menuBtn = screen.getByRole('button', { name: /Więcej akcji: Audi A6/ });
        expect(menuBtn).toBeVisible();
        fireEvent.click(menuBtn);
        const menu = screen.getByRole('menu');
        fireEvent.click(within(menu).getByRole('menuitem', { name: /Usuń wpis/ }));
        expect(onDelete).toHaveBeenCalledWith(e);
    });

    it('rozliczony wpis nie ma „Usuń", tylko „Odblokuj do korekty"', () => {
        const e = entry({ isClosed: true, closeHistoryId: 'h-1' });
        const { onReopen } = renderTable([e]);
        expect(screen.getByText('Rozliczony')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Więcej akcji/ }));
        const menu = screen.getByRole('menu');
        expect(within(menu).queryByRole('menuitem', { name: /Usuń wpis/ })).toBeNull();
        fireEvent.click(within(menu).getByRole('menuitem', { name: /Odblokuj do korekty/ }));
        expect(onReopen).toHaveBeenCalledWith(e);
    });

    it('na telefonie pozycja listy też otwiera edytor', () => {
        const e = entry();
        const { onOpen } = renderTable([e], false);
        fireEvent.click(screen.getByRole('button', { name: /Audi A6.*615,00/ }));
        expect(onOpen).toHaveBeenCalledWith(e);
    });
});
