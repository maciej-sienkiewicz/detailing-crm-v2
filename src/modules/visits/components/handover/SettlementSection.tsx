import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Toggle } from '@/common/components/Toggle';
import { Box, BoxRow, Money, Muted, Pill, PillRow, Section, SectionLabel } from './HandoverKit';
import { InvoiceSection } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { documentTypes } from './paymentOptions';
import type { HandoverProblem, HandoverState } from '../../types/handover';
import type { KsefAutomation } from '@/modules/finance/hooks';
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

// Right-aligned value stack: each amount sits directly next to its own
// "brutto"/"netto" label (law of proximity) instead of the label living in a
// separate column on the far left of the row.
const ValueStack = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
`;

const SubValue = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

const SendRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 3px;
`;

const SendTexts = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const SendLabel = styled.label`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    cursor: pointer;
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
}

/**
 * Rozliczenie wizyty: kwota, forma zapłaty, dokument.
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
}: SettlementSectionProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);

    // Ostrzegamy dopiero, gdy znamy odpowiedź: `configured` jest false także w trakcie
    // ładowania, a to pokazałoby „brak tokenu" studiom, które token mają.
    const ksefAnswerKnown =
        state.documentType === 'INVOICE' && !ksef.isLoading && ksef.moduleEnabled;

    /**
     * Podpowiedź pod przełącznikiem mówi, co się stanie z tą fakturą — szczegóły
     * przeszkody i drogę wyjścia niesie baner poniżej, więc tu wystarczy jedno zdanie.
     */
    const sendHint = ksef.isLoading
        ? 'Sprawdzamy konfigurację KSeF…'
        : !ksef.configured
          ? 'Bez tokenu KSeF wysyłka jest niemożliwa.'
          : !sendToKsef
            ? 'Faktura zostanie zapisana bez wysyłki; wyślesz ją później z dokumentów przychodowych.'
            : ksef.lacksIssuePermission
              ? 'Token nie pozwala wystawiać faktur, więc KSeF tej faktury nie przyjmie.'
              : 'Faktura trafi do KSeF automatycznie po wydaniu pojazdu.';

    if (isFreeVisit) {
        return (
            <Section>
                <SectionLabel>Rozliczenie</SectionLabel>
                <Box>
                    <BoxRow>
                        <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                            Wizyta bezpłatna, łączna wartość usług wynosi 0 zł.
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
                    <AmountLabel>Do zapłaty</AmountLabel>
                    <ValueStack>
                        <Money $strong>{fmt(totals.gross)} brutto</Money>
                        <SubValue>{fmt(totals.net)} netto</SubValue>
                    </ValueStack>
                </BoxRow>
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

                    {/* Wysyłka do KSeF to część tej samej decyzji co wybór dokumentu:
                        „faktura" i „co się z nią dalej dzieje" czyta się razem, więc
                        przełącznik stoi tuż pod wyborem, a nie w osobnej sekcji niżej. */}
                    {state.documentType === 'INVOICE' && ksef.moduleEnabled && (
                        <SendRow>
                            <SendTexts>
                                <SendLabel htmlFor="handover-send-ksef">
                                    Wyślij fakturę do KSeF
                                </SendLabel>
                                <Muted>{sendHint}</Muted>
                            </SendTexts>
                            <Toggle
                                checked={sendToKsef}
                                onChange={onSendToKsefChange}
                                disabled={!canChooseSendToKsef}
                                size="sm"
                                inputId="handover-send-ksef"
                                ariaLabel="Wyślij fakturę do KSeF"
                            />
                        </SendRow>
                    )}
                </Group>
            </Box>

            {ksefAnswerKnown && !ksef.configured && (
                <KsefNotice>
                    <KsefNoticeIcon aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </KsefNoticeIcon>
                    <div>
                        <KsefNoticeTitle>Brak tokenu KSeF</KsefNoticeTitle>
                        Fakturę wystawimy i zapiszemy, ale nie wyślemy — plik pobierzesz po
                        wydaniu pojazdu. Token dodasz w <strong>Ustawienia → Faktury</strong>.
                    </div>
                </KsefNotice>
            )}

            {/* Token bez prawa wystawiania kończy wysyłkę odmową, którą backend zapisuje
                jako błąd przejściowy i wstawia do kolejki offline24 — a ta próba nie ma
                szans się udać. Lepiej powiedzieć to przed wydaniem niż zostawić fakturę
                w kolejce, która nigdy nie zadziała. */}
            {ksefAnswerKnown && ksef.configured && ksef.lacksIssuePermission && (
                <KsefNotice>
                    <KsefNoticeIcon aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </KsefNoticeIcon>
                    <div>
                        <KsefNoticeTitle>Token KSeF nie pozwala wystawiać faktur</KsefNoticeTitle>
                        Ma prawo tylko do odczytu, więc KSeF nie przyjmie tej faktury.
                        Wystawimy ją i zapiszemy — plik pobierzesz po wydaniu pojazdu.
                        Token z prawem wystawiania faktur dodasz w{' '}
                        <strong>Ustawienia → Faktury</strong>.
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
