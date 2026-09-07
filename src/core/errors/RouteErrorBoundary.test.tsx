// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/** Route, który przy renderze rzuca podanym błędem - jak padnięty `lazy()`. */
function makeRouter(error: unknown) {
    const Boom = () => { throw error; };
    return createMemoryRouter([
        {
            element: <Boom />,
            errorElement: <RouteErrorBoundary />,
            path: '/',
        },
    ]);
}

const CHUNK_ERROR = new Error(
    'Failed to fetch dynamically imported module: https://detailboost.pl/assets/MailView-CRm-D0lQ.js',
);

let reload: ReturnType<typeof vi.fn>;
let originalLocation: Location;

beforeEach(() => {
    window.sessionStorage.clear();
    reload = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, reload, href: '/' },
    });
    // React loguje każdy błąd złapany przez boundary - w teście to tylko szum.
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
});

describe('RouteErrorBoundary', () => {
    it('brakujący chunk: przeładowuje stronę i pokazuje ekran aktualizacji', () => {
        render(<RouterProvider router={makeRouter(CHUNK_ERROR)} />);

        expect(reload).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Aktualizuję aplikację/i)).toBeInTheDocument();
        // Domyślnego ekranu React Routera użytkownik nie zobaczy.
        expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument();
    });

    it('po wyczerpaniu limitu przeładowań pokazuje ekran błędu zamiast pętli', () => {
        // Dwie próby już zużyte w tym oknie czasowym.
        window.sessionStorage.setItem(
            'detailboost:chunk-reload',
            JSON.stringify({ count: 2, firstAt: Date.now() }),
        );

        render(<RouterProvider router={makeRouter(CHUNK_ERROR)} />);

        expect(reload).not.toHaveBeenCalled();
        expect(screen.getByText(/Nie udało się wczytać aplikacji/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Odśwież stronę/i })).toBeInTheDocument();
    });

    it('inny błąd (np. 500 z API) nie przeładowuje strony, tylko pokazuje ekran błędu', () => {
        render(<RouterProvider router={makeRouter(new Error('Request failed with status code 500'))} />);

        expect(reload).not.toHaveBeenCalled();
        expect(screen.getByText(/Wystąpił nieoczekiwany błąd/i)).toBeInTheDocument();
        expect(screen.getByText(/wsparciem DetailBoost/i)).toBeInTheDocument();
    });
});
