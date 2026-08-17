import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Box, BoxRow, Money, Muted, Pill, PillRow, Section, SectionLabel } from './HandoverKit';
import { InvoiceSection } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { documentTypes } from './paymentOptions';
import { useKsefAutomation } from '@/modules/finance/hooks';
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

    // Only meaningful once an invoice is actually on the table; the hook itself
    // skips the request for studios without the KSeF module.
    const ksef = useKsefAutomation({ enabled: !isFreeVisit && state.documentType === 'INVOICE' });

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

            {state.documentType === 'INVOICE' && !ksef.isLoading && ksef.moduleEnabled && !ksef.configured && (
                <KsefNotice>
                    <KsefNoticeIcon aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </KsefNoticeIcon>
                    <div>
                        <KsefNoticeTitle>Brak tokenu KSeF — wysyłka nie będzie automatyczna</KsefNoticeTitle>
                        Fakturę wystawimy i zapiszemy normalnie, ale nie trafi sama do KSeF.
                        Po wydaniu pojazdu pobierzesz plik XML i wgrasz go ręcznie. Token
                        skonfigurujesz w <strong>Finanse → KSeF</strong>; od tego momentu
                        wysyłka działa automatycznie.
                    </div>
                </KsefNotice>
            )}

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

const KsefNotice = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 13px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    background: rgba(245, 158, 11, 0.08);
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: #78350f;
    line-height: 1.55;

    strong { font-weight: 700; }
`;

const KsefNoticeIcon = styled.span`
    display: flex;
    flex-shrink: 0;
    color: #d97706;
    margin-top: 1px;
    svg { width: 15px; height: 15px; }
`;

const KsefNoticeTitle = styled.strong`
    display: block;
    font-weight: 700;
    margin-bottom: 2px;
`;
