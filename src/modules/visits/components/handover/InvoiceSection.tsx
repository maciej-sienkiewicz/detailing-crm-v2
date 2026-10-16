import { useState } from 'react';
import styled from 'styled-components';
import { Check, ChevronDown, ChevronRight, Building2, Eye, Pencil, User } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Toggle } from '@/common/components/Toggle';
import { BoxRow, Divider, GhostAction, Muted, SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { SellerPrompt } from './SellerPrompt';
import { InvoiceLines } from './InvoiceLines';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
    formatNip,
    normalizeNip,
    type HandoverProblem,
    type HandoverState,
    type RateMismatch,
} from '../../types/handover';
import type { KsefAutomation } from '@/modules/finance/hooks';

/**
 * Konfiguracja faktury leży na JEDNYM, zatopionym planie (reguła 2: „materiał -
 * dwa plany zamiast pięciu identycznych ram"). Wyniesiona, jasna karta jest w tym
 * oknie jedna - kwota „Do zapłaty”. Wszystko, co dotyczy faktury (nabywca,
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
    display: flex;
    flex-wrap: wrap;
    column-gap: 12px;
    font-size: 12.5px;
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
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

const LinesHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px 14px;
`;

const LinesTitle = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
`;

/** Dwie kwoty, po które się wraca: kwota faktury i - przy „Faktura + Inny” - reszta. */
const Totals = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 10px;
    background: ${st.bgCardAlt};
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};

    strong {
        font-size: 16px;
        font-weight: 700;
        color: ${st.text};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
`;

const HintBox = styled.div<{ $tone: 'info' | 'warn' }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    line-height: 1.5;
    ${p => p.$tone === 'warn'
        ? 'background: #fffbeb; border: 1px solid #fde68a; color: #78350f;'
        : 'background: #f8fafc; border: 1px solid #e2e8f0; color: #334155;'}

    strong { font-weight: 700; }
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
`;

export interface InvoiceControls {
    itemsMatchServices: boolean;
    vatMismatch: RateMismatch | null;
    /** ISO chwili zapisu przywróconego draftu z pozycjami innymi niż usługi; null = brak. */
    restoredAt: string | null;
    resetItemsToServices: () => void;
    /** Dokument „Faktura + Inny” włączony / wyłączony. */
    setInvoiceOther: (on: boolean) => void;
    applyItemsPerRate: () => void;
}

const savedTime = (iso: string): string | null => {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        : null;
};

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
    controls: InvoiceControls;
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
    controls,
}: InvoiceSectionProps) => {
    const [isBuyerOpen, setBuyerOpen] = useState(false);
    const [areItemsOpen, setItemsOpen] = useState(false);

    const [isPreviewOpen, setPreviewOpen] = useState(false);

    // „Faktura + Inny” ustawia się kwotami pozycji, więc przy jego wyborze edytor pozycji
    // otwiera się sam. Dostosowanie w trakcie renderu, nie efekt (React: „you might not
    // need an effect”).
    const isInvoiceOther = state.remainderWithoutReceipt;
    const [seenInvoiceOther, setSeenInvoiceOther] = useState(isInvoiceOther);
    if (isInvoiceOther !== seenInvoiceOther) {
        setSeenInvoiceOther(isInvoiceOther);
        if (isInvoiceOther) setItemsOpen(true);
    }

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
    // ładowania, a to pokazałoby „brak tokenu” studiom, które token mają.
    const ksefAnswerKnown = !ksef.isLoading && ksef.moduleEnabled;

    /**
     * Jedna spokojna linia zamiast akapitu pod przełącznikiem: w happy-path (token
     * jest, wysyłamy) wystarczy zdanie, że faktura pójdzie do KSeF. Dodatkowe
     * wyjaśnienie pojawia się tylko wtedy, gdy niesie NOWĄ informację - świadome
     * „nie wysyłam” albo blokada tokenu. Szczegóły blokady i drogę wyjścia niesie
     * baner niżej, więc tu wystarczy jedno zdanie.
     */
    // Wadliwy token sprawdzany PRZED „!sendToKsef”: przełącznik jest wtedy zgaszony
    // przymusowo, a „wyślesz ją później” byłoby obietnicą bez pokrycia - wysyłka
    // wróci dopiero po naprawie tokenu.
    const ksefLine = ksef.isLoading
        ? 'Sprawdzamy ustawienia KSeF…'
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

    const buyerRow = (
        <>
            <BoxRow>
                <BuyerLine>
                    {isCompanyBuyer ? <Building2 /> : <User />}
                    <BuyerText>
                        <BuyerName>
                            {state.buyer.name.trim() || 'Bez nazwy nabywcy'}
                        </BuyerName>
                        <BuyerMeta>
                            {/* Dwa fakty jako dwa elementy, nie ciąg z kropką (CLAUDE.md §4). */}
                            <span>{isCompanyBuyer ? `NIP ${formatNip(nip)}` : 'Faktura dla konsumenta'}</span>
                            {addressSummary && <span>{addressSummary}</span>}
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
        </>
    );

    // Faktury wystawia księgowość (Ustawienia → Faktury): CRM nie tworzy faktury, więc
    // pozycje, dane sprzedawcy, wysyłka do KSeF i bilans nie mają tu nic do roboty.
    // Zostaje nabywca - zapisuje się przy płatności, to jemu księgowość wystawi fakturę.
    if (ksef.invoicesIssuedExternally) {
        return (
            <Panel>
                {buyerRow}
                <Divider />
                <ExternalNote>
                    <strong>Fakturę wystawi księgowość.</strong> CRM zapisze płatność na {fmt(visitGross)}{' '}
                    z tym nabywcą, ale nie tworzy własnej faktury, więc nic nie policzy się dwa razy.
                </ExternalNote>
            </Panel>
        );
    }

    return (
        <Panel>
            {!sellerComplete && <SellerPrompt company={company} />}
            <SectionProblems problems={problemsIn('seller')} />

            {/* ── Nabywca ─────────────────────────────────────────────────── */}
            {buyerRow}

            <Divider />

            {/* ── Przywrócony draft ─────────────────────────────────────────── */}
            {controls.restoredAt !== null && (
                <HintBox $tone="warn" role="status">
                    <span>
                        <strong>Wróciły zapisane zmiany faktury</strong>
                        {savedTime(controls.restoredAt) ? ` (${savedTime(controls.restoredAt)})` : ''}
                    </span>
                    <Actions>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>
                            Wróć do kwot z usług
                        </GhostAction>
                    </Actions>
                </HintBox>
            )}

            {/* ── Pozycje ──────────────────────────────────────────────────────
                Lista jak na dokumencie zamiast licznika „2 pozycje na …”: pracownik
                widzi, co dokładnie trafi do KSeF, zanim cokolwiek wyśle. Pod nią tylko
                dwie kwoty, które mają znaczenie przy ladzie. */}
            <LinesHead>
                <LinesTitle>Pozycje faktury</LinesTitle>
                <Actions>
                    <GhostAction type="button" onClick={() => setItemsOpen(open => !open)}>
                        {areItemsOpen ? <Check /> : <Pencil />}
                        {areItemsOpen ? 'Gotowe' : 'Edytuj'}
                    </GhostAction>
                    <GhostAction type="button" onClick={() => setPreviewOpen(true)}>
                        <Eye />
                        Podgląd faktury
                    </GhostAction>
                </Actions>
            </LinesHead>

            {areItemsOpen ? (
                <>
                    <InvoiceItemsEditor
                        items={state.items}
                        onChange={items => patch({ items })}
                        exemptionBasis={state.exemptionBasis}
                        onExemptionBasisChange={exemptionBasis => patch({ exemptionBasis })}
                    />
                    {!controls.itemsMatchServices && controls.restoredAt === null && (
                        <Actions>
                            <GhostAction type="button" onClick={controls.resetItemsToServices}>
                                Wróć do kwot z usług
                            </GhostAction>
                        </Actions>
                    )}
                </>
            ) : (
                <InvoiceLines items={state.items} fmt={fmt} />
            )}
            <SectionProblems problems={problemsIn('items')} />

            <Totals>
                <TotalRow>
                    <span>Kwota na fakturze</span>
                    <strong>{fmt(invoiceGross)}</strong>
                </TotalRow>
                {isInvoiceOther && (
                    <TotalRow>
                        <span>Kwota do zapłaty na innym dokumencie</span>
                        <strong>{fmt(Math.max(remainder, 0))}</strong>
                    </TotalRow>
                )}
            </Totals>

            <InvoicePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setPreviewOpen(false)}
                company={company}
                buyer={state.buyer}
                items={state.items}
                paymentMethod={state.paymentMethod}
                fmt={fmt}
            />

            {/* ── Stawki VAT inne niż w usługach ───────────────────────────────
                Scalenie usług o różnych stawkach w jedną pozycję zmienia podatek przy
                tej samej cenie dla klienta - mówimy o tym i dajemy scalenie, które go
                nie zmienia. */}
            {controls.vatMismatch && (
                <HintBox $tone="warn" role="status">
                    <span>
                        <strong>Stawki VAT różnią się od usług wizyty.</strong>
                        {controls.vatMismatch.vatDifference !== null && controls.vatMismatch.vatDifference !== 0 && (
                            <>
                                {' '}VAT {controls.vatMismatch.vatDifference > 0 ? 'wyższy' : 'niższy'} o{' '}
                                <strong>{fmt(Math.abs(controls.vatMismatch.vatDifference))}</strong>.
                            </>
                        )}
                    </span>
                    <Actions>
                        <GhostAction type="button" onClick={controls.applyItemsPerRate}>
                            Jedna pozycja na każdą stawkę
                        </GhostAction>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>
                            Wróć do kwot z usług
                        </GhostAction>
                    </Actions>
                </HintBox>
            )}

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
                                wydaniu pojazdu. Token dodasz w <strong>Ustawieniach → KSeF</strong>.
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
                                dodasz w <strong>Ustawieniach → KSeF</strong>.
                            </div>
                        </KsefNotice>
                    )}
                </>
            )}

            {/* ── Bilans ──────────────────────────────────────────────────────
                Jeden komunikat z drogą wyjścia zamiast dwóch powtórzonych (bilans
                i czerwony baner mówiły to samo). Przy podziale bilans niesie równanie
                wyżej, więc tu zostają tylko stany wymagające decyzji. */}
            {balanceState === 'over' && (
                <Balance $state="over" role="alert">
                    <span>
                        Faktura jest wyższa niż kwota wizyty o <strong>{fmt(-remainder)}</strong>.
                    </span>
                    <Actions>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>
                            Wróć do kwot z usług
                        </GhostAction>
                    </Actions>
                </Balance>
            )}
            {balanceState === 'under' && !state.splitRemainder && (
                <Balance $state="under" role="alert">
                    <span>
                        Faktura jest niższa niż kwota wizyty o <strong>{fmt(remainder)}</strong>.
                    </span>
                    <Actions>
                        <GhostAction type="button" onClick={() => controls.setInvoiceOther(true)}>
                            Resztę na inny dokument
                        </GhostAction>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>
                            Wróć do kwot z usług
                        </GhostAction>
                    </Actions>
                </Balance>
            )}
        </Panel>
    );
};

const ExternalNote = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    line-height: 1.55;
    color: ${st.textSecondary};

    strong { color: ${st.text}; font-weight: 600; }
`;

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
