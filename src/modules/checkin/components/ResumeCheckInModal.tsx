import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolsApi } from '@/modules/protocols/api/protocolsApi';
import type { VisitProtocol } from '@/modules/protocols/types';
import { SigningRequirementModal } from './SigningRequirementModal';
import { checkinErrorMessage, DOCUMENTS_ERROR_TEXTS } from '../utils/checkinErrorMessage';
import type { ProtocolResponse } from '../types';
import type { OpenDraftVisit } from '@/modules/visits/types';

/*
 * Dokończenie przerwanego przyjęcia pojazdu.
 *
 * Wizyta i jej protokoły już istnieją - brakuje wyłącznie ostatniego kroku, tego samego,
 * którym kończy się kreator: podpisów i zatwierdzenia. Dlatego wznowienie NIE wraca do
 * kreatora (dane przyjęcia są już zapisane i formularza nie ma z czego odtworzyć), tylko
 * otwiera dokładnie to okno, w którym przyjęcie zostało porzucone.
 *
 * Protokoły dociągamy z serwera, bo tylko on wie, co zostało w międzyczasie podpisane -
 * np. na tablecie już po zamknięciu okna.
 */

/** Kształt z `/v1/visits/{id}/protocols` sprowadzony do tego, czego potrzebuje okno. */
const toProtocolResponse = (protocol: VisitProtocol): ProtocolResponse => ({
    id: protocol.id,
    templateId: protocol.protocolTemplateId ?? null,
    templateName: protocol.protocolTemplate?.name ?? 'Protokół',
    stage: protocol.stage === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
    status: protocol.filledPdfUrl ? 'READY_FOR_SIGNATURE' : 'PENDING',
    // Bez adresu pliku „Drukuj" przy wznowionym przyjęciu było zawsze wyłączone.
    filledPdfUrl: protocol.filledPdfUrl,
});

/**
 * Dokument przyjęcia, którego plik nie powstał: zapis szkicu albo poprawka usług przerwała
 * się przed wypełnieniem PDF-u (np. błąd serwera po „Wróć do formularza"). Odpowiedź tego
 * endpointu nie niesie statusu, więc PENDING rozpoznajemy po braku pliku u niepodpisanego
 * dokumentu. Uwaga: bez dostępu do danych osobowych serwer nie wydaje adresu pliku - wtedy
 * wygenerowanie jest wywoływane bez potrzeby, ale backend robi je idempotentnie, a my raz.
 */
const isUnfilled = (protocol: VisitProtocol): boolean =>
    protocol.stage !== 'CHECK_OUT' && !protocol.isSigned && !protocol.filledPdfUrl;

/**
 * Tyle wystarczy, żeby wrócić do dokumentów szkicu. Węższe niż [OpenDraftVisit], bo kreator
 * otwiera to okno także po nieudanej poprawce usług, gdzie listy nieukończonych przyjęć nie
 * ma pod ręką - a zmyślanie daty założenia czy pracownika tylko po to, żeby pasował typ,
 * byłoby gorsze niż ich brak.
 */
export type ResumableDraft = Pick<
    OpenDraftVisit,
    'visitId' | 'visitNumber' | 'customerName' | 'customerPhone' | 'customerEmail' | 'hasPhotos' | 'hasDamageMap'
>;

interface ResumeCheckInModalProps {
    draft: ResumableDraft;
    /** Przyjęcie z rezerwacji (true) albo walk-in (false); nieznane z listy - patrz [AbandonCheckInDialog]. */
    fromReservation?: boolean;
    /** Wizyta zatwierdzona - przyjęcie domknięte. */
    onConfirmed: (visitId: string, options: { sendVisitCard: boolean }) => void;
    /** Wizyta anulowana - szkicu już nie ma. */
    onCancelled: () => void;
    /**
     * Zamknięcie bez zmian - opcjonalne, bo sensowne tylko w jednym z dwóch miejsc,
     * z których to okno się otwiera.
     *
     * Z listy „Nieukończone przyjęcia": szkic już tam jest, więc zamknięcie okna
     * niczego nie psuje ani nie ukrywa - przekazujemy powrót do listy.
     *
     * Z kreatora przyjęcia (po napotkaniu trwającego przyjęcia tej rezerwacji):
     * nie przekazujemy niczego. Wyjście bez decyzji zostawiłoby auto przyjęte,
     * a wizytę nierozpoczętą - czyli dokładnie ten stan, którego to okno pilnuje.
     */
    onLeaveForLater?: () => void;
    /**
     * „Wróć do formularza" - tylko z kreatora, gdy formularz jest TEGO szkicu (po nieudanej
     * poprawce usług). Szkic zostaje, kreator pokazuje formularz z usługami.
     */
    onBackToForm?: () => void;
}

export const ResumeCheckInModal = ({
    draft,
    fromReservation,
    onConfirmed,
    onCancelled,
    onLeaveForLater,
    onBackToForm,
}: ResumeCheckInModalProps) => {
    const queryClient = useQueryClient();
    const queryKey = ['visit-protocols', draft.visitId];

    const { data: protocols, isPending, isError, error, refetch, isRefetching } = useQuery({
        queryKey,
        queryFn: () => protocolsApi.getVisitProtocols(draft.visitId),
    });

    /*
     * Pusta lista albo dokument bez pliku to nie „wizyta nie wymaga protokołów": zapis
     * szkicu albo poprawka usług mogły przerwać się przed wygenerowaniem dokumentów. Dawniej
     * okno mówiło wtedy „Ta wizyta nie wymaga protokołów." i pozwalało zatwierdzić wizytę
     * bez żadnego podpisu. Generujemy RAZ (backend robi to idempotentnie i uzupełnia
     * niewypełnione) i dopiero wynik rozstrzyga - jak przy dokumentach wydania (ProtocolSection).
     */
    const generate = useMutation({
        mutationFn: () => protocolsApi.generateVisitProtocols(draft.visitId, 'CHECK_IN'),
        // Odpowiedź to pełna lista dokumentów przyjęcia - bez drugiego zapytania.
        onSuccess: generated => queryClient.setQueryData<VisitProtocol[]>(queryKey, previous => [
            ...(previous ?? []).filter(protocol => protocol.stage === 'CHECK_OUT'),
            ...generated,
        ]),
    });
    const generationRequested = useRef(false);
    const needsGeneration = protocols !== undefined && (protocols.length === 0 || protocols.some(isUnfilled));

    useEffect(() => {
        if (!needsGeneration || generationRequested.current) return;
        generationRequested.current = true;
        generate.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsGeneration]);

    // „Nie wymaga protokołów" wolno powiedzieć dopiero po próbie wygenerowania.
    const awaitingGeneration = needsGeneration && (generate.isIdle || generate.isPending);

    const protocolsError = isError
        ? {
            title: 'Nie udało się wczytać dokumentów',
            message: checkinErrorMessage(error, DOCUMENTS_ERROR_TEXTS),
            onRetry: () => { void refetch(); },
            isRetrying: isRefetching,
        }
        : generate.isError
            ? {
                title: 'Nie udało się przygotować dokumentów',
                message: checkinErrorMessage(generate.error, DOCUMENTS_ERROR_TEXTS),
                onRetry: () => generate.mutate(),
                isRetrying: generate.isPending,
            }
            : undefined;

    const shown = isError ? [] : (protocols ?? []);

    return (
        <SigningRequirementModal
            isOpen
            isCreating={(isPending && !isError) || awaitingGeneration}
            visitId={draft.visitId}
            visitNumber={draft.visitNumber}
            customerName={draft.customerName ?? ''}
            customerPhone={draft.customerPhone}
            customerEmail={draft.customerEmail}
            protocols={shown.map(toProtocolResponse)}
            signedProtocolIds={shown.filter(p => p.isSigned).map(p => p.id)}
            hasPhotos={draft.hasPhotos}
            hasDamageMap={draft.hasDamageMap}
            protocolsError={protocolsError}
            fromReservation={fromReservation}
            onConfirm={({ sendVisitCard }) => onConfirmed(draft.visitId, { sendVisitCard })}
            onCancel={onCancelled}
            onLeaveForLater={onLeaveForLater}
            onBackToForm={onBackToForm}
        />
    );
};
