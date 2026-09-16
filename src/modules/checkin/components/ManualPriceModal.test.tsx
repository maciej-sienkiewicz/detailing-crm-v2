// @vitest-environment jsdom
//
// Cena usługi rozliczanej indywidualnie, podawana przy dodawaniu jej do wizyty.
//
// Trzy rzeczy, których pilnuje ten plik, wprost z wymagań biznesu:
//  - użytkownik wpisuje NETTO  -> brutto ma się policzyć od netta,
//  - użytkownik wpisuje BRUTTO -> netto ma się policzyć od brutta, a samo brutto
//    ma zostać DOKŁADNIE takie, jakie wpisał (1900,00 nie może wrócić jako 1900,01),
//  - cena 0 zł jest legalna (usługa darmowa) i nie wolno jej blokować.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SidebarProvider } from '@/widgets/Sidebar/context/SidebarContext';
import { ManualPriceModal } from './ManualPriceModal';
import type { Service } from '@/modules/services/types';

const SERVICE: Service = {
    id: 'svc-manual',
    name: 'Detailing indywidualny',
    basePriceNet: 0,
    basePriceGross: 0,
    vatRate: 23,
    requireManualPrice: true,
    isActive: true,
    isPackage: false,
    packageItems: null,
    createdAt: '',
    updatedAt: '',
    createdByFirstName: '',
    createdByLastName: '',
    updatedBy: '',
    replacesServiceId: null,
};

const renderModal = (onConfirm = vi.fn()) => {
    render(
        <ThemeProvider theme={theme}>
            <SidebarProvider>
                <ManualPriceModal isOpen service={SERVICE} onClose={vi.fn()} onConfirm={onConfirm} />
            </SidebarProvider>
        </ThemeProvider>
    );
    // Pola netto i brutto dzielą placeholder; kolejność jest stała: [netto, brutto].
    const [netField, grossField] = screen.getAllByPlaceholderText('0.00');
    const confirm = screen.getByRole('button', { name: 'Dodaj usługę' });
    return { onConfirm, netField, grossField, confirm };
};

describe('ManualPriceModal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('netto wpisane przez użytkownika -> brutto liczone od netta', async () => {
        const user = userEvent.setup();
        const { onConfirm, netField, confirm } = renderModal();

        await user.type(netField, '100');
        await user.click(confirm);

        // 100,00 zł netto przy 23% VAT -> 123,00 zł brutto.
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ basePriceNet: 10000, basePriceGross: 12300, vatRate: 23 })
        );
    });

    it('brutto wpisane przez użytkownika -> netto liczone od brutta, a brutto NIE pływa', async () => {
        const user = userEvent.setup();
        const { onConfirm, grossField, confirm } = renderModal();

        await user.type(grossField, '1900');
        await user.click(confirm);

        // 1900,00 brutto: netto = 154472 gr. Odtworzenie brutta z tego netta dałoby
        // 190001 - dlatego brutto musi zostać dokładnie 190000, jakie wpisał człowiek.
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ basePriceNet: 154472, basePriceGross: 190000, vatRate: 23 })
        );
    });

    it('cena 0 zł (usługa darmowa) jest dozwolona - przycisk aktywny, potwierdzenie przechodzi', async () => {
        const user = userEvent.setup();
        const { onConfirm, confirm } = renderModal();

        expect(confirm).toBeEnabled();
        await user.click(confirm);

        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ basePriceNet: 0, basePriceGross: 0 })
        );
    });
});
