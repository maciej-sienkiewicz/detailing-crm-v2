import styled from 'styled-components';
import { Combine, Plus, Split, Trash2 } from 'lucide-react';
import { InputShell, BareInput, FieldLabel, FormField } from '@/common/components/Form';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { Button, ui } from '@/common/components/ui';
import { Muted } from './HandoverKit';
import { VatRateSelect } from './VatRateSelect';
import {
    isPlnInput,
    lineAmounts,
    parsePln,
    toPln,
    vatFromGross,
    vatFromNet,
    type HandoverPrice,
    type InvoiceLine,
    type PriceMode,
    type VatRateCode,
} from '../../types/handover';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: minmax(120px, 1fr) 76px 108px 108px 32px;
    gap: 8px;
    align-items: center;

    /* Telefon: nazwa i akcja w pierwszym wierszu, pod nimi stawka, netto i brutto. */
    @media (max-width: 640px) {
        grid-template-columns: repeat(3, minmax(0, 1fr)) 32px;
        align-items: end;
        padding: 10px;
        border: 1px solid ${ui.line};
        border-radius: 10px;

        > *:nth-child(1) { grid-column: 1 / 4; }
        > *:nth-child(5) { grid-column: 4; grid-row: 1; }
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

/** Pole wyliczone z wpisanego: ta sama ramka, lekko wyszarzone - jak w cenach usług. */
const AmountShell = styled(InputShell)<{ $derived: boolean }>`
    ${p => p.$derived && `background: ${ui.surfaceAlt}; input { color: ${ui.textSecondary}; }`}
`;

const CellLabel = styled.span`
    display: none;
    font-size: 11.5px;
    font-weight: 600;
    color: ${ui.textMuted};

    @media (max-width: 640px) { display: block; }
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
    gap: 6px 8px;
`;

/** Kwoty pozycji do pól: wpisana strona jak wpisana, druga wyliczona z niej przy stawce pozycji. */
const fieldsOf = (line: InvoiceLine, item: { net: string; gross: string; mode: PriceMode; vatRate: VatRateCode }) => {
    if (line.amountMode === 'NET') {
        const net = parsePln(line.amount);
        return { net: line.amount, gross: toPln(net + vatFromNet(net, item.vatRate)), typed: 'NET' as PriceMode };
    }
    if (line.amountMode === 'GROSS') {
        const gross = parsePln(line.amount);
        return { net: toPln(gross - vatFromGross(gross, item.vatRate)), gross: line.amount, typed: 'GROSS' as PriceMode };
    }
    return { net: item.net, gross: item.gross, typed: item.mode };
};

interface InvoiceItemsEditorProps {
    lines: InvoiceLine[];
    prices: HandoverPrice[];
    /** „Faktura + inny dokument”: kwota pozycji niższa niż usługi zostawia resztę na innym dokumencie. */
    split: boolean;
    onChangeLine: (index: number, changes: Partial<InvoiceLine>) => void;
    onChangeRate: (index: number, vatRate: VatRateCode) => void;
    onAddLine: () => void;
    onRemoveLine: (index: number) => void;
    /** „Nadpisz pozycje”: jedna pozycja z całą sumą i pustą nazwą. */
    onOverwrite: () => void;
    onUnmerge: (index: number) => void;
    exemptionBasis: string;
    onExemptionBasisChange: (value: string) => void;
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
    onOverwrite,
    onUnmerge,
    exemptionBasis,
    onExemptionBasisChange,
}: InvoiceItemsEditorProps) => {
    // Kosz tylko przy pozycji złożonej wyłącznie z dopisanych - scalona z usługą wizyty się rozdziela.
    const isAdded = (line: InvoiceLine) => line.serviceIds.every(id => prices.find(p => p.serviceId === id)?.added);
    const hasExempt = lines.some(line => lineAmounts(line, prices).vatRate === 'zw');

    const setAmount = (index: number, mode: PriceMode, value: string) => {
        if (!isPlnInput(value)) return;
        onChangeLine(index, { amount: value, amountMode: mode });
    };

    return (
        <Wrap>
            <Toolbar>
                <Button variant="outline" size="sm" onClick={onAddLine}>
                    <Plus />Dodaj pozycję
                </Button>
                <Button variant="outline" size="sm" disabled={lines.length < 2} onClick={onOverwrite}>
                    <Combine />Nadpisz pozycje
                </Button>
            </Toolbar>

            <HeaderRow>
                <span>Nazwa pozycji</span>
                <span>VAT</span>
                <span>{split ? 'Netto na fakturze' : 'Netto'}</span>
                <span>{split ? 'Brutto na fakturze' : 'Brutto'}</span>
                <span />
            </HeaderRow>

            {lines.map((line, index) => {
                const item = lineAmounts(line, prices);
                const fields = fieldsOf(line, item);
                const merged = line.serviceIds.length > 1;
                const added = isAdded(line);
                return (
                    <Row key={line.serviceIds.join('|')}>
                        <Cell>
                            <InputShell $compact>
                                <BareInput
                                    value={line.name}
                                    placeholder={added ? 'Nazwa nowej pozycji' : 'Nazwa pozycji na fakturze'}
                                    aria-label={`Nazwa pozycji ${index + 1}`}
                                    onChange={e => onChangeLine(index, { name: e.target.value })}
                                    $compact
                                />
                            </InputShell>
                        </Cell>
                        <VatRateSelect
                            value={item.vatRate}
                            ariaLabel={`Stawka VAT, pozycja ${index + 1}`}
                            onChange={rate => onChangeRate(index, rate)}
                        />
                        {(['NET', 'GROSS'] as const).map(mode => {
                            const value = mode === 'NET' ? fields.net : fields.gross;
                            return (
                                <Cell key={mode}>
                                    <CellLabel>{mode === 'NET' ? 'Netto' : 'Brutto'}</CellLabel>
                                    <AmountShell $compact $derived={fields.typed !== mode}>
                                        <BareInput
                                            value={value}
                                            placeholder={added ? '0,00' : undefined}
                                            inputMode="decimal"
                                            aria-label={`${mode === 'NET' ? 'Netto' : 'Brutto'}, pozycja ${index + 1}`}
                                            onChange={e => setAmount(index, mode, e.target.value)}
                                            onKeyDown={handleZeroAwareKeyDown(value, val => setAmount(index, mode, val))}
                                            $compact
                                        />
                                    </AmountShell>
                                </Cell>
                            );
                        })}
                        {added && !merged ? (
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
