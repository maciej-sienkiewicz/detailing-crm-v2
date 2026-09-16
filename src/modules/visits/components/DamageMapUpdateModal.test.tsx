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

/*
 * Sesja telefonu żyje w oknie, więc okno wciąga gniazdo WebSocket, a to kontekst
 * uwierzytelnienia. Montowanie tu całego `AuthProvider` sprawdzałoby infrastrukturę,
 * nie okno — a sama sesja ma własny plik testowy (useDamageMapMobileSession.test.tsx).
 */
const phoneSeen = { value: false };

/*
 * Dostępność powiadomienia zależy od modułu komunikacji i kartoteki klienta. Tu
 * steruje nią prosty przełącznik; sama reguła ma własny plik testowy
 * (useDamageMapNotifyAvailability.test.ts).
 */
const notify = {
    canNotify: true,
    blockedReason: null as string | null,
    isLoading: false,
};
vi.mock('../hooks/useDamageMapNotifyAvailability', () => ({
    useDamageMapNotifyAvailability: () => ({
        isLoading: notify.isLoading,
        canNotify: notify.canNotify,
        blockedReason: notify.blockedReason,
        channel: notify.canNotify ? 'EMAIL' : null,
    }),
}));
vi.mock('../hooks/useDamageMapMobileSession', () => ({
    useDamageMapMobileSession: () => ({
        qrUrl: null,
        secondsLeft: 0,
        isExpired: false,
        isStarting: false,
        error: null,
        phoneSeen: phoneSeen.value,
        start: vi.fn(),
    }),
}));

const renderModal = (overrides: Overrides = {}) => {
    const onSubmit: Mock = overrides.onSubmit ?? vi.fn().mockResolvedValue(undefined);
    const onClose: Mock = overrides.onClose ?? vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <DamageMapUpdateModal
                visitId="visit-1"
                visitNumber="WIZ/2026/09/001"
                customerEmail="jan@example.com"
                customerPhone="534920205"
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
        // Podpowiedź mówi, ile ta konkretna treść kosztuje, a nie jak działa kodowanie.
        expect(screen.getByText(/zaoszczędzić kredyty SMS/i)).toBeTruthy();
        expect(screen.getByText(new RegExp(`${textarea.value.trim().length} znak`))).toBeTruthy();

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

    it('bez czym wysłać nie pyta o klienta i zapisuje wprost z mapy', async () => {
        /*
         * `COMM_SEND_TRANSACTIONAL` blokuje w bramce OBA kanały, nie tylko SMS, więc
         * bez modułu komunikacji pytanie „poinformować klienta" miałoby jedną możliwą
         * odpowiedź. Wcześniej okno oferowało „Tak, powiadom", a operator dowiadywał
         * się o odmowie dopiero po zapisie.
         */
        const user = userEvent.setup();
        notify.canNotify = false;
        notify.blockedReason = 'moduł Komunikacja nie jest aktywny w tym studiu';
        try {
            const { onSubmit } = renderModal();
            await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));

            expect(screen.getByText(/Klient nie zostanie powiadomiony o zmianie/i)).toBeTruthy();
            expect(screen.getByText(/moduł Komunikacja nie jest aktywny/i)).toBeTruthy();

            await addPointOnDiagram(user);
            // Krok o kliencie odpada, więc z mapy zapisuje się bezpośrednio.
            expect(screen.queryByRole('button', { name: /Podsumowanie/i })).toBeNull();
            await user.click(screen.getByRole('button', { name: /Zapisz mapę uszkodzeń/i }));

            expect(onSubmit.mock.calls[0][0]).toMatchObject({ notifyCustomer: false });
            expect('notifyMessage' in onSubmit.mock.calls[0][0]).toBe(false);
        } finally {
            notify.canNotify = true;
            notify.blockedReason = null;
        }
    });

    it('gdy da się wysłać, nota o braku powiadomienia się nie pokazuje', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));

        expect(screen.queryByText(/Klient nie zostanie powiadomiony/i)).toBeNull();
    });

    it('czeka z kształtem ścieżki, dopóki nie wie, czy można powiadomić', () => {
        notify.isLoading = true;
        try {
            renderModal();
            expect(screen.getByText(/Wczytywanie zapisanych oznaczeń/i)).toBeTruthy();
            expect(screen.queryByText(/Co zrobić z dotychczasowym dokumentem/i)).toBeNull();
        } finally {
            notify.isLoading = false;
        }
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

    it('pasek „Połączono z telefonem" pojawia się dopiero, gdy telefon da znak życia', async () => {
        const user = userEvent.setup();
        phoneSeen.value = false;
        renderModal();
        await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
        expect(screen.queryByText(/Połączono z telefonem/i)).toBeNull();
    });

    it('po połączeniu telefonu okno mówi o tym nad mapą', async () => {
        // Kod QR przestaje być potrzebny — operator patrzy teraz na mapę, na której
        // widzi to, co robi telefonem.
        const user = userEvent.setup();
        phoneSeen.value = true;
        try {
            renderModal();
            await user.click(screen.getByRole('button', { name: /Przejdź do mapy/i }));
            expect(screen.getByText(/Połączono z telefonem/i)).toBeTruthy();
        } finally {
            phoneSeen.value = false;
        }
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
                    customerEmail="jan@example.com"
                    customerPhone="534920205"
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
                    customerEmail="jan@example.com"
                    customerPhone="534920205"
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
