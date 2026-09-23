// @vitest-environment jsdom
//
// Zatwierdzenie listy obecności z podpisem na innym urządzeniu: tablet studia albo własny
// telefon. Podpis z tabletu lub telefonu sam zatwierdza listę - okno dowiaduje się o tym
// na żywo i się zamyka.
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../team/SignaturePad', () => ({
    SignaturePad: forwardRef<unknown, { onInkChange?: (ink: boolean) => void }>(function FakePad(_, ref) {
        useImperativeHandle(ref, () => ({ clear: () => undefined, toDataUrl: () => 'data:image/png;base64,PODPIS' }));
        return <div data-testid="signature-pad" />;
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

const renderModal = () => {
    const onClose = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <ApproveAttendanceSheetModal sheet={sheet} onClose={onClose} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
};

/** Serwer zmienia stan prośby, a WebSocket to ogłasza. */
const deliver = async (next: AttendanceSignatureRequest) => {
    api.getLatestRemoteSignature.mockResolvedValue(next);
    await act(async () => { socket.handlers?.onEvent({ type: `SIGNATURE_${next.status}`, requestId: next.id }); });
};

describe('zatwierdzenie listy obecności - podpis na innym urządzeniu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

        fireEvent.click(await screen.findByRole('button', { name: /Wyświetl podpis na tablecie\s*Recepcja/ }));

        await waitFor(() => expect(api.requestRemoteSignature).toHaveBeenCalledWith('sheet-sep', 'TABLET', 't-1'));
        expect(await screen.findByText('Lista czeka na podpis na tablecie „Recepcja”')).toBeInTheDocument();
        expect(screen.getByText('Dokument jest w drodze na tablet.')).toBeInTheDocument();
        // Podczas czekania nie ma czego zatwierdzać tutaj - okno można tylko zamknąć.
        expect(screen.getByText('Zamknij', { selector: 'button' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Zatwierdź' })).not.toBeInTheDocument();
        expect(socket.ids).toEqual(['req-1']);
    });

    it('przy kilku tabletach pozwala wybrac, na ktory wyslac', async () => {
        api.getSigningOptions.mockResolvedValue(options({
            tablets: [{ tabletId: 't-1', deviceName: 'Recepcja' }, { tabletId: 't-2', deviceName: 'Stanowisko 2' }],
        }));
        api.requestRemoteSignature.mockResolvedValue(signatureRequest({ tabletId: 't-2' }));
        renderModal();

        fireEvent.click(await screen.findByRole('button', { name: /Wyświetl podpis na tablecie\s*2 tablety - wybierz/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Stanowisko 2' }));

        await waitFor(() => expect(api.requestRemoteSignature).toHaveBeenCalledWith('sheet-sep', 'TABLET', 't-2'));
    });

    it('wysyla link na wlasny numer i mowi, gdzie go szukac', async () => {
        api.requestRemoteSignature.mockResolvedValue(signatureRequest({ channel: 'SMS_LINK', tabletId: null }));
        renderModal();

        fireEvent.click(await screen.findByRole('button', { name: /Wyślij podpis na mój numer telefonu\s*\+48 ••• ••• 678/ }));

        await waitFor(() => expect(api.requestRemoteSignature).toHaveBeenCalledWith('sheet-sep', 'SMS', undefined));
        expect(await screen.findByText('Lista czeka na podpis na Twoim telefonie')).toBeInTheDocument();
        expect(screen.getByText(/Wysłaliśmy link SMS-em na numer \+48 ••• ••• 678/)).toBeInTheDocument();
    });

    it('podpis z tabletu zatwierdza liste i zamyka okno', async () => {
        api.requestRemoteSignature.mockResolvedValue(signatureRequest());
        const { onClose } = renderModal();
        fireEvent.click(await screen.findByRole('button', { name: /Wyświetl podpis na tablecie\s*Recepcja/ }));
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
        fireEvent.click(await screen.findByRole('button', { name: /Wyświetl podpis na tablecie\s*Recepcja/ }));
        await screen.findByText('Lista czeka na podpis na tablecie „Recepcja”');

        await deliver(signatureRequest({ status: 'DECLINED' }));

        expect(await screen.findByText(/Podpis na tablecie został odrzucony/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Wyświetl podpis na tablecie/ })).toBeEnabled();
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
        expect(await screen.findByRole('button', { name: /Wyświetl podpis na tablecie/ })).toBeInTheDocument();
        expect(screen.queryByText('Prośba o podpis została anulowana.')).not.toBeInTheDocument();
    });

    it('stara, dawno zakonczona prosba nie zamyka okna', async () => {
        api.getLatestRemoteSignature.mockResolvedValue(signatureRequest({ status: 'COMPLETED' }));
        const { onClose } = renderModal();

        await screen.findByRole('button', { name: /Wyświetl podpis na tablecie\s*Recepcja/ });
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

        fireEvent.click(await screen.findByRole('button', { name: /Wyślij podpis na mój numer telefonu\s*\+48/ }));

        expect(await screen.findByText('Na Twoim koncie nie ma numeru telefonu - uzupełnij go w swoim profilu.')).toBeInTheDocument();
    });

    it('bez numeru w profilu i bez tabletu opcje sa zablokowane z powodem', async () => {
        api.getSigningOptions.mockResolvedValue(options({ tablets: [], phone: null }));
        renderModal();

        expect(await screen.findByRole('button', { name: /Wyświetl podpis na tablecie\s*Brak sparowanego tabletu/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Wyślij podpis na mój numer telefonu\s*Brak numeru telefonu w Twoim profilu/ })).toBeDisabled();
    });

    it('bez modulu podpisow opcje sa zablokowane z nazwa modulu', async () => {
        capabilities.SIGNATURE_LOCAL = { enabled: false, lockReason: 'Wymaga modułu: Podpisy elektroniczne' };
        capabilities.SIGNATURE_REMOTE_REQUEST = { enabled: false, lockReason: 'Wymaga modułu: Automatyzacja kontaktu' };
        renderModal();

        expect(await screen.findByRole('button', { name: /Wymaga modułu: Podpisy elektroniczne/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Wymaga modułu: Automatyzacja kontaktu/ })).toBeDisabled();
    });
});
