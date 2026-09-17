import { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, Building2, User } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Toggle } from '@/common/components/Toggle';
import { BoxRow, Divider, GhostAction, Muted, SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { SellerPrompt } from './SellerPrompt';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { formatNip, normalizeNip, type HandoverProblem, type HandoverState } from '../../types/handover';
import type { KsefAutomation } from '@/modules/finance/hooks';

/**
 * Konfiguracja faktury leży na JEDNYM, zatopionym planie (reguła 2: „materiał -
 * dwa plany zamiast pięciu identycznych ram"). Wyniesiona, jasna karta jest w tym
 * oknie jedna - kwota „Do zapłaty". Wszystko, co dotyczy faktury (nabywca,
 * pozycje, wysyłka do KSeF, bilans), grupuje się tu pod nią jako dowód i
 * ustawienia, a nie jako druga karta walcząca o uwagę.
 */
const Panel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 13px 14px;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
`;

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

// Wiersz kroju „etykieta po lewej, wartość/akcja po prawej" - wspólny dla
// nabywcy, pozycji i wysyłki KSeF, żeby cała konfiguracja czytała się jednym
// rytmem, a nie jako trzy różne języki wizualne.
const RowLabel = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};

    strong { color: ${st.text}; font-weight: 600; }
    strong.num { font-variant-numeric: tabular-nums; }
`;

const KsefRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
`;

const KsefTexts = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const KsefLabel = styled.label`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    cursor: pointer;
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
    canChooseSendToKsef: boolean;
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
    canChooseSendToKsef,
    onSendToKsefChange,
}: InvoiceSectionProps) => {
    const [isBuyerOpen, setBuyerOpen] = useState(false);
    const [areItemsOpen, setItemsOpen] = useState(false);

    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const nip = normalizeNip(state.buyer.nip);
    const isCompanyBuyer = nip.length > 0;
    const balanceState: 'ok' | 'under' | 'over' =
        remainder === 0 ? 'ok' : remainder > 0 ? 'under' : 'over';

    const addressSummary = [state.buyer.addressLine1, state.buyer.addressLine2]
        .map(part => part.trim())
        .filter(Boolean)
        .join(', ');

    // Ostrzegamy dopiero, gdy znamy odpowiedź: `configured` jest false także w trakcie
    // ładowania, a to pokazałoby „brak tokenu" studiom, które token mają.
    const ksefAnswerKnown = !ksef.isLoading && ksef.moduleEnabled;

    /**
     * Jedna spokojna linia zamiast akapitu pod przełącznikiem: w happy-path (token
     * jest, wysyłamy) wystarczy zdanie, że faktura pójdzie do KSeF. Dodatkowe
     * wyjaśnienie pojawia się tylko wtedy, gdy niesie NOWĄ informację - świadome
     * „nie wysyłam" albo blokada tokenu. Szczegóły blokady i drogę wyjścia niesie
     * baner niżej, więc tu wystarczy jedno zdanie.
     */
    // Wadliwy token sprawdzany PRZED „!sendToKsef": przełącznik jest wtedy zgaszony
    // przymusowo, a „wyślesz ją później" byłoby obietnicą bez pokrycia - wysyłka
    // wróci dopiero po naprawie tokenu.
    const ksefLine = ksef.isLoading
        ? 'Sprawdzamy konfigurację KSeF…'
        : !ksef.configured
          ? 'Faktura nie zostanie wysłana do KSeF.'
          : ksef.lacksIssuePermission
            ? 'Faktura nie zostanie wysłana do KSeF.'
            : sendToKsef
              ? 'Wyślemy fakturę do KSeF automatycznie po wydaniu pojazdu.'
              : 'Faktura zostanie zapisana bez wysyłki do KSeF.';

    // Muted-dopisek tylko tam, gdzie mówi coś ponad linię wyżej: świadome „nie
    // wysyłam" prowadzi do drogi wysłania później. Blokady opisuje baner.
    const ksefHint =
        !ksef.isLoading && ksef.configured && !ksef.lacksIssuePermission && !sendToKsef
            ? 'Wyślesz ją później z dokumentów przychodowych.'
            : null;

    return (
        <Panel>
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
                <RowLabel>
                    Pozycje: <strong>{state.items.length}</strong> ·{' '}
                    <strong className="num">{fmt(invoiceGross)}</strong>
                    {invoiceGross === visitGross && ' · zgodne z usługami wizyty'}
                </RowLabel>
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

            {/* ── Wysyłka do KSeF ─────────────────────────────────────────────
                Wysyłka to część konfiguracji faktury, więc żyje tu, przy nabywcy
                i pozycjach, a nie jako osobny wiersz nad wyborem dokumentu. Studio
                bez modułu KSeF nie widzi jej wcale - o wysyłce nie decyduje. */}
            {ksef.moduleEnabled && (
                <>
                    <Divider />
                    <KsefRow>
                        <KsefTexts>
                            <KsefLabel htmlFor="handover-send-ksef">Wyślij fakturę do KSeF</KsefLabel>
                            <Muted>{ksefLine}</Muted>
                            {ksefHint && <Muted>{ksefHint}</Muted>}
                        </KsefTexts>
                        <Toggle
                            checked={sendToKsef}
                            onChange={onSendToKsefChange}
                            disabled={!canChooseSendToKsef}
                            size="sm"
                            inputId="handover-send-ksef"
                            ariaLabel="Wyślij fakturę do KSeF"
                        />
                    </KsefRow>

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
                                Fakturę wystawimy i zapiszemy, ale nie wyślemy - plik pobierzesz po
                                wydaniu pojazdu. Token dodasz w <strong>Ustawienia → Faktury</strong>.
                            </div>
                        </KsefNotice>
                    )}

                    {/* Token bez prawa wystawiania kończył wysyłkę odmową KSeF i fakturą
                        w kolejce retry bez szans powodzenia - dlatego przełącznik jest przy
                        takim tokenie zgaszony i zablokowany, a baner mówi, co naprawić. */}
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
                                Ma prawo tylko do odczytu, więc wysyłka do KSeF jest wyłączona.
                                Fakturę wystawimy i zapiszemy razem z danymi nabywcy - plik
                                pobierzesz po wydaniu pojazdu, a po naprawie tokenu wyślesz ją
                                z dokumentów przychodowych. Token z prawem wystawiania faktur
                                dodasz w <strong>Ustawienia → Faktury</strong>.
                            </div>
                        </KsefNotice>
                    )}
                </>
            )}

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
        </Panel>
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
