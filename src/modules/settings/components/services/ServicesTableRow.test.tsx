// @vitest-environment jsdom
// Wiersz cennika: która kwota jest główna i skąd bierze się brutto (CLAUDE.md §1).
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Service } from '@/modules/services/types';
import { ServicesTableRow } from './ServicesTableRow';
import { rowPriceTexts } from './servicesTable.helpers';

const service = (over: Partial<Service> = {}): Service => ({
    id: 's1',
    name: 'Powłoka ceramiczna 3 lata',
    basePriceNet: 154472,
    basePriceGross: 190000,
    vatRate: 23,
    requireManualPrice: false,
    isActive: true,
    isPackage: false,
    packageItems: null,
    createdAt: '',
    updatedAt: '',
    createdByFirstName: '',
    createdByLastName: '',
    updatedBy: '',
    replacesServiceId: null,
    ...over,
});

const renderRow = (props: Partial<Parameters<typeof ServicesTableRow>[0]> = {}) => {
    const onOpenMenu = vi.fn();
    render(
        <ServicesTableRow
            service={service()}
            priceSide="gross"
            actionsDisabled={false}
            menuOpen={false}
            onOpenMenu={onOpenMenu}
            {...props}
        />,
    );
    return { onOpenMenu };
};

// toLocaleString('pl-PL') wstawia twardą spację przed „zł" i w tysiącach - porównujemy bez niej.
const text = (el: HTMLElement) => el.textContent?.replace(/\s/g, ' ');

describe('rowPriceTexts', () => {
    it('brutto główne: zapisane 1900,00 zł, nie 1900,01 z netta', () => {
        const t = rowPriceTexts(service(), 'gross');
        expect(t.main?.replace(/\s/g, ' ')).toBe('1900,00 zł');
        expect(t.mainCaption).toBe('brutto');
        expect(t.secondary.replace(/\s/g, ' ')).toBe('1544,72 zł netto, VAT 23%');
    });

    it('netto główne: netto wprost, brutto zapisane w zdaniu obok', () => {
        const t = rowPriceTexts(service(), 'net');
        expect(t.main?.replace(/\s/g, ' ')).toBe('1544,72 zł');
        expect(t.mainCaption).toBe('netto');
        expect(t.secondary.replace(/\s/g, ' ')).toBe('1900,00 zł brutto, VAT 23%');
    });

    it('zwolnione z VAT: „zw.", brutto równe netto', () => {
        const t = rowPriceTexts(service({ basePriceNet: 50000, basePriceGross: 50000, vatRate: -1 }), 'gross');
        expect(t.secondary.replace(/\s/g, ' ')).toBe('500,00 zł netto, VAT zw.');
    });

    it('wycena ręczna: bez kwoty, sama stawka', () => {
        expect(rowPriceTexts(service({ requireManualPrice: true, basePriceNet: 0, basePriceGross: 0 }), 'gross'))
            .toEqual({ main: null, mainCaption: '', secondary: 'VAT 23%' });
    });

    it('brutto 0 przy netto > 0 (obiekt spoza API) nie pokazuje się jako 0,00 zł', () => {
        const t = rowPriceTexts(service({ basePriceNet: 50000, basePriceGross: 0 }), 'gross');
        expect(t.main?.replace(/\s/g, ' ')).toBe('615,00 zł');
    });

    it('żadnej kropki środkowej (CLAUDE.md §4)', () => {
        (['gross', 'net'] as const).forEach(side => {
            const t = rowPriceTexts(service(), side);
            expect(`${t.main} ${t.secondary}`).not.toMatch(/[·•]/);
        });
    });
});

describe('ServicesTableRow', () => {
    it('pokazuje wybraną stronę jako kwotę główną', () => {
        renderRow({ priceSide: 'gross' });
        expect(text(screen.getByTestId('services-row-main'))).toBe('1900,00 zł');
        expect(text(screen.getByTestId('services-row-secondary'))).toBe('1544,72 zł netto, VAT 23%');
    });

    it('pakiet wymienia usługi zdaniem z przecinkami, nie „ · "', () => {
        renderRow({
            service: service({
                isPackage: true,
                packageItems: [
                    { serviceId: 'b', serviceName: 'Czyszczenie wnętrza', position: 1 },
                    { serviceId: 'a', serviceName: 'Mycie ręczne', position: 0 },
                ],
            }),
        });
        expect(screen.getByText('W pakiecie: Mycie ręczne, Czyszczenie wnętrza')).toBeInTheDocument();
        expect(screen.getByTestId('services-row').textContent).not.toMatch(/[·•]/);
    });

    it('usługa z instrukcją pielęgnacji mówi, którą', () => {
        renderRow({ careTitles: ['Po myciu'] });
        expect(screen.getByText('Instrukcja: Po myciu')).toBeInTheDocument();
    });

    it('menu ⋮ otwiera się z wiersza', () => {
        const { onOpenMenu } = renderRow();
        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji: Powłoka ceramiczna 3 lata' }));
        expect(onOpenMenu).toHaveBeenCalledTimes(1);
    });

    it('actionsDisabled blokuje całe menu - archiwizacja też nie przechodzi w trakcie edycji', () => {
        const { onOpenMenu } = renderRow({ actionsDisabled: true });
        const kebab = screen.getByRole('button', { name: 'Więcej akcji: Powłoka ceramiczna 3 lata' });
        expect(kebab).toBeDisabled();
        fireEvent.click(kebab);
        expect(onOpenMenu).not.toHaveBeenCalled();
    });

    it('pozycja archiwalna: plakietka zamiast akcji', () => {
        renderRow({ service: service({ isActive: false }) });
        expect(screen.getByText('Archiwalna')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });
});
