// @vitest-environment jsdom
//
// Wymaganie biznesu: edycja jednej rezerwacji z serii zmienia tylko ją, a nadpisanie
// innych rezerwacji musi być intencjonalne i jasno zaznaczone. To okno jest jedyną drogą
// do zapisu w serii - nie może niczego wybierać za operatora ani zatwierdzać w ciemno.
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { SeriesEditImpact } from '../types';
import { RecurrenceEditScopeModal, type RecurrenceEditScopeModalProps } from './RecurrenceEditScopeModal';

vi.mock('@/common/components/ModalKit', () => {
    const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    return {
        ModalShell: passthrough, ModalHeader: passthrough, ModalTitleGroup: passthrough, ModalTitle: passthrough,
        ModalContent: passthrough, ModalFooter: passthrough, CloseBtn: () => null,
    };
});

const impact: SeriesEditImpact = {
    seriesId: 's-1',
    recurrenceIndex: 2,
    totalInSeries: 10,
    isDetached: false,
    thisAndFuture: { otherCount: 7, skippedDetachedCount: 0, skippedConvertedCount: 0 },
    all: { otherCount: 8, skippedDetachedCount: 1, skippedConvertedCount: 0 },
};

const renderModal = (props: Partial<RecurrenceEditScopeModalProps> = {}) => {
    const onConfirm = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <RecurrenceEditScopeModal
                isOpen
                onClose={vi.fn()}
                onConfirm={onConfirm}
                recurrenceInfo={{ seriesId: 's-1', recurrenceIndex: 2, totalInSeries: 10, isDetached: false }}
                impact={impact}
                changedFields={['tytuł', 'usługi z cenami']}
                identitySwap={{ customer: false, vehicle: false }}
                customerRecordEdited={false}
                isSubmitting={false}
                {...props}
            />
        </ThemeProvider>,
    );
    return { onConfirm };
};

describe('RecurrenceEditScopeModal - zapis w serii tylko świadomie', () => {
    it('żadna opcja serii nie jest wybrana z góry, a zatwierdzenie jest nieaktywne', () => {
        renderModal();

        const radios = screen.getAllByRole('radio') as HTMLInputElement[];
        expect(radios).toHaveLength(2);
        expect(radios.every(r => !r.checked)).toBe(true);
        const confirm = screen.getByRole('button', { name: 'Wybierz zakres' });
        expect(confirm).toBeDisabled();
        expect(screen.queryByTestId('series-consequences')).toBeNull();
    });

    it('nie oferuje zapisu „tylko ta" - to robi zwykły przycisk zapisu poza oknem', () => {
        renderModal();

        expect(screen.queryByText(/tylko tę/i)).toBeNull();
    });

    it('zatwierdzenie serii nie jest wypełnionym przyciskiem głównym', () => {
        renderModal();
        fireEvent.click(screen.getByRole('radio', { name: /ta i następne/i }));

        const confirm = screen.getByRole('button', { name: 'Nadpisz 7 rezerwacji' });
        // Bez białego tekstu na wypełnionym tle (SharedButton primary/danger).
        const style = getComputedStyle(confirm);
        expect(style.backgroundColor).toBe('rgb(255, 251, 235)');
        expect(style.color).not.toBe('rgb(255, 255, 255)');
    });

    it('po wyborze mówi, ile rezerwacji i co nadpisze, a zatwierdza wybrany zakres', () => {
        const { onConfirm } = renderModal();
        fireEvent.click(screen.getByRole('radio', { name: /ta i następne/i }));

        const consequences = screen.getByTestId('series-consequences');
        expect(consequences.textContent).toContain(
            'Nadpiszesz tytuł, kolor, usługi z cenami, notatki i door-to-door w 7 kolejnych rezerwacjach tej serii',
        );
        expect(consequences.textContent).toContain('Zmieniono w tej rezerwacji: tytuł, usługi z cenami.');
        expect(consequences.textContent).toContain('Terminy rezerwacji się nie zmieniają.');

        fireEvent.click(screen.getByRole('button', { name: 'Nadpisz 7 rezerwacji' }));
        expect(onConfirm).toHaveBeenCalledWith('THIS_AND_FUTURE');
    });

    it('cała seria z podmianą klienta i pojazdu wymienia je i mówi o pominiętych', () => {
        const { onConfirm } = renderModal({ identitySwap: { customer: true, vehicle: true } });
        fireEvent.click(screen.getByRole('radio', { name: /wszystkie rezerwacje/i }));

        const text = screen.getByTestId('series-consequences').textContent;
        expect(text).toContain('door-to-door, klienta i pojazd w 8 pozostałych rezerwacjach tej serii');
        expect(text).toContain('Bez zmian zostaną: 1 rezerwacja zmieniana wcześniej osobno.');

        fireEvent.click(screen.getByRole('button', { name: 'Nadpisz 8 rezerwacji' }));
        expect(onConfirm).toHaveBeenCalledWith('ALL');
    });

    it('bez policzonych rezerwacji nie da się zatwierdzić', () => {
        renderModal({ impact: undefined });

        const radios = screen.getAllByRole('radio') as HTMLInputElement[];
        expect(radios.every(r => r.disabled)).toBe(true);
        expect(screen.getAllByText('Liczymy rezerwacje serii…')).toHaveLength(2);
    });

    it('poprawka danych klienta jest opisana jako wspólna niezależnie od wyboru', () => {
        renderModal({ customerRecordEdited: true });

        expect(screen.getByText(/widać je we wszystkich jego rezerwacjach/)).toBeTruthy();
    });
});
