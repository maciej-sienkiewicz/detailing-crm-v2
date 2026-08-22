// src/modules/campaigns/components/AudienceTable.test.tsx
// @vitest-environment jsdom
//
// Tabela odbiorców jest jedynym miejscem w module, w którym jedno kliknięcie
// wypisuje człowieka z wysyłki — i jedynym, w którym da się to cofnąć. Te dwie
// rzeczy muszą działać w obie strony, także dla kogoś, kto jest już odznaczony.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { AudienceTable } from './AudienceTable';
import type { AudienceCustomer, AudienceEstimate } from '../types';

const customer = (
    id: string,
    lastName: string,
    eligibility: AudienceCustomer['eligibility'] = 'ELIGIBLE'
): AudienceCustomer => ({
    customerId: id,
    firstName: 'Anna',
    lastName,
    phone: '+48 600 100 200',
    email: 'anna@example.com',
    vehicleBrand: 'BMW',
    vehicleModel: 'X3',
    lastVisitDate: '2025-03-12T10:00:00Z',
    lastServiceName: 'Powłoka ceramiczna',
    eligibility,
});

const estimateOf = (sample: AudienceCustomer[], overrides: Partial<AudienceEstimate> = {}): AudienceEstimate => ({
    matched: sample.length,
    optedOut: 0,
    noConsent: 0,
    noAddress: 0,
    frequencyCapped: 0,
    eligible: sample.filter((s) => s.eligibility === 'ELIGIBLE').length,
    excludedManually: sample.filter((s) => s.eligibility === 'EXCLUDED_MANUALLY').length,
    estimatedSmsSegments: 1,
    estimatedCredits: sample.length,
    sample,
    sampleOffset: 0,
    projectionHorizonDays: null,
    ...overrides,
});

const renderTable = (props: Partial<Parameters<typeof AudienceTable>[0]> = {}) => {
    const onExcludedChange = vi.fn();
    const onPageChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <AudienceTable
                estimate={estimateOf([customer('a', 'Nowak'), customer('b', 'Kowalska')])}
                isEstimating={false}
                channel="SMS"
                excluded={[]}
                onExcludedChange={onExcludedChange}
                page={0}
                onPageChange={onPageChange}
                {...props}
            />
        </ThemeProvider>
    );
    return { onExcludedChange, onPageChange };
};

/** Pola wyboru wierszy, bez tego w nagłówku („zaznacz wszystkich na stronie"). */
const rowBoxes = () =>
    within(screen.getByRole('table').querySelector('tbody')!).getAllByRole('checkbox');

describe('AudienceTable', () => {
    beforeEach(() => vi.clearAllMocks());

    it('domyślnie zaznacza każdego, kto może dostać wiadomość', () => {
        renderTable();
        expect(rowBoxes().every((box) => (box as HTMLInputElement).checked)).toBe(true);
    });

    it('odznaczenie wiersza dopisuje klienta do wykluczeń', async () => {
        const { onExcludedChange } = renderTable();
        await userEvent.click(rowBoxes()[0]);
        expect(onExcludedChange).toHaveBeenCalledWith(['a']);
    });

    it('odznaczony klient zostaje na liście i da się go zaznaczyć z powrotem', async () => {
        // Wiersz przychodzi z backendu ze statusem EXCLUDED_MANUALLY: gdyby znikał,
        // odznaczenie byłoby ruchem bez odwrotu.
        const { onExcludedChange } = renderTable({
            estimate: estimateOf([customer('a', 'Nowak', 'EXCLUDED_MANUALLY'), customer('b', 'Kowalska')]),
            excluded: ['a'],
        });

        expect(screen.getByText('Odznaczony ręcznie')).toBeTruthy();
        const [first] = rowBoxes();
        expect((first as HTMLInputElement).checked).toBe(false);

        await userEvent.click(first);
        expect(onExcludedChange).toHaveBeenCalledWith([]);
    });

    it('nie pozwala zaznaczyć kogoś, kogo wypisał system', () => {
        renderTable({
            estimate: estimateOf([customer('a', 'Nowak', 'NO_CONSENT')]),
        });
        const [box] = rowBoxes();
        expect((box as HTMLInputElement).disabled).toBe(true);
        expect(screen.getByText('Brak zgody marketingowej')).toBeTruthy();
    });

    it('nagłówkowe pole wyboru odznacza całą stronę i zaznacza ją z powrotem', async () => {
        const { onExcludedChange } = renderTable();
        const headerBox = within(screen.getByRole('table').querySelector('thead')!).getByRole('checkbox');

        await userEvent.click(headerBox);
        expect(onExcludedChange).toHaveBeenCalledWith(['a', 'b']);
    });

    it('przy niewybranej usłudze automatu tłumaczy, czego brakuje, zamiast pokazywać zero', () => {
        renderTable({ awaitingTrigger: true, estimate: estimateOf([]) });
        expect(screen.getByText(/Wybierz usługę w warunku wysyłki/)).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
