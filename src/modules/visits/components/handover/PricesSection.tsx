import { useState } from 'react';
import styled from 'styled-components';
import { Check, Pencil, RotateCcw } from 'lucide-react';
import { InputShell, BareInput, Select } from '@/common/components/Form';
import { ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { GhostAction, SectionProblems } from './HandoverKit';
import {
    RATE_LABEL,
    isPlnInput,
    priceChanged,
    type HandoverPrice,
    type HandoverProblem,
    type VatRateCode,
} from '../../types/handover';

/*
 * Ceny usług przy wydaniu. Osoba wydająca auto może na końcu zmienić cenę (podwyżka,
 * rabat) i stawkę VAT usługi - zmiana trafia do wizyty, więc widzą ją statystyki, a faktura
 * i drugi dokument ją przejmują (decyzja biznesu z 20.10.2026). Na fakturze nie zmienia
 * się już ceny: tam układa się tylko opis pozycji.
 */

const Card = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
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

const Change = styled.span<{ $tone: 'down' | 'up' }>`
    font-size: 13px;
    font-weight: 600;
    color: ${p => (p.$tone === 'down' ? ui.okInk : ui.warnInk)};
    font-variant-numeric: tabular-nums;
`;

const Links = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: minmax(140px, 2.2fr) 104px 104px 82px;
    gap: 8px;
    align-items: start;

    @media (max-width: 640px) {
        grid-template-columns: 1fr 1fr;
        padding: 10px;
        border: 1px solid ${ui.line};
        border-radius: 10px;

        > *:first-child { grid-column: 1 / -1; }
    }
`;

const Header = styled(Grid)`
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

const CellLabel = styled.span`
    display: none;
    font-size: 11.5px;
    font-weight: 600;
    color: ${ui.textMuted};

    @media (max-width: 640px) { display: block; }
`;

const Name = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
    padding-top: 7px;

    @media (max-width: 640px) { padding-top: 0; }
`;

const Was = styled.small`
    font-size: 12px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

/** Pole pochodne: wartość wyliczona z pola wpisanego, lekko wyszarzona. */
const DerivedShell = styled(InputShell)<{ $derived: boolean }>`
    ${p => p.$derived && `background: ${ui.surfaceAlt}; input { color: ${ui.textSecondary}; }`}
`;

interface PricesSectionProps {
    prices: HandoverPrice[];
    onChange: (serviceId: string, changes: Partial<Pick<HandoverPrice, 'net' | 'gross' | 'vatRate'>>) => void;
    onReset: () => void;
    /** Rabat (+) albo dopłata (−) przy wydaniu, brutto. */
    discount: number;
    totalGross: number;
    problems: HandoverProblem[];
    fmt: (grosz: number) => string;
    /**
     * Kiedy zmienia się cena: „przy wydaniu” (ekran wydania) albo „w poprawce” (poprawka
     * rozliczenia) - ta sama tabela cen w obu oknach, różni się tylko podpis zmiany.
     */
    changeContext?: string;
    /** Tabela cen od razu otwarta - w poprawce rozliczenia cena to najczęstszy powód wejścia. */
    defaultEditing?: boolean;
}

export const PricesSection = ({
    prices, onChange, onReset, discount, totalGross, problems, fmt, changeContext = 'przy wydaniu', defaultEditing = false,
}: PricesSectionProps) => {
    const changed = prices.some(priceChanged);
    const [editing, setEditing] = useState(changed || defaultEditing);
    const count = prices.length;

    const setAmount = (price: HandoverPrice, field: 'net' | 'gross', value: string) => {
        if (!isPlnInput(value)) return;
        onChange(price.serviceId, field === 'net' ? { net: value } : { gross: value });
    };

    return (
        <>
            <Card id="handover-prices">
                <Row>
                    <RowText>
                        {count} {pluralPl(count, 'usługa', 'usługi', 'usług')}, <strong>{fmt(totalGross)} brutto</strong>
                    </RowText>
                    <Links>
                        {changed && (
                            <GhostAction type="button" onClick={onReset}><RotateCcw />Ceny z wizyty</GhostAction>
                        )}
                        <GhostAction type="button" onClick={() => setEditing(e => !e)}>
                            {editing ? <><Check />Gotowe</> : <><Pencil />Zmień ceny</>}
                        </GhostAction>
                    </Links>
                </Row>
                {discount !== 0 && (
                    <Change $tone={discount > 0 ? 'down' : 'up'}>
                        {discount > 0
                            ? `Rabat ${changeContext} ${fmt(discount)} brutto`
                            : `Dopłata ${changeContext} ${fmt(-discount)} brutto`}
                    </Change>
                )}

                {editing && (
                    <>
                        <Header>
                            <span>Usługa</span>
                            <span>Netto</span>
                            <span>Brutto</span>
                            <span>VAT</span>
                        </Header>
                        {prices.map(price => {
                            const was = priceChanged(price)
                                ? `było ${fmt(price.originalGross)}${price.vatRate !== price.originalRate ? `, ${RATE_LABEL[price.originalRate]}` : ''}`
                                : null;
                            return (
                                <Grid key={price.serviceId}>
                                    <Cell>
                                        <Name>{price.name}</Name>
                                        {was && <Was>{was}</Was>}
                                    </Cell>
                                    <Cell>
                                        <CellLabel>{price.mode === 'GROSS' ? 'Netto (wyliczone)' : 'Netto'}</CellLabel>
                                        <DerivedShell $derived={price.mode === 'GROSS'} $compact>
                                            <BareInput
                                                value={price.net}
                                                inputMode="decimal"
                                                aria-label={`Netto: ${price.name}`}
                                                onChange={e => setAmount(price, 'net', e.target.value)}
                                                onKeyDown={handleZeroAwareKeyDown(price.net, val => setAmount(price, 'net', val))}
                                                $compact
                                            />
                                        </DerivedShell>
                                    </Cell>
                                    <Cell>
                                        <CellLabel>{price.mode === 'NET' ? 'Brutto (wyliczone)' : 'Brutto'}</CellLabel>
                                        <DerivedShell $derived={price.mode === 'NET'} $compact>
                                            <BareInput
                                                value={price.gross}
                                                inputMode="decimal"
                                                aria-label={`Brutto: ${price.name}`}
                                                onChange={e => setAmount(price, 'gross', e.target.value)}
                                                onKeyDown={handleZeroAwareKeyDown(price.gross, val => setAmount(price, 'gross', val))}
                                                $compact
                                            />
                                        </DerivedShell>
                                    </Cell>
                                    <Cell>
                                        <CellLabel>Stawka VAT</CellLabel>
                                        <Select
                                            value={price.vatRate}
                                            aria-label={`Stawka VAT: ${price.name}`}
                                            onChange={e => onChange(price.serviceId, { vatRate: e.target.value as VatRateCode })}
                                            $compact
                                        >
                                            <option value="23">23%</option>
                                            <option value="8">8%</option>
                                            <option value="5">5%</option>
                                            <option value="0">0%</option>
                                            <option value="zw">zw.</option>
                                        </Select>
                                    </Cell>
                                </Grid>
                            );
                        })}
                        <RowText>
                            Nowa cena zmienia cenę wizyty: zobaczą ją statystyki, faktura i inny dokument.
                        </RowText>
                    </>
                )}
            </Card>
            <SectionProblems problems={problems} />
        </>
    );
};
