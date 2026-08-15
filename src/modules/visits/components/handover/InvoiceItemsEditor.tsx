import styled from 'styled-components';
import { Plus, Trash2 } from 'lucide-react';
import { InputShell, BareInput, Select, FieldLabel, FormField } from '@/common/components/Form';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Muted } from './HandoverKit';
import type { HandoverItem, VatRateCode } from '../../types/handover';
import { withDerived } from '../../types/handover';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: minmax(140px, 2.2fr) 100px 100px 82px 32px;
    gap: 8px;
    align-items: center;

    @media (max-width: 640px) {
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        padding: 10px;
        border: 1px solid ${st.border};
        border-radius: ${st.radiusSm};

        > *:first-child { grid-column: 1 / -1; }
    }
`;

const HeaderRow = styled(Row)`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;

    @media (max-width: 640px) { display: none; }
`;

/** Pole pochodne — wartość wyliczona z pola wpisanego, lekko wyszarzona. */
const DerivedShell = styled(InputShell)<{ $derived: boolean }>`
    ${p =>
        p.$derived &&
        `
        background: ${st.bgCardAlt};
        input { color: ${st.textSecondary}; }
    `}
`;

const RemoveBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: ${st.textMuted};
    border-radius: ${st.radiusSm};
    cursor: pointer;

    &:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const AddBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 7px 12px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #1d4ed8;
    background: #eff6ff;
    border: 1px dashed #93c5fd;
    border-radius: ${st.radiusSm};
    cursor: pointer;

    &:hover { background: #dbeafe; }
`;

interface InvoiceItemsEditorProps {
    items: HandoverItem[];
    onChange: (items: HandoverItem[]) => void;
    exemptionBasis: string;
    onExemptionBasisChange: (value: string) => void;
}

/**
 * Tabela pozycji faktury. Wpisana kwota (netto albo brutto) jest źródłem prawdy
 * i nie jest przeliczana wstecz — druga kolumna zawsze pochodna. Backend liczy
 * identycznie, więc 500,00 nie przeskoczy na 499,99.
 */
export const InvoiceItemsEditor = ({
    items,
    onChange,
    exemptionBasis,
    onExemptionBasisChange,
}: InvoiceItemsEditorProps) => {
    const hasExemptItem = items.some(item => item.vatRate === 'zw');

    const updateItem = (index: number, changes: Partial<HandoverItem>) =>
        onChange(
            items.map((item, i) => {
                if (i !== index) return item;
                const next: HandoverItem = { ...item, ...changes };
                // Edycja kwoty przełącza tryb: wpisane netto → NET, brutto → GROSS.
                if (changes.net !== undefined) next.mode = 'NET';
                if (changes.gross !== undefined) next.mode = 'GROSS';
                if (
                    changes.net !== undefined ||
                    changes.gross !== undefined ||
                    changes.vatRate !== undefined
                ) {
                    return withDerived(next);
                }
                return next;
            })
        );

    return (
        <Wrap>
            <HeaderRow>
                <span>Nazwa pozycji</span>
                <span>Netto</span>
                <span>Brutto</span>
                <span>VAT</span>
                <span />
            </HeaderRow>

            {items.map((item, index) => (
                <Row key={index}>
                    <InputShell>
                        <BareInput
                            value={item.name}
                            aria-label={`Nazwa pozycji ${index + 1}`}
                            onChange={e => updateItem(index, { name: e.target.value })}
                        />
                    </InputShell>
                    <DerivedShell $derived={item.mode === 'GROSS'}>
                        <BareInput
                            value={item.net}
                            inputMode="decimal"
                            aria-label={`Netto pozycji ${index + 1}`}
                            title={item.mode === 'GROSS' ? 'Wyliczone z brutto' : 'Kwota wpisana'}
                            onChange={e => updateItem(index, { net: e.target.value })}
                        />
                    </DerivedShell>
                    <DerivedShell $derived={item.mode === 'NET'}>
                        <BareInput
                            value={item.gross}
                            inputMode="decimal"
                            aria-label={`Brutto pozycji ${index + 1}`}
                            title={item.mode === 'NET' ? 'Wyliczone z netto' : 'Kwota wpisana'}
                            onChange={e => updateItem(index, { gross: e.target.value })}
                        />
                    </DerivedShell>
                    <Select
                        value={item.vatRate}
                        aria-label={`Stawka VAT pozycji ${index + 1}`}
                        onChange={e => updateItem(index, { vatRate: e.target.value as VatRateCode })}
                    >
                        <option value="23">23%</option>
                        <option value="8">8%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                        <option value="zw">zw.</option>
                    </Select>
                    <RemoveBtn
                        type="button"
                        disabled={items.length === 1}
                        title="Usuń pozycję"
                        onClick={() => onChange(items.filter((_, i) => i !== index))}
                    >
                        <Trash2 size={15} />
                    </RemoveBtn>
                </Row>
            ))}

            <AddBtn
                type="button"
                onClick={() =>
                    onChange([...items, { name: '', net: '', gross: '', mode: 'GROSS', vatRate: '23' }])
                }
            >
                <Plus size={14} /> Dodaj pozycję
            </AddBtn>

            {hasExemptItem && (
                <FormField>
                    <FieldLabel>Podstawa prawna zwolnienia z VAT *</FieldLabel>
                    <InputShell>
                        <BareInput
                            value={exemptionBasis}
                            placeholder="np. art. 113 ust. 1 ustawy o VAT"
                            onChange={e => onExemptionBasisChange(e.target.value)}
                        />
                    </InputShell>
                    <Muted>Wymagana przez KSeF dla stawki „zw" — trafia na fakturę jako pole P_19A.</Muted>
                </FormField>
            )}
        </Wrap>
    );
};
