// @vitest-environment jsdom
//
// Pusty cache zapytań po zmianie osoby (AuthContext) nie wystarcza: otwarte okno trzyma
// w stanie to, czym je wypełniono. Ekran blokady zostawia stronę pod spodem, więc kreator
// stopki otwarty przez właściciela i zapisany po odblokowaniu PIN-em przez pracownika
// zapisywał stopkę właściciela na konto pracownika (zgłoszenie 03.11.2026).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import type { User } from '@/modules/auth/types';

const auth = vi.hoisted(() => ({
    value: { user: null as Partial<User> | null, isAuthenticated: true, isLoading: false },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('./SubscriptionGate', () => ({ SubscriptionGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./SessionLockedScreen', () => ({ SessionLockedScreen: () => <p>Sesja zablokowana</p> }));

import { ProtectedRoute } from './ProtectedRoute';

/** Okno z danymi wpisanymi przez osobę, która je otworzyła. */
function OpenEditor() {
    const [name, setName] = useState('');
    return <input aria-label="Imię i nazwisko" value={name} onChange={e => setName(e.target.value)} />;
}

const app = (withSubscriptionGate = true) => (
    <MemoryRouter>
        <ProtectedRoute withSubscriptionGate={withSubscriptionGate}><OpenEditor /></ProtectedRoute>
    </MemoryRouter>
);

afterEach(cleanup);

describe('ProtectedRoute: inna osoba = aplikacja od nowa', () => {
    it.each([true, false])('po przełączeniu na inną osobę otwarte okno traci cudze dane (bramka pakietu: %s)', gate => {
        auth.value.user = { userId: 'owner' };
        const { rerender } = render(app(gate));
        fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Właściciel' } });

        auth.value.user = { userId: 'employee' };
        rerender(app(gate));

        expect(screen.getByLabelText('Imię i nazwisko')).toHaveValue('');
    });

    it('ta sama osoba (np. odświeżone uprawnienia) zachowuje to, co wpisała', () => {
        auth.value.user = { userId: 'owner' };
        const { rerender } = render(app());
        fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Jan Właściciel' } });

        auth.value.user = { userId: 'owner', permissions: ['LEADS_MANAGE'] };
        rerender(app());

        expect(screen.getByLabelText('Imię i nazwisko')).toHaveValue('Jan Właściciel');
    });
});
