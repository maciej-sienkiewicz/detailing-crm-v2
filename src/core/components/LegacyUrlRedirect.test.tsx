// @vitest-environment jsdom
//
// Stare (polskie) adresy z pushy, e-maili i powrotów z OAuth zamieniają się na nowe,
// zanim wyrenderuje się ekran (audyt HTTP, P2-21).
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyUrlRedirect } from './LegacyUrlRedirect';

/** Gdzie wylądowała nawigacja - ścieżka, query i fragment. */
function Where() {
    const location = useLocation();
    return <p data-testid="where">{`${location.pathname}${location.search}${location.hash}`}</p>;
}

const land = (url: string) => {
    render(
        <MemoryRouter initialEntries={[url]}>
            <Routes>
                <Route element={<LegacyUrlRedirect><Outlet /></LegacyUrlRedirect>}>
                    <Route path="*" element={<Where />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
    return screen.getByTestId('where').textContent;
};

describe('LegacyUrlRedirect', () => {
    it('stary adres z pusha trafia na nowy, z fragmentem', () => {
        expect(land('/zapytania?view=poczta&thread=t1#odpowiedz')).toBe('/inbox?view=mail&thread=t1#odpowiedz');
    });

    it('aktualny adres renderuje ekran bez przekierowania', () => {
        expect(land('/instagram?view=competition&show=ads')).toBe('/instagram?view=competition&show=ads');
    });
});
