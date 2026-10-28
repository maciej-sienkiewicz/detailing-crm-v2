// src/modules/finance/components/InvoiceEditCorrection.tsx
//
// „Popraw fakturę" - korekta jak edycja. Pozycje faktury stają się polami do poprawienia,
// a serwer składa z różnic jedną fakturę korygującą: zmieniona pozycja trafia na nią jako
// stan przed i stan po. Literówka w numerze rejestracyjnym to jedna korekta bez zmiany kwot,
// a nie korekta do zera i nowa faktura.
import React from 'react';
import styled from 'styled-components';
import { Plus, X } from 'lucide-react';
import { FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import {
    CORRECTION_REASONS,
    VAT_RATE_OPTIONS,
    lineProblem,
    newEditLine,
    type EditChange,
    type EditLine,
} from '../utils/invoiceEdit';

const Box = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 13px;
    color: #334155;
`;

const Lead = styled.p`
    margin: 0;
    line-height: 1.55;
    color: #475569;
    strong { color: #0f172a; }
`;

const Table = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.div<{ $removed?: boolean }>`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 72px 120px 84px 32px;
    gap: 8px;
    align-items: center;

    @media (max-width: 720px) {
        grid-template-columns: 1fr 1fr 1fr;
        > :first-child { grid-column: 1 / -1; }
    }
`;

const Head = styled(Row)`
    font-size: 11.5px;
    font-weight: 600;
    color: #64748b;
`;

const Field = styled.input`
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font: inherit;
    color: #0f172a;
    background: #ffffff;
    &:focus { outline: none; border-color: #93c5fd; box-shadow: 0 0 0 3px #dbeafe; }
    &[aria-invalid='true'] { border-color: #fca5a5; }
`;

const Select = styled.select`
    width: 100%;
    padding: 8px 6px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font: inherit;
    background: #ffffff;
`;

const IconBtn = styled.button`
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    color: #64748b;
    cursor: pointer;
    &:hover { color: #b91c1c; border-color: #fecaca; }
`;

const AddBtn = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px dashed #cbd5e1;
    border-radius: 999px;
    background: #ffffff;
    font: inherit;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    &:hover { border-color: #94a3b8; color: #0f172a; }
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    button {
        padding: 4px 11px;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #ffffff;
        font: inherit;
        color: #475569;
        cursor: pointer;
        &[aria-pressed='true'] { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
    }
`;

const Effect = styled.p<{ $tone: 'neutral' | 'info' }>`
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    line-height: 1.5;
    background: ${p => (p.$tone === 'info' ? '#eff6ff' : '#f8fafc')};
    color: ${p => (p.$tone === 'info' ? '#1e40af' : '#475569')};
`;

const Problem = styled.span`
    grid-column: 1 / -1;
    font-size: 12px;
    color: #b91c1c;
`;

interface InvoiceEditCorrectionProps {
    lines: EditLine[];
    onLinesChange: (lines: EditLine[]) => void;
    reason: string;
    onReasonChange: (reason: string) => void;
    change: EditChange;
}

const EFFECT: Record<EditChange, string> = {
    none: 'Popraw pozycję, która jest błędna - reszta zostaje bez zmian.',
    description: 'Kwoty bez zmian. Korekta poprawi tylko opis: na fakturze korygującej pozycja stanie raz z błędną nazwą (przed korektą) i raz z poprawną.',
    amounts: 'Zmienia się ilość, cena albo lista pozycji. Korekta wykaże różnicę kwot - policzymy ją przy wystawieniu tak samo jak na fakturze.',
};

export const InvoiceEditCorrection: React.FC<InvoiceEditCorrectionProps> = ({
    lines,
    onLinesChange,
    reason,
    onReasonChange,
    change,
}) => {
    const update = (key: string, patch: Partial<EditLine>) =>
        onLinesChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

    return (
        <Box aria-label="Poprawa faktury">
            <Lead>
                <strong>Popraw fakturę.</strong> Zmień to, co jest błędne. Wystawimy jedną fakturę korygującą
                i wyślemy ją do KSeF - faktura pierwotna zostaje ważna.
            </Lead>

            <Table role="group" aria-label="Pozycje po korekcie">
                <Head aria-hidden="true">
                    <span>Nazwa</span>
                    <span>Ilość</span>
                    <span>J.m.</span>
                    <span>Cena jedn.</span>
                    <span>VAT</span>
                    <span />
                </Head>
                {lines.map((line) => {
                    const problem = line.name || line.price ? lineProblem(line) : null;
                    return (
                        <Row key={line.key}>
                            <Field
                                aria-label="Nazwa pozycji"
                                value={line.name}
                                onChange={(e) => update(line.key, { name: e.target.value })}
                            />
                            <Field
                                aria-label="Ilość"
                                inputMode="decimal"
                                value={line.quantity}
                                onChange={(e) => update(line.key, { quantity: e.target.value })}
                            />
                            <Field
                                aria-label="Jednostka"
                                value={line.unit}
                                onChange={(e) => update(line.key, { unit: e.target.value })}
                            />
                            <Field
                                aria-label={line.priceMode === 'GROSS' ? 'Cena jednostkowa brutto' : 'Cena jednostkowa netto'}
                                title={line.priceMode === 'GROSS' ? 'Cena brutto - tak jak na fakturze' : 'Cena netto - tak jak na fakturze'}
                                inputMode="decimal"
                                value={line.price}
                                aria-invalid={problem === 'Wpisz cenę'}
                                onChange={(e) => update(line.key, { price: e.target.value })}
                            />
                            <Select
                                aria-label="Stawka VAT"
                                value={line.vatRate}
                                onChange={(e) => update(line.key, { vatRate: e.target.value })}
                            >
                                {VAT_RATE_OPTIONS.map((rate) => (
                                    <option key={rate} value={rate}>{rate === 'zw' ? 'zw.' : `${rate}%`}</option>
                                ))}
                            </Select>
                            <IconBtn
                                type="button"
                                aria-label={`Usuń pozycję ${line.name || ''}`.trim()}
                                title="Usuń pozycję z faktury"
                                onClick={() => onLinesChange(lines.filter((candidate) => candidate.key !== line.key))}
                            >
                                <X size={14} />
                            </IconBtn>
                            {problem && <Problem>{problem}</Problem>}
                        </Row>
                    );
                })}
                <AddBtn type="button" onClick={() => onLinesChange([...lines, newEditLine()])}>
                    <Plus size={14} /> Dodaj pozycję
                </AddBtn>
            </Table>

            <Effect $tone={change === 'none' ? 'neutral' : 'info'} role="status">{EFFECT[change]}</Effect>

            <div>
                <FieldLabel>Przyczyna korekty *</FieldLabel>
                <Chips role="group" aria-label="Gotowe przyczyny">
                    {CORRECTION_REASONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={reason === option}
                            onClick={() => onReasonChange(option)}
                        >
                            {option}
                        </button>
                    ))}
                </Chips>
                <InputShell style={{ marginTop: 8 }}>
                    <BareInput
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder="Przyczyna trafi na fakturę korygującą"
                    />
                </InputShell>
            </div>
        </Box>
    );
};
