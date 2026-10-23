// @vitest-environment jsdom
//
// Filtr okresu jest sterowany okresem karty. Audyt z 23.10.2026: „Wybierz zakres" zapalał
// się od razu, choć lista dalej pokazywała poprzedni okres, a zakres 31.10–01.10 przechodził
// bez słowa i lista mówiła „nie ma jeszcze aut".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { DateRangeFilter } from './DateRangeFilter';
import { currentMonthPeriod } from '../utils/period';

const renderFilter = (from: string, to: string) => {
    const onChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <DateRangeFilter from={from} to={to} onChange={onChange} />
        </ThemeProvider>,
    );
    return { onChange };
};

const chip = (name: string) => screen.getByRole('button', { name });

describe('DateRangeFilter', () => {
    afterEach(cleanup);

    it('zapalony chip wynika z okresu karty', () => {
        const month = currentMonthPeriod();
        renderFilter(month.from, month.to);
        expect(chip('Bieżący miesiąc')).toHaveAttribute('aria-pressed', 'true');
        expect(chip('Wybierz zakres')).toHaveAttribute('aria-pressed', 'false');
    });

    it('otwarcie „Wybierz zakres" nie zmienia okresu ani zapalonego chipa', () => {
        const month = currentMonthPeriod();
        const { onChange } = renderFilter(month.from, month.to);
        fireEvent.click(chip('Wybierz zakres'));
        expect(onChange).not.toHaveBeenCalled();
        expect(chip('Bieżący miesiąc')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Zastosuj' })).toBeDisabled();
    });

    it('odwrócony zakres nie przechodzi', () => {
        const month = currentMonthPeriod();
        const { onChange } = renderFilter(month.from, month.to);
        fireEvent.click(chip('Wybierz zakres'));
        fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-10-31' } });
        fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-10-01' } });
        expect(screen.getByRole('alert')).toHaveTextContent('Data „od” jest po dacie „do”');
        fireEvent.click(screen.getByRole('button', { name: 'Zastosuj' }));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('poprawny zakres stosuje się dopiero przyciskiem', () => {
        const month = currentMonthPeriod();
        const { onChange } = renderFilter(month.from, month.to);
        fireEvent.click(chip('Wybierz zakres'));
        fireEvent.change(screen.getByLabelText('Od'), { target: { value: '2026-10-03' } });
        fireEvent.change(screen.getByLabelText('Do'), { target: { value: '2026-10-17' } });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Zastosuj' }));
        expect(onChange).toHaveBeenCalledWith('2026-10-03', '2026-10-17');
    });

    it('zakres spoza pełnego miesiąca zapala „Wybierz zakres"', () => {
        renderFilter('2026-09-03', '2026-09-17');
        expect(chip('Wybierz zakres')).toHaveAttribute('aria-pressed', 'true');
        expect(chip('Bieżący miesiąc')).toHaveAttribute('aria-pressed', 'false');
    });

    it('starszy pełny miesiąc zapala „Wybierz miesiąc" z tym miesiącem na liście', () => {
        renderFilter('2024-02-01', '2024-02-29');
        expect(chip('Wybierz miesiąc')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText('Miesiąc')).toHaveValue('2024-02');
    });
});
