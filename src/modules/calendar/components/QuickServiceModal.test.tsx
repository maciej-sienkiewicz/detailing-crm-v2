// @vitest-environment jsdom
//
// „Wprowadź nową usługę": zmiana stawki VAT zachowuje stronę ceny, którą wpisał
// człowiek (CLAUDE.md §1). Wcześniej efekt na zmianie stawki liczył brutto zawsze
// od netta, więc wpisane 1900,00 zł brutto (23% VAT: 154472 gr netto, a
// 154472 × 1,23 = 190001 gr) po 23% → 8% → 23% wracało jako 1900,01 zł.
// Bliźniak tego okna, checkin/ManualPriceModal, ma te same przypadki.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SidebarProvider } from '@/widgets/Sidebar/context/SidebarContext';
import { QuickServiceModal } from './QuickServiceModal';

// Bez „Zapisz w bazie" okno nie woła API - wystarczy atrapa mutacji.
vi.mock('@/modules/services/hooks/useServices', () => ({
    useCreateService: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const renderModal = () => {
    const onServiceCreate = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <SidebarProvider>
                <QuickServiceModal
                    isOpen
                    onClose={vi.fn()}
                    onServiceCreate={onServiceCreate}
                    initialServiceName="Powłoka ceramiczna"
                />
            </SidebarProvider>
        </ThemeProvider>
    );
    // Pola netto i brutto dzielą placeholder; kolejność jest stała: [netto, brutto].
    const [netField, grossField] = screen.getAllByPlaceholderText('0.00');
    return {
        onServiceCreate,
        netField,
        grossField,
        vatSelect: screen.getByRole('combobox'),
        submit: screen.getByRole('button', { name: 'Dodaj usługę' }),
        user: userEvent.setup(),
    };
};

describe('QuickServiceModal - zmiana stawki VAT', () => {
    it('brutto wpisane przez użytkownika przeżywa zmianę stawki 23% → 8% → 23% - zostaje 1900,00', async () => {
        const { onServiceCreate, netField, grossField, vatSelect, submit, user } = renderModal();

        await user.type(grossField, '1900');
        await user.selectOptions(vatSelect, '8');

        // Przy 8% brutto zostaje wpisaną kwotą, a netto liczy się od niego.
        expect(grossField).toHaveValue('1900.00');
        expect(netField).toHaveValue('1759.26');

        await user.selectOptions(vatSelect, '23');
        expect(grossField).toHaveValue('1900.00');

        await user.click(submit);
        expect(onServiceCreate).toHaveBeenCalledWith(
            expect.objectContaining({ basePriceNet: 154472, basePriceGross: 190000, vatRate: 23 })
        );
    });

    it('netto wpisane przez użytkownika zostaje, brutto liczy się od niego przy nowej stawce', async () => {
        const { onServiceCreate, netField, grossField, vatSelect, submit, user } = renderModal();

        await user.type(netField, '100');
        await user.selectOptions(vatSelect, '8');
        expect(grossField).toHaveValue('108.00');

        await user.click(submit);
        expect(onServiceCreate).toHaveBeenCalledWith(
            expect.objectContaining({ basePriceNet: 10000, basePriceGross: 10800, vatRate: 8 })
        );
    });

    it('zmiana na ZW przy cenie wpisanej od brutta: netto równa się wpisanemu brutto', async () => {
        const { onServiceCreate, grossField, vatSelect, submit, user } = renderModal();

        await user.type(grossField, '1900');
        await user.selectOptions(vatSelect, '-1');

        await user.click(submit);
        expect(onServiceCreate).toHaveBeenCalledWith(
            expect.objectContaining({ basePriceNet: 190000, basePriceGross: 190000, vatRate: -1 })
        );
    });
});
