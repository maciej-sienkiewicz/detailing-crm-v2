import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Eye, FileCheck2 } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    CloseBtn,
} from '@/common/components/ModalKit';
import { Button, ui } from '@/common/components/ui';
import { formatCurrency } from '@/common/utils';
import { isPiiMasked, joinPiiName } from '@/common/pii';
import { usePermissions } from '@/core/permissions';
import { defaultDueDate, useHandover } from '../../hooks/useHandover';
import { useVisitComments } from '../../hooks';
import { CustomerNotesSection } from './CustomerNotesSection';
import {
    ActionIcon, ActionText, FooterActions, PrimaryAction, SettlementFooter, SettlementGrid,
} from './HandoverKit';
import { SettlementSection } from './SettlementSection';
import { SettlementSummary } from './SettlementSummary';
import { PricesSection } from './PricesSection';
import { handoverAction } from './handoverAction';
import { paymentMethods } from './paymentOptions';
import { FinanceUpsellPanel } from './FinanceUpsellPanel';
import { ProtocolSection } from './ProtocolSection';
import { ThankYouSmsSection } from './ThankYouSmsSection';
import { advanceLabel, allProtocolsSigned, type ProtocolSignatureStatus } from './signatureStep';
import { HandoverResultView } from './HandoverResultView';
import { InvoicePreviewModal } from './InvoicePreviewModal';
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

const ProtocolNote = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${p => p.theme.colors.textSecondary};
`;

/**
 * Podgląd faktury obok przycisku wydania: ta sama bryła (promień, kafelek ikony,
 * wysokość), ale stonowana - biała z obwódką, żeby zieleń została tylko przy wydaniu.
 */
const PreviewAction = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px 10px 10px;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: ${ui.surface};
    color: ${ui.inkSoft};
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

    &:hover { border-color: ${ui.lineStrong}; color: ${ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const PreviewIcon = styled.span`
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 10px;
    background: ${ui.surfaceAlt};
    color: ${ui.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 18px; height: 18px; }
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
    // Protokoły wydania (pobranie, wygenerowanie, wysyłka do podpisu) to edycja wizyty -
    // VISITS_CREATE. Bez niego sekcja sama generowała protokół i od razu dostawała odmowę.
    const canHandleProtocols = usePermissions().can('VISITS_CREATE');

    // Potwierdzenie na ekranie „Pojazd wydany": SMS-a z podziękowaniem NIE da się
    // zaplanować po zakończeniu wizyty (jedzie w payloadzie `complete`), więc sama
    // decyzja zapada w kroku 1. Tu odtwarzamy termin tą samą regułą, którą backend
    // zastosuje u siebie, żeby na wyniku pokazać, kiedy podziękowanie wyjdzie.
    const thankYouAt =
        handover.thankYouSms.available && handover.thankYouSmsChecked
            ? defaultThankYouSendAt()
            : null;

    const fmt = (grosz: number) => formatCurrency(grosz / 100, handover.currency);
    // Podgląd faktury przy przycisku wydania - ostatnie spojrzenie przed wystawieniem.
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const showInvoicePreview = handover.canIssueDocuments && !handover.isFreeVisit
        && handover.state.documentType === 'INVOICE' && !handover.invoicedExternally;
    const action = handoverAction({
        isFreeVisit: handover.isFreeVisit,
        canIssueDocuments: handover.canIssueDocuments,
        documentType: handover.state.documentType,
        hasOtherDocument: handover.state.splitRemainder && handover.remainder > 0,
        invoicedExternally: handover.invoicedExternally,
        sendToKsef: handover.sendToKsef,
        gross: fmt(handover.payable),
        invoiceGross: fmt(handover.invoiceGross),
        remainder: fmt(handover.remainder),
        buyerName: handover.state.buyer.name,
        paymentLabel: paymentMethods.find(m => m.value === handover.state.paymentMethod)?.label ?? 'Inna metoda',
    });
    // Dwie kolumny tylko tam, gdzie jest co rozliczać; podpis, wizyta bezpłatna i ekran
    // wyniku zostają w węższym oknie.
    const isWide = !handover.result && !isSignatureStep && handover.canIssueDocuments && !handover.isFreeVisit;

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size={isWide ? undefined : 'lg'} maxWidth={isWide ? '1080px' : undefined}>
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
                        paymentLabel={handover.totals.gross > 0 ? paymentMethods.find(m => m.value === handover.state.paymentMethod)?.label : undefined}
                        onClose={onClose}
                    />
                ) : (
                    <Body>
                        {/* Bez paska „1 Podpis protokołu, 2 Rozliczenie”: przy dwóch krokach nie
                            niósł nic, czego nie mówią przycisk kroku 1 („…przejdź do płatności”),
                            „Wstecz do protokołu” i linia „Protokół” w podsumowaniu - a zabierał
                            wiersz nad najważniejszą treścią. */}
                        <StepPane $active={isSignatureStep}>
                            <Body>
                                <CustomerNotesSection comments={customerComments} />
                                {canHandleProtocols ? (
                                    <ProtocolSection
                                        visitId={visit.id}
                                        signerName={signerName}
                                        customerPhone={visit.customer.phone}
                                        isOpen={isOpen}
                                        onStatusChange={handleSignatureStatus}
                                    />
                                ) : (
                                    <ProtocolNote>
                                        Protokół wydania przygotowuje i wysyła do podpisu osoba z prawem do edycji wizyt.
                                        Wydanie możesz zakończyć bez niego.
                                    </ProtocolNote>
                                )}
                                {/* Podziękowanie to kontakt z klientem, nie rozliczenie: stoi
                                    przy kliencie (krok 1), a nie w środku pieniędzy. Decyzja
                                    musi zapaść przed „Wydaj pojazd", bo termin jedzie w
                                    payloadzie zakończenia wizyty; na ekranie wyniku zostaje
                                    już tylko potwierdzenie, kiedy SMS wyjdzie.
                                    Studio z wyłączonym szablonem „Podziękowanie po wizycie"
                                    nie zobaczy tu nic: nie ma czego zaplanować. */}
                                {handover.thankYouSms.available && (
                                    <ThankYouSmsSection
                                        enabled={handover.thankYouSmsChecked}
                                        onEnabledChange={value => handover.patch({ thankYouSms: value })}
                                    />
                                )}
                            </Body>
                        </StepPane>

                        <StepPane $active={!isSignatureStep}>
                            <Body>
                                {handover.canIssueDocuments && !handover.isFreeVisit ? (
                                    <SettlementGrid>
                                        <SettlementSection
                                            state={handover.state}
                                            patch={handover.patch}
                                            currency={handover.currency}
                                            invoiceItems={handover.invoiceItems}
                                            invoiceGross={handover.invoiceGross}
                                            remainder={handover.remainder}
                                            remainderAuto={handover.remainderAuto}
                                            sellerComplete={handover.sellerComplete}
                                            company={handover.company}
                                            problemsIn={handover.problemsIn}
                                            invoicedExternally={handover.invoicedExternally}
                                            controls={{
                                                linesMatch: handover.linesMatch,
                                                restoredAt: handover.restoredAt,
                                                resetLines: handover.resetLines,
                                                setInvoiceOther: handover.setInvoiceOther,
                                                setRemainderInput: handover.setRemainderInput,
                                                changeLine: handover.changeLine,
                                                changeLineRate: handover.changeLineRate,
                                                addLine: handover.addLine,
                                                removeLine: handover.removeLine,
                                                overwriteLines: handover.overwriteLines,
                                                unmerge: handover.unmerge,
                                            }}
                                            priceControls={{
                                                changePrice: handover.changePrice,
                                                resetPrices: handover.resetPrices,
                                                discount: handover.pricesDiscount,
                                                totalGross: handover.pricesGross,
                                            }}
                                        />
                                        <SettlementSummary
                                            state={handover.state}
                                            totals={handover.totals}
                                            originalGross={handover.originalGross}
                                            currency={handover.currency}
                                            invoiceItems={handover.invoiceItems}
                                            invoiceGross={handover.invoiceGross}
                                            remainder={handover.remainder}
                                            payable={handover.payable}
                                            invoicedExternally={handover.invoicedExternally}
                                            sendToKsef={handover.sendToKsef}
                                            ksefBlocked={handover.ksefBlocked}
                                            transferDueDate={handover.transferDueDate}
                                            problems={handover.problems}
                                            onBuyerChange={buyer => handover.patch({ buyer })}
                                        />
                                    </SettlementGrid>
                                ) : handover.isFreeVisit ? (
                                    <ProtocolNote>Wizyta bez opłat. Dokument sprzedaży nie powstanie.</ProtocolNote>
                                ) : (
                                    // Moment wysokiej intencji: zamiast sekcji rozliczenia,
                                    // propozycja modułu finansowego, z zachowaną ścieżką
                                    // „wydaj pojazd bez faktury" (operacja rdzeniowa BASIC).
                                    !handover.isFreeVisit && (
                                        <>
                                            {/* Cenę na końcu zmienia osoba, która wydaje auto - także
                                                bez modułu Finanse: zmiana trafia do wizyty. */}
                                            <PricesSection
                                                prices={handover.state.prices}
                                                onChange={handover.changePrice}
                                                onReset={handover.resetPrices}
                                                discount={handover.handoverDiscount}
                                                totalGross={handover.totals.gross}
                                                problems={handover.problemsIn('prices')}
                                                fmt={fmt}
                                            />
                                            <FinanceUpsellPanel
                                                grossAmount={handover.totals.gross}
                                                currency={handover.currency}
                                            />
                                        </>
                                    )
                                )}
                            </Body>
                        </StepPane>
                    </Body>
                )}
            </ModalContent>

            {!handover.result && (
                <SettlementFooter>
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
                                <ArrowLeft />Wstecz do protokołu
                            </Button>
                            <FooterActions>
                                {showInvoicePreview && (
                                    <PreviewAction type="button" onClick={() => setPreviewOpen(true)}>
                                        <PreviewIcon aria-hidden="true"><Eye /></PreviewIcon>
                                        Podgląd faktury
                                    </PreviewAction>
                                )}
                                <PrimaryAction
                                    type="button"
                                    disabled={!handover.canSubmit}
                                    onClick={() => handover.submit()}
                                >
                                    <ActionIcon aria-hidden="true"><FileCheck2 /></ActionIcon>
                                    <ActionText>
                                        <span>{handover.isSubmitting ? 'Wydawanie…' : action.title}</span>
                                        <span>{action.detail}</span>
                                    </ActionText>
                                    <ArrowRight aria-hidden="true" />
                                </PrimaryAction>
                            </FooterActions>
                        </>
                    )}
                </SettlementFooter>
            )}
            <InvoicePreviewModal
                isOpen={isPreviewOpen && showInvoicePreview}
                onClose={() => setPreviewOpen(false)}
                company={handover.company}
                buyer={handover.state.buyer}
                items={handover.invoiceItems}
                paymentMethod={handover.state.paymentMethod}
                dueDate={handover.state.paymentMethod === 'TRANSFER' ? defaultDueDate() : undefined}
            />
        </ModalShell>
    );
};
