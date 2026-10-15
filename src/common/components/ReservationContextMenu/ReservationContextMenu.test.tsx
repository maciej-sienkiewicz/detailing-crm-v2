// @vitest-environment jsdom
//
// Edycja rezerwacji wysyła klienta w całości. Kto nie ma danych osobowych (CUSTOMERS_VIEW),
// widzi je zamaskowane (`***`) - zapis takiego formularza nadpisałby klienta gwiazdkami,
// więc „Edytuj" ma zniknąć, a reszta menu zostać.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReservationContextMenu } from './index';

let permissions: string[] | null = [];
vi.mock('@/core/context/AuthContext', () => ({
    useAuth: () => ({ user: { email: 'r@studio.pl', permissions }, setUser: vi.fn() }),
}));

const renderMenu = () => render(
    <MemoryRouter>
        <ReservationContextMenu appointmentId="a-1" x={10} y={10} onClose={() => {}} />
    </MemoryRouter>,
);

afterEach(cleanup);

describe('ReservationContextMenu - Edytuj', () => {
    it('jest schowane bez danych osobowych', () => {
        permissions = ['VISITS_VIEW', 'VISITS_CREATE'];
        renderMenu();
        expect(screen.queryByText('Edytuj')).toBeNull();
        expect(screen.getByText('Rozpocznij wizytę')).toBeTruthy();
    });

    it('jest widoczne z rezerwacjami i danymi osobowymi', () => {
        permissions = ['VISITS_VIEW', 'CUSTOMERS_VIEW', 'VISITS_CREATE'];
        renderMenu();
        expect(screen.getByText('Edytuj')).toBeTruthy();
    });

    it('same dane osobowe nie wystarczą', () => {
        permissions = ['VISITS_VIEW', 'CUSTOMERS_VIEW'];
        renderMenu();
        expect(screen.queryByText('Edytuj')).toBeNull();
    });

    it('właściciel widzi edycję', () => {
        permissions = null;
        renderMenu();
        expect(screen.getByText('Edytuj')).toBeTruthy();
    });
});
