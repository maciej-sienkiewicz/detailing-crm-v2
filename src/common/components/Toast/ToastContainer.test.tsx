// @vitest-environment jsdom
//
// To samo zdanie nie stoi na ekranie dwa razy. Odmowa zapisu po zmianie osoby w sesji
// (sessionUser.ts) idzie dymkiem globalnym, a okno, które ją dostało, pokazywało ją jeszcze
// raz pod własnym tytułem - dwa czerwone dymki z identyczną treścią.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider, useToast } from './ToastContainer';

let toast: ReturnType<typeof useToast>;
function Probe() {
    const ctx = useToast();
    useLayoutEffect(() => { toast = ctx; });
    return null;
}

const mount = () => render(
    <ThemeProvider theme={theme}>
        <ToastProvider><Probe /></ToastProvider>
    </ThemeProvider>,
);

const SENTENCE = 'Zmiana nie jest zapisana. W tej przeglądarce zalogowała się w międzyczasie inna osoba.';

afterEach(cleanup);

describe('ToastProvider', () => {
    it('dymek okna z tym samym zdaniem zastępuje dymek globalny', () => {
        mount();

        act(() => window.dispatchEvent(new CustomEvent('api:error', { detail: { message: SENTENCE } })));
        act(() => toast.showError('Nie udało się zapisać stopki', SENTENCE));

        expect(screen.getAllByText(SENTENCE)).toHaveLength(1);
        expect(screen.getByText('Nie udało się zapisać stopki')).toBeTruthy();
    });

    it('różne komunikaty zostają obok siebie', () => {
        mount();

        act(() => toast.showError('Nie udało się zapisać stopki', 'Brak połączenia z serwerem.'));
        act(() => toast.showSuccess('Zapisano notatkę'));

        expect(screen.getByText('Brak połączenia z serwerem.')).toBeTruthy();
        expect(screen.getByText('Zapisano notatkę')).toBeTruthy();
    });
});
