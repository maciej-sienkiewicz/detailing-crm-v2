// @vitest-environment jsdom
//
// Oznaczenia: numeracja wizyt zwracała `null` w trakcie wczytywania i po błędzie
// (pusta sekcja), a „Zapisz" przy błędnym formacie był cichym no-opem. Kolory
// usuwały się przez własną nakładkę i dokładały drugi dymek do dymku interceptora.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { AppointmentColor } from '@/modules/appointment-colors';
import { LabelsSection } from './LabelsSection';

const showSuccess = vi.fn();
const showError = vi.fn();
const updateNumbering = vi.fn();
const refetchNumbering = vi.fn();
const removeColor = vi.fn();

let numbering: { config?: { format: string; sequenceLength: number; randomLength: number; preview: string }; isLoading: boolean; isError: boolean };
let colors: AppointmentColor[] = [];

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess, showError }),
}));
vi.mock('../hooks/useCompany', () => ({
    useVisitNumberingConfig: () => ({ ...numbering, refetch: refetchNumbering }),
    useUpdateVisitNumberingConfig: () => ({ mutateAsync: updateNumbering, isPending: false }),
}));
vi.mock('@/modules/appointment-colors', () => ({
    AppointmentColorFormModal: () => null,
}));
const idle = { mutate: vi.fn(), isPending: false };
vi.mock('@/modules/appointment-colors/hooks/useAppointmentColors', () => ({
    useAppointmentColors: () => ({ colors, isLoading: false, isError: false, refetch: vi.fn() }),
    useSetDefaultAppointmentColor: () => idle,
    useClearDefaultAppointmentColor: () => idle,
    useSetAppointmentColorArchived: () => idle,
    useDeleteAppointmentColor: () => ({ mutate: removeColor, isPending: false }),
}));

const renderLabels = (subView: 'numbering' | 'colors') =>
    render(
        <ThemeProvider theme={theme}>
            <LabelsSection subView={subView} onSubViewChange={vi.fn()} canSeeNumbering />
        </ThemeProvider>,
    );

beforeEach(() => {
    vi.clearAllMocks();
    numbering = {
        config: { format: 'VIS-{YYYY}-{SEQ}', sequenceLength: 5, randomLength: 6, preview: 'VIS-2026-00001' },
        isLoading: false,
        isError: false,
    };
    colors = [
        { id: 'c1', name: 'Ceramika', hexColor: '#0ea5e9', isActive: true, isDefault: true } as AppointmentColor,
    ];
});
afterEach(() => cleanup());

describe('Oznaczenia - przełącznik', () => {
    it('widoki przełącza Segmented, nie pasek zakładek', () => {
        renderLabels('numbering');
        expect(screen.getByRole('group', { name: 'Rodzaj oznaczeń' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Numeracja wizyt' }).getAttribute('aria-pressed')).toBe('true');
    });
});

describe('Numeracja wizyt', () => {
    it('błąd wczytania to komunikat z ponowieniem, a nie pusta sekcja', () => {
        numbering = { config: undefined, isLoading: false, isError: true };
        renderLabels('numbering');
        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(refetchNumbering).toHaveBeenCalled();
    });

    it('wczytywanie ma widoczny stan', () => {
        numbering = { config: undefined, isLoading: true, isError: false };
        renderLabels('numbering');
        expect(screen.getByRole('status').textContent).toMatch(/Wczytywanie numeracji/);
    });

    it('błędny format: pasek nazywa problem, a „Zapisz" przenosi do pola zamiast nic nie robić', async () => {
        renderLabels('numbering');
        fireEvent.click(screen.getByRole('radio', { name: /Własny format/ }));
        const input = screen.getByLabelText('Własny format');
        fireEvent.change(input, { target: { value: 'VIS-{YYYY}' } });

        expect(screen.getByRole('region', { name: 'Niezapisane zmiany' }).textContent).toMatch(/Format numeru wymaga poprawy/);
        (input as HTMLInputElement).blur();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        expect(updateNumbering).not.toHaveBeenCalled();
        await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Własny format')));
    });
});

describe('Kolory wizyt', () => {
    it('„Domyślny" to plakietka stanu, a „Dodaj kolor" jest akcją sekcji', () => {
        renderLabels('colors');
        expect(screen.getByText('Domyślny')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Dodaj kolor' })).toBeTruthy();
    });

    it('usunięcie pyta przez okno potwierdzenia i nie dubluje dymku przy 4xx', () => {
        removeColor.mockImplementation((_id: string, opts: { onError: (e: unknown) => void }) =>
            opts.onError({ response: { status: 409, data: { message: 'Kolor jest używany' } }, config: { method: 'delete' } }));
        renderLabels('colors');

        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji: Ceramika' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Usuń kolor' }));
        expect(screen.getByText('Usunąć kolor „Ceramika"?')).toBeTruthy();
        fireEvent.click(screen.getAllByRole('button', { name: 'Usuń kolor' }).slice(-1)[0]!);

        expect(removeColor).toHaveBeenCalledWith('c1', expect.anything());
        expect(showError).not.toHaveBeenCalled();
    });

    it('5xx przy usuwaniu: dymek z sekcji, bo interceptor go nie pokazuje', () => {
        removeColor.mockImplementation((_id: string, opts: { onError: (e: unknown) => void }) =>
            opts.onError({ response: { status: 503, data: {} }, config: { method: 'delete' } }));
        renderLabels('colors');

        fireEvent.click(screen.getByRole('button', { name: 'Więcej akcji: Ceramika' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Usuń kolor' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'Usuń kolor' }).slice(-1)[0]!);

        expect(showError).toHaveBeenCalledWith('Nie udało się usunąć koloru', expect.any(String));
    });
});
