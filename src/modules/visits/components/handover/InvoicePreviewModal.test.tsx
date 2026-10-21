// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { CompanySettings } from '@/modules/settings/types';
import { InvoicePreviewModal } from './InvoicePreviewModal';

const company = {
    name: 'Detailing Studio', taxId: '5260001246', street: 'Prosta 1', postalCode: '00-001', city: 'Warszawa',
    phone: '500 600 700', email: 'biuro@studio.pl', website: null, bankAccount: '12 3456 7890', logoUrl: null,
} as unknown as CompanySettings;

const buyer = { nip: '', name: 'Alicja Kucharska', addressLine1: 'Długa 5', addressLine2: '00-002 Warszawa', email: '' };

describe('InvoicePreviewModal', () => {
    it('wygląda jak faktura: metryczka, tabela pozycji, VAT według stawek, słownie', () => {
        render(
            <InvoicePreviewModal
                isOpen
                onClose={vi.fn()}
                company={company}
                buyer={buyer}
                items={[
                    { name: 'Powłoka ceramiczna', net: '', gross: '1900,00', mode: 'GROSS', vatRate: '23' },
                    { name: 'Pranie tapicerki', net: '100,00', gross: '', mode: 'NET', vatRate: '8' },
                ]}
                paymentMethod="CARD"
            />,
        );
        const paper = screen.getByRole('article', { name: 'Faktura' });
        expect(within(paper).getByText('FAKTURA')).toBeInTheDocument();
        expect(within(paper).getByText('nada system przy wystawieniu')).toBeInTheDocument();

        const rows = within(screen.getByRole('table', { name: 'Pozycje faktury' })).getAllByRole('row');
        // Brutto wpisane jako brutto zostaje brutto, VAT to różnica (CLAUDE.md §1).
        expect(rows[1].textContent).toMatch(/Powłoka ceramiczna1szt\.1\s544,721\s544,7223%355,281\s900,00/);
        expect(rows[2].textContent).toMatch(/Pranie tapicerki.*8%8,00108,00/);

        const totals = screen.getByLabelText('Podsumowanie faktury');
        expect(totals.textContent).toMatch(/DO ZAPŁATY2\s008,00 PLN/);
        expect(paper.textContent).toContain('Słownie: dwa tysiące osiem złotych 00/100');
        expect(paper.textContent).toContain('Status: Zapłacona');
        expect(paper.textContent).not.toContain('Rachunek do wpłaty');
    });

    it('przelew: termin płatności w metryczce i rachunek do wpłaty', () => {
        render(
            <InvoicePreviewModal
                isOpen
                onClose={vi.fn()}
                company={company}
                buyer={buyer}
                items={[{ name: 'Test', net: '', gross: '123,00', mode: 'GROSS', vatRate: '23' }]}
                paymentMethod="TRANSFER"
                dueDate="2026-11-04"
            />,
        );
        const paper = screen.getByRole('article', { name: 'Faktura' });
        expect(within(paper).getAllByText('04.11.2026').length).toBeGreaterThan(0);
        expect(paper.textContent).toContain('Status: Oczekuje na zapłatę');
        expect(paper.textContent).toContain('Rachunek do wpłaty: 12 3456 7890');
    });
});
