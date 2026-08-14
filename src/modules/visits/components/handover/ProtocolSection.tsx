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
import type { VisitProtocol } from '@/modules/protocols/types';

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
    /** Podnosi w górę informację, czy którykolwiek protokół został podpisany. */
    onSignedChange: (signed: boolean) => void;
}

/**
 * Protokół wydania pojazdu — te same akcje co w „Dokumentacji i Podpisach"
 * przy przyjęciu: podgląd, wydruk, wysyłka na telefon klienta i na tablet,
 * ze statusem podpisu na żywo.
 *
 * Protokoły etapu CHECK_OUT generujemy przy otwarciu ekranu wydania — nic
 * wcześniej ich nie tworzy, a `generate` jest idempotentne (istniejące zwraca
 * bez tworzenia nowych). Gdy studio nie ma skonfigurowanego dokumentu na
 * wydanie, lista jest pusta i mówimy o tym wprost.
 */
export const ProtocolSection = ({
    visitId,
    signerName,
    customerPhone,
    isOpen,
    onSignedChange,
}: ProtocolSectionProps) => {
    const queryClient = useQueryClient();
    const [previewProtocolId, setPreviewProtocolId] = useState<string | null>(null);
    const [tabletPickerProtocolId, setTabletPickerProtocolId] = useState<string | null>(null);
    const tabletPickerRef = useRef<HTMLDivElement>(null);

    const { data: protocols = [], isPending } = useQuery({
        queryKey: ['visit-protocols', visitId],
        queryFn: () => protocolsApi.getVisitProtocols(visitId),
        enabled: isOpen,
    });

    const checkOutProtocols = protocols.filter((protocol: VisitProtocol) => protocol.stage === 'CHECK_OUT');

    // Wygenerowanie brakujących protokołów wydania — raz, po pierwszym pobraniu.
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

    const signing = useProtocolSigning({
        visitId,
        signerName,
        customerPhone,
        enabled: isOpen,
    });

    const signedCount = checkOutProtocols.filter(
        protocol => protocol.isSigned || signing.byProtocol[protocol.id]?.phase === 'signed'
    ).length;

    useEffect(() => {
        onSignedChange(checkOutProtocols.length > 0 && signedCount === checkOutProtocols.length);
    }, [signedCount, checkOutProtocols.length, onSignedChange]);

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

    const handleTabletClick = (protocolId: string) => {
        if (signing.tablets.length === 1) {
            signing.sendToTablet(protocolId, signing.tablets[0].tabletId);
        } else if (signing.tablets.length > 1) {
            setTabletPickerProtocolId(prev => (prev === protocolId ? null : protocolId));
        }
    };

    const handlePrint = (protocol: VisitProtocol) => {
        if (protocol.filledPdfUrl) window.open(protocol.filledPdfUrl, '_blank');
    };

    const NO_SIGNER = 'Brak dostępu do danych osobowych klienta — nie można wysłać do podpisu';

    const tabletTitle = (protocolId: string, isSigned: boolean): string => {
        const phase = signing.byProtocol[protocolId]?.phase;
        if (isSigned || phase === 'signed') return 'Klient podpisał dokument';
        if (phase === 'waiting') return 'Oczekiwanie na podpis klienta…';
        if (!canSign) return NO_SIGNER;
        if (!hasTablets) return 'Brak sparowanego tabletu';
        if (signing.tablets.length === 1) return `Wyślij na tablet: ${signing.tablets[0].deviceName}`;
        return 'Wybierz tablet do podpisu';
    };

    const phoneTitle = (protocolId: string, isSigned: boolean): string => {
        const phase = signing.byProtocol[protocolId]?.phase;
        if (isSigned || phase === 'signed') return 'Klient podpisał dokument';
        if (phase === 'waiting') return 'Oczekiwanie na podpis klienta…';
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
                    <span>Przygotowuję protokół wydania…</span>
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
                                        // span niesie tooltip — wyłączony przycisk połyka hover
                                        <span
                                            title={phoneTitle(protocol.id, isSigned)}
                                            style={{ display: 'inline-flex' }}
                                        >
                                            <IconButton
                                                onClick={() => signing.sendToPhone(protocol.id)}
                                                disabled={!customerPhone || !canSign || busy}
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
                                                        ? signing.sendToPhone(protocol.id)
                                                        : handleTabletClick(protocol.id)
                                                }
                                                title={
                                                    smsChannel
                                                        ? phoneTitle(protocol.id, isSigned)
                                                        : tabletTitle(protocol.id, isSigned)
                                                }
                                                disabled={
                                                    !canSign || (smsChannel ? !customerPhone : !hasTablets)
                                                }
                                            >
                                                Ponów
                                            </RetryButton>
                                        ) : (
                                            <IconButton
                                                onClick={() => handleTabletClick(protocol.id)}
                                                title={tabletTitle(protocol.id, isSigned)}
                                                disabled={!hasTablets || busy}
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
                                                            signing.sendToTablet(protocol.id, tablet.tabletId);
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
