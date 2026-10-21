import { useState } from 'react';
import styled from 'styled-components';
import { Merge, Split } from 'lucide-react';
import { InputShell, BareInput, FieldLabel, FormField } from '@/common/components/Form';
import { ui } from '@/common/components/ui';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { GhostAction, Muted } from './HandoverKit';
import {
    RATE_LABEL,
    isPlnInput,
    lineAmounts,
    lineFullGross,
    itemAmounts,
    type HandoverPrice,
    type InvoiceLine,
} from '../../types/handover';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.div<{ $split: boolean }>`
    display: grid;
    grid-template-columns: 22px minmax(140px, 1fr) 56px ${p => (p.$split ? '150px 110px' : '110px')} 32px;
    gap: 8px;
    align-items: center;

    @media (max-width: 640px) {
        grid-template-columns: 22px 1fr 1fr;
        padding: 10px;
        border: 1px solid ${ui.line};
        border-radius: 10px;

        > *:nth-child(2) { grid-column: 2 / -1; }
    }
`;

const HeaderRow = styled(Row)`
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textMuted};

    @media (max-width: 640px) { display: none; }
`;

const Cell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const Sources = styled.small`
    font-size: 12px;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const Rate = styled.span`
    font-size: 13px;
    color: ${ui.textSecondary};
    font-variant-numeric: tabular-nums;
`;

const Amount = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
`;

const Toggle = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${ui.inkSoft};
    cursor: pointer;
`;

const IconBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: ${ui.textMuted};
    border-radius: 8px;
    cursor: pointer;

    &:hover { background: ${ui.brandTint}; color: ${ui.brandInk}; }
    svg { width: 15px; height: 15px; }
`;

const Toolbar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 18px;
`;

const MergeError = styled.span`
    font-size: 13px;
    color: ${ui.dangerInk};
`;

interface InvoiceItemsEditorProps {
    lines: InvoiceLine[];
    prices: HandoverPrice[];
    /** „Faktura + inny dokument”: pozycja na fakturze albo na innym dokumencie, z kwotą częściową. */
    split: boolean;
    onChangeLine: (index: number, changes: Partial<InvoiceLine>) => void;
    onMerge: (indexes: number[]) => string | null;
    onUnmerge: (index: number) => void;
    onLinesPerRate: () => void;
    exemptionBasis: string;
    onExemptionBasisChange: (value: string) => void;
    fmt: (grosz: number) => string;
}

/**
 * Pozycje faktury. Kwota pozycji wynika z cen usług (ceny zmienia się w „Cenach usług”),
 * tu układa się opis: nazwy, scalenie usług tej samej stawki i - przy podziale - które
 * pozycje idą na fakturę, a które na inny dokument.
 */
export const InvoiceItemsEditor = ({
    lines,
    prices,
    split,
    onChangeLine,
    onMerge,
    onUnmerge,
    onLinesPerRate,
    exemptionBasis,
    onExemptionBasisChange,
    fmt,
}: InvoiceItemsEditorProps) => {
    const [selected, setSelected] = useState<number[]>([]);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const nameOf = (id: string) => prices.find(p => p.serviceId === id)?.name ?? '';
    const hasExempt = lines.some(line => (!split || line.onInvoice) && lineAmounts(line, prices).vatRate === 'zw');

    const toggleSelected = (index: number) => {
        setMergeError(null);
        setSelected(current => (current.includes(index) ? current.filter(i => i !== index) : [...current, index]));
    };

    const merge = () => {
        const error = onMerge(selected);
        setMergeError(error);
        if (!error) setSelected([]);
    };

    const setPartial = (index: number, value: string) => {
        if (!isPlnInput(value)) return;
        onChangeLine(index, { partialGross: value });
    };

    return (
        <Wrap>
            <Toolbar>
                <GhostAction type="button" disabled={selected.length < 2} onClick={merge}>
                    <Merge />Scal zaznaczone{selected.length >= 2 ? ` (${selected.length})` : ''}
                </GhostAction>
                <GhostAction type="button" onClick={() => { setSelected([]); onLinesPerRate(); }}>
                    Jedna pozycja na każdą stawkę
                </GhostAction>
                {mergeError && <MergeError role="alert">{mergeError}</MergeError>}
            </Toolbar>

            <HeaderRow $split={split}>
                <span />
                <span>Nazwa pozycji</span>
                <span>VAT</span>
                {split && <span>Dokument</span>}
                <span style={{ textAlign: 'right' }}>{split ? 'Na fakturze' : 'Brutto'}</span>
                <span />
            </HeaderRow>

            {lines.map((line, index) => {
                const item = lineAmounts(line, prices);
                const full = lineFullGross(line, prices);
                const merged = line.serviceIds.length > 1;
                const sourceNames = line.serviceIds.map(nameOf);
                const showSources = merged || sourceNames[0]?.trim() !== line.name.trim();
                const onInvoice = !split || line.onInvoice;
                return (
                    <Row key={line.serviceIds.join('|')} $split={split}>
                        <input
                            type="checkbox"
                            aria-label={`Zaznacz pozycję ${index + 1} do scalenia`}
                            checked={selected.includes(index)}
                            onChange={() => toggleSelected(index)}
                        />
                        <Cell>
                            <InputShell $compact>
                                <BareInput
                                    value={line.name}
                                    aria-label={`Nazwa pozycji ${index + 1}`}
                                    onChange={e => onChangeLine(index, { name: e.target.value })}
                                    $compact
                                />
                            </InputShell>
                            {showSources && <Sources>{merged ? 'Usługi: ' : 'Usługa: '}{sourceNames.join(', ')}</Sources>}
                        </Cell>
                        <Rate>{RATE_LABEL[item.vatRate]}</Rate>
                        {split && (
                            <Toggle>
                                <input
                                    type="checkbox"
                                    checked={line.onInvoice}
                                    aria-label={`Pozycja ${index + 1} na fakturze`}
                                    onChange={e => onChangeLine(index, { onInvoice: e.target.checked, partialGross: '' })}
                                />
                                {line.onInvoice ? 'Faktura' : 'Inny dokument'}
                            </Toggle>
                        )}
                        {split && onInvoice ? (
                            <Cell>
                                <InputShell $compact>
                                    <BareInput
                                        value={line.partialGross}
                                        placeholder={fmt(full)}
                                        inputMode="decimal"
                                        aria-label={`Kwota na fakturze, pozycja ${index + 1}`}
                                        title="Puste = cała kwota usług tej pozycji"
                                        onChange={e => setPartial(index, e.target.value)}
                                        onKeyDown={handleZeroAwareKeyDown(line.partialGross, val => setPartial(index, val))}
                                        $compact
                                    />
                                </InputShell>
                            </Cell>
                        ) : (
                            <Amount>{onInvoice ? fmt(itemAmounts(item).gross) : fmt(full)}</Amount>
                        )}
                        {merged ? (
                            <IconBtn type="button" title="Rozdziel na usługi" aria-label={`Rozdziel pozycję ${index + 1}`} onClick={() => onUnmerge(index)}>
                                <Split />
                            </IconBtn>
                        ) : <span />}
                    </Row>
                );
            })}

            {split && (
                <Muted>
                    Pozycje na innym dokumencie i część kwoty ponad wpisaną na fakturze idą na zapis bez paragonu i bez VAT, gotówką.
                </Muted>
            )}

            {hasExempt && (
                <FormField>
                    <FieldLabel>Podstawa prawna zwolnienia z VAT *</FieldLabel>
                    <InputShell $compact>
                        <BareInput
                            value={exemptionBasis}
                            placeholder="np. art. 113 ust. 1 ustawy o VAT"
                            onChange={e => onExemptionBasisChange(e.target.value)}
                            $compact
                        />
                    </InputShell>
                    <Muted>Wymagana przy stawce „zw”. Trafi na fakturę.</Muted>
                </FormField>
            )}
        </Wrap>
    );
};
