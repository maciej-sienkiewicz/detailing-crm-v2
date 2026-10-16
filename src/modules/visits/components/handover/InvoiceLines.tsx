import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import { RATE_LABEL, itemAmounts, type HandoverItem } from '../../types/handover';

/**
 * Pozycje faktury tak, jak stoją na dokumencie: nazwa, pod nią stawka i netto, po prawej
 * brutto. Ta sama lista w sekcji faktury i w podglądzie - to, co pracownik widzi przed
 * wydaniem, jest dokładnie tym, co pójdzie do KSeF.
 *
 * VAT pozycji to różnica brutto − netto (CLAUDE.md §1), nie osobne mnożenie.
 */
const List = styled.ol`
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid ${ui.line};
    border-radius: 10px;
    background: ${ui.surface};
    overflow: hidden;
`;

const Line = styled.li`
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    gap: 2px 10px;
    align-items: baseline;
    padding: 11px 14px;

    & + & { border-top: 1px solid ${ui.lineSoft}; }
`;

const No = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${ui.textFaint};
    font-variant-numeric: tabular-nums;
`;

const Name = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Gross = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const Meta = styled.span`
    grid-column: 2 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 12.5px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

interface InvoiceLinesProps {
    items: HandoverItem[];
    fmt: (grosz: number) => string;
}

export const InvoiceLines = ({ items, fmt }: InvoiceLinesProps) => (
    <List aria-label="Pozycje faktury">
        {items.map((item, index) => {
            const { net, gross } = itemAmounts(item);
            return (
                <Line key={index}>
                    <No>{index + 1}.</No>
                    <Name>{item.name.trim() || 'Bez nazwy'}</Name>
                    <Gross>{fmt(gross)}</Gross>
                    {/* Dwa fakty jako dwa elementy, nie ciąg z kropką (CLAUDE.md §4). */}
                    <Meta>
                        <span>Netto {fmt(net)}</span>
                        <span>VAT {RATE_LABEL[item.vatRate]} {fmt(gross - net)}</span>
                    </Meta>
                </Line>
            );
        })}
    </List>
);
