// src/modules/checkin/views/mobile/MobileDamageSection.test.tsx
// @vitest-environment jsdom
//
// Zgłoszenie z produkcji: telefon, zakładka „Uszkodzenia". Pierwsze dotknięcie mapy
// pokazuje „Zapisano", ale znacznik się nie pojawia.
//
// Przyczyna: hak wczytuje zapisane oznaczenia z serwera dopiero po weryfikacji sesji,
// a mapa jest już dotykalna. Dotknięcie przed odpowiedzią dodaje punkt, po czym
// odpowiedź (`setDamagePoints(serwer)`) go nadpisuje. Odroczony zapis wysyła jednak
// listę z chwili dotknięcia - stąd „Zapisano" przy znikniętym znaczniku, a gdy sesja
// ma już oznaczenia (aktualizacja mapy wizyty), ten zapis kasuje je na serwerze.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { checkinApi } from '../../api/checkinApi';
import type { DamagePoint, MobileDamagePointsResponse } from '../../types';
import { useMobileDamageLogic } from './useMobileDamageLogic';
import { MobileDamageSection } from './MobileDamageSection';

vi.mock('../../api/checkinApi', () => ({
    checkinApi: {
        getMobileDamagePoints: vi.fn(),
        saveMobileDamagePoints: vi.fn(),
        uploadMobilePhoto: vi.fn(),
    },
}));

vi.mock('../../services/imageUploadPrep', () => ({
    prepareImageOrExplain: (file: File) => Promise.resolve({ file }),
}));

const api = vi.mocked(checkinApi);

function Harness() {
    const logic = useMobileDamageLogic('tok', true, true);
    return <MobileDamageSection logic={logic} />;
}

/** Odpowiedź serwera, którą test wypuszcza w wybranej chwili - jak wolna sieć w telefonie. */
function deferredLoad() {
    let resolve!: (value: MobileDamagePointsResponse) => void;
    api.getMobileDamagePoints.mockReturnValue(new Promise(r => { resolve = r; }));
    return (damagePoints: DamagePoint[]) =>
        act(async () => resolve({ checkinId: 'c1', damagePoints, savedAt: '2026-10-09T10:00:00Z' }));
}

/** Dotknięcie schematu w (x%, y%) - schemat ma w teście 200 × 100 px. */
const tapDiagram = (x: number, y: number) => {
    const overlay = screen.getByAltText(/Schemat pojazdu/).nextElementSibling as HTMLElement;
    fireEvent.click(overlay, { clientX: x * 2, clientY: y });
};

const markersOnDiagram = () =>
    Array.from((screen.getByAltText(/Schemat pojazdu/).nextElementSibling as HTMLElement).children);

describe('Mapa uszkodzeń na telefonie - dotknięcie przed wczytaniem oznaczeń z serwera', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        api.saveMobileDamagePoints.mockResolvedValue({} as MobileDamagePointsResponse);
        Element.prototype.scrollIntoView = vi.fn();
        vi.spyOn(HTMLImageElement.prototype, 'getBoundingClientRect').mockReturnValue(
            { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
        );
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('pierwszy znacznik zostaje na mapie, gdy serwer nie ma jeszcze oznaczeń', async () => {
        const respond = deferredLoad();
        render(<Harness />);

        tapDiagram(40, 50);
        expect(markersOnDiagram()).toHaveLength(1);

        await respond([]);
        await act(() => vi.advanceTimersByTimeAsync(2000));

        expect(screen.getByText('✓ Zapisano')).toBeInTheDocument();
        // Przed poprawką: „Zapisano" i pusta mapa.
        expect(markersOnDiagram()).toHaveLength(1);
        expect(api.saveMobileDamagePoints).toHaveBeenLastCalledWith(
            'tok', [expect.objectContaining({ x: 40, y: 50 })], 'sedan'
        );
    });

    it('nowy znacznik dołącza do zapisanych, a zapis nie kasuje tych z serwera', async () => {
        const respond = deferredLoad();
        render(<Harness />);

        tapDiagram(40, 50);
        await respond([{ id: 1, x: 10, y: 20, note: 'rysa na zderzaku' }]);
        await act(() => vi.advanceTimersByTimeAsync(2000));

        // Przed poprawką serwer dostawał wyłącznie nowy punkt i usuwał zapisany.
        const calls = api.saveMobileDamagePoints.mock.calls;
        const [, saved] = calls[calls.length - 1];
        expect(saved).toEqual([
            expect.objectContaining({ id: 1, x: 10, y: 20, note: 'rysa na zderzaku' }),
            expect.objectContaining({ id: 2, x: 40, y: 50 }),
        ]);
        expect(markersOnDiagram()).toHaveLength(2);
        expect(screen.getByDisplayValue('rysa na zderzaku')).toBeInTheDocument();
    });

    it('bez dotknięcia przed odpowiedzią mapa pokazuje dokładnie to, co na serwerze, i niczego nie zapisuje', async () => {
        const respond = deferredLoad();
        render(<Harness />);

        await respond([{ id: 3, x: 10, y: 20, note: '' }]);
        await act(() => vi.advanceTimersByTimeAsync(2000));

        expect(markersOnDiagram()).toHaveLength(1);
        expect(api.saveMobileDamagePoints).not.toHaveBeenCalled();
    });
});

describe('Mapa uszkodzeń na telefonie - kilka zdjęć naraz do jednego oznaczenia', () => {
    beforeEach(() => {
        localStorage.clear();
        api.saveMobileDamagePoints.mockResolvedValue({} as MobileDamagePointsResponse);
        URL.createObjectURL = vi.fn(() => 'blob:podglad');
    });
    afterEach(() => vi.clearAllMocks());

    it('każde z wybranych zdjęć zostaje przy oznaczeniu', async () => {
        api.getMobileDamagePoints.mockResolvedValue({
            checkinId: 'c1', savedAt: '2026-10-09T10:00:00Z',
            damagePoints: [{ id: 1, x: 10, y: 20, note: '' }],
        });
        let n = 0;
        api.uploadMobilePhoto.mockImplementation(async () => ({
            photoId: `srv-${++n}`, fileName: 'a.jpg', checkinId: 'c1', uploadedAt: '2026-10-09T10:00:00Z',
        }));

        const { result } = renderHook(() => useMobileDamageLogic('tok', true, true));
        await act(async () => {});

        const files = [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })];
        act(() => { result.current.attachPhotos(1, files); });
        // Przed poprawką pętla czytała listę sprzed pierwszego zdjęcia i pierwsze znikało.
        expect(result.current.damagePoints[0].photos).toHaveLength(2);

        await act(async () => {});
        expect(result.current.damagePoints[0].photos?.map(ph => ph.photoId).sort()).toEqual(['srv-1', 'srv-2']);
    });
});
