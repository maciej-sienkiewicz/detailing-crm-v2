import { useQuery } from '@tanstack/react-query';
import { protocolsApi } from '@/modules/protocols/api/protocolsApi';
import { SigningRequirementModal } from './SigningRequirementModal';
import type { ProtocolResponse } from '../types';
import type { OpenDraftVisit } from '@/modules/visits/types';

/*
 * Dokończenie przerwanego przyjęcia pojazdu.
 *
 * Wizyta i jej protokoły już istnieją — brakuje wyłącznie ostatniego kroku, tego samego,
 * którym kończy się kreator: podpisów i zatwierdzenia. Dlatego wznowienie NIE wraca do
 * kreatora (dane przyjęcia są już zapisane i formularza nie ma z czego odtworzyć), tylko
 * otwiera dokładnie to okno, w którym przyjęcie zostało porzucone.
 *
 * Protokoły dociągamy z serwera, bo tylko on wie, co zostało w międzyczasie podpisane —
 * np. na tablecie już po zamknięciu okna.
 */

/** Kształt z `/v1/visits/{id}/protocols` sprowadzony do tego, czego potrzebuje okno. */
const toProtocolResponse = (protocol: {
    id: string;
    protocolTemplateId: string;
    protocolTemplate?: { name: string };
    stage: string;
}): ProtocolResponse => ({
    id: protocol.id,
    templateId: protocol.protocolTemplateId ?? null,
    templateName: protocol.protocolTemplate?.name ?? 'Protokół',
    stage: protocol.stage === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
    status: 'READY_FOR_SIGNATURE',
});

interface ResumeCheckInModalProps {
    draft: OpenDraftVisit;
    /** Wizyta zatwierdzona — przyjęcie domknięte. */
    onConfirmed: (visitId: string, options: { sendVisitCard: boolean }) => void;
    /** Wizyta anulowana — szkicu już nie ma. */
    onCancelled: () => void;
    /** Użytkownik znów odkłada przyjęcie; szkic zostaje w kolejce. */
    onLeaveForLater: () => void;
}

export const ResumeCheckInModal = ({
    draft,
    onConfirmed,
    onCancelled,
    onLeaveForLater,
}: ResumeCheckInModalProps) => {
    const { data: protocols, isPending } = useQuery({
        queryKey: ['visit-protocols', draft.visitId],
        queryFn: () => protocolsApi.getVisitProtocols(draft.visitId),
    });

    return (
        <SigningRequirementModal
            isOpen
            isCreating={isPending}
            visitId={draft.visitId}
            visitNumber={draft.visitNumber}
            customerName={draft.customerName ?? ''}
            customerPhone={draft.customerPhone}
            customerEmail={draft.customerEmail}
            protocols={(protocols ?? []).map(toProtocolResponse)}
            signedProtocolIds={(protocols ?? []).filter(p => p.isSigned).map(p => p.id)}
            hasPhotos={draft.hasPhotos}
            hasDamageMap={draft.hasDamageMap}
            onConfirm={({ sendVisitCard }) => onConfirmed(draft.visitId, { sendVisitCard })}
            onCancel={onCancelled}
            onLeaveForLater={onLeaveForLater}
        />
    );
};
