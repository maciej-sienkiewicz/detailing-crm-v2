// @vitest-environment jsdom
//
// Zatwierdzenie listy obecności wymaga podpisu - na tym urządzeniu, na tablecie studia albo
// na własnym telefonie. Wszystkie trzy sposoby są widoczne od razu. Podpis z tabletu lub
// telefonu sam zatwierdza listę - okno dowiaduje się o tym na żywo i się zamyka.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import {
    attendanceApi,
    type AttendanceSheet,
    type AttendanceSignatureRequest,
    type AttendanceSigningOptions,
} from '../../api/attendanceApi';
import { ApproveAttendanceSheetModal } from './ApproveAttendanceSheetModal';

vi.mock('../../api/attendanceApi', async importOriginal => {
    const original = await importOriginal<typeof import('../../api/attendanceApi')>();
    return {
        ...original,
        attendanceApi: {
            approveAttendanceSheet: vi.fn(),
            getSigningOptions: vi.fn(),
            getLatestRemoteSignature: vi.fn(),
            requestRemoteSignature: vi.fn(),
            cancelRemoteSignature: vi.fn(),
        },
    };
});

// Status na żywo: atrapa zapamiętuje, na które prośby okno czeka, i pozwala „dostarczyć" zdarzenie.
const socket = vi.hoisted(() => ({
    ids: [] as string[],
    handlers: null as null | { onEvent: (event: unknown) => void; onReconnect?: () => void },
}));
vi.mock('@/modules/checkin/hooks/useSignatureRequestsSocket', () => ({
    useSignatureRequestsSocket: (ids: string[], handlers: typeof socket.handlers) => {
        socket.ids = ids;
        socket.handlers = handlers;
    },
}));

const capabilities = vi.hoisted(() => ({
    SIGNATURE_LOCAL: { enabled: true, lockReason: null as string | null },
    SIGNATURE_REMOTE_REQUEST: { enabled: true, lockReason: null as string | null },
}));
vi.mock('@/modules/subscription', () => ({
    useCapability: (key: keyof typeof capabilities) => capabilities[key],
}));

// Kanwa nie działa w jsdom. Atrapa trzyma kontrakt prawdziwego pola: zaraz po zamontowaniu
// zgłasza „pusto", a podpis „składa się" przyciskiem.
const pad = vi.hoisted(() => ({ mounts: 0 }));
vi.mock('../team/SignaturePad', () => ({
    SignaturePad: forwardRef<unknown, { onInkChange?: (ink: boolean) => void }>(function FakePad({ onInkChange }, ref) {
        const ink = useRef(false);
        useImperativeHandle(ref, () => ({
            clear: () => { ink.current = false; onInkChange?.(false); },
            toDataUrl: () => (ink.current ? 'data:image/png;base64,PODPIS' : null),
        }));
        useEffect(() => {
            pad.mounts += 1;
            onInkChange?.(false);
        }, [onInkChange]);
        return (
            <button type="button" onClick={() => { ink.current = true; onInkChange?.(true); }}>
                atrapa: złóż podpis
            </button>
        );
    }),
}));

const api = vi.mocked(attendanceApi);

const sheet: AttendanceSheet = {
    id: 'sheet-sep',
    period: '2026-09',
    employeeCount: 3,
    signed: false,
    signerName: null,
    signedAt: null,
    createdAt: Date.parse('2026-09-23T12:05:00Z'),
    status: 'GENERATED',
    createdByName: 'Jan Kowalski',
    approvedAt: null,
    approvedByName: null,
};

const options = (overrides: Partial<AttendanceSigningOptions> = {}): AttendanceSigningOptions => ({
    tablets: [{ tabletId: 't-1', deviceName: 'Recepcja' }],
    phone: '+48 ••• ••• 678',
    ...overrides,
});

const signatureRequest = (overrides: Partial<AttendanceSignatureRequest> = {}): AttendanceSignatureRequest => ({
    id: 'req-1',
    attendanceSheetId: 'sheet-sep',
    tabletId: 't-1',
    channel: 'TABLET',
    status: 'PENDING_DISPLAY',
    expiresAt: '2026-09-23T12:20:00Z',
    failureReason: null,
    ...overrides,
});

const renderModal = (target: AttendanceSheet = sheet) => {
    const onClose = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <ApproveAttendanceSheetModal sheet={target} onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

/** Wybiera sposób podpisu - opis w nazwie mówi, co dokładnie wybrano (który tablet, który numer). */
const choose = async (name: RegExp) => {
    const option = await screen.findByRole('radio', { name });
    await waitFor(() => expect(option).toBeEnabled());
    fireEvent.click(option);
    return option;
};

/** Serwer zmienia stan prośby, a WebSocket to ogłasza. */
const deliver = async (next: AttendanceSignatureRequest) => {
    api.getLatestRemoteSignature.mockResolvedValue(next);
    await act(async () => { socket.handlers?.onEvent({ type: `SIGNATURE_${next.status}`, requestId: next.id }); });
};

describe('zatwierdzenie listy obecności - podpis na innym urządzeniu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pad.mounts = 0;
        socket.ids = [];
        socket.handlers = null;
        capabilities.SIGNATURE_LOCAL = { enabled: true, lockReason: null };
        capabilities.SIGNATURE_REMOTE_REQUEST = { enabled: true, lockReason: null };
        api.getSigningOptions.mockResolvedValue(options());
        api.getLatestRemoteSignature.mockResolvedValue(null);
        api.cancelRemoteSignature.mockResolvedValue(undefined);
    });
    afterEach(() => cleanup());

    it('wyswietla liste na jedynym tablecie i czeka na podpis', async () => {
        api.requestRemoteSignature.mockResolvedValue(signatureRequest());
        renderModal();

        await choose(/Podpisz na tablecie\s*Recepcja/);
        expect(screen.getByText(/Lista wyświetli się na tablecie/)).toHaveTextContent('Lista wyświetli się na tablecie „Recepcja”.');
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij na tablet' }));

        await waitFor(() => expect(api.requestRemoteSignature).toHaveBeenCalledWith('sheet-sep', 'TABLET', 't-1'));
        expect(await screen.findByText('Lista czeka na podpis na tablecie „Recepcja”')).toBeInTheDocument();
        expect(screen.getByText('Dokument jest w drodze na tablet.')).toBeInTheDocument();
        // Podczas czekania nie ma czego zatwierdzać tutaj - okno można tylko zamknąć.
        expect(screen.getByText('Zamknij', { selector: 'button' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Zatwierdź|Wyślij/ })).not.toBeInTheDocument();
        expect(socket.ids).toEqual(['req-1']);
    });

    it('przy kilku tabletach pozwala wybrac, na ktory wyslac', async () => {
        api.getSigningOptions.mockResolvedValue(options({
            tablets: [{ tabletId: 't-1', deviceName: 'Recepcja' }, { tabletId: 't-2', deviceName: 'Stanowisko 2' }],
        }));
        api.requestRemoteSignature.mockResolvedValue(signatureRequest({ tabletId: 't-2' }));
        renderModal();

        await choose(/Podpisz na tablecie\s*2 tablety do wyboru/);
        // Bez wskazania tabletu nie ma dokąd wysłać.
        expect(screen.getByRole('button', { name: 'Wyślij na tablet' })).toBeDisabled();
        fireEvent.click(screen.getByRole('radio', { name: 'Stanowisko 2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij na tablet' }));

        await waitFor(() => expect(api.requestRemoteSignature).toHaveBeenCalledWith('sheet-sep', 'TABLET', 't-2'));
    });

    it('wysyla link na wlasny numer i mowi, gdzie go szukac', async () => {
        api.requestRemoteSignature.mockResolvedValue(signatureRequest({ channel: 'SMS_LINK', tabletId: null }));
        renderModal();

        await choose(/Wyślij na telefon\s*\+48 ••• ••• 678/);
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij SMS' }));

        await waitFor(() => expect(api.requestRemoteSignature).toHaveBeenCalledWith('sheet-sep', 'SMS', undefined));
        expect(await screen.findByText('Lista czeka na podpis na Twoim telefonie')).toBeInTheDocument();
        expect(screen.getByText(/Wysłaliśmy link SMS-em na numer \+48 ••• ••• 678/)).toBeInTheDocument();
    });

    it('podpis z tabletu zatwierdza liste i zamyka okno', async () => {
        api.requestRemoteSignature.mockResolvedValue(signatureRequest());
        const { onClose } = renderModal();
        await choose(/Podpisz na tablecie\s*Recepcja/);
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij na tablet' }));
        await screen.findByText('Lista czeka na podpis na tablecie „Recepcja”');

        await deliver(signatureRequest({ status: 'DISPLAYED' }));
        expect(await screen.findByText('Dokument jest wyświetlony na tablecie.')).toBeInTheDocument();

        await deliver(signatureRequest({ status: 'COMPLETED' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(await screen.findByText('Lista obecności podpisana i zatwierdzona')).toBeInTheDocument();
    });

    it('odrzucony podpis wraca do wyboru z informacja, co sie stalo', async () => {
        api.requestRemoteSignature.mockResolvedValue(signatureRequest());
        const { onClose } = renderModal();
        await choose(/Podpisz na tablecie\s*Recepcja/);
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij na tablet' }));
        await screen.findByText('Lista czeka na podpis na tablecie „Recepcja”');

        await deliver(signatureRequest({ status: 'DECLINED' }));

        expect(await screen.findByText(/Podpis na tablecie został odrzucony/)).toBeInTheDocument();
        // Wybór zostaje przy tablecie - wysłanie jeszcze raz to jedno kliknięcie.
        expect(screen.getByRole('radio', { name: /Podpisz na tablecie/ })).toBeChecked();
        expect(screen.getByRole('button', { name: 'Wyślij na tablet' })).toBeEnabled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('po ponownym otwarciu wraca do czekania i pozwala anulowac prosbe', async () => {
        api.getLatestRemoteSignature.mockResolvedValue(signatureRequest({ status: 'DISPLAYED' }));
        renderModal();

        expect(await screen.findByText('Dokument jest wyświetlony na tablecie.')).toBeInTheDocument();
        api.getLatestRemoteSignature.mockResolvedValue(signatureRequest({ status: 'CANCELLED' }));
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj prośbę' }));

        await waitFor(() => expect(api.cancelRemoteSignature).toHaveBeenCalledWith('sheet-sep'));
        // Własne anulowanie nie jest „wynikiem" do ogłoszenia - po prostu wracają opcje.
        expect(await screen.findByRole('radio', { name: /Podpisz na tablecie/ })).toBeInTheDocument();
        expect(screen.queryByText('Prośba o podpis została anulowana.')).not.toBeInTheDocument();
    });

    it('stara, dawno zakonczona prosba nie zamyka okna', async () => {
        api.getLatestRemoteSignature.mockResolvedValue(signatureRequest({ status: 'COMPLETED' }));
        const { onClose } = renderModal();

        await screen.findByRole('radio', { name: /Podpisz na tablecie\s*Recepcja/ });
        await waitFor(() => expect(api.getLatestRemoteSignature).toHaveBeenCalled());
        // Odpowiedź i efekty muszą dojść do końca - dopiero wtedy „nie zamknęło się" coś znaczy.
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.queryByText('Lista obecności podpisana i zatwierdzona')).not.toBeInTheDocument();
    });

    it('odmowa serwera trafia do okna, przy ktorym stoi uzytkownik', async () => {
        api.requestRemoteSignature.mockRejectedValue({
            response: { status: 400, data: { message: 'Na Twoim koncie nie ma numeru telefonu - uzupełnij go w swoim profilu.' } },
        });
        renderModal();

        await choose(/Wyślij na telefon\s*\+48/);
        fireEvent.click(screen.getByRole('button', { name: 'Wyślij SMS' }));

        expect(await screen.findByText('Na Twoim koncie nie ma numeru telefonu - uzupełnij go w swoim profilu.')).toBeInTheDocument();
    });

    it('bez numeru w profilu i bez tabletu opcje sa zablokowane z powodem', async () => {
        api.getSigningOptions.mockResolvedValue(options({ tablets: [], phone: null }));
        renderModal();

        expect(await screen.findByRole('radio', { name: /Podpisz na tablecie\s*Brak sparowanego tabletu/ })).toBeDisabled();
        expect(screen.getByRole('radio', { name: /Wyślij na telefon\s*Brak numeru telefonu w Twoim profilu/ })).toBeDisabled();
        // Na tym urządzeniu podpisać można zawsze.
        expect(screen.getByRole('radio', { name: /Podpisz na tym urządzeniu/ })).toBeEnabled();
    });

    it('bez modulu podpisow opcje sa zablokowane z nazwa modulu', async () => {
        capabilities.SIGNATURE_LOCAL = { enabled: false, lockReason: 'Wymaga modułu: Podpisy elektroniczne' };
        capabilities.SIGNATURE_REMOTE_REQUEST = { enabled: false, lockReason: 'Wymaga modułu: Automatyzacja kontaktu' };
        renderModal();

        expect(await screen.findByRole('radio', { name: /Podpisz na tablecie\s*Wymaga modułu: Podpisy elektroniczne/ })).toBeDisabled();
        expect(screen.getByRole('radio', { name: /Wyślij na telefon\s*Wymaga modułu: Automatyzacja kontaktu/ })).toBeDisabled();
    });
});

describe('zatwierdzenie listy obecności - podpis na tym urządzeniu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        pad.mounts = 0;
        capabilities.SIGNATURE_LOCAL = { enabled: true, lockReason: null };
        capabilities.SIGNATURE_REMOTE_REQUEST = { enabled: true, lockReason: null };
        api.getSigningOptions.mockResolvedValue(options());
        api.getLatestRemoteSignature.mockResolvedValue(null);
        api.approveAttendanceSheet.mockResolvedValue({ ...sheet, status: 'APPROVED', signed: true });
    });
    afterEach(() => cleanup());

    it('trzy sposoby podpisu sa widoczne od razu, a domyslny to to urzadzenie', async () => {
        renderModal();

        const group = await screen.findByRole('radiogroup', { name: 'Gdzie złożysz podpis?' });
        const methods = within(group).getAllByRole('radio');
        expect(methods.map(method => method.closest('label')?.textContent)).toEqual([
            expect.stringContaining('Podpisz na tym urządzeniu'),
            expect.stringContaining('Podpisz na tablecie'),
            expect.stringContaining('Wyślij na telefon'),
        ]);
        expect(screen.getByRole('radio', { name: /Podpisz na tym urządzeniu/ })).toBeChecked();
        expect(screen.getByRole('button', { name: 'atrapa: złóż podpis' })).toBeVisible();
        expect(screen.getByText(/Zatwierdzenie wymaga Twojego podpisu\./)).toBeInTheDocument();
    });

    it('bez podpisu nie da sie zatwierdzic', async () => {
        renderModal();

        const approve = await screen.findByRole('button', { name: 'Podpisz i zatwierdź' });
        expect(approve).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Zatwierdź' })).not.toBeInTheDocument();

        fireEvent.click(approve);
        expect(api.approveAttendanceSheet).not.toHaveBeenCalled();
    });

    it('podpis z tego urzadzenia idzie razem z zatwierdzeniem', async () => {
        const { onClose } = renderModal();

        fireEvent.click(await screen.findByRole('button', { name: 'atrapa: złóż podpis' }));
        fireEvent.click(screen.getByRole('button', { name: 'Podpisz i zatwierdź' }));

        await waitFor(() => expect(api.approveAttendanceSheet).toHaveBeenCalledWith('sheet-sep', 'data:image/png;base64,PODPIS'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('wyczyszczony podpis znow blokuje zatwierdzenie', async () => {
        renderModal();

        fireEvent.click(await screen.findByRole('button', { name: 'atrapa: złóż podpis' }));
        expect(screen.getByRole('button', { name: 'Podpisz i zatwierdź' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Wyczyść' }));

        expect(screen.getByRole('button', { name: 'Podpisz i zatwierdź' })).toBeDisabled();
    });

    it('zajrzenie do innego sposobu nie kasuje zlozonego podpisu', async () => {
        renderModal();

        fireEvent.click(await screen.findByRole('button', { name: 'atrapa: złóż podpis' }));
        await choose(/Podpisz na tablecie/);
        // Przy tablecie przycisk wysyła prośbę - zatwierdzenia z tego miejsca nie ma.
        expect(screen.queryByRole('button', { name: 'Podpisz i zatwierdź' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('radio', { name: /Podpisz na tym urządzeniu/ }));

        expect(screen.getByRole('button', { name: 'Podpisz i zatwierdź' })).toBeEnabled();
        expect(pad.mounts).toBe(1);
    });

    it('lista podpisana wczesniej zatwierdza sie bez nowego podpisu', async () => {
        renderModal({ ...sheet, signed: true, signerName: 'Jan Kowalski' });

        expect(await screen.findByText(/Arkusz jest już podpisany \(Jan Kowalski\)/)).toBeInTheDocument();
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Zatwierdź' }));

        await waitFor(() => expect(api.approveAttendanceSheet).toHaveBeenCalledWith('sheet-sep', null));
    });
});
