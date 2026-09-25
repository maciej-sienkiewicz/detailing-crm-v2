import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
import { Button, StepPills } from '@/common/components/ui';
import { isPiiMasked, joinPiiName } from '@/common/pii';
import { useHandover } from '../../hooks/useHandover';
import { useVisitComments } from '../../hooks';
import { CustomerNotesSection } from './CustomerNotesSection';
import { SettlementSection } from './SettlementSection';
import { FinanceUpsellPanel } from './FinanceUpsellPanel';
import { ProtocolSection } from './ProtocolSection';
import { ThankYouSmsSection } from './ThankYouSmsSection';
import { advanceLabel, allProtocolsSigned, type ProtocolSignatureStatus } from './signatureStep';
import { HandoverResultView } from './HandoverResultView';
import { defaultThankYouSendAt } from './thankYouSms';
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

    const vehicleLabel = [
        [visit.vehicle.brand, visit.vehicle.model].filter(Boolean).join(' '),
        visit.vehicle.licensePlate,
    ].filter(Boolean).join(', ');
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

    // Potwierdzenie na ekranie „Pojazd wydany": SMS-a z podziękowaniem NIE da się
    // zaplanować po zakończeniu wizyty (jedzie w payloadzie `complete`), więc sama
    // decyzja zapada w kroku 1. Tu odtwarzamy termin tą samą regułą, którą backend
    // zastosuje u siebie, żeby na wyniku pokazać, kiedy podziękowanie wyjdzie.
    const thankYouAt =
        handover.thankYouSms.available && handover.state.thankYouSms
            ? defaultThankYouSendAt()
            : null;

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wydanie pojazdu</ModalTitle>
                    {/* Auto i klient zwykłym zdaniem, bez kropek jako kleju (CLAUDE.md §4). */}
                    <ModalSubtitle>
                        {[vehicleLabel, customerLabel].filter(Boolean).join(', ')}
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
                        thankYouAt={thankYouAt}
                        onClose={onClose}
                    />
                ) : (
                    <Body>
                        <StepPills
                            label="Etapy wydania"
                            steps={[
                                { key: 'signature', label: 'Podpis protokołu', state: isSignatureStep ? 'active' : signatureDone ? 'done' : 'todo' },
                                { key: 'payment', label: 'Rozliczenie', state: isSignatureStep ? 'todo' : 'active' },
                            ]}
                        />

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
                                {/* Podziękowanie to kontakt z klientem, nie rozliczenie: stoi
                                    przy kliencie (krok 1), a nie w środku pieniędzy. Decyzja
                                    musi zapaść przed „Wydaj pojazd", bo termin jedzie w
                                    payloadzie zakończenia wizyty; na ekranie wyniku zostaje
                                    już tylko potwierdzenie, kiedy SMS wyjdzie.
                                    Studio z wyłączonym szablonem „Podziękowanie po wizycie"
                                    nie zobaczy tu nic: nie ma czego zaplanować. */}
                                {handover.thankYouSms.available && (
                                    <ThankYouSmsSection
                                        enabled={handover.state.thankYouSms}
                                        onEnabledChange={value => handover.patch({ thankYouSms: value })}
                                    />
                                )}
                            </Body>
                        </StepPane>

                        <StepPane $active={!isSignatureStep}>
                            <Body>
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
                            </Body>
                        </StepPane>
                    </Body>
                )}
            </ModalContent>

            {!handover.result && (
                <HandoverFooter>
                    {isSignatureStep ? (
                        <>
                            <span />
                            <Button variant="primary" size="lg" onClick={() => setStep('payment')}>
                                {advanceLabel(signatureStatus)}<ArrowRight />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="lg"
                                disabled={handover.isSubmitting}
                                onClick={() => setStep('signature')}
                            >
                                <ArrowLeft />Wstecz
                            </Button>
                            {/* Zieleń: wydanie domyka wizytę - ten sam kolor co w nagłówku wizyty. */}
                            <Button
                                variant="success"
                                size="lg"
                                disabled={!handover.canSubmit}
                                onClick={() => handover.submit()}
                            >
                                <Check />
                                {/* Jedna etykieta dla każdej ścieżki: co stanie się z dokumentem
                                    (faktura, paragon, brak) mówi sekcja rozliczenia nad przyciskiem -
                                    etykieta, która to powtarzała, zmieniała się w trakcie klikania
                                    i wydłużała przycisk. */}
                                {handover.isSubmitting ? 'Wydawanie...' : 'Wydaj pojazd'}
                            </Button>
                        </>
                    )}
                </HandoverFooter>
            )}
        </ModalShell>
    );
};
