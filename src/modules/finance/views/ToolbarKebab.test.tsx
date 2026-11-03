// @vitest-environment jsdom
//
// Zgłoszenie z telefonu: „nie mogę kliknąć w trzy kropki" przy filtrach dokumentów
// kosztowych. Menu otwierało się niewidoczne (panel czeka na pomiar, którego nikt nie
// robił), a następne dotknięcie trafiało w przezroczyste tło i je zamykało.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToolbarKebab } from './FinanceView';

afterEach(cleanup);

// Przycisk siedzi w KebabWrap, który pokazuje się dopiero media query (< 1200 px);
// jsdom media queries nie liczy, więc dla niego przycisk jest ukryty.
const kebabButton = () => screen.getByRole('button', { name: 'Więcej opcji', hidden: true });

const renderKebab = (onRefresh = vi.fn(), onToggle = vi.fn()) =>
    render(
        <ThemeProvider theme={theme}>
            <ToolbarKebab
                items={[
                    { kind: 'toggle', key: 'hidden', label: 'Pokaż ukryte', on: false, onSelect: onToggle },
                    { kind: 'action', key: 'refresh', label: 'Odśwież', onSelect: onRefresh },
                ]}
            />
        </ThemeProvider>,
    );

describe('ToolbarKebab', () => {
    it('otwarte menu jest widoczne i da się w nim wybrać pozycję', async () => {
        const onRefresh = vi.fn();
        renderKebab(onRefresh);

        await userEvent.click(kebabButton());

        const menu = screen.getByRole('menu');
        expect(menu.style.visibility).toBe('visible');
        expect(kebabButton().getAttribute('aria-expanded')).toBe('true');

        await userEvent.click(screen.getByRole('menuitem', { name: 'Odśwież' }));
        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('przełącznik w menu nie zamyka menu', async () => {
        const onToggle = vi.fn();
        renderKebab(vi.fn(), onToggle);

        await userEvent.click(kebabButton());
        await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Pokaż ukryte' }));

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('menu')).toBeTruthy();
    });
});
