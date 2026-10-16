import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { SummaryStrip, ui } from '@/common/components/ui';
import type { CompanySettings } from '@/modules/settings/types';
import { Pill, PillRow } from './HandoverKit';
import { InvoiceSection, type InvoiceControls } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { documentChoices, type DocumentChoice } from './paymentOptions';
import type { HandoverProblem, HandoverState } from '../../types/handover';
import type { KsefAutomation } from '@/modules/finance/hooks';
import type { InvoiceType } from '../../types/stateTransitions';

/*
 * Kwota „Do zapłaty" to ten sam pasek podsumowania co na karcie wizyty i w
 * zleceniach zbiorczych: etykieta, kwota 20px, obok rozpisanie zwykłym zdaniem.
 * Wcześniej była tu osobna wyniesiona karta z gradientem i wypełnionym kafelkiem
 * ikony - drugie wypełnienie w oknie obok „Wydaj pojazd" (CLAUDE.md §2).
 */

// Płaskie pole na tle: etykieta pismem zdaniowym (nie wersaliki-jedyny-znacznik)
// nad kontrolką. „Forma zapłaty" i „Dokument" nie są przedmiotem okna, więc nie
// dostają własnej ramy - rozdziela je odstęp.
const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FieldTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

// Więcej powietrza niż domyślny odstęp sekcji: przy płaskich polach na tle to
// odstęp - nie ramka - rozdziela plany (reguła 2: „Reszta leży płasko na tle
// i rozdziela ją odstęp").
const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

interface SettlementSectionProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    totals: { net: number; vat: number; gross: number };
    currency: string;
    isFreeVisit: boolean;
    invoiceGross: number;
    remainder: number;
    sellerComplete: boolean;
    company: CompanySettings | undefined;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    ksef: KsefAutomation;
    sendToKsef: boolean;
    canChooseSendToKsef: boolean;
    onSendToKsefChange: (value: boolean) => void;
    controls: InvoiceControls;
}

/**
 * Rozliczenie wizyty: kwota, forma zapłaty, dokument.
 *
 * Jeden przedmiot okna (kwota), reszta płasko pod nim. Gdy dokumentem jest
 * faktura, cała jej konfiguracja schodzi na jeden zatopiony plan [InvoiceSection]
 * zamiast rozlewać się na kolejne białe karty.
 *
 * Wizyta bezpłatna nie ma czego rozliczać: sekcja zwija się wtedy do jednej
 * informacji, zamiast pokazywać wybory bez znaczenia.
 */
export const SettlementSection = ({
    state,
    patch,
    totals,
    currency,
    isFreeVisit,
    invoiceGross,
    remainder,
    sellerComplete,
    company,
    problemsIn,
    ksef,
    sendToKsef,
    canChooseSendToKsef,
    onSendToKsefChange,
    controls,
}: SettlementSectionProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const choice: DocumentChoice =
        state.documentType === 'INVOICE' && state.remainderWithoutReceipt ? 'INVOICE_OTHER' : state.documentType;
    const isSplit = choice === 'INVOICE_OTHER' && remainder > 0;
    const choose = (value: DocumentChoice) => {
        if (value === choice) return;
        // Z „Faktura + Inny” do czegokolwiek innego: pozycje wracają do usług, żeby
        // faktura na część kwoty nie wróciła po cichu przy kolejnym wyborze faktury.
        if (choice === 'INVOICE_OTHER') controls.setInvoiceOther(false);
        if (value === 'INVOICE_OTHER') {
            patch({ documentType: 'INVOICE' });
            controls.setInvoiceOther(true);
        } else {
            patch({ documentType: value as InvoiceType });
        }
    };

    if (isFreeVisit) {
        return (
            <Stack>
                <SummaryStrip
                    label="Wizyta bezpłatna"
                    amount={fmt(0)}
                    details="usługi mają wartość 0 zł, dokument finansowy nie powstanie"
                />
            </Stack>
        );
    }

    return (
        <Stack>
            {/* VAT to RÓŻNICA pokazanych kwot (CLAUDE.md §1): totals.vat = gross - net,
                liczone w useHandover, tu tylko pokazywane. */}
            <SummaryStrip
                label="Do zapłaty"
                amount={fmt(totals.gross)}
                details={isSplit
                    ? `faktura ${fmt(invoiceGross)} + inny ${fmt(remainder)}`
                    : `netto ${fmt(totals.net)}, VAT ${fmt(totals.vat)}`}
            />

            <Field>
                {/* Przy podziale forma zapłaty dotyczy faktury - reszta ma własną niżej. */}
                <FieldTitle>{isSplit ? 'Forma zapłaty faktury' : 'Forma zapłaty'}</FieldTitle>
                <PaymentMethodPicker
                    value={state.paymentMethod}
                    onChange={paymentMethod => patch({ paymentMethod })}
                />
            </Field>

            <Field>
                <FieldTitle>Dokument</FieldTitle>
                <PillRow>
                    {documentChoices.map(type => (
                        <Pill
                            key={type.value}
                            type="button"
                            $selected={choice === type.value}
                            onClick={() => choose(type.value)}
                        >
                            {type.label}
                        </Pill>
                    ))}
                </PillRow>
            </Field>

            {state.documentType === 'INVOICE' && (
                <InvoiceSection
                    state={state}
                    patch={patch}
                    currency={currency}
                    visitGross={totals.gross}
                    invoiceGross={invoiceGross}
                    remainder={remainder}
                    sellerComplete={sellerComplete}
                    company={company}
                    problemsIn={problemsIn}
                    ksef={ksef}
                    sendToKsef={sendToKsef}
                    canChooseSendToKsef={canChooseSendToKsef}
                    onSendToKsefChange={onSendToKsefChange}
                    controls={controls}
                />
            )}
        </Stack>
    );
};
