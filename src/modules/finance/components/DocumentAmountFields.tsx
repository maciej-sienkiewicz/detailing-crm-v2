// src/modules/finance/components/DocumentAmountFields.tsx
//
// Pola kwot dokumentu przychodowego: stawka VAT, netto, brutto i VAT jako wynik.
// Wspólne dla okien „Nowy dokument" i „Edytuj dokument" - oba liczyły VAT na sztywno
// po 23% i przyjmowały tylko netto. Arytmetyka i decyzja, które pole zostaje przy
// zmianie stawki, mieszkają w utils/amountInputs.ts.

import styled from 'styled-components';
import { Segmented, ui } from '@/common/components/ui';
import { FormGrid, FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import {
    DOCUMENT_VAT_OPTIONS,
    documentAmountsToCents,
    withDocumentGross,
    withDocumentNet,
    withDocumentVatRate,
    type DocumentAmounts,
} from '../utils/amountInputs';
import { formatMoney } from '../utils/formatters';

const VatResult = styled.p`
    grid-column: 1 / -1;
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};

    strong { color: ${ui.ink}; font-weight: 600; }
`;

/** Dwa miejsca po przecinku - reszta przepadłaby przy zamianie na grosze. */
const MAX_2_DECIMALS = /^\d*([.,]\d{0,2})?$/;

interface Props {
    idPrefix: string;
    value: DocumentAmounts;
    onChange: (next: DocumentAmounts) => void;
    /** Kwot nie wolno zmienić (dokument z wydania pojazdu, faktura KSeF). */
    disabled?: boolean;
}

export function DocumentAmountFields({ idPrefix, value, onChange, disabled }: Props) {
    const cents = documentAmountsToCents(value);
    const onNet = (raw: string) => { if (MAX_2_DECIMALS.test(raw)) onChange(withDocumentNet(value, raw)); };
    const onGross = (raw: string) => { if (MAX_2_DECIMALS.test(raw)) onChange(withDocumentGross(value, raw)); };

    return (
        <FormGrid>
            <FormField $fullWidth>
                <FieldLabel as="span">Stawka VAT</FieldLabel>
                {disabled ? (
                    <span>{DOCUMENT_VAT_OPTIONS.find(o => o.value === value.vatRate)?.label}</span>
                ) : (
                    <Segmented
                        label="Stawka VAT"
                        options={DOCUMENT_VAT_OPTIONS}
                        value={value.vatRate}
                        onChange={rate => onChange(withDocumentVatRate(value, rate))}
                        size="sm"
                    />
                )}
            </FormField>

            <FormField>
                <FieldLabel htmlFor={`${idPrefix}-netAmount`}>Kwota netto (PLN)</FieldLabel>
                <InputShell>
                    <BareInput
                        id={`${idPrefix}-netAmount`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={value.net}
                        onChange={e => onNet(e.target.value)}
                        onKeyDown={handleZeroAwareKeyDown(value.net, onNet)}
                        disabled={disabled}
                        autoComplete="off"
                    />
                </InputShell>
            </FormField>

            <FormField>
                <FieldLabel htmlFor={`${idPrefix}-grossAmount`}>Kwota brutto (PLN)</FieldLabel>
                <InputShell>
                    <BareInput
                        id={`${idPrefix}-grossAmount`}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={value.gross}
                        onChange={e => onGross(e.target.value)}
                        onKeyDown={handleZeroAwareKeyDown(value.gross, onGross)}
                        disabled={disabled}
                        autoComplete="off"
                    />
                </InputShell>
            </FormField>

            {cents && (
                <VatResult aria-live="polite">
                    VAT <strong>{formatMoney(cents.totalVat)}</strong>
                </VatResult>
            )}
        </FormGrid>
    );
}
