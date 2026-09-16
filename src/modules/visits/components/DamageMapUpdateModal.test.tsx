// src/modules/visits/components/DamageMapUpdateModal.test.tsx
// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { DamageMapUpdateModal } from './DamageMapUpdateModal';
import { theme } from '@/common/theme';
import type { DamagePoint } from '@/modules/checkin/types';
import type { VisitPhoto } from '../types';

const existingPoints: DamagePoint[] = [
    { id: 1, x: 20, y: 30, note: 'rysa na masce' },
];

const photos: VisitPhoto[] = [
    {
        id: 'photo-1',
        fileName: 'maska.jpg',
        uploadedAt: '2026-09-16T08:00:00Z',
        thumbnailUrl: 'https://example.test/thumb.jpg',
        fullSizeUrl: 'https://example.test/full.jpg',
    },
];

type Overrides = Partial<Omit<Parameters<typeof DamageMapUpdateModal>[0], 'onSubmit' | 'onClose'>> & {
    onSubmit?: Mock;
    onClose?: Mock;
};

/* Panel QR pyta backend o token przy montowaniu; w tych testach nie wchodzimy w tę
   zakładkę, a gdyby test kiedyś wszedł, ma dostać przewidywalną atrapę. */
vi.mock('./DamageMapQrPanel', () => ({
    DamageMapQrPanel: () => <div data-testid="qr-panel" />,
}));

const renderModal = (overrides: Overrides = {}) => {
    const onSubmit: Mock = overrides.onSubmit ?? vi.fn().mockResolvedValue(undefined);
    const onClose: Mock = overrides.onClose ?? vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <DamageMapUpdateModal
                visitId="visit-1"
                visitNumber="WIZ/2026/09/001"
                initialPoints={existingPoints}
                initialVehicleType="suv"
                pointsRecoverable
                hasDocument
                visitPhotos={photos}
                isLoading={false}
                isSaving={false}
                onClose={onClose}
                onSubmit={onSubmit}
                onUploadPhotoFile={vi.fn()}
                onPhotosClaimed={vi.fn()}
                {...overrides}
            />
        </ThemeProvider>
    );
    return { onSubmit, onClose };
};

/** Klika w schemat pojazdu, dorysowując punkt. */
const addPointOnDiagram = async (user: ReturnType<typeof userEvent.setup>) => {
    const diagram = screen.getByAltText(/Schemat pojazdu/i);
    // Overlay przyjmujący kliknięcia leży nad obrazkiem.
    const overlay = diagram.nextElementSibling as HTMLElement;
    await user.click(overlay);
};

describe('DamageMapUpdateModal', () => {
    it('zaczyna od decyzji o dokumencie, nie od rysowania', async () => {
        renderModal();

        // Pytanie o plik jest PIERWSZE świadomie: po dorysowaniu dziesięciu punktów
        // nikt nie czyta wyjaśnień o nadpisywaniu podpisanego protokołu.
        expect(screen.getByText(/Co zrobić z dotychczasowym dokumentem/i)).toBeTruthy();
        expect(screen.getByText(/Wygeneruj nowy plik/i)).toBeTruthy();
        expect(screen.getByText(/Zaktualizuj istniejący/i)).toBeTruthy();
        expect(screen.queryByAltText(/Schemat pojazdu/i)).toBeNull();
    });

    it('domyślnie wybiera nowy plik — wariant, który nie kasuje mapy z przyjęcia', () => {
        renderModal();

        const newFile = screen.getByRole('button', { name: /Wygeneruj nowy plik/i });
        expect(newFile.getAttribute('aria-pressed')).toBe('true');
    });

    it('nie tłumaczy już, dlaczego to pytanie jest pierwsze', () => {
        renderModal();
        expect(screen.queryByText(/Dlatego to pytanie jest pierwsze/i)).toBeNull();
    });

    it('ostrzega przed nadpisaniem dokumentu, który klient mógł już dostać', async () => {
        const user = userEvent.setup();
        renderModal();

        expect(screen.queryByText(/nie pokażesz/i)).toBeNull();
        await user.click(screen.getByRole('button', { name: /Zaktualizuj istniejący/i }));
        expect(screen.getByText(/nie pokażesz/i)).toBeTruthy();
    });

    it('bez dotychczasowego dokumentu pomija pytanie o plik i otwiera od razu mapę', () => {
        // Ekran z jedną możliwą odpowiedzią to kliknięcie na pusto przed właściwą pracą.
        renderModal({ hasDocument: false, pointsRecoverable: false, initialPoints: [] });

        expect(screen.queryByText(/Co zrobić z dotychczasowym dokumentem/i)).toBeNull();
        expect(screen.queryByRole('button', { name: /Zaktualizuj istniejący/i })).toBeNull();
        expect(screen.getByAltText(/Schemat pojazdu/i)).toBeTruthy();
        // Z dwóch kroków pierwszy nie ma już „Wróć".
        expect(screen.queryByRole('button', { name: /^Wróć$/i })).toBeNull();
    });

    it('bez dokumentu prowadzi wprost do podsumowania i zapisuje jako nowy plik', async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderModal({ hasDocument: false, pointsRecoverable: false, initialPoints: [] });

        await addPointOnDiagram(user);
        await user.click(screen.getByRole('button', { name: /Podsumowanie/i }));
        await user.click(screen.getByRole('button', { name: /Nie, powiem osobiście/i }));
        await user.click(screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }));

        expect(onSubmit.mock.calls[0][0]).toMatchObject({ mode: 'NEW_FILE' });
    });

    it('czeka z wyborem kroku, dopóki nie wie, czy jest dokument', () => {
        // `hasDocument` przychodzi z zapytania. Gdyby okno rysowało mapę już w trakcie
        // wczytywania, operator zobaczyłby ją i po chwili przeskok na pytanie o plik.
        renderModal({ isLoading: true });

        expect(screen.getByText(/Wczytywanie zapisanych oznaczeń/i)).toBeTruthy();
        expect(screen.queryByAltText(/Schemat pojazdu/i)).toBeNull();
        expect(screen.queryByText(/Co zrobić z dotychczasowym dokumentem/i)).toBeNull();
    });

    it('mówi wprost, gdy punktów z przyjęcia nie da się odtworzyć', () => {
        // Bez tego ostrzeżenia „aktualizacja" starej wizyty zapisałaby pustą mapę
        // i cicho skasowała wszystkie oznaczenia z przyjęcia.
        renderModal({ pointsRecoverable: false, initialPoints: [], hasDocument: true });

        expect(screen.getByText(/starsza niż zapis oznaczeń/i)).toBeTruthy();
    });

    it('bez żadnej zmiany nie da się przejść dalej ani zapisać', async () => {
        const user = userEvent.setup();
        renderModal();

        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));

        const next = screen.getByRole('button', { name: /Podsumowanie/i }) as HTMLButtonElement;
        expect(next.disabled).toBe(true);
        expect(next.title).toMatch(/Dodaj lub popraw oznaczenie/i);
    });

    it('zapis jest zablokowany, dopóki nie padnie TAK albo NIE w sprawie klienta', async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderModal();

        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
        await addPointOnDiagram(user);
        await user.click(screen.getByRole('button', { name: /Podsumowanie/i }));

        const save = screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }) as HTMLButtonElement;
        expect(save.disabled).toBe(true);
        expect(save.title).toMatch(/Wybierz, czy poinformować klienta/i);

        await user.click(screen.getByRole('button', { name: /Nie, powiem osobiście/i }));
        expect((screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }) as HTMLButtonElement).disabled)
            .toBe(false);

        await user.click(screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit.mock.calls[0][0]).toMatchObject({
            mode: 'NEW_FILE',
            notifyCustomer: false,
            vehicleType: 'suv',
        });
        expect('notifyMessage' in onSubmit.mock.calls[0][0]).toBe(false);
    });

    it('TAK odsłania edytowalną treść wiadomości i wysyła ją w payloadzie', async () => {
        const user = userEvent.setup();
        const { onSubmit, onClose } = renderModal();

        await user.click(screen.getByRole('button', { name: /Zaktualizuj istniejący/i }));
        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
        await addPointOnDiagram(user);
        await user.click(screen.getByRole('button', { name: /Podsumowanie/i }));

        expect(screen.queryByLabelText(/Treść wiadomości do klienta/i)).toBeNull();
        await user.click(screen.getByRole('button', { name: /Tak, powiadom/i }));

        const textarea = screen.getByLabelText(/Treść wiadomości do klienta/i) as HTMLTextAreaElement;
        // Szkic składa się z różnicy i jest bez ogonków (ta sama treść może pójść SMS-em).
        expect(textarea.value).toContain('WIZ/2026/09/001');
        expect(textarea.value).not.toMatch(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);

        await user.clear(textarea);
        await user.type(textarea, 'Doszla rysa na drzwiach');
        await user.click(screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }));

        expect(onSubmit.mock.calls[0][0]).toMatchObject({
            mode: 'REPLACE_EXISTING',
            notifyCustomer: true,
            notifyMessage: 'Doszla rysa na drzwiach',
        });
        // Okno zamyka się dopiero po udanym zapisie.
        expect(onClose).toHaveBeenCalled();
    });

    it('nieudany zapis nie zamyka okna — punkty zostają na ekranie', async () => {
        // Zamknięcie przy błędzie znaczyłoby klikanie mapy od nowa.
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockRejectedValue(new Error('500'));
        const onClose = vi.fn();
        renderModal({ onSubmit, onClose });

        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
        await addPointOnDiagram(user);
        await user.click(screen.getByRole('button', { name: /Podsumowanie/i }));
        await user.click(screen.getByRole('button', { name: /Nie, powiem osobiście/i }));
        await user.click(screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }));

        expect(onSubmit).toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i })).toBeTruthy();
    });

    it('podsumowanie mówi, ile oznaczeń zostanie i co stanie się z plikiem', async () => {
        const user = userEvent.setup();
        renderModal();

        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
        await addPointOnDiagram(user);
        await user.click(screen.getByRole('button', { name: /Podsumowanie/i }));

        expect(screen.getByText(/2 oznaczenia na mapie/i)).toBeTruthy();
        expect(screen.getByText(/utworzy nowy plik/i)).toBeTruthy();
    });

    it('doładowanie punktów z API nie zdmuchuje świeżo postawionego oznaczenia', async () => {
        // Zapytanie o punkty leci dopiero po otwarciu okna, więc propsy zmieniają
        // się już przy otwartym edytorze. Gdyby efekt nadpisywał stan bezwarunkowo,
        // operator tracił punkt w połowie klikania.
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(
            <ThemeProvider theme={theme}>
                <DamageMapUpdateModal
                    visitId="visit-1"
                    visitNumber="WIZ/2026/09/001"
                    initialPoints={[]}
                    initialVehicleType={null}
                    pointsRecoverable
                    hasDocument
                    visitPhotos={photos}
                    isLoading={false}
                    isSaving={false}
                    onClose={vi.fn()}
                    onSubmit={onSubmit}
                    onUploadPhotoFile={vi.fn()}
                    onPhotosClaimed={vi.fn()}
                />
            </ThemeProvider>
        );

        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
        await addPointOnDiagram(user);

        rerender(
            <ThemeProvider theme={theme}>
                <DamageMapUpdateModal
                    visitId="visit-1"
                    visitNumber="WIZ/2026/09/001"
                    initialPoints={existingPoints}
                    initialVehicleType="suv"
                    pointsRecoverable
                    hasDocument
                    visitPhotos={photos}
                    isLoading={false}
                    isSaving={false}
                    onClose={vi.fn()}
                    onSubmit={onSubmit}
                    onUploadPhotoFile={vi.fn()}
                    onPhotosClaimed={vi.fn()}
                />
            </ThemeProvider>
        );

        // Dorysowany punkt przeżył doładowanie.
        expect(screen.getByPlaceholderText(/Opis uszkodzenia/i)).toBeTruthy();
    });
});
