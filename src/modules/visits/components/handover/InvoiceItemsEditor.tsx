import { useState } from 'react';
import styled from 'styled-components';
import { Merge, Plus, Split, Trash2 } from 'lucide-react';
import { InputShell, BareInput, FieldLabel, FormField, Select } from '@/common/components/Form';
import { ui } from '@/common/components/ui';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { GhostAction, Muted } from './HandoverKit';
import {
    isPlnInput,
    lineAmounts,
    lineFullGross,
    type HandoverPrice,
    type InvoiceLine,
    type VatRateCode,
} from '../../types/handover';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 22px minmax(140px, 1fr) 76px 120px 32px;
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

const RATES: Array<{ value: VatRateCode; label: string }> = [
    { value: '23', label: '23%' },
    { value: '8', label: '8%' },
    { value: '5', label: '5%' },
    { value: '0', label: '0%' },
    { value: 'zw', label: 'zw.' },
];

interface InvoiceItemsEditorProps {
    lines: InvoiceLine[];
    prices: HandoverPrice[];
    /** „Faktura + inny dokument”: kwota pozycji niższa niż usługi zostawia resztę na innym dokumencie. */
    split: boolean;
    onChangeLine: (index: number, changes: Partial<InvoiceLine>) => void;
    onChangeRate: (index: number, vatRate: VatRateCode) => void;
    onAddLine: () => void;
    onRemoveLine: (index: number) => void;
    onMerge: (indexes: number[]) => string | null;
    onUnmerge: (index: number) => void;
    exemptionBasis: string;
    onExemptionBasisChange: (value: string) => void;
    fmt: (grosz: number) => string;
}

/**
 * Pozycje faktury: nazwa, stawka VAT i kwota każdej pozycji - tu ustala się, co klient
 * zapłaci, więc przy fakturze nie ma osobnej sekcji „Ceny usług”. Kwota inna niż cena
 * usług zmienia cenę w wizycie; przy podziale niższa zostawia resztę na innym dokumencie.
 * Pozycja dopisana tutaj staje się przy wydaniu usługą wizyty.
 */
export const InvoiceItemsEditor = ({
    lines,
    prices,
    split,
    onChangeLine,
    onChangeRate,
    onAddLine,
    onRemoveLine,
    onMerge,
    onUnmerge,
    exemptionBasis,
    onExemptionBasisChange,
    fmt,
}: InvoiceItemsEditorProps) => {
    const [selected, setSelected] = useState<number[]>([]);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const nameOf = (id: string) => prices.find(p => p.serviceId === id)?.name ?? '';
    const isAdded = (line: InvoiceLine) => line.serviceIds.some(id => prices.find(p => p.serviceId === id)?.added);
    const hasExempt = lines.some(line => lineAmounts(line, prices).vatRate === 'zw');

    const toggleSelected = (index: number) => {
        setMergeError(null);
        setSelected(current => (current.includes(index) ? current.filter(i => i !== index) : [...current, index]));
    };

    const merge = () => {
        const error = onMerge(selected);
        setMergeError(error);
        if (!error) setSelected([]);
    };

    const setAmount = (index: number, value: string) => {
        if (!isPlnInput(value)) return;
        onChangeLine(index, { partialGross: value });
    };

    return (
        <Wrap>
            <Toolbar>
                <GhostAction type="button" onClick={() => { setSelected([]); onAddLine(); }}>
                    <Plus />Dodaj pozycję
                </GhostAction>
                <GhostAction type="button" disabled={selected.length < 2} onClick={merge}>
                    <Merge />Scal zaznaczone{selected.length >= 2 ? ` (${selected.length})` : ''}
                </GhostAction>
                {mergeError && <MergeError role="alert">{mergeError}</MergeError>}
            </Toolbar>

            <HeaderRow>
                <span />
                <span>Nazwa pozycji</span>
                <span>VAT</span>
                <span style={{ textAlign: 'right' }}>{split ? 'Na fakturze' : 'Brutto'}</span>
                <span />
            </HeaderRow>

            {lines.map((line, index) => {
                const item = lineAmounts(line, prices);
                const full = lineFullGross(line, prices);
                const merged = line.serviceIds.length > 1;
                const added = isAdded(line);
                return (
                    <Row key={line.serviceIds.join('|')}>
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
                                    placeholder={added ? 'Nazwa nowej pozycji' : undefined}
                                    aria-label={`Nazwa pozycji ${index + 1}`}
                                    onChange={e => onChangeLine(index, { name: e.target.value })}
                                    $compact
                                />
                            </InputShell>
                            {/* Nazwy usług tylko przy scaleniu - pod jedną usługą powtarzałyby nazwę pozycji. */}
                            {merged && <Sources>Usługi: {line.serviceIds.map(nameOf).join(', ')}</Sources>}
                        </Cell>
                        <Select
                            value={item.vatRate}
                            aria-label={`Stawka VAT, pozycja ${index + 1}`}
                            onChange={e => onChangeRate(index, e.target.value as VatRateCode)}
                            $compact
                        >
                            {RATES.map(rate => <option key={rate.value} value={rate.value}>{rate.label}</option>)}
                        </Select>
                        <InputShell $compact>
                            <BareInput
                                value={line.partialGross}
                                placeholder={fmt(full)}
                                inputMode="decimal"
                                aria-label={split ? `Kwota na fakturze, pozycja ${index + 1}` : `Brutto, pozycja ${index + 1}`}
                                onChange={e => setAmount(index, e.target.value)}
                                onKeyDown={handleZeroAwareKeyDown(line.partialGross, val => setAmount(index, val))}
                                $compact
                            />
                        </InputShell>
                        {added ? (
                            <IconBtn type="button" title="Usuń pozycję" aria-label={`Usuń pozycję ${index + 1}`} onClick={() => onRemoveLine(index)}>
                                <Trash2 />
                            </IconBtn>
                        ) : merged ? (
                            <IconBtn type="button" title="Rozdziel na usługi" aria-label={`Rozdziel pozycję ${index + 1}`} onClick={() => onUnmerge(index)}>
                                <Split />
                            </IconBtn>
                        ) : <span />}
                    </Row>
                );
            })}

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
