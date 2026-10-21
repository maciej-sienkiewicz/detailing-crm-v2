import { useState } from 'react';
import styled from 'styled-components';
import { Check, Pencil, RotateCcw } from 'lucide-react';
import { pluralPl } from '@/common/utils';
import { Button, ui } from '@/common/components/ui';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles/sharedModalStyles';
import { InputShell, BareInput } from '@/common/components/Form';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { SectionProblems } from './HandoverKit';
import { BuyerEditor } from './BuyerEditor';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { InvoiceLines } from './InvoiceLines';
import {
    isPlnInput,
    type HandoverBuyer,
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

/** Akcje przy nagłówku pozycji: małe pigułki aplikacji, nie podkreślone linki. */
const Links = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 8px;
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

/** „Wylicz” pod polem kwoty: przy lewej krawędzi kafla, nie na całą szerokość. */
const RecalcAction = styled(Button)`
    align-self: flex-start;
    margin: 4px 0 0 -11px;
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
    /** „Nadpisz pozycje”: wszystkie pozycje w jedną (jedną na stawkę VAT) z pustą nazwą. */
    overwriteLines: () => void;
    unmerge: (index: number) => void;
}

const savedTime = (iso: string): string | null => {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime())
        ? date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        : null;
};

// ─── Nabywca ──────────────────────────────────────────────────────────────────

interface BuyerModalProps {
    isOpen: boolean;
    onClose: () => void;
    buyer: HandoverBuyer;
    onChange: (buyer: HandoverBuyer) => void;
}

/**
 * Edycja nabywcy faktury w oknie - otwiera ją „Zmień” przy nabywcy w podsumowaniu.
 * Karta nabywcy w lewej kolumnie powtarzała to, co podsumowanie i tak pokazuje.
 */
export const BuyerModal = ({ isOpen, onClose, buyer, onChange }: BuyerModalProps) => (
    <ModalShell isOpen={isOpen} onClose={onClose} size="md" zIndex={SUBMODAL_Z_INDEX} labelledBy="handover-buyer-title">
        <ModalHeader>
            <ModalTitleGroup>
                <ModalTitle id="handover-buyer-title">Nabywca faktury</ModalTitle>
            </ModalTitleGroup>
            <CloseBtn onClick={onClose} />
        </ModalHeader>
        <ModalContent>
            <BuyerEditor buyer={buyer} onChange={onChange} />
        </ModalContent>
        <ModalFooter>
            <Button variant="primary" onClick={onClose}>Gotowe</Button>
        </ModalFooter>
    </ModalShell>
);

/** Przy fakturze od księgowości: co CRM zrobi z nabywcą. */
export const ExternalInvoiceNote = () => (
    <ExternalNote>Fakturę wystawi księgowość. CRM zapisze płatność i nabywcę.</ExternalNote>
);

// ─── Pozycje ──────────────────────────────────────────────────────────────────

interface InvoicePositionsProps {
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    invoiceItems: HandoverItem[];
    invoiceGross: number;
    remainder: number;
    /** Kwota innego dokumentu wyliczona: netto części usług poza fakturą. */
    remainderAuto: number;
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
    problemsIn,
    controls,
    fmt,
}: InvoicePositionsProps) => {
    const [mode, setMode] = useState<'collapsed' | 'list' | 'edit'>('collapsed');
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
            onOverwrite={controls.overwriteLines}
            onUnmerge={controls.unmerge}
            exemptionBasis={state.exemptionBasis}
            onExemptionBasisChange={exemptionBasis => patch({ exemptionBasis })}
        />
    );

    // „Przywróć domyślne” przy nagłówku pozycji, gdy coś zmieniono - tam, gdzie się zmienia.
    const restoreDefaults = (
        <Button variant="outline" size="sm" onClick={controls.resetLines}><RotateCcw />Przywróć domyślne</Button>
    );
    // Przy przywróconym szkicu ten sam przycisk stoi w komunikacie pod pozycjami.
    const changed = !controls.linesMatch && controls.restoredAt === null;

    const notices = (
        <>
            {controls.restoredAt !== null && (
                <Hint $tone="warn" role="status">
                    <span>Wróciły zapisane zmiany cen i pozycji{savedTime(controls.restoredAt) ? ` (${savedTime(controls.restoredAt)})` : ''}.</span>
                    <Links>{restoreDefaults}</Links>
                </Hint>
            )}
        </>
    );


    if (isOther) {
        return (
            <SplitPanel id="handover-positions">
                <Row>
                    <RowText><strong>Faktura + inny dokument</strong></RowText>
                    <Links>
                        {changed && restoreDefaults}
                        <Button variant="outline" size="sm" onClick={() => controls.setInvoiceOther(false)}>Nie dziel</Button>
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
                            <RecalcAction variant="ghost" size="sm" onClick={() => controls.setRemainderInput('')}>
                                <RotateCcw />Wylicz: {fmt(remainderAuto)}
                            </RecalcAction>
                        )}
                    </Tile>
                </Tiles>
                {notices}
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
                        {changed && restoreDefaults}
                        {mode === 'collapsed' && (
                            <Button variant="outline" size="sm" onClick={() => setMode('list')}>Pokaż pozycje</Button>
                        )}
                        {mode === 'list' && (
                            <Button variant="outline" size="sm" onClick={() => setMode('edit')}><Pencil />Edytuj</Button>
                        )}
                        {mode === 'edit' && (
                            <Button variant="tinted" size="sm" onClick={() => setMode('list')}><Check />Gotowe</Button>
                        )}
                    </Links>
                </Row>
                {mode === 'list' && <InvoiceLines items={invoiceItems} fmt={fmt} />}
                {mode === 'edit' && editor}
            </PositionsCard>
            <SectionProblems problems={[...problemsIn('items'), ...problemsIn('balance')]} />
            {notices}
        </>
    );
};
