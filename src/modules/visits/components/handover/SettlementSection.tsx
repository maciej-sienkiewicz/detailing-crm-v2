import styled from 'styled-components';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Muted, Pill, PillRow } from './HandoverKit';
import { InvoiceSection } from './InvoiceSection';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { documentTypes } from './paymentOptions';
import type { HandoverProblem, HandoverState } from '../../types/handover';
import type { KsefAutomation } from '@/modules/finance/hooks';
import type { InvoiceType } from '../../types/stateTransitions';

/**
 * Kwota „Do zapłaty" to JEDYNA wyniesiona powierzchnia w tym oknie (reguła 2:
 * „wyniesienie niesie temat"). To liczba, po którą się tu wraca, więc jest
 * nagłówkiem sekcji, a nie kolejną białą ramą w rzędzie identycznych. Pasek
 * marki u góry, kafelek ikony i cień odróżniają ją od reszty, która leży płasko
 * na tle. Netto i VAT to dowód pod liczbą, nie druga liczba tej samej wagi.
 */
const AmountCard = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
    border-radius: ${st.radiusLg};
    background: ${st.gradientCardBlue};
    border: 1px solid ${st.border};
    box-shadow: ${st.shadowMd};
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: ${st.gradientBlue};
    }
`;

const AmountHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const IconTile = styled.div`
    width: 30px;
    height: 30px;
    border-radius: ${st.radiusSm};
    background: ${st.gradientBlue};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: ${st.shadowXs};

    svg { width: 16px; height: 16px; }
`;

// Nazwa pismem tekstowym z kafelkiem ikony, nie 11 px wersalikami w szarości -
// wersaliki jako JEDYNy znacznik sekcji są w tym module wycofane (CLAUDE.md).
const AmountTitle = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const HeroRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
`;

const HeroValue = styled.span`
    font-size: ${st.fontXxl};
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
`;

const HeroUnit = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const ProofLine = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
`;

// Płaskie pole na tle: etykieta pismem zdaniowym (nie wersaliki-jedyny-znacznik)
// nad kontrolką. „Forma zapłaty" i „Dokument" nie są przedmiotem okna, więc nie
// dostają własnej ramy - rozdziela je odstęp.
const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FieldTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const FreeCard = styled(AmountCard)`
    &::before { background: ${st.border}; }
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
}: SettlementSectionProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);

    if (isFreeVisit) {
        return (
            <Stack>
                <FreeCard>
                    <AmountHead>
                        <IconTile>
                            <Wallet />
                        </IconTile>
                        <AmountTitle>Wizyta bezpłatna</AmountTitle>
                    </AmountHead>
                    <HeroRow>
                        <HeroValue>{fmt(0)}</HeroValue>
                    </HeroRow>
                    <Muted>
                        Łączna wartość usług wynosi 0 zł, dokument finansowy nie zostanie
                        wygenerowany.
                    </Muted>
                </FreeCard>
            </Stack>
        );
    }

    return (
        <Stack>
            <AmountCard>
                <AmountHead>
                    <IconTile>
                        <Wallet />
                    </IconTile>
                    <AmountTitle>Do zapłaty</AmountTitle>
                </AmountHead>
                <HeroRow>
                    {/* VAT to RÓŻNICA pokazanych kwot (reguła 1): totals.vat = gross - net,
                        liczone w useHandover, tu tylko pokazywane. */}
                    <HeroValue>{fmt(totals.gross)}</HeroValue>
                    <HeroUnit>brutto</HeroUnit>
                </HeroRow>
                <ProofLine>
                    netto {fmt(totals.net)} · VAT {fmt(totals.vat)}
                </ProofLine>
            </AmountCard>

            <Field>
                <FieldTitle>Forma zapłaty</FieldTitle>
                <PaymentMethodPicker
                    value={state.paymentMethod}
                    onChange={paymentMethod => patch({ paymentMethod })}
                />
            </Field>

            <Field>
                <FieldTitle>Dokument</FieldTitle>
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
                />
            )}
        </Stack>
    );
};
