// @vitest-environment jsdom
//
// Stare adresy skrzynek żyją w powiadomieniach, zakładkach przeglądarki i mailach
// z linkiem „otwórz w CRM". Po połączeniu Leadów i Poczty w „Zapytania" każdy z nich
// ma trafić dokładnie tam, gdzie prowadził - z tą samą sprawą albo tym samym wątkiem.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LegacyLeadsRedirect, LegacyMailRedirect } from './InboxRedirects';

function Where() {
    const location = useLocation();
    return <output>{`${location.pathname}${location.search}`}</output>;
}

const landOn = (url: string) => {
    render(
        <MemoryRouter initialEntries={[url]}>
            <Routes>
                <Route path="/leads" element={<LegacyLeadsRedirect />} />
                <Route path="/communication" element={<LegacyMailRedirect />} />
                <Route path="/inbox" element={<Where />} />
            </Routes>
        </MemoryRouter>
    );
    return screen.getByRole('status').textContent;
};

describe('przekierowania do skrzynki „Zapytania"', () => {
    it('lead z powiadomienia otwiera tę samą sprawę', () => {
        expect(landOn('/leads?lead=abc')).toBe('/inbox?lead=abc');
    });

    it('archiwum leadów z analityki zostaje archiwum', () => {
        expect(landOn('/leads?status=LOST')).toBe('/inbox?status=LOST');
    });

    it('wątek poczty otwiera się w zakładce Poczta', () => {
        expect(landOn('/communication?thread=t1')).toBe('/inbox?thread=t1&view=mail');
    });

    it('folder Wysłane staje się zakładką Wysłane', () => {
        expect(landOn('/communication?folder=sent&thread=t2')).toBe('/inbox?thread=t2&view=sent');
    });

    it('nowa wiadomość do leada bez wątku otwiera jego sprawę', () => {
        expect(landOn('/communication?compose=1&to=jan%40example.com&lead=L1')).toBe('/inbox?lead=L1');
    });

    it('nowa wiadomość bez leada zostaje w poczcie z adresatem', () => {
        expect(landOn('/communication?compose=1&to=jan%40example.com')).toBe(
            '/inbox?compose=1&to=jan%40example.com&view=mail'
        );
    });
});
