import { useCallback } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { isPiiMasked, joinPiiName } from '@/common/pii';
import { useHandover } from '../../hooks/useHandover';
import { useVisitComments } from '../../hooks';
import { CustomerNotesSection } from './CustomerNotesSection';
import { SettlementSection } from './SettlementSection';
import { FinanceUpsellPanel } from './FinanceUpsellPanel';
import { ProtocolSection } from './ProtocolSection';
import { HandoverResultView } from './HandoverResultView';
import type { Visit } from '../../types';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const HandoverFooter = styled(ModalFooter)`
    justify-content: flex-end;

    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

const submitLabel = (documentType: string, isFreeVisit: boolean, canIssueDocuments: boolean): string => {
    if (isFreeVisit) return 'Wydaj pojazd';
    if (!canIssueDocuments) return 'Wydaj pojazd bez faktury';
    if (documentType === 'INVOICE') return 'Wydaj pojazd i wystaw fakturę';
    if (documentType === 'RECEIPT') return 'Wydaj pojazd i wystaw paragon';
    return 'Wydaj pojazd';
};

interface HandoverSheetProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Wydanie pojazdu: jeden ekran zamiast trzystopniowego kreatora.
 *
 * Wszystkie decyzje mają domyślne odpowiedzi (forma zapłaty, dokument, nabywca
 * z kartoteki), więc typowe wydanie to jedno kliknięcie w stopce. Szczegóły
 * (nabywca i pozycje faktury) są zwinięte i edytowalne w tym samym oknie;
 * nie ma tu już modala nad modalem.
 *
 * Po zapisie okno nie znika: pokazuje potwierdzenie z numerem dokumentu
 * i akcjami naprawczymi, gdy KSeF odrzucił fakturę.
 */
export const HandoverSheet = ({ visit, isOpen, onClose }: HandoverSheetProps) => {
    const handover = useHandover({ visit, isOpen });
    const { comments } = useVisitComments(visit.id);
    const customerComments = comments.filter(c => c.type === 'FOR_CUSTOMER' && !c.isDeleted);

    const vehicleLabel = [visit.vehicle.brand, visit.vehicle.model, visit.vehicle.licensePlate]
        .filter(Boolean)
        .join(' · ');
    const customerLabel = `${visit.customer.firstName} ${visit.customer.lastName}`.trim();

    // Imię i nazwisko trafia na protokół jako podpisujący. Bez uprawnienia do
    // danych osobowych dostajemy z backendu maskę: pusta wartość wyłącza
    // wysyłkę do podpisu, zamiast wpisać „***" na dokument.
    const signerName = isPiiMasked(joinPiiName(visit.customer.firstName, visit.customer.lastName))
        ? ''
        : customerLabel;

    // Zamknięcie w trakcie zapisu zostawiłoby użytkownika bez informacji, czy
    // wizyta została zakończona, więc blokujemy do czasu odpowiedzi serwera.
    const handleClose = () => {
        if (handover.isSubmitting) return;
        onClose();
    };

    // `signatureObtained` w payloadzie odzwierciedla realny stan podpisu
    // protokołu, a nie (jak w starym kreatorze) twardą wartość `true`.
    const { patch } = handover;
    const handleSignedChange = useCallback(
        (protocolSigned: boolean) => patch({ protocolSigned }),
        [patch]
    );

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wydanie pojazdu</ModalTitle>
                    <ModalSubtitle>
                        {[vehicleLabel, customerLabel, `Wizyta ${visit.visitNumber}`]
                            .filter(Boolean)
                            .join(' · ')}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                {handover.result ? (
                    <HandoverResultView
                        result={handover.result}
                        grossAmount={handover.totals.gross}
                        currency={handover.currency}
                        onClose={onClose}
                    />
                ) : (
                    <Body>
                        <CustomerNotesSection comments={customerComments} />

                        {handover.canIssueDocuments ? (
                            <SettlementSection
                                state={handover.state}
                                patch={handover.patch}
                                totals={handover.totals}
                                currency={handover.currency}
                                isFreeVisit={handover.isFreeVisit}
                                invoiceGross={handover.invoiceGross}
                                remainder={handover.remainder}
                                sellerComplete={handover.sellerComplete}
                                company={handover.company}
                                problemsIn={handover.problemsIn}
                                ksef={handover.ksef}
                                sendToKsef={handover.sendToKsef}
                                onSendToKsefChange={handover.setSendToKsef}
                            />
                        ) : (
                            // Moment wysokiej intencji: zamiast sekcji rozliczenia,
                            // propozycja modułu finansowego, z zachowaną ścieżką
                            // „wydaj pojazd bez faktury" (operacja rdzeniowa BASIC).
                            !handover.isFreeVisit && (
                                <FinanceUpsellPanel
                                    grossAmount={handover.totals.gross}
                                    currency={handover.currency}
                                />
                            )
                        )}

                        <ProtocolSection
                            visitId={visit.id}
                            signerName={signerName}
                            customerPhone={visit.customer.phone}
                            isOpen={isOpen}
                            onSignedChange={handleSignedChange}
                        />
                    </Body>
                )}
            </ModalContent>

            {!handover.result && (
                <HandoverFooter>
                    <SharedButton
                        $variant="primary"
                        type="button"
                        disabled={!handover.canSubmit}
                        onClick={() => handover.submit()}
                    >
                        {handover.isSubmitting
                            ? 'Wydawanie...'
                            : submitLabel(
                                handover.state.documentType,
                                handover.isFreeVisit,
                                handover.canIssueDocuments
                            )}
                    </SharedButton>
                </HandoverFooter>
            )}
        </ModalShell>
    );
};
