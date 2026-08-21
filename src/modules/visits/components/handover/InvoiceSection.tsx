import { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, Building2, User } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Toggle } from '@/common/components/Toggle';
import { Box, BoxRow, Divider, GhostAction, Muted, SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { SellerPrompt } from './SellerPrompt';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { formatNip, normalizeNip, type HandoverProblem, type HandoverState } from '../../types/handover';
import type { KsefAutomation } from '@/modules/finance/hooks';

const BuyerLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${st.textMuted}; }
`;

const BuyerText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
`;

const BuyerName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    overflow-wrap: anywhere;
`;

const BuyerMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
`;

const Balance = styled.div<{ $state: 'ok' | 'under' | 'over' }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 11px 13px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    line-height: 1.5;

    ${p => p.$state === 'under' && `background: #fffbeb; border: 1px solid #fde68a; color: #78350f;`}
    ${p => p.$state === 'over' && `background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d;`}
    ${p => p.$state === 'ok' && `display: none;`}

    strong { font-variant-numeric: tabular-nums; }
`;

const BalanceRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
`;

interface InvoiceSectionProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    currency: string;
    visitGross: number;
    invoiceGross: number;
    remainder: number;
    sellerComplete: boolean;
    company: CompanySettings | undefined;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    ksef: KsefAutomation;
    sendToKsef: boolean;
    onSendToKsefChange: (value: boolean) => void;
}

/**
 * Konfiguracja faktury: w tym samym oknie, nie w modalu nad modalem.
 *
 * Nabywca i pozycje są domyślnie zwinięte do jednej linijki, bo w typowym
 * wydaniu są poprawne. Wiersz nabywcy pokazuje dokładnie to, co pójdzie do
 * KSeF, łącznie z NIP-em z kartoteki, który wcześniej backend doklejał po
 * cichu, gdy pole zostało puste.
 */
export const InvoiceSection = ({
    state,
    patch,
    currency,
    visitGross,
    invoiceGross,
    remainder,
    sellerComplete,
    company,
    problemsIn,
    ksef,
    sendToKsef,
    onSendToKsefChange,
}: InvoiceSectionProps) => {
    const [isBuyerOpen, setBuyerOpen] = useState(false);
    const [areItemsOpen, setItemsOpen] = useState(false);

    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const nip = normalizeNip(state.buyer.nip);
    const isCompanyBuyer = nip.length > 0;
    const balanceState: 'ok' | 'under' | 'over' =
        remainder === 0 ? 'ok' : remainder > 0 ? 'under' : 'over';

    /**
     * Podpowiedź pod przełącznikiem mówi, co się stanie, a nie co przełącznik robi.
     * Wyłączona wysyłka to legalny wybór (faktura powstaje i jest zapisana), więc
     * nie straszymy: informujemy, że dokument czeka na ręczną wysyłkę.
     */
    const sendHint = !sendToKsef
        ? 'Faktura zostanie wystawiona i zapisana, ale nie pojedzie do KSeF. Wyślesz ją później z listy dokumentów przychodowych.'
        : ksef.isLoading
          ? 'Sprawdzamy konfigurację KSeF…'
          : !ksef.configured
            ? 'Brak tokenu KSeF: fakturę trzeba będzie wgrać do KSeF ręcznie.'
            : ksef.lacksIssuePermission
              ? 'Token bez uprawnienia do wystawiania faktur: KSeF odrzuci tę wysyłkę.'
              : 'Faktura trafi do KSeF automatycznie po wydaniu pojazdu.';

    const addressSummary = [state.buyer.addressLine1, state.buyer.addressLine2]
        .map(part => part.trim())
        .filter(Boolean)
        .join(', ');

    return (
        <Box>
            {!sellerComplete && <SellerPrompt company={company} />}
            <SectionProblems problems={problemsIn('seller')} />

            {/* ── Nabywca ─────────────────────────────────────────────────── */}
            <BoxRow>
                <BuyerLine>
                    {isCompanyBuyer ? <Building2 /> : <User />}
                    <BuyerText>
                        <BuyerName>
                            {state.buyer.name.trim() || 'Nabywca nieokreślony'}
                        </BuyerName>
                        <BuyerMeta>
                            {isCompanyBuyer ? `NIP ${formatNip(nip)}` : 'Faktura dla konsumenta'}
                            {addressSummary && ` · ${addressSummary}`}
                        </BuyerMeta>
                    </BuyerText>
                </BuyerLine>
                <GhostAction type="button" onClick={() => setBuyerOpen(open => !open)}>
                    {isBuyerOpen ? <ChevronDown /> : <ChevronRight />}
                    {isBuyerOpen ? 'Zwiń' : 'Zmień'}
                </GhostAction>
            </BoxRow>

            {isBuyerOpen && (
                <BuyerEditor buyer={state.buyer} onChange={buyer => patch({ buyer })} />
            )}
            <SectionProblems problems={problemsIn('buyer')} />

            <Divider />

            {/* ── Pozycje ─────────────────────────────────────────────────── */}
            <BoxRow>
                <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                    Pozycje: <strong>{state.items.length}</strong> ·{' '}
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(invoiceGross)}</strong>
                    {invoiceGross === visitGross && ' · zgodne z usługami wizyty'}
                </span>
                <GhostAction type="button" onClick={() => setItemsOpen(open => !open)}>
                    {areItemsOpen ? <ChevronDown /> : <ChevronRight />}
                    {areItemsOpen ? 'Zwiń' : 'Edytuj'}
                </GhostAction>
            </BoxRow>

            {areItemsOpen && (
                <InvoiceItemsEditor
                    items={state.items}
                    onChange={items => patch({ items })}
                    exemptionBasis={state.exemptionBasis}
                    onExemptionBasisChange={exemptionBasis => patch({ exemptionBasis })}
                />
            )}
            <SectionProblems problems={problemsIn('items')} />

            {/* ── Bilans ──────────────────────────────────────────────────── */}
            <Balance $state={balanceState}>
                <BalanceRow>
                    <span>Kwota wizyty</span>
                    <strong>{fmt(visitGross)}</strong>
                </BalanceRow>
                <BalanceRow>
                    <span>Suma faktury</span>
                    <strong>{fmt(invoiceGross)}</strong>
                </BalanceRow>

                {balanceState === 'over' && (
                    <span>
                        Faktura przekracza kwotę wizyty o <strong>{fmt(-remainder)}</strong>, obniż
                        pozycje.
                    </span>
                )}

                {balanceState === 'under' && (
                    <>
                        <BalanceRow>
                            <span>Pozostaje do udokumentowania</span>
                            <strong>{fmt(remainder)}</strong>
                        </BalanceRow>
                        {!state.splitRemainder ? (
                            <GhostAction
                                type="button"
                                onClick={() => patch({ splitRemainder: true })}
                            >
                                Resztę udokumentuj paragonem
                            </GhostAction>
                        ) : (
                            <>
                                <span>
                                    Reszta <strong>{fmt(remainder)}</strong> zostanie ujęta na
                                    paragonie, osobnym dokumentem przychodowym (przy gotówce
                                    z wpisem do kasy). Czym klient zapłacił resztę?
                                </span>
                                <PaymentMethodPicker
                                    value={state.remainderMethod}
                                    onChange={remainderMethod => patch({ remainderMethod })}
                                />
                                <GhostAction
                                    type="button"
                                    onClick={() => patch({ splitRemainder: false })}
                                >
                                    Anuluj podział, faktura na całość
                                </GhostAction>
                            </>
                        )}
                    </>
                )}
            </Balance>
            <SectionProblems problems={problemsIn('balance')} />

            {/* ── Wysyłka do KSeF ─────────────────────────────────────────── */}
            {ksef.moduleEnabled && (
                <>
                    <Divider />
                    <SendRow>
                        <SendTexts>
                            <SendLabel htmlFor="handover-send-ksef">Wyślij fakturę do KSeF</SendLabel>
                            <Muted>{sendHint}</Muted>
                        </SendTexts>
                        <Toggle
                            checked={sendToKsef}
                            onChange={onSendToKsefChange}
                            size="sm"
                            inputId="handover-send-ksef"
                            ariaLabel="Wyślij fakturę do KSeF"
                        />
                    </SendRow>
                </>
            )}
        </Box>
    );
};

const SendRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
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
