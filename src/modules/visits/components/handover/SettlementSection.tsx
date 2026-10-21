import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { ui } from '@/common/components/ui';
import type { CompanySettings } from '@/modules/settings/types';
import { GhostAction, Pill, PillRow, SectionProblems } from './HandoverKit';
import { InvoiceBuyer, InvoicePositions, type InvoiceControls } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { SellerPrompt } from './SellerPrompt';
import { PricesSection } from './PricesSection';
import { documentChoices } from './paymentOptions';
import type { HandoverItem, HandoverPrice, HandoverProblem, HandoverState } from '../../types/handover';
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

const SplitLink = styled(GhostAction)`
    align-self: flex-start;
`;

const FieldTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

export interface PriceControls {
    changePrice: (serviceId: string, changes: Partial<Pick<HandoverPrice, 'net' | 'gross' | 'vatRate'>>) => void;
    resetPrices: () => void;
    /** Rabat (+) albo dopłata (−) przy wydaniu, brutto. */
    discount: number;
    totalGross: number;
}

interface SettlementSectionProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    currency: string;
    invoiceItems: HandoverItem[];
    invoiceGross: number;
    remainder: number;
    remainderAuto: number;
    sellerComplete: boolean;
    company: CompanySettings | undefined;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    invoicedExternally: boolean;
    controls: InvoiceControls;
    priceControls: PriceControls;
}

export const SettlementSection = ({
    state,
    patch,
    currency,
    invoiceItems,
    invoiceGross,
    remainder,
    remainderAuto,
    sellerComplete,
    company,
    problemsIn,
    invoicedExternally,
    controls,
    priceControls,
}: SettlementSectionProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const isInvoice = state.documentType === 'INVOICE';
    const isSplit = isInvoice && state.splitRemainder;
    const crmInvoice = isInvoice && !invoicedExternally;

    const choose = (value: InvoiceType) => {
        if (value === state.documentType) return;
        // Odejście od faktury zdejmuje podział: pozycje wracają do usług, żeby faktura
        // na część kwoty nie wróciła po cichu przy kolejnym wyborze faktury.
        if (isSplit) controls.setInvoiceOther(false);
        patch({ documentType: value });
    };

    return (
        <Stack>
            <Field id="handover-document">
                <FieldTitle>Dokument dla klienta</FieldTitle>
                <PillRow role="group" aria-label="Dokument dla klienta">
                    {documentChoices.map(type => (
                        <Pill
                            key={type.value}
                            type="button"
                            $selected={state.documentType === type.value}
                            aria-pressed={state.documentType === type.value}
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

            {/* Przy fakturze z CRM ceny ustala się w pozycjach faktury (kwota, stawka, nowa
                pozycja) - osobna sekcja cen powtarzałaby to samo dwa razy. */}
            {!crmInvoice && (
                <Field>
                    <FieldTitle>Ceny usług</FieldTitle>
                    <PricesSection
                        prices={state.prices}
                        onChange={priceControls.changePrice}
                        onReset={priceControls.resetPrices}
                        discount={priceControls.discount}
                        totalGross={priceControls.totalGross}
                        problems={problemsIn('prices')}
                        fmt={fmt}
                    />
                </Field>
            )}

            <Field id="handover-payment">
                <FieldTitle>{isSplit ? 'Forma zapłaty faktury' : 'Forma zapłaty'}</FieldTitle>
                <PaymentMethodPicker
                    value={state.paymentMethod}
                    onChange={paymentMethod => patch({ paymentMethod })}
                />
                {/* Podział to sposób zapłaty faktury, nie osobny dokument: część kwoty na
                    fakturze, reszta gotówką na innym dokumencie. */}
                {crmInvoice && !isSplit && (
                    <SplitLink type="button" onClick={() => controls.setInvoiceOther(true)}>
                        Podziel płatność: faktura + inny dokument
                    </SplitLink>
                )}
            </Field>

            {crmInvoice && (
                <Field>
                    {!isSplit && <FieldTitle>Pozycje</FieldTitle>}
                    <InvoicePositions
                        state={state}
                        patch={patch}
                        invoiceItems={invoiceItems}
                        invoiceGross={invoiceGross}
                        remainder={remainder}
                        remainderAuto={remainderAuto}
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
