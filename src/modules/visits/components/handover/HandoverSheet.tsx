import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, PenLine, Wallet } from 'lucide-react';
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
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useHandover } from '../../hooks/useHandover';
import { useVisitComments } from '../../hooks';
import { CustomerNotesSection } from './CustomerNotesSection';
import { SettlementSection } from './SettlementSection';
import { FinanceUpsellPanel } from './FinanceUpsellPanel';
import { ProtocolSection } from './ProtocolSection';
import { advanceLabel, allProtocolsSigned, type ProtocolSignatureStatus } from './signatureStep';
import { HandoverResultView } from './HandoverResultView';
import type { Visit } from '../../types';

type Step = 'signature' | 'payment';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

/**
 * Krok nieaktywny jest CHOWANY, nie odmontowywany.
 *
 * Podpis chodzi po tablecie albo po telefonie klienta i jego stan dojeżdża
 * dopiero po chwili - odmontowanie kroku podpisu przy przejściu do płatności
 * ucinałoby nasłuch i wizyta zapisałaby się jako niepodpisana, mimo że klient
 * właśnie złożył podpis. Chowanie kosztuje jeden węzeł w DOM i nic więcej.
 */
const StepPane = styled.div<{ $active: boolean }>`
    display: ${p => (p.$active ? 'block' : 'none')};
`;

const Steps = styled.ol`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
    padding: 0;
    list-style: none;
`;

const StepChip = styled.li<{ $state: 'active' | 'done' | 'todo' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;

    svg { width: 13px; height: 13px; }

    ${p => {
        if (p.$state === 'active') {
            return `background: ${st.accentBlue}; color: #fff;`;
        }
        if (p.$state === 'done') {
            return `background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;`;
        }
        return `background: ${st.bgCard}; color: ${st.textMuted}; border: 1px solid ${st.border};`;
    }}
`;

const StepArrow = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
`;

const HandoverFooter = styled(ModalFooter)`
    justify-content: space-between;
    gap: 12px;

    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

interface HandoverSheetProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Wydanie pojazdu w dwóch krokach: najpierw podpis protokołu, potem rozliczenie.
 *
 * Kolejność odwzorowuje to, co dzieje się przy ladzie: klient ogląda pojazd i
 * podpisuje protokół wydania, a dopiero potem płaci i dostaje dokument. Gdy
 * jedno okno niosło i opłatę, i protokół na dole, płatność była pierwsza na
 * ekranie i pierwsza w kolejności klikania, a podpis - tym, o czym się
 * przypominało po fakcie.
 *
 * Oba kroki żyją w jednym oknie i jednym stanie [useHandover]: „Wstecz" wraca do
 * podpisu bez gubienia wybranej formy zapłaty i pozycji faktury. Po zapisie okno
 * nie znika - pokazuje potwierdzenie z numerem dokumentu i akcjami naprawczymi,
 * gdy KSeF odrzucił fakturę.
 */
export const HandoverSheet = ({ visit, isOpen, onClose }: HandoverSheetProps) => {
    const handover = useHandover({ visit, isOpen });
    const { comments } = useVisitComments(visit.id);
    const customerComments = comments.filter(c => c.type === 'FOR_CUSTOMER' && !c.isDeleted);

    // Każde wydanie zaczyna się od podpisu. Resetu przy zamknięciu nie ma i nie
    // trzeba: VisitDetailView zdejmuje to okno z drzewa (transitionType → null),
    // więc krok znika razem z nim - na tym samym założeniu stoi useHandover,
    // który odtwarza draft w inicjalizatorze stanu.
    const [step, setStep] = useState<Step>('signature');
    const [signatureStatus, setSignatureStatus] = useState<ProtocolSignatureStatus>({ total: 0, signed: 0 });

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
    const handleSignatureStatus = useCallback(
        (status: ProtocolSignatureStatus) => {
            setSignatureStatus(status);
            patch({ protocolSigned: allProtocolsSigned(status) });
        },
        [patch]
    );

    const isSignatureStep = step === 'signature';
    const signatureDone = allProtocolsSigned(signatureStatus);

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
                        <Steps>
                            <StepChip $state={isSignatureStep ? 'active' : signatureDone ? 'done' : 'todo'}>
                                <PenLine /> 1. Podpis protokołu
                            </StepChip>
                            <StepArrow aria-hidden="true">→</StepArrow>
                            <StepChip $state={isSignatureStep ? 'todo' : 'active'}>
                                <Wallet /> 2. Rozliczenie
                            </StepChip>
                        </Steps>

                        <StepPane $active={isSignatureStep}>
                            <Body>
                                <CustomerNotesSection comments={customerComments} />
                                <ProtocolSection
                                    visitId={visit.id}
                                    signerName={signerName}
                                    customerPhone={visit.customer.phone}
                                    isOpen={isOpen}
                                    onStatusChange={handleSignatureStatus}
                                />
                            </Body>
                        </StepPane>

                        <StepPane $active={!isSignatureStep}>
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
                                    canChooseSendToKsef={handover.canChooseSendToKsef}
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
                        </StepPane>
                    </Body>
                )}
            </ModalContent>

            {!handover.result && (
                <HandoverFooter>
                    {isSignatureStep ? (
                        <>
                            <span />
                            <SharedButton
                                $variant="primary"
                                type="button"
                                onClick={() => setStep('payment')}
                            >
                                {advanceLabel(signatureStatus)}
                            </SharedButton>
                        </>
                    ) : (
                        <>
                            <SharedButton
                                $variant="secondary"
                                type="button"
                                disabled={handover.isSubmitting}
                                onClick={() => setStep('signature')}
                            >
                                <ArrowLeft size={15} /> Wstecz
                            </SharedButton>
                            <SharedButton
                                $variant="primary"
                                type="button"
                                disabled={!handover.canSubmit}
                                onClick={() => handover.submit()}
                            >
                                {/* Jedna etykieta dla każdej ścieżki: co stanie się z dokumentem
                                    (faktura, paragon, brak) mówi sekcja rozliczenia nad przyciskiem -
                                    etykieta, która to powtarzała, zmieniała się w trakcie klikania
                                    i wydłużała przycisk. */}
                                {handover.isSubmitting ? 'Wydawanie...' : 'Wydaj pojazd'}
                            </SharedButton>
                        </>
                    )}
                </HandoverFooter>
            )}
        </ModalShell>
    );
};
