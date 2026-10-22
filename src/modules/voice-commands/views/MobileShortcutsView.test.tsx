// @vitest-environment jsdom
//
// Dawna strona „Skróty mobilne" przeszła do Ustawienia → Telefon. Adres zostaje, bo
// siedzi w zakładkach i na ekranach telefonów: telefon z tokenem dalej trafia prosto
// do nagrywania (token we fragmencie #, nie w query stringu), reszta - do ustawień.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MobileShortcutsView } from './MobileShortcutsView';

const state = vi.hoisted(() => ({ mobile: false, token: 'tok-1' as string | null }));

vi.mock('../hooks/useMobileShortcutToken', () => ({
    useMobileShortcutToken: () => ({ data: state.token, isLoading: false }),
}));

beforeAll(() => {
    window.matchMedia = ((query: string) => ({
        matches: state.mobile, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
});

const Where = () => {
    const location = useLocation();
    return <p>{location.pathname}{location.search}{location.hash}</p>;
};

const renderView = () => render(
    <MemoryRouter initialEntries={['/mobile-shortcuts']}>
        <Routes>
            <Route path="/mobile-shortcuts" element={<MobileShortcutsView />} />
            <Route path="*" element={<Where />} />
        </Routes>
    </MemoryRouter>,
);

afterEach(() => {
    cleanup();
    state.mobile = false;
    state.token = 'tok-1';
});

describe('MobileShortcutsView', () => {
    it('na komputerze prowadzi do Ustawienia → Telefon → Lead głosem', () => {
        renderView();

        expect(screen.getByText('/settings?tab=phone&view=voice')).toBeInTheDocument();
    });

    it('na telefonie przechodzi na stronę głosową z tokenem we fragmencie', () => {
        state.mobile = true;

        renderView();

        expect(screen.getByText('/m/voice#token=tok-1')).toBeInTheDocument();
    });

    it('telefon bez tokenu trafia do ustawień, które mówią, czemu skrótu nie ma', () => {
        state.mobile = true;
        state.token = null;

        renderView();

        expect(screen.getByText('/settings?tab=phone&view=voice')).toBeInTheDocument();
    });
});
