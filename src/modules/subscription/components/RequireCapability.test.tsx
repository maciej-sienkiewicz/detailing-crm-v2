// @vitest-environment jsdom
//
// Sekcja zablokowana przez nieaktywny abonament: przycisk z kłódką bywa jedyną
// podpowiedzią (napis pod nim mieści się dopiero w wyższej sekcji), więc jego nazwa nie
// może proponować zakupu - studio potrzebuje odnowienia, nie modułu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequireCapability } from './RequireCapability';

const capability = { enabled: false, lockedBySubscription: true, lockReason: 'Wymaga odnowienia abonamentu' };

vi.mock('../hooks/useCapability', () => ({
    useCapability: () => capability,
}));

beforeEach(() => {
    capability.lockedBySubscription = true;
    capability.lockReason = 'Wymaga odnowienia abonamentu';
});

afterEach(() => cleanup());

describe('RequireCapability (upsell)', () => {
    it('zablokowane abonamentem: kłódka mówi „Odnów abonament", nie „Kup dostęp"', () => {
        render(
            <MemoryRouter>
                <RequireCapability capability="STATS_VIEW" mode="upsell"><p>Statystyki</p></RequireCapability>
            </MemoryRouter>,
        );
        const badge = screen.getByRole('button', { name: 'Odnów abonament' });
        expect(badge.getAttribute('title')).toBe('Odnów abonament');
        expect(screen.queryByRole('button', { name: /Kup dostęp/ })).toBeNull();
    });

    it('zablokowane brakiem modułu: dalej „Kup dostęp do tej funkcji"', () => {
        capability.lockedBySubscription = false;
        capability.lockReason = 'Wymaga modułu: Statystyki';
        render(
            <MemoryRouter>
                <RequireCapability capability="STATS_VIEW" mode="upsell"><p>Statystyki</p></RequireCapability>
            </MemoryRouter>,
        );
        expect(screen.getByRole('button', { name: 'Kup dostęp do tej funkcji' })).toBeTruthy();
    });
});
