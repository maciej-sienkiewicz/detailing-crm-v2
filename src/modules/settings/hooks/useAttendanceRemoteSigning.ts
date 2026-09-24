import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSignatureRequestsSocket } from '@/modules/checkin/hooks/useSignatureRequestsSocket';
import { useCapability } from '@/modules/subscription';
import {
    attendanceApi,
    type AttendanceSignatureRequest,
    type RemoteSigningChannel,
} from '../api/attendanceApi';

/** Prośba czeka na podpis: dokument wysłany albo już wyświetlony na urządzeniu. */
export const isAwaitingSignature = (request: AttendanceSignatureRequest | null | undefined): boolean =>
    request?.status === 'PENDING_DISPLAY' || request?.status === 'DISPLAYED';

/** Zapasowe odświeżanie stanu, gdyby WebSocket nie dowiózł zdarzenia. */
const FALLBACK_POLL_MS = 5_000;

export const attendanceSignatureKey = (sheetId: string) =>
    ['settings', 'attendance-sheets', sheetId, 'remote-signature'] as const;

/** Dlaczego podpisu na tablecie / telefonie nie da się teraz zlecić; null - da się. */
export interface RemoteSigningBlockers {
    TABLET: string | null;
    SMS: string | null;
}

const CHECKING = 'Sprawdzam…';

/**
 * Podpis listy obecności na tablecie studia albo na własnym telefonie.
 *
 * Stan prośby to zawsze ostatnia prośba z serwera - także po zamknięciu i ponownym
 * otwarciu okna zatwierdzania. Zmiany przychodzą WebSocketem (jak przy protokołach
 * wizyt), a dopóki prośba czeka, stan jest dodatkowo dociągany co kilka sekund.
 */
export function useAttendanceRemoteSigning(sheetId: string) {
    const queryClient = useQueryClient();
    const key = attendanceSignatureKey(sheetId);

    const options = useQuery({
        queryKey: ['settings', 'attendance-signing-options'],
        queryFn: attendanceApi.getSigningOptions,
        staleTime: 30_000,
    });

    const latest = useQuery({
        queryKey: key,
        queryFn: () => attendanceApi.getLatestRemoteSignature(sheetId),
        refetchInterval: query => (isAwaitingSignature(query.state.data) ? FALLBACK_POLL_MS : false),
    });

    const tablets = options.data?.tablets ?? [];
    const phone = options.data?.phone ?? null;
    const tabletCapability = useCapability('SIGNATURE_LOCAL');
    const smsCapability = useCapability('SIGNATURE_REMOTE_REQUEST');
    // Tablety, numer i moduły jeszcze się wczytują - brak nie znaczy jeszcze „nie ma".
    const checking = options.isLoading || tabletCapability.isLoading || smsCapability.isLoading;
    const blockers: RemoteSigningBlockers = {
        TABLET: checking ? CHECKING
            : !tabletCapability.enabled ? tabletCapability.lockReason ?? 'Wymaga modułu Podpisy elektroniczne'
                : tablets.length === 0 ? 'Brak sparowanego tabletu' : null,
        SMS: checking ? CHECKING
            : !smsCapability.enabled ? smsCapability.lockReason ?? 'Wymaga modułów: Podpisy elektroniczne i Automatyzacja kontaktu'
                : phone === null ? 'Brak numeru telefonu w Twoim profilu' : null,
    };

    const awaiting = isAwaitingSignature(latest.data) ? latest.data! : null;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

    useSignatureRequestsSocket(awaiting ? [awaiting.id] : [], {
        onEvent: refresh,
        // Zdarzenia z czasu bez połączenia przepadły - stan dociągamy z serwera.
        onReconnect: refresh,
    });

    const send = useMutation({
        mutationFn: ({ channel, tabletId }: { channel: RemoteSigningChannel; tabletId?: string }) =>
            attendanceApi.requestRemoteSignature(sheetId, channel, tabletId),
        onSuccess: request => queryClient.setQueryData(key, request),
    });

    const cancel = useMutation({
        mutationFn: () => attendanceApi.cancelRemoteSignature(sheetId),
        onSettled: refresh,
    });

    return {
        tablets,
        phone,
        /** Powód, dla którego tablet / telefon są niedostępne - widoczny zamiast opisu opcji. */
        blockers,
        /** Ostatnia prośba o podpis tej listy - także zakończona. */
        latest: latest.data ?? null,
        latestLoading: latest.isLoading,
        /** Prośba, która właśnie czeka na podpis; null, gdy żadna. */
        awaiting,
        send,
        cancel,
    };
}
