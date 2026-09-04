import { useCapability } from '@/modules/subscription';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Printer, Tablet, MessageSquare, Check, RotateCw } from 'lucide-react';
import { protocolsApi } from '@/modules/protocols/api/protocolsApi';
import { DocumentPreview } from '@/modules/checkin/components/DocumentPreview';
import { useProtocolSigning } from '@/modules/checkin/hooks/useProtocolSigning';
import {
    DocumentList,
    DocumentRow,
    DocumentIcon,
    DocumentInfo,
    DocumentName,
    ActionButtons,
    IconButton,
    RetryButton,
    Spinner,
    LoadingContainer,
    EmptyState,
    TabletPickerWrapper,
    TabletPickerDropdown,
    TabletPickerLabel,
    TabletPickerItem,
    SpinningIconWrapper,
} from '@/modules/checkin/components/SigningRequirementModal.styles';
import { Section, SectionLabel } from './HandoverKit';
import { VisualConditionModal } from './VisualConditionModal';
import type { VisitProtocol } from '@/modules/protocols/types';
import type { ProtocolSignatureStatus } from './signatureStep';

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    </svg>
);

interface ProtocolSectionProps {
    visitId: string;
    signerName: string;
    customerPhone?: string | null;
    isOpen: boolean;
    /**
     * Podnosi w górę stan podpisów. Nie sam „podpisano / nie podpisano": ekran
     * wydania musi odróżnić dokument czekający na podpis od studia, które
     * dokumentu wydania w ogóle nie skonfigurowało - w drugim przypadku nie ma
     * czego pomijać i krok podpisu nie może stać się ślepą uliczką.
     */
    onStatusChange: (status: ProtocolSignatureStatus) => void;
}

/**
 * Protokół wydania pojazdu: te same akcje co w „Dokumentacji i Podpisach"
 * przy przyjęciu: podgląd, wydruk, wysyłka na telefon klienta i na tablet,
 * ze statusem podpisu na żywo.
 *
 * Protokoły etapu CHECK_OUT generujemy przy otwarciu ekranu wydania, nic
 * wcześniej ich nie tworzy, a `generate` jest idempotentne (istniejące zwraca
 * bez tworzenia nowych). Gdy studio nie ma skonfigurowanego dokumentu na
 * wydanie, lista jest pusta i mówimy o tym wprost.
 */
export const ProtocolSection = ({
    visitId,
    signerName,
    customerPhone,
    isOpen,
    onStatusChange,
}: ProtocolSectionProps) => {
    const queryClient = useQueryClient();
    const [previewProtocolId, setPreviewProtocolId] = useState<string | null>(null);
    const [tabletPickerProtocolId, setTabletPickerProtocolId] = useState<string | null>(null);
    // Wysyłka do podpisu czeka na odpowiedź o zgodności stanu wizualnego: dokument
    // musi nieść zaznaczenie, zanim klient go zobaczy.
    const [pendingSend, setPendingSend] = useState<
        { protocolId: string; documentName: string; channel: 'tablet'; tabletId: string }
        | { protocolId: string; documentName: string; channel: 'phone' }
        | null
    >(null);
    const tabletPickerRef = useRef<HTMLDivElement>(null);

    const { data: protocols = [], isPending } = useQuery({
        queryKey: ['visit-protocols', visitId],
        queryFn: () => protocolsApi.getVisitProtocols(visitId),
        enabled: isOpen,
    });

    const checkOutProtocols = protocols.filter((protocol: VisitProtocol) => protocol.stage === 'CHECK_OUT');

    // Wygenerowanie brakujących protokołów wydania: raz, po pierwszym pobraniu.
    const generate = useMutation({
        mutationFn: () => protocolsApi.generateVisitProtocols(visitId, 'CHECK_OUT'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visit-protocols', visitId] }),
    });
    const hasRequestedGeneration = useRef(false);

    useEffect(() => {
        if (!isOpen || isPending || hasRequestedGeneration.current) return;
        if (checkOutProtocols.length > 0) return;
        hasRequestedGeneration.current = true;
        generate.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isPending, checkOutProtocols.length]);

    const visualCondition = useMutation({
        mutationFn: ({ protocolId, conditionMatch, remarks }: {
            protocolId: string;
            conditionMatch: boolean;
            remarks: string | null;
        }) => protocolsApi.setVisualCondition(visitId, protocolId, { conditionMatch, remarks }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visit-protocols', visitId] }),
    });

    const signing = useProtocolSigning({
        visitId,
        signerName,
        customerPhone,
        enabled: isOpen,
    });

    const signedCount = checkOutProtocols.filter(
        protocol => protocol.isSigned || signing.byProtocol[protocol.id]?.phase === 'signed'
    ).length;

    const protocolCount = checkOutProtocols.length;
    useEffect(() => {
        onStatusChange({ total: protocolCount, signed: signedCount });
    }, [signedCount, protocolCount, onStatusChange]);

    // Zamknięcie listy tabletów kliknięciem obok
    useEffect(() => {
        if (!tabletPickerProtocolId) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (tabletPickerRef.current && !tabletPickerRef.current.contains(event.target as Node)) {
                setTabletPickerProtocolId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [tabletPickerProtocolId]);

    // Bez imienia i nazwiska podpisującego backend odrzuci prośbę o podpis,
    // a na dokumencie i tak nie ma czego wpisać.
    const canSign = signerName.trim().length > 0;
    const hasTablets = signing.tablets.length > 0 && canSign;

    // Rozstrzygnięcia z backendu: tablet = moduł podpisów; telefon klienta to
    // reguła krzyżowa (podpisy ∧ komunikacja): link do podpisu jedzie SMS-em.
    // Kanały gatujemy OSOBNO: studio z samymi podpisami podpisuje na tablecie,
    // a przy telefonie widzi dokładnie, którego modułu brakuje.
    const sigLocal = useCapability('SIGNATURE_LOCAL');
    const sigRemote = useCapability('SIGNATURE_REMOTE_REQUEST');

    const documentNameOf = (protocolId: string) =>
        checkOutProtocols.find(protocol => protocol.id === protocolId)?.protocolTemplate?.name
        ?? 'Protokół wydania pojazdu';

    const handleTabletClick = (protocolId: string) => {
        if (!sigLocal.enabled) return;
        if (signing.tablets.length === 1) {
            setPendingSend({
                protocolId,
                documentName: documentNameOf(protocolId),
                channel: 'tablet',
                tabletId: signing.tablets[0].tabletId,
            });
        } else if (signing.tablets.length > 1) {
            setTabletPickerProtocolId(prev => (prev === protocolId ? null : protocolId));
        }
    };

    const handlePhoneClick = (protocolId: string) => {
        setPendingSend({ protocolId, documentName: documentNameOf(protocolId), channel: 'phone' });
    };

    /** Najpierw odpowiedź na dokument, dopiero potem prośba o podpis. */
    const confirmVisualCondition = async (conditionMatch: boolean, remarks: string | null) => {
        const send = pendingSend;
        if (!send) return;
        try {
            await visualCondition.mutateAsync({ protocolId: send.protocolId, conditionMatch, remarks });
        } catch {
            // Nieudany zapis nie może skończyć się wysłaniem dokumentu bez zaznaczenia -
            // okno zostaje otwarte, żeby dało się spróbować ponownie.
            return;
        }
        setPendingSend(null);
        if (send.channel === 'tablet') {
            signing.sendToTablet(send.protocolId, send.tabletId);
        } else {
            signing.sendToPhone(send.protocolId);
        }
    };

    const handlePrint = (protocol: VisitProtocol) => {
        if (protocol.filledPdfUrl) window.open(protocol.filledPdfUrl, '_blank');
    };

    const NO_SIGNER = 'Brak dostępu do danych osobowych klienta, nie można wysłać do podpisu';

    const tabletTitle = (protocolId: string, isSigned: boolean): string => {
        const phase = signing.byProtocol[protocolId]?.phase;
        if (isSigned || phase === 'signed') return 'Klient podpisał dokument';
        if (phase === 'waiting') return 'Oczekiwanie na podpis klienta...';
        if (!sigLocal.enabled) return sigLocal.lockReason ?? 'Wymaga modułu Podpisy elektroniczne';
        if (!canSign) return NO_SIGNER;
        if (!hasTablets) return 'Brak sparowanego tabletu';
        if (signing.tablets.length === 1) return `Wyślij na tablet: ${signing.tablets[0].deviceName}`;
        return 'Wybierz tablet do podpisu';
    };

    const phoneTitle = (protocolId: string, isSigned: boolean): string => {
        const phase = signing.byProtocol[protocolId]?.phase;
        if (isSigned || phase === 'signed') return 'Klient podpisał dokument';
        if (phase === 'waiting') return 'Oczekiwanie na podpis klienta...';
        if (!sigRemote.enabled) return sigRemote.lockReason ?? 'Wymaga modułów: Podpisy elektroniczne i Automatyzacja kontaktu';
        if (!canSign) return NO_SIGNER;
        if (!customerPhone) return 'Nie podano numeru klienta';
        return 'Wyślij prośbę na telefon klienta';
    };

    return (
        <Section>
            <SectionLabel>Protokół wydania</SectionLabel>

            {isPending || generate.isPending ? (
                <LoadingContainer>
                    <Spinner />
                    <span>Przygotowuję protokół wydania...</span>
                </LoadingContainer>
            ) : checkOutProtocols.length === 0 ? (
                <EmptyState>
                    Brak dokumentu wymaganego przy wydaniu. Dodaj go w Ustawieniach, w sekcji
                    dokumentów dla etapu „Wydanie pojazdu".
                </EmptyState>
            ) : (
                <DocumentList>
                    {checkOutProtocols.map(protocol => {
                        const state = signing.byProtocol[protocol.id];
                        const phase = state?.phase;
                        const smsChannel = state?.channel === 'sms';
                        const isSending = phase === 'sending';
                        const isWaiting = phase === 'waiting';
                        const isSigned = protocol.isSigned || phase === 'signed';
                        const needsRetry = phase === 'failed' || phase === 'declined';
                        const isPickerOpen = tabletPickerProtocolId === protocol.id;
                        const busy = isSending || isWaiting || isSigned;

                        return (
                            <DocumentRow key={protocol.id}>
                                <DocumentIcon>
                                    <FileIcon />
                                </DocumentIcon>

                                <DocumentInfo>
                                    <DocumentName>
                                        {protocol.protocolTemplate?.name || 'Protokół wydania pojazdu'}
                                    </DocumentName>
                                </DocumentInfo>

                                <ActionButtons>
                                    <IconButton
                                        onClick={() => setPreviewProtocolId(protocol.id)}
                                        title="Podgląd"
                                    >
                                        <Eye />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handlePrint(protocol)}
                                        title="Drukuj"
                                        disabled={!protocol.filledPdfUrl}
                                    >
                                        <Printer />
                                    </IconButton>

                                    {!needsRetry && (
                                        // span niesie tooltip: wyłączony przycisk połyka hover
                                        <span
                                            title={phoneTitle(protocol.id, isSigned)}
                                            style={{ display: 'inline-flex' }}
                                        >
                                            <IconButton
                                                onClick={() => handlePhoneClick(protocol.id)}
                                                disabled={!customerPhone || !canSign || busy || !sigRemote.enabled}
                                                $success={isSigned}
                                                aria-label="Wyślij prośbę na telefon klienta"
                                            >
                                                {smsChannel && (isSending || isWaiting) ? (
                                                    <SpinningIconWrapper>
                                                        <RotateCw />
                                                    </SpinningIconWrapper>
                                                ) : isSigned ? (
                                                    <Check />
                                                ) : (
                                                    <MessageSquare />
                                                )}
                                            </IconButton>
                                        </span>
                                    )}

                                    <TabletPickerWrapper ref={isPickerOpen ? tabletPickerRef : undefined}>
                                        {needsRetry ? (
                                            <RetryButton
                                                onClick={() =>
                                                    smsChannel
                                                        ? handlePhoneClick(protocol.id)
                                                        : handleTabletClick(protocol.id)
                                                }
                                                title={
                                                    smsChannel
                                                        ? phoneTitle(protocol.id, isSigned)
                                                        : tabletTitle(protocol.id, isSigned)
                                                }
                                                disabled={
                                                    !canSign ||
                                                    (smsChannel
                                                        ? !customerPhone || !sigRemote.enabled
                                                        : !hasTablets || !sigLocal.enabled)
                                                }
                                            >
                                                Ponów
                                            </RetryButton>
                                        ) : (
                                            <IconButton
                                                onClick={() => handleTabletClick(protocol.id)}
                                                title={tabletTitle(protocol.id, isSigned)}
                                                disabled={!hasTablets || busy || !sigLocal.enabled}
                                                $active={isPickerOpen}
                                                $success={isSigned}
                                                aria-label="Wyślij na tablet"
                                            >
                                                {!smsChannel && (isSending || isWaiting) ? (
                                                    <SpinningIconWrapper>
                                                        <RotateCw />
                                                    </SpinningIconWrapper>
                                                ) : isSigned ? (
                                                    <Check />
                                                ) : (
                                                    <Tablet />
                                                )}
                                            </IconButton>
                                        )}

                                        {isPickerOpen && signing.tablets.length > 1 && (
                                            <TabletPickerDropdown>
                                                <TabletPickerLabel>Wybierz tablet</TabletPickerLabel>
                                                {signing.tablets.map(tablet => (
                                                    <TabletPickerItem
                                                        key={tablet.tabletId}
                                                        onClick={() => {
                                                            setTabletPickerProtocolId(null);
                                                            setPendingSend({
                                                                protocolId: protocol.id,
                                                                documentName: documentNameOf(protocol.id),
                                                                channel: 'tablet',
                                                                tabletId: tablet.tabletId,
                                                            });
                                                        }}
                                                    >
                                                        <Tablet />
                                                        {tablet.deviceName}
                                                    </TabletPickerItem>
                                                ))}
                                            </TabletPickerDropdown>
                                        )}
                                    </TabletPickerWrapper>
                                </ActionButtons>
                            </DocumentRow>
                        );
                    })}
                </DocumentList>
            )}

            {pendingSend && (
                <VisualConditionModal
                    documentName={pendingSend.documentName}
                    isSaving={visualCondition.isPending}
                    onCancel={() => setPendingSend(null)}
                    onConfirm={confirmVisualCondition}
                />
            )}

            {previewProtocolId && (
                <DocumentPreview
                    isOpen
                    onClose={() => setPreviewProtocolId(null)}
                    visitId={visitId}
                    protocolId={previewProtocolId}
                />
            )}
        </Section>
    );
};
