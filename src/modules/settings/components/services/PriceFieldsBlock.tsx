// src/modules/settings/components/services/PriceFieldsBlock.tsx
//
// Cena w formularzu usługi i pakietu: brutto, netto, stawka VAT, wycena ręczna.
//
// Brutto stoi pierwsze: tyle płaci klient i tak zwykle wpisuje się cenę. Które pole
// wpisano, pamięta `priceSide` - to ono przechodzi przez zmianę stawki bez zmian
// (CLAUDE.md §1). Cała arytmetyka siedzi w servicePriceForm.helpers.ts.
import { forwardRef } from 'react';
import styled from 'styled-components';
import { FieldLabel, FormErrorMsg, InputShell, BareInput } from '@/common/components/Form';
import { Segmented, ui } from '@/common/components/ui';
import type { VatRate } from '@/modules/services/types';
import {
    changeVat, toggleManualPrice, typeGross, typeNet,
    type PriceFields,
} from './servicePriceForm.helpers';

const VAT_OPTIONS: { value: string; label: string }[] = [
    { value: '23', label: '23%' },
    { value: '8', label: '8%' },
    { value: '5', label: '5%' },
    { value: '0', label: '0%' },
    { value: '-1', label: 'zw.' },
];

interface Props {
    idPrefix: string;
    fields: PriceFields;
    onChange: (next: PriceFields) => void;
    error?: string;
    /** Co się stanie z ceną przy wycenie ręcznej - inne zdanie dla usługi i pakietu. */
    manualHint: string;
}

export const PriceFieldsBlock = forwardRef<HTMLInputElement, Props>(
    ({ idPrefix, fields, onChange, error, manualHint }, grossRef) => {
        const apply = (next: PriceFields | null) => { if (next) onChange(next); };

        return (
            <Block>
                <SwitchRow
                    type="button"
                    role="switch"
                    aria-checked={fields.requireManualPrice}
                    onClick={() => onChange(toggleManualPrice(fields))}
                >
                    <Track $on={fields.requireManualPrice}><Thumb $on={fields.requireManualPrice} /></Track>
                    <SwitchTexts>
                        <strong>Wycena ręczna</strong>
                        <span>{manualHint}</span>
                    </SwitchTexts>
                </SwitchRow>

                {!fields.requireManualPrice && (
                    <>
                        <Grid>
                            <Field>
                                <FieldLabel htmlFor={`${idPrefix}-gross`}>Cena brutto</FieldLabel>
                                <InputShell $hasError={!!error}>
                                    <BareInput
                                        id={`${idPrefix}-gross`}
                                        ref={grossRef}
                                        inputMode="decimal"
                                        autoComplete="off"
                                        placeholder="np. 615,00"
                                        value={fields.grossInput}
                                        onChange={e => apply(typeGross(fields, e.target.value))}
                                        aria-invalid={!!error}
                                    />
                                    <Unit>zł</Unit>
                                </InputShell>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor={`${idPrefix}-net`}>Cena netto</FieldLabel>
                                <InputShell $hasError={!!error}>
                                    <BareInput
                                        id={`${idPrefix}-net`}
                                        inputMode="decimal"
                                        autoComplete="off"
                                        placeholder="np. 500,00"
                                        value={fields.netInput}
                                        onChange={e => apply(typeNet(fields, e.target.value))}
                                        aria-invalid={!!error}
                                    />
                                    <Unit>zł</Unit>
                                </InputShell>
                            </Field>
                        </Grid>
                        {error && <FormErrorMsg>{error}</FormErrorMsg>}

                        <Field>
                            <FieldLabel as="span" id={`${idPrefix}-vat`}>Stawka VAT</FieldLabel>
                            <Segmented
                                label="Stawka VAT"
                                size="sm"
                                options={VAT_OPTIONS}
                                value={String(fields.vatRate)}
                                onChange={v => onChange(changeVat(fields, Number(v) as VatRate))}
                            />
                        </Field>
                    </>
                )}
            </Block>
        );
    },
);
PriceFieldsBlock.displayName = 'PriceFieldsBlock';

const Block = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 520px) { grid-template-columns: minmax(0, 1fr); }
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;

    > div { align-self: stretch; }
    > [role='group'] { align-self: flex-start; }
`;

const Unit = styled.span`
    padding-right: 12px;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const Hint = styled.span`
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const SwitchRow = styled.button`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 4px; border-radius: 8px; }
`;

const Track = styled.span<{ $on: boolean }>`
    position: relative;
    width: 40px;
    height: 24px;
    flex-shrink: 0;
    margin-top: 1px;
    border-radius: 999px;
    background: ${p => (p.$on ? ui.brand : '#cbd5e1')};
    transition: background 150ms ease;
`;

const Thumb = styled.span<{ $on: boolean }>`
    position: absolute;
    top: 3px;
    left: ${p => (p.$on ? '19px' : '3px')};
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
    transition: left 150ms ease;
`;

const SwitchTexts = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 13px; line-height: 1.45; color: ${ui.textMuted}; }
`;
