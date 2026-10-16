import { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, Building2, User } from 'lucide-react';
import { formatCurrency, pluralPl } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompanySettings } from '@/modules/settings/types';
import { Toggle } from '@/common/components/Toggle';
import { BoxRow, Divider, GhostAction, Muted, SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { SellerPrompt } from './SellerPrompt';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import {
    formatNip,
    invoiceNetOf,
    isPlnInput,
    normalizeNip,
    parsePln,
    toPln,
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

// Wiersz kroju „etykieta po lewej, wartość/akcja po prawej” - wspólny dla
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

/**
 * „Faktura + Inny”: faktura na kwotę, o którą prosi klient, i zapis „Inny” na resztę.
 * Suma obu to zawsze kwota wizyty - tak samo pilnuje tego backend.
 */
const SplitBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const AmountGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
`;

const AmountRow = styled.label`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const AmountInput = styled.input<{ $invalid?: boolean }>`
    width: 150px;
    max-width: 100%;
    height: 38px;
    padding: 0 11px;
    border: 1px solid ${p => (p.$invalid ? '#fca5a5' : st.border)};
    border-radius: ${st.radiusSm};
    background: #fff;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: ${st.text};

    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: 1px; }
`;

/**
 * „Wizyta = Faktura + Inny” jako trzy kwoty obok siebie: przy ladzie wystarczy
 * jedno spojrzenie, żeby sprawdzić, że nic nie zginęło.
 */
const Equation = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 10px;
    padding: 10px 12px;
    border-radius: ${st.radiusSm};
    border: 1px solid #bae6fd;
    background: #f0f9ff;
    color: #0c4a6e;
    font-size: ${st.fontSm};

    strong { font-size: 15px; font-variant-numeric: tabular-nums; color: #0c4a6e; }
    .op { color: #0369a1; font-weight: 700; }
`;

const EquationPart = styled.span`
    display: inline-flex;
    flex-direction: column;
    gap: 1px;
`;

const FieldError = styled.span`
    font-size: 12.5px;
    color: #b91c1c;
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
    /** Faktura na kwotę brutto (brutto wpisane, netto liczone). */
    setInvoiceAmount: (grosz: number) => void;
    /** Faktura na kwotę netto (netto wpisane, brutto liczone). */
    setInvoiceNet: (grosz: number) => void;
    /** Netto wizyty: górna granica netto faktury. */
    visitNet: number;
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

    // Pola kwoty faktury: podczas wpisywania własny tekst pola, żeby „10 0” nie
    // przeskakiwało na „100,00”; bez fokusu (draft = null) oba pokazują aktualne sumy
    // pozycji - drugie pole jest więc zawsze policzone z tego, które wpisano.
    const invoiceNet = invoiceNetOf(state.items);
    const [amountDraft, setAmountDraft] = useState<{ field: 'net' | 'gross'; text: string } | null>(null);
    const netText = amountDraft?.field === 'net' ? amountDraft.text : toPln(invoiceNet);
    const grossText = amountDraft?.field === 'gross' ? amountDraft.text : toPln(invoiceGross);
    const tooHigh = amountDraft !== null && (amountDraft.field === 'net'
        ? parsePln(amountDraft.text) >= controls.visitNet
        : parsePln(amountDraft.text) >= visitGross);
    const onAmountChange = (field: 'net' | 'gross', value: string) => {
        if (!isPlnInput(value)) return;
        setAmountDraft({ field, text: value });
        const grosz = parsePln(value);
        if (field === 'net' && grosz > 0 && grosz < controls.visitNet) controls.setInvoiceNet(grosz);
        if (field === 'gross' && grosz > 0 && grosz < visitGross) controls.setInvoiceAmount(grosz);
    };

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

            {/* ── „Faktura + Inny”: kwota faktury, reszta zapisem „Inny” ──────
                Tylko dwa pola kwoty faktury i forma zapłaty reszty. Wpisane netto
                liczy brutto, wpisane brutto liczy netto (CLAUDE.md §1); pozycje
                przeliczają się same, stawki VAT zostają jak w usługach. */}
            {state.remainderWithoutReceipt && (
                <>
                    <SplitBlock>
                        <AmountGrid>
                            <AmountRow>
                                Faktura netto
                                <AmountInput
                                    value={netText}
                                    inputMode="decimal"
                                    aria-label="Faktura netto"
                                    $invalid={tooHigh && amountDraft?.field === 'net'}
                                    onFocus={() => setAmountDraft({ field: 'net', text: toPln(invoiceNet) })}
                                    onChange={e => onAmountChange('net', e.target.value)}
                                    onBlur={() => setAmountDraft(null)}
                                />
                                <span>zł</span>
                            </AmountRow>
                            <AmountRow>
                                Faktura brutto
                                <AmountInput
                                    value={grossText}
                                    inputMode="decimal"
                                    aria-label="Faktura brutto"
                                    $invalid={tooHigh && amountDraft?.field === 'gross'}
                                    onFocus={() => setAmountDraft({ field: 'gross', text: toPln(invoiceGross) })}
                                    onChange={e => onAmountChange('gross', e.target.value)}
                                    onBlur={() => setAmountDraft(null)}
                                />
                                <span>zł</span>
                            </AmountRow>
                        </AmountGrid>
                        {tooHigh && (
                            <FieldError role="alert">
                                Faktura musi być niższa niż kwota wizyty ({fmt(visitGross)} brutto).
                            </FieldError>
                        )}
                        <Equation aria-label="Podział kwoty wizyty">
                            <EquationPart>Wizyta<strong>{fmt(visitGross)}</strong></EquationPart>
                            <span className="op">=</span>
                            <EquationPart>Faktura<strong>{fmt(invoiceGross)}</strong></EquationPart>
                            <span className="op">+</span>
                            <EquationPart>Inny<strong>{fmt(Math.max(remainder, 0))}</strong></EquationPart>
                        </Equation>
                        {remainder > 0 ? (
                            <>
                                <RowLabel>Jak klient zapłacił „Inny” ({fmt(remainder)})?</RowLabel>
                                <PaymentMethodPicker
                                    value={state.remainderMethod}
                                    onChange={remainderMethod => patch({ remainderMethod })}
                                />
                            </>
                        ) : (
                            <Muted>Wpisz kwotę faktury, resztę kwoty wizyty obejmie „Inny”.</Muted>
                        )}
                    </SplitBlock>

                    <Divider />
                </>
            )}

            {/* ── Przywrócony draft ─────────────────────────────────────────── */}
            {controls.restoredAt !== null && (
                <HintBox $tone="warn" role="status">
                    <span>
                        <strong>Wróciły wcześniejsze zmiany faktury</strong>
                        {savedTime(controls.restoredAt) ? ` (zapisane o ${savedTime(controls.restoredAt)})` : ''}.
                        {' '}Kwoty różnią się od usług wizyty.
                    </span>
                    <Actions>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>
                            Wróć do kwot z usług
                        </GhostAction>
                    </Actions>
                </HintBox>
            )}

            {/* ── Pozycje ─────────────────────────────────────────────────── */}
            <BoxRow>
                <RowLabel>
                    {state.items.length} {pluralPl(state.items.length, 'pozycja', 'pozycje', 'pozycji')} na{' '}
                    <strong className="num">{fmt(invoiceGross)}</strong>
                    {controls.itemsMatchServices && ', zgodnie z usługami wizyty'}
                </RowLabel>
                <GhostAction type="button" onClick={() => setItemsOpen(open => !open)}>
                    {areItemsOpen ? <ChevronDown /> : <ChevronRight />}
                    {areItemsOpen ? 'Zwiń' : 'Edytuj'}
                </GhostAction>
            </BoxRow>

            {areItemsOpen && (
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
            )}
            <SectionProblems problems={problemsIn('items')} />

            {/* ── Stawki VAT inne niż w usługach ───────────────────────────────
                Scalenie usług o różnych stawkach w jedną pozycję zmienia podatek przy
                tej samej cenie dla klienta - mówimy o tym i dajemy scalenie, które go
                nie zmienia. */}
            {controls.vatMismatch && (
                <HintBox $tone="warn" role="status">
                    <span>
                        <strong>Stawki VAT na fakturze różnią się od usług wizyty.</strong>{' '}
                        Usługi: {controls.vatMismatch.serviceRates.join(', ')}. Faktura:{' '}
                        {controls.vatMismatch.invoiceRates.join(', ')}.
                        {controls.vatMismatch.vatDifference !== null && controls.vatMismatch.vatDifference !== 0 && (
                            <>
                                {' '}VAT na fakturze będzie{' '}
                                {controls.vatMismatch.vatDifference > 0 ? 'wyższy' : 'niższy'} o{' '}
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
                        Faktura (<strong>{fmt(invoiceGross)}</strong>) jest wyższa niż kwota wizyty
                        (<strong>{fmt(visitGross)}</strong>). Jeśli klient płaci więcej, zamknij to okno
                        i zmień cenę w sekcji <strong>Usługi</strong> - faktura przeliczy się sama.
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
                    <BalanceRow>
                        <span>Kwota wizyty</span>
                        <strong>{fmt(visitGross)}</strong>
                    </BalanceRow>
                    <BalanceRow>
                        <span>Suma faktury</span>
                        <strong>{fmt(invoiceGross)}</strong>
                    </BalanceRow>
                    <span>
                        Brakuje dokumentu na <strong>{fmt(remainder)}</strong>. Jeśli klient płaci tę
                        kwotę bez faktury, rozlicz ją jako „Inny”. Jeśli dostał rabat, zmień cenę w usługach.
                    </span>
                    <Actions>
                        <GhostAction type="button" onClick={() => controls.setInvoiceOther(true)}>
                            Resztę rozlicz jako „Inny”
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
