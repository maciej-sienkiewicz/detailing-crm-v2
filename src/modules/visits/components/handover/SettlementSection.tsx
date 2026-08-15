import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Box, BoxRow, Money, Muted, Pill, PillRow, Section, SectionLabel } from './HandoverKit';
import { InvoiceSection } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { documentTypes } from './paymentOptions';
import type { HandoverProblem, HandoverState } from '../../types/handover';
import type { InvoiceType } from '../../types/stateTransitions';

const AmountBox = styled(Box)`
    gap: 6px;
    background: ${st.bg};
`;

const AmountLabel = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const SubRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
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
}

/**
 * Rozliczenie wizyty: kwota, forma zapłaty, dokument.
 *
 * Wizyta bezpłatna nie ma czego rozliczać — sekcja zwija się wtedy do jednej
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
}: SettlementSectionProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);

    if (isFreeVisit) {
        return (
            <Section>
                <SectionLabel>Rozliczenie</SectionLabel>
                <Box>
                    <BoxRow>
                        <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                            Wizyta bezpłatna — łączna wartość usług wynosi 0 zł.
                        </span>
                        <Money $strong>{fmt(0)}</Money>
                    </BoxRow>
                    <Muted>Dokument finansowy nie zostanie wygenerowany.</Muted>
                </Box>
            </Section>
        );
    }

    return (
        <Section>
            <SectionLabel>Rozliczenie</SectionLabel>

            <AmountBox>
                <BoxRow>
                    <AmountLabel>Do zapłaty · brutto</AmountLabel>
                    <Money $strong>{fmt(totals.gross)}</Money>
                </BoxRow>
                <SubRow>
                    <span>netto</span>
                    <span>{fmt(totals.net)}</span>
                </SubRow>
            </AmountBox>

            <Box>
                <Group>
                    <SectionLabel as="h4">Zapłacono</SectionLabel>
                    <PaymentMethodPicker
                        value={state.paymentMethod}
                        onChange={paymentMethod => patch({ paymentMethod })}
                    />
                </Group>

                <Group>
                    <SectionLabel as="h4">Dokument</SectionLabel>
                    <PillRow>
                        {documentTypes.map(type => (
                            <Pill
                                key={type.value}
                                type="button"
                                $selected={state.documentType === type.value}
                                onClick={() => patch({ documentType: type.value as InvoiceType })}
                            >
                                {type.label}
                            </Pill>
                        ))}
                    </PillRow>
                </Group>
            </Box>

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
                />
            )}
        </Section>
    );
};
