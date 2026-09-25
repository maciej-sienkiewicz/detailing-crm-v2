// src/modules/settings/components/shared/SettingsLayout.test.tsx
// @vitest-environment jsdom
//
// Rama ustawień. Pasek zapisu obiecywał „Opuszczenie strony bez zapisu spowoduje
// utratę zmian", ale nikt tego nie pilnował - testy sprawdzają, że pasek zgłasza
// niezapisane zmiany ramie, mówi zdaniem, co zmieniono i co blokuje zapis, a akcje
// sekcji trafiają do nagłówka ramy.

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { UnsavedChangesBanner } from './SettingsLayout';
import { SettingsHeaderActions } from './SettingsHeaderActions';
import { SettingsChromeContext, type SettingsChromeValue } from './settingsChrome';

function Harness({ setDirty, children }: { setDirty: SettingsChromeValue['setDirty']; children: React.ReactNode }) {
    const [target, setTarget] = useState<HTMLElement | null>(null);
    return (
        <ThemeProvider theme={theme}>
            <SettingsChromeContext.Provider value={{ setDirty, headerActions: target }}>
                <div data-testid="header" ref={setTarget} />
                {children}
            </SettingsChromeContext.Provider>
        </ThemeProvider>
    );
}

describe('UnsavedChangesBanner', () => {
    it('nie pokazuje się i nie zgłasza zmian, gdy nic nie zmieniono', () => {
        const setDirty = vi.fn();
        render(<Harness setDirty={setDirty}><UnsavedChangesBanner visible={false} onSave={vi.fn()} onDiscard={vi.fn()} /></Harness>);
        expect(screen.queryByRole('region', { name: 'Niezapisane zmiany' })).toBeNull();
        expect(setDirty).not.toHaveBeenCalledWith(expect.any(String), true);
    });

    it('zgłasza zmiany ramie i cofa zgłoszenie po odmontowaniu', () => {
        const setDirty = vi.fn();
        const { unmount } = render(
            <Harness setDirty={setDirty}><UnsavedChangesBanner visible onSave={vi.fn()} onDiscard={vi.fn()} /></Harness>,
        );
        expect(setDirty).toHaveBeenLastCalledWith(expect.any(String), true);
        unmount();
        expect(setDirty).toHaveBeenLastCalledWith(expect.any(String), false);
    });

    it('mówi, ile pól zmieniono i co blokuje zapis, a „Pokaż pole" prowadzi do niego', () => {
        const onShowProblem = vi.fn();
        render(
            <Harness setDirty={vi.fn()}>
                <UnsavedChangesBanner
                    visible
                    changedCount={2}
                    problem="REGON wymaga poprawy"
                    onShowProblem={onShowProblem}
                    onSave={vi.fn()}
                    onDiscard={vi.fn()}
                />
            </Harness>,
        );
        const bar = screen.getByRole('region', { name: 'Niezapisane zmiany' });
        expect(bar).toHaveTextContent('Zmieniono 2 pola.');
        expect(bar).toHaveTextContent('REGON wymaga poprawy, zanim zapiszesz.');
        fireEvent.click(screen.getByRole('button', { name: 'Pokaż pole' }));
        expect(onShowProblem).toHaveBeenCalled();
    });

    it('odmienia liczbę pól', () => {
        const { rerender } = render(<Harness setDirty={vi.fn()}><UnsavedChangesBanner visible changedCount={1} onSave={vi.fn()} onDiscard={vi.fn()} /></Harness>);
        expect(screen.getByText('Zmieniono 1 pole.')).toBeInTheDocument();
        rerender(<Harness setDirty={vi.fn()}><UnsavedChangesBanner visible changedCount={5} onSave={vi.fn()} onDiscard={vi.fn()} /></Harness>);
        expect(screen.getByText('Zmieniono 5 pól.')).toBeInTheDocument();
        rerender(<Harness setDirty={vi.fn()}><UnsavedChangesBanner visible changedCount={22} onSave={vi.fn()} onDiscard={vi.fn()} /></Harness>);
        expect(screen.getByText('Zmieniono 22 pola.')).toBeInTheDocument();
    });
});

describe('SettingsHeaderActions', () => {
    it('przenosi akcje sekcji do nagłówka ramy', () => {
        render(<Harness setDirty={vi.fn()}><SettingsHeaderActions><button type="button">Dodaj usługę</button></SettingsHeaderActions></Harness>);
        expect(screen.getByTestId('header')).toContainElement(screen.getByRole('button', { name: 'Dodaj usługę' }));
    });

    it('poza ramą renderuje akcje w miejscu', () => {
        render(<SettingsHeaderActions><button type="button">Dodaj usługę</button></SettingsHeaderActions>);
        expect(screen.getByRole('button', { name: 'Dodaj usługę' })).toBeInTheDocument();
    });
});
