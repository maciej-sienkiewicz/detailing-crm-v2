import { useState } from 'react';
import styled from 'styled-components';
import { Building2, Check, Eye, Pencil, User } from 'lucide-react';
import { pluralPl } from '@/common/utils';
import { ui } from '@/common/components/ui';
import type { CompanySettings } from '@/modules/settings/types';
import { GhostAction, SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { InvoiceLines } from './InvoiceLines';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
    formatNip,
    normalizeNip,
    type HandoverProblem,
    type HandoverState,
    type RateMismatch,
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

    span { font-size: 12.5px; font-weight: 600; color: ${ui.textMuted}; }
    strong { font-size: 20px; font-weight: 800; color: ${ui.ink}; font-variant-numeric: tabular-nums; }
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
    itemsMatchServices: boolean;
    vatMismatch: RateMismatch | null;
    /** ISO chwili zapisu przywróconego draftu z pozycjami innymi niż usługi; null = brak. */
    restoredAt: string | null;
    resetItemsToServices: () => void;
    /** Dokument „Faktura + Inny dokument” włączony / wyłączony. */
    setInvoiceOther: (on: boolean) => void;
    applyItemsPerRate: () => void;
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
    invoiceGross: number;
    remainder: number;
    company: CompanySettings | undefined;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    controls: InvoiceControls;
    fmt: (grosz: number) => string;
}

/**
 * Pozycje faktury. Przy zwykłej fakturze zwinięte do jednej linii, bo zwykle są
 * zgodne z usługami; przy „Faktura + Inny dokument” to jedyne miejsce, w którym
 * ustawia się kwotę faktury, więc edycja jest otwarta, a pod nią dwie kwoty.
 */
export const InvoicePositions = ({
    state,
    patch,
    invoiceGross,
    remainder,
    company,
    problemsIn,
    controls,
    fmt,
}: InvoicePositionsProps) => {
    const [mode, setMode] = useState<'collapsed' | 'list' | 'edit'>('collapsed');
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const isOther = state.remainderWithoutReceipt;
    const count = state.items.length;

    const editor = (
        <InvoiceItemsEditor
            items={state.items}
            onChange={items => patch({ items })}
            exemptionBasis={state.exemptionBasis}
            onExemptionBasisChange={exemptionBasis => patch({ exemptionBasis })}
        />
    );

    const notices = (
        <>
            {controls.restoredAt !== null && (
                <Hint $tone="warn" role="status">
                    <span>Wróciły zapisane zmiany pozycji{savedTime(controls.restoredAt) ? ` (${savedTime(controls.restoredAt)})` : ''}.</span>
                    <Links>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>Wróć do kwot z usług</GhostAction>
                    </Links>
                </Hint>
            )}
            {controls.vatMismatch && (
                <Hint $tone="warn" role="status">
                    <span>
                        <strong>Stawki VAT różnią się od usług wizyty.</strong>
                        {controls.vatMismatch.vatDifference !== null && controls.vatMismatch.vatDifference !== 0 && (
                            <>
                                {' '}VAT {controls.vatMismatch.vatDifference > 0 ? 'wyższy' : 'niższy'} o{' '}
                                <strong>{fmt(Math.abs(controls.vatMismatch.vatDifference))}</strong>.
                            </>
                        )}
                    </span>
                    <Links>
                        <GhostAction type="button" onClick={controls.applyItemsPerRate}>Jedna pozycja na każdą stawkę</GhostAction>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>Wróć do kwot z usług</GhostAction>
                    </Links>
                </Hint>
            )}
            {remainder < 0 && (
                <Hint $tone="bad" role="alert">
                    <span>Faktura jest wyższa niż kwota wizyty o <strong>{fmt(-remainder)}</strong>.</span>
                    <Links>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>Wróć do kwot z usług</GhostAction>
                    </Links>
                </Hint>
            )}
            {remainder > 0 && !state.splitRemainder && (
                <Hint $tone="warn" role="alert">
                    <span>Faktura jest niższa niż kwota wizyty o <strong>{fmt(remainder)}</strong>.</span>
                    <Links>
                        <GhostAction type="button" onClick={() => controls.setInvoiceOther(true)}>Resztę na inny dokument</GhostAction>
                        <GhostAction type="button" onClick={controls.resetItemsToServices}>Wróć do kwot z usług</GhostAction>
                    </Links>
                </Hint>
            )}
        </>
    );

    const preview = (
        <InvoicePreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setPreviewOpen(false)}
            company={company}
            buyer={state.buyer}
            items={state.items}
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
                <SectionProblems problems={problemsIn('items')} />
                <Tiles>
                    <Tile>
                        <span>Kwota na fakturze</span>
                        <strong>{fmt(invoiceGross)}</strong>
                    </Tile>
                    <Tile>
                        <span>Kwota do zapłaty na innym dokumencie</span>
                        <strong>{fmt(Math.max(remainder, 0))}</strong>
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
                {mode === 'list' && <InvoiceLines items={state.items} fmt={fmt} />}
                {mode === 'edit' && editor}
            </PositionsCard>
            <SectionProblems problems={problemsIn('items')} />
            {notices}
            {preview}
        </>
    );
};
