import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import { formatCurrency, pluralPl } from '@/common/utils';
import { useDocumentationSummary } from '../hooks/useStats';
import type { DocumentationSummary } from '../types';

/*
 * Jak udokumentowano sprzedaż: część sprzedaży na fakturach, paragonach i zapisach bez
 * paragonu (alokacje usługa × dokument), rabaty przy wydaniu i uzgodnienie netto sprzedaży
 * z netto dokumentów. Sprzedaż w wykresach liczy się z cen wizyt - tu widać, czym ją
 * rozliczono, bez mnożenia wierszy.
 */

const Card = styled.section`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    border: 1px solid ${ui.line};
    border-radius: 16px;
    background: ${ui.surface};
`;

const Title = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: ${ui.ink};
`;

const Bar = styled.div`
    display: flex;
    height: 12px;
    border-radius: 6px;
    overflow: hidden;
    background: ${ui.surfaceAlt};
`;

const Segment = styled.span<{ $pct: number; $color: string }>`
    width: ${p => p.$pct}%;
    background: ${p => p.$color};
`;

const Legend = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 8px 20px;
`;

const LegendItem = styled.li`
    display: grid;
    grid-template-columns: 10px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: ${ui.inkSoft};

    strong { color: ${ui.ink}; font-variant-numeric: tabular-nums; }
`;

const Dot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${p => p.$color};
`;

const Tiles = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 10px;
`;

const Tile = styled.div<{ $tone?: 'warn' }>`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid ${p => (p.$tone === 'warn' ? ui.warnLine : ui.lineSoft)};
    background: ${p => (p.$tone === 'warn' ? ui.warnTint : ui.surfaceSoft)};
    font-size: 13px;
    color: ${ui.textSecondary};

    > strong { font-size: 18px; font-weight: 800; color: ${ui.ink}; font-variant-numeric: tabular-nums; }
    > span strong { color: ${ui.ink}; font-variant-numeric: tabular-nums; }
`;

const Note = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const zl = (grosz: number) => formatCurrency(grosz / 100);

const segmentsOf = (s: DocumentationSummary) => [
    { key: 'invoice', label: 'Faktura', amount: s.invoiceGross, color: ui.brandStrong },
    { key: 'external', label: 'Faktura księgowości', amount: s.externalInvoiceGross, color: ui.brandDeep },
    { key: 'receipt', label: 'Paragon', amount: s.receiptGross, color: ui.okInk },
    { key: 'without', label: 'Bez paragonu', amount: s.withoutReceiptGross, color: ui.warnLine },
    { key: 'other', label: 'Inny dokument', amount: s.otherGross, color: ui.lineStrong },
    { key: 'none', label: 'Brak danych o podziale', amount: s.unallocatedGross, color: ui.line },
].filter(seg => seg.amount > 0);

export function DocumentationPanel({ startDate, endDate }: { startDate: string; endDate: string }) {
    const { summary, isLoading, isError } = useDocumentationSummary(startDate, endDate);
    if (isLoading || isError || !summary || summary.salesGross <= 0) return null;

    const segments = segmentsOf(summary);
    const total = summary.salesGross;
    // Grosz na wizytę to zaokrąglenia „w stu” przy scaleniach - więcej to sygnał do sprawdzenia.
    const unexplainedAlarm = Math.abs(summary.unexplainedNetDifference) > summary.visitCount;
    const netDifference = summary.documentsNet - summary.salesNetDocumented;

    return (
        <Card aria-labelledby="documentation-title">
            <Title id="documentation-title">Jak udokumentowano sprzedaż</Title>
            <Bar role="img" aria-label={segments.map(seg => `${seg.label} ${zl(seg.amount)}`).join(', ')}>
                {segments.map(seg => <Segment key={seg.key} $pct={(seg.amount / total) * 100} $color={seg.color} />)}
            </Bar>
            <Legend>
                {segments.map(seg => (
                    <LegendItem key={seg.key}>
                        <Dot $color={seg.color} aria-hidden="true" />
                        <span>{seg.label}</span>
                        <strong>{zl(seg.amount)} ({Math.round((seg.amount / total) * 100)}%)</strong>
                    </LegendItem>
                ))}
            </Legend>

            <Tiles>
                <Tile>
                    <span>Rabaty i dopłaty przy wydaniu</span>
                    <strong>{summary.handoverDiscountGross >= 0 ? zl(summary.handoverDiscountGross) : `−${zl(-summary.handoverDiscountGross)}`}</strong>
                    <span>
                        {summary.handoverChangedVisits} {pluralPl(summary.handoverChangedVisits, 'wizyta', 'wizyty', 'wizyt')} ze
                        zmianą ceny na końcu
                    </span>
                </Tile>
                <Tile $tone={unexplainedAlarm || summary.mismatchedVisits > 0 ? 'warn' : undefined}>
                    <span>Netto dokumentów a netto sprzedaży</span>
                    <strong>{netDifference >= 0 ? '+' : '−'}{zl(Math.abs(netDifference))}</strong>
                    <span>
                        w tym VAT zapisów bez paragonu <strong>{zl(summary.withoutReceiptVat)}</strong> (tak ma być),
                        inne różnice <strong>{zl(summary.unexplainedNetDifference)}</strong>
                    </span>
                    {summary.mismatchedVisits > 0 && (
                        <span>
                            {summary.mismatchedVisits} {pluralPl(summary.mismatchedVisits, 'wizyta', 'wizyty', 'wizyt')}:
                            dokumenty nie pokrywają kwoty wizyty.
                        </span>
                    )}
                </Tile>
            </Tiles>

            {summary.unallocatedVisits > 0 && (
                <Note>
                    {summary.unallocatedVisits} {pluralPl(summary.unallocatedVisits, 'wizyta', 'wizyty', 'wizyt')} bez danych
                    o podziale na dokumenty: wydane, zanim CRM zaczął go zapisywać, albo bez dokumentu.
                </Note>
            )}
        </Card>
    );
}
