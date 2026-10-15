// @vitest-environment jsdom
//
// Kłódka nad zablokowaną sekcją w aplikacji ze sklepu (App Store 3.1.1, Google Play):
// nie prowadzi do pakietu i nie zachęca do zakupu. Okno z informacją o module
// (onLockedClick → UpsellModal) dalej się otwiera. W przeglądarce bez zmian.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LockedSection } from './index';

const platform = vi.hoisted(() => ({ purchasable: false }));

vi.mock('@/core/native/platform', () => ({
    canPurchaseHere: () => platform.purchasable,
    isNativeApp: () => !platform.purchasable,
}));

const renderLocked = (onLockedClick?: () => void) => render(
    <MemoryRouter initialEntries={['/visit']}>
        <Routes>
            <Route path="/visit" element={
                <LockedSection locked message="Twój pakiet nie obsługuje powiadomień SMS." onLockedClick={onLockedClick}>
                    <p>powiadomienia</p>
                </LockedSection>
            } />
            <Route path="/settings" element={<p>ustawienia pakietu</p>} />
        </Routes>
    </MemoryRouter>,
);

const lockBadge = () => screen.getAllByRole('button')[0];

afterEach(() => cleanup());

describe('LockedSection w aplikacji ze sklepu', () => {
    beforeEach(() => { platform.purchasable = false; });

    it('kłódka bez onLockedClick nie prowadzi do pakietu i nie mówi „Kup"', async () => {
        renderLocked();

        expect(lockBadge()).toHaveProperty('disabled', true);
        expect(lockBadge().getAttribute('title')).toBeNull();
        await userEvent.click(lockBadge());
        expect(screen.queryByText('ustawienia pakietu')).toBeNull();
        expect(screen.getByText('Twój pakiet nie obsługuje powiadomień SMS.')).toBeTruthy();
    });

    it('onLockedClick dalej otwiera okno z informacją', async () => {
        const onLockedClick = vi.fn();
        renderLocked(onLockedClick);

        await userEvent.click(lockBadge());
        expect(onLockedClick).toHaveBeenCalledTimes(1);
    });
});

describe('LockedSection w przeglądarce - bez zmian', () => {
    beforeEach(() => { platform.purchasable = true; });

    it('kłódka prowadzi do pakietu w ustawieniach', async () => {
        renderLocked();

        expect(lockBadge().getAttribute('title')).toBe('Kup dostęp do tej funkcji');
        await userEvent.click(lockBadge());
        expect(await screen.findByText('ustawienia pakietu')).toBeTruthy();
    });
});
