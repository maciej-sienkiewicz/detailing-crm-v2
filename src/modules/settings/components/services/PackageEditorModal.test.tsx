// @vitest-environment jsdom
//
// Zgłoszenie: „przy dodawaniu nowego pakietu, jak wyszukujemy usługę, całe okno skacze".
// Okno rosło z listą podpowiedzi, a lista znikała przy każdym nowym zapytaniu i wracała
// po odpowiedzi. Teraz okno ma stałą wysokość, a lista trzyma poprzednie wyniki,
// dopóki nie przyjdą nowe.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const api = vi.hoisted(() => ({ getServices: vi.fn() }));
vi.mock('@/modules/services/api/servicesApi', async importOriginal => ({
    ...(await importOriginal<typeof import('@/modules/services/api/servicesApi')>()),
    servicesApi: api,
}));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock('../shared/settingsChrome', () => ({ useSettingsDirty: () => undefined }));

import { PackageEditorModal } from './PackageEditorModal';

const page = (names: string[]) => ({
    services: names.map((name, i) => ({ id: `s-${name}-${i}`, name, isPackage: false })),
    pagination: { currentPage: 1, totalPages: 1, totalItems: names.length, itemsPerPage: 50 },
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PackageEditorModal - wyszukiwanie usługi nie rusza okna', () => {
    it('okno ma stałą wysokość, a podpowiedzi zostają, dopóki nie przyjdą nowe', async () => {
        let resolveNext: (v: unknown) => void = () => {};
        api.getServices.mockImplementation(({ search }: { search: string }) => (
            search === 'pol'
                ? new Promise(resolve => { resolveNext = resolve; })
                : Promise.resolve(page(search ? ['Polerowanie', 'Powłoka ceramiczna'] : ['Mycie', 'Polerowanie']))
        ));

        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider theme={theme}>
                    <PackageEditorModal target={null} onClose={vi.fn()} onSaved={vi.fn()} />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        // Rama okna (ModalBox, pierwsze dziecko nakładki) ma stałą wysokość - nie rośnie z listą.
        // jsdom nie rozumie `min()` w getComputedStyle, więc sprawdzamy regułę klasy ramy.
        const box = screen.getByRole('dialog').firstElementChild as HTMLElement;
        const css = Array.from(document.querySelectorAll('style')).map(el => el.textContent ?? '').join('');
        const boxRules = Array.from(box.classList).flatMap(cls => css.match(new RegExp(`\\.${cls}\\{[^}]*\\}`, 'g')) ?? []);
        expect(boxRules.join('')).toMatch(/height:\s*min\(640px,\s*100%\)/);

        const search = screen.getByLabelText('Dodaj usługę');
        fireEvent.focus(search);
        fireEvent.change(search, { target: { value: 'po' } });
        expect(await screen.findByRole('option', { name: 'Powłoka ceramiczna' })).toBeInTheDocument();

        // Kolejny znak: zapytanie wisi, a lista nie znika (i okno nie zmienia wysokości).
        fireEvent.change(search, { target: { value: 'pol' } });
        await waitFor(() => expect(api.getServices).toHaveBeenCalledWith(expect.objectContaining({ search: 'pol' })));
        expect(screen.getByRole('option', { name: 'Powłoka ceramiczna' })).toBeInTheDocument();

        await act(async () => { resolveNext(page(['Polerowanie'])); });
        await waitFor(() => expect(screen.queryByRole('option', { name: 'Powłoka ceramiczna' })).toBeNull());
        expect(screen.getByRole('option', { name: 'Polerowanie' })).toBeInTheDocument();
    });

    it('wyszukiwarka pyta serwer po pauzie w pisaniu, nie przy każdym znaku', async () => {
        api.getServices.mockResolvedValue(page(['Mycie']));
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider theme={theme}>
                    <PackageEditorModal target={null} onClose={vi.fn()} onSaved={vi.fn()} />
                </ThemeProvider>
            </QueryClientProvider>,
        );
        const search = screen.getByLabelText('Dodaj usługę');
        for (const value of ['m', 'my', 'myc', 'myci', 'mycie']) fireEvent.change(search, { target: { value } });

        await waitFor(() => expect(api.getServices).toHaveBeenCalledWith(expect.objectContaining({ search: 'mycie' })));
        const searched = api.getServices.mock.calls.map(([f]) => (f as { search: string }).search);
        expect(searched).not.toContain('myc');
    });
});
