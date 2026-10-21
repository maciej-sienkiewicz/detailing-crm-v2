import { useState } from 'react';
import styled from 'styled-components';
import { Building2, Check, Eye, Pencil, RotateCcw, User } from 'lucide-react';
import { pluralPl } from '@/common/utils';
import { ui } from '@/common/components/ui';
import { InputShell, BareInput } from '@/common/components/Form';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import type { CompanySettings } from '@/modules/settings/types';
import { GhostAction, SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { InvoiceLines } from './InvoiceLines';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
    formatNip,
    isPlnInput,
    normalizeNip,
    type HandoverItem,
    type HandoverProblem,
    type HandoverState,
    type InvoiceLine,
    type VatRateCode,
} from '../../types/handover';

/**
 * Części faktury w lewej kolumnie ekranu rozliczenia: nabywca pod wyborem dokumentu
 * i pozycje (albo blok „Faktura + Inny dokument”). Kwota, podsumowanie i przycisk
 * stoją w prawej kolumnie - tu są tylko decyzje.
 */

const Card = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 16px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
`;

const PositionsCard = styled(Card)`
    flex-direction: column;
    align-items: stretch;
`;

const BuyerLine = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;

    > svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; color: ${ui.textMuted}; }
`;

const BuyerText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const BuyerName = styled.strong`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

// Dwa fakty jako dwa elementy z odstępem, nie ciąg z kropką (CLAUDE.md §4).
const BuyerMeta = styled.span`
    display: flex;
    flex-wrap: wrap;
    column-gap: 14px;
    font-size: 13px;
    color: ${ui.textSecondary};
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 16px;
`;

const RowText = styled.span`
    font-size: 14px;
    color: ${ui.inkSoft};

    strong { color: ${ui.ink}; font-variant-numeric: tabular-nums; }
`;

const Links = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
`;

/** „Faktura + Inny dokument”: jedyny tintowany blok w lewej kolumnie - to tu ustawia się kwotę. */
const SplitPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid ${ui.brandLineSoft};
    border-radius: 14px;
    background: ${ui.brandTint};
`;

const Tiles = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 480px) { grid-template-columns: minmax(0, 1fr); }
`;

const Tile = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};

    > span { font-size: 12.5px; font-weight: 600; color: ${ui.textMuted}; }
    strong { font-size: 20px; font-weight: 800; color: ${ui.ink}; font-variant-numeric: tabular-nums; }
    small { font-size: 12.5px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

/** Kwota innego dokumentu jako pole: wyliczona podpowiada się w placeholderze. */
const AmountShell = styled(InputShell)`
    input { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
`;

const Hint = styled.div<{ $tone: 'warn' | 'bad' }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.5;
    ${p => p.$tone === 'warn'
        ? 'background: #fffbeb; border: 1px solid #fde68a; color: #78350f;'
        : 'background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d;'}

    strong { font-weight: 700; font-variant-numeric: tabular-nums; }
`;

const ExternalNote = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textSecondary};
`;

export interface InvoiceControls {
    /** Pozycje ułożone dokładnie jak usługi (bez scaleń, nazw i podziału). */
    linesMatch: boolean;
    /** ISO chwili zapisu przywróconego draftu ze zmianami; null = brak. */
    restoredAt: string | null;
    resetLines: () => void;
    /** Dokument „Faktura + Inny dokument” włączony / wyłączony. */
    setInvoiceOther: (on: boolean) => void;
    /** Kwota innego dokumentu wpisana ręcznie; '' = wyliczona. */
    setRemainderInput: (value: string) => void;
    changeLine: (index: number, changes: Partial<InvoiceLine>) => void;
    changeLineRate: (index: number, vatRate: VatRateCode) => void;
    addLine: () => void;
    removeLine: (index: number) => void;
    mergeSelected: (indexes: number[]) => string | null;
    unmerge: (index: number) => void;
}

const savedTime = (iso: string): string | null => {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        : null;
};

// ─── Nabywca ──────────────────────────────────────────────────────────────────

interface InvoiceBuyerProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    invoicedExternally: boolean;
}

/** Nabywca tak, jak trafi na fakturę - z NIP-em z kartoteki, który backend dokleja, gdy pole jest puste. */
export const InvoiceBuyer = ({ state, patch, problemsIn, invoicedExternally }: InvoiceBuyerProps) => {
    const [isOpen, setOpen] = useState(false);
    const nip = normalizeNip(state.buyer.nip);
    const address = [state.buyer.addressLine1, state.buyer.addressLine2].map(p => p.trim()).filter(Boolean).join(', ');

    return (
        <>
            <Card id="handover-buyer">
                <BuyerLine>
                    {nip ? <Building2 aria-hidden="true" /> : <User aria-hidden="true" />}
                    <BuyerText>
                        <BuyerName>{state.buyer.name.trim() || 'Brak nazwy nabywcy'}</BuyerName>
                        <BuyerMeta>
                            <span>{nip ? `NIP ${formatNip(nip)}` : 'Osoba prywatna'}</span>
                            {address && <span>{address}</span>}
                        </BuyerMeta>
                    </BuyerText>
                </BuyerLine>
                <GhostAction type="button" onClick={() => setOpen(open => !open)}>
                    {isOpen ? 'Gotowe' : 'Zmień'}
                </GhostAction>
            </Card>
            {isOpen && <BuyerEditor buyer={state.buyer} onChange={buyer => patch({ buyer })} />}
            <SectionProblems problems={problemsIn('buyer')} />
            {invoicedExternally && <ExternalNote>Fakturę wystawi księgowość. CRM zapisze płatność i nabywcę.</ExternalNote>}
        </>
    );
};

// ─── Pozycje ──────────────────────────────────────────────────────────────────

interface InvoicePositionsProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    invoiceItems: HandoverItem[];
    invoiceGross: number;
    remainder: number;
    /** Kwota innego dokumentu wyliczona: netto części usług poza fakturą. */
    remainderAuto: number;
    company: CompanySettings | undefined;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    controls: InvoiceControls;
    fmt: (grosz: number) => string;
}

/**
 * Pozycje faktury. Przy zwykłej fakturze zwinięte do jednej linii, bo zwykle są zgodne
 * z usługami; przy „Faktura + Inny dokument” edycja jest otwarta - tu wskazuje się, które
 * usługi idą na fakturę - a pod nią dwie kwoty.
 */
export const InvoicePositions = ({
    state,
    patch,
    invoiceItems,
    invoiceGross,
    remainder,
    remainderAuto,
    company,
    problemsIn,
    controls,
    fmt,
}: InvoicePositionsProps) => {
    const [mode, setMode] = useState<'collapsed' | 'list' | 'edit'>('collapsed');
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const isOther = state.splitRemainder;
    const count = invoiceItems.length;

    const editor = (
        <InvoiceItemsEditor
            lines={state.lines}
            prices={state.prices}
            split={isOther}
            onChangeLine={controls.changeLine}
            onChangeRate={controls.changeLineRate}
            onAddLine={controls.addLine}
            onRemoveLine={controls.removeLine}
            onMerge={controls.mergeSelected}
            onUnmerge={controls.unmerge}
            exemptionBasis={state.exemptionBasis}
            onExemptionBasisChange={exemptionBasis => patch({ exemptionBasis })}
            fmt={fmt}
        />
    );

    const notices = (
        <>
            {controls.restoredAt !== null && (
                <Hint $tone="warn" role="status">
                    <span>Wróciły zapisane zmiany cen i pozycji{savedTime(controls.restoredAt) ? ` (${savedTime(controls.restoredAt)})` : ''}.</span>
                    <Links>
                        <GhostAction type="button" onClick={controls.resetLines}>Pozycje jak usługi</GhostAction>
                    </Links>
                </Hint>
            )}
            {!controls.linesMatch && !isOther && (
                <Links>
                    <GhostAction type="button" onClick={controls.resetLines}>Pozycje jak usługi</GhostAction>
                </Links>
            )}
        </>
    );

    const preview = (
        <InvoicePreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setPreviewOpen(false)}
            company={company}
            buyer={state.buyer}
            items={invoiceItems}
            paymentMethod={state.paymentMethod}
            fmt={fmt}
        />
    );

    if (isOther) {
        return (
            <SplitPanel id="handover-positions">
                <Row>
                    <RowText><strong>Faktura + inny dokument</strong></RowText>
                    <Links>
                        <GhostAction type="button" onClick={() => setPreviewOpen(true)}><Eye />Podgląd faktury</GhostAction>
                        <GhostAction type="button" onClick={() => controls.setInvoiceOther(false)}>Nie dziel</GhostAction>
                    </Links>
                </Row>
                {editor}
                <SectionProblems problems={[...problemsIn('items'), ...problemsIn('balance')]} />
                <Tiles>
                    <Tile>
                        <span>Kwota na fakturze</span>
                        <strong>{fmt(invoiceGross)}</strong>
                    </Tile>
                    <Tile>
                        <span>Inny dokument: bez paragonu, bez VAT, gotówka</span>
                        <AmountShell $compact>
                            <BareInput
                                value={state.remainderInput}
                                placeholder={fmt(remainderAuto)}
                                inputMode="decimal"
                                aria-label="Kwota innego dokumentu"
                                onChange={e => isPlnInput(e.target.value) && controls.setRemainderInput(e.target.value)}
                                onKeyDown={handleZeroAwareKeyDown(state.remainderInput, controls.setRemainderInput)}
                                $compact
                            />
                        </AmountShell>
                        {state.remainderInput.trim() && remainder !== remainderAuto && (
                            <GhostAction type="button" onClick={() => controls.setRemainderInput('')}>
                                <RotateCcw />Wylicz: {fmt(remainderAuto)}
                            </GhostAction>
                        )}
                    </Tile>
                </Tiles>
                {notices}
                {preview}
            </SplitPanel>
        );
    }

    return (
        <>
            <PositionsCard id="handover-positions">
                <Row>
                    <RowText>
                        {count} {pluralPl(count, 'pozycja', 'pozycje', 'pozycji')}, <strong>{fmt(invoiceGross)} brutto</strong>
                    </RowText>
                    <Links>
                        {mode === 'collapsed' && (
                            <GhostAction type="button" onClick={() => setMode('list')}>Pokaż pozycje</GhostAction>
                        )}
                        {mode === 'list' && (
                            <GhostAction type="button" onClick={() => setMode('edit')}><Pencil />Edytuj</GhostAction>
                        )}
                        {mode === 'edit' && (
                            <GhostAction type="button" onClick={() => setMode('list')}><Check />Gotowe</GhostAction>
                        )}
                        <GhostAction type="button" onClick={() => setPreviewOpen(true)}><Eye />Podgląd faktury</GhostAction>
                    </Links>
                </Row>
                {mode === 'list' && <InvoiceLines items={invoiceItems} fmt={fmt} />}
                {mode === 'edit' && editor}
            </PositionsCard>
            <SectionProblems problems={[...problemsIn('items'), ...problemsIn('balance')]} />
            {notices}
            {preview}
        </>
    );
};
