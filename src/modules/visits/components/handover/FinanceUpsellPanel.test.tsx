// @vitest-environment jsdom
//
// Panel w miejscu rozliczenia przy wydaniu pojazdu. Dwie rzeczy:
//  - rozliczenia wyłączone przez nieaktywny abonament to nie „wymaga modułu" i nie
//    sprzedaż modułu, który studio może mieć - tylko droga do odnowienia;
//  - zakup modułu jest akcją drugorzędną: krokiem następnym jest wydanie pojazdu
//    w stopce okna, więc „Wykup dostęp" nie jest wypełniony (CLAUDE.md §2).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { FinanceUpsellPanel } from './FinanceUpsellPanel';

const capability = {
    enabled: false,
    lockedBySubscription: false,
    upsell: [] as { addOnKey: string; addOnName: string; monthlyPriceGrossCents: number | null; isAvailable: boolean }[],
};
const permissions = { isOwner: true };

vi.mock('@/modules/subscription', () => ({
    useCapability: () => capability,
}));

vi.mock('@/core/permissions/usePermissions', () => ({
    usePermissions: () => permissions,
}));

vi.mock('@/modules/subscription/hooks/useAddOnUnlock', () => ({
    useAddOnUnlock: () => ({ openUnlockDialog: vi.fn(), dialogOpen: false, pendingKey: null }),
}));

vi.mock('@/modules/subscription/components/PlanChangeDialog', () => ({
    AddOnActivationDialog: () => null,
}));

const renderPanel = () => render(
    <ThemeProvider theme={theme}>
        <FinanceUpsellPanel grossAmount={190000} currency="PLN" />
    </ThemeProvider>,
);

beforeEach(() => {
    capability.lockedBySubscription = false;
    capability.upsell = [{ addOnKey: 'FINANCE_MODULE', addOnName: 'Kontrola nad finansami', monthlyPriceGrossCents: 6900, isAvailable: true }];
    permissions.isOwner = true;
});

afterEach(() => cleanup());

describe('FinanceUpsellPanel', () => {
    it('brak modułu: oferta zakupu, ale bez wypełnienia - wypełniony jest krok wydania w stopce', () => {
        renderPanel();
        expect(screen.getByText(/wymagają modułu/)).toBeTruthy();
        const buy = screen.getByRole('button', { name: /Wykup dostęp/ });
        expect(buy.getAttribute('data-variant')).toBe('tinted');
    });

    it('nieaktywny abonament: bez „wymaga modułu" i bez zakupu, odnośnik do abonamentu', () => {
        capability.lockedBySubscription = true;
        capability.upsell = [];
        renderPanel();

        expect(screen.getByText('Abonament studia nie jest aktywny')).toBeTruthy();
        expect(screen.queryByText(/wymagają modułu/)).toBeNull();
        expect(screen.queryByRole('button', { name: /Wykup dostęp/ })).toBeNull();
        const link = screen.getByRole('link', { name: 'Przejdź do abonamentu' });
        expect(link.getAttribute('href')).toBe('/settings?tab=plan');
        expect(link.getAttribute('data-variant')).not.toBe('primary');
    });

    it('nieaktywny abonament u pracownika: kto może to naprawić, bez przycisku', () => {
        capability.lockedBySubscription = true;
        permissions.isOwner = false;
        renderPanel();
        expect(screen.getByText('Abonament może odnowić wyłącznie właściciel studia.')).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
    });
});
