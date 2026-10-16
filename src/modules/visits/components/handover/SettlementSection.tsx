import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { ui } from '@/common/components/ui';
import type { CompanySettings } from '@/modules/settings/types';
import { Pill, PillRow, SectionProblems } from './HandoverKit';
import { InvoiceBuyer, InvoicePositions, type InvoiceControls } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { SellerPrompt } from './SellerPrompt';
import { documentChoices, type DocumentChoice } from './paymentOptions';
import type { HandoverProblem, HandoverState } from '../../types/handover';
import type { InvoiceType } from '../../types/stateTransitions';

/*
 * Lewa kolumna rozliczenia: same decyzje, w kolejności, w jakiej padają przy ladzie -
 * dokument i nabywca (NIP musi być znany przed wydrukiem paragonu), potem forma
 * zapłaty, na końcu pozycje. Kwota, podsumowanie i przycisk stoją w prawej kolumnie
 * (SettlementSummary), więc tu nie powtarzamy żadnej sumy poza blokiem podziału.
 */

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 26px;
`;

const Field = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const FieldTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

interface SettlementSectionProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    currency: string;
    invoiceGross: number;
    remainder: number;
    sellerComplete: boolean;
    company: CompanySettings | undefined;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    invoicedExternally: boolean;
    controls: InvoiceControls;
}

export const SettlementSection = ({
    state,
    patch,
    currency,
    invoiceGross,
    remainder,
    sellerComplete,
    company,
    problemsIn,
    invoicedExternally,
    controls,
}: SettlementSectionProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const choice: DocumentChoice =
        state.documentType === 'INVOICE' && state.remainderWithoutReceipt ? 'INVOICE_OTHER' : state.documentType;
    const isInvoice = state.documentType === 'INVOICE';

    const choose = (value: DocumentChoice) => {
        if (value === choice) return;
        // Z „Faktura + Inny dokument” do czegokolwiek innego: pozycje wracają do usług,
        // żeby faktura na część kwoty nie wróciła po cichu przy kolejnym wyborze faktury.
        if (choice === 'INVOICE_OTHER') controls.setInvoiceOther(false);
        if (value === 'INVOICE_OTHER') {
            patch({ documentType: 'INVOICE' });
            controls.setInvoiceOther(true);
        } else {
            patch({ documentType: value as InvoiceType });
        }
    };

    // Księgowość wystawia faktury poza CRM: podziału na fakturę i inny dokument nie ma
    // komu wystawić, więc ta opcja znika.
    const choices = invoicedExternally ? documentChoices.filter(c => c.value !== 'INVOICE_OTHER') : documentChoices;

    return (
        <Stack>
            <Field id="handover-document">
                <FieldTitle>Dokument dla klienta</FieldTitle>
                <PillRow role="group" aria-label="Dokument dla klienta">
                    {choices.map(type => (
                        <Pill
                            key={type.value}
                            type="button"
                            $selected={choice === type.value}
                            aria-pressed={choice === type.value}
                            onClick={() => choose(type.value)}
                        >
                            {type.label}
                        </Pill>
                    ))}
                </PillRow>
                {isInvoice && !invoicedExternally && !sellerComplete && <SellerPrompt company={company} />}
                {isInvoice && !invoicedExternally && <SectionProblems problems={problemsIn('seller')} />}
                {isInvoice && (
                    <InvoiceBuyer
                        state={state}
                        patch={patch}
                        problemsIn={problemsIn}
                        invoicedExternally={invoicedExternally}
                    />
                )}
            </Field>

            {isInvoice && !invoicedExternally && state.remainderWithoutReceipt && (
                <InvoicePositions
                    state={state}
                    patch={patch}
                    invoiceGross={invoiceGross}
                    remainder={remainder}
                    company={company}
                    problemsIn={problemsIn}
                    controls={controls}
                    fmt={fmt}
                />
            )}

            <Field id="handover-payment">
                <FieldTitle>{choice === 'INVOICE_OTHER' ? 'Forma zapłaty faktury' : 'Forma zapłaty'}</FieldTitle>
                <PaymentMethodPicker
                    value={state.paymentMethod}
                    onChange={paymentMethod => patch({ paymentMethod })}
                />
            </Field>

            {isInvoice && !invoicedExternally && !state.remainderWithoutReceipt && (
                <Field>
                    <FieldTitle>Pozycje</FieldTitle>
                    <InvoicePositions
                        state={state}
                        patch={patch}
                        invoiceGross={invoiceGross}
                        remainder={remainder}
                        company={company}
                        problemsIn={problemsIn}
                        controls={controls}
                        fmt={fmt}
                    />
                </Field>
            )}
        </Stack>
    );
};
