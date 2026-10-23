// @vitest-environment jsdom
//
// Stare adresy skrzynek żyją w powiadomieniach, zakładkach przeglądarki i mailach
// z linkiem „otwórz w CRM". Każdy ma trafić dokładnie tam, gdzie prowadził - z tą samą
// sprawą albo tym samym wątkiem: sprawy do „Zapytań" (/inbox), poczta do „Poczty" (/mail).
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LegacyLeadsRedirect, LegacyMailRedirect } from './InboxRedirects';
import InboxView from './InboxView';

vi.mock('../inbox/InboxPage', () => ({ default: ({ scope }: { scope: string }) => <p>{`skrzynka ${scope}`}</p> }));

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
                <Route path="/inbox" element={<><InboxView /><Where /></>} />
                <Route path="/mail" element={<Where />} />
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

    it('wątek poczty otwiera się w Poczcie', () => {
        expect(landOn('/communication?thread=t1')).toBe('/mail?thread=t1');
    });

    it('folder Wysłane staje się zakładką Wysłane', () => {
        expect(landOn('/communication?folder=sent&thread=t2')).toBe('/mail?thread=t2&view=sent');
    });

    it('nowa wiadomość do leada bez wątku otwiera jego sprawę', () => {
        expect(landOn('/communication?compose=1&to=jan%40example.com&lead=L1')).toBe('/inbox?lead=L1');
    });

    it('nowa wiadomość bez leada zostaje w poczcie z adresatem', () => {
        expect(landOn('/communication?compose=1&to=jan%40example.com')).toBe('/mail?compose=1&to=jan%40example.com');
    });

    // Dawne zakładki skrzynki (/inbox?view=mail|sent) - także z polskich linków z pushy.
    it('zakładka Poczta ze starego adresu przechodzi do Poczty z tym samym wątkiem', () => {
        expect(landOn('/inbox?view=mail&thread=t3')).toBe('/mail?thread=t3');
    });

    it('zakładka Wysłane ze starego adresu zostaje Wysłanymi', () => {
        expect(landOn('/inbox?view=sent&thread=t4')).toBe('/mail?view=sent&thread=t4');
    });
});
