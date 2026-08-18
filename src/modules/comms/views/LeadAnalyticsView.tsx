// src/modules/comms/views/LeadAnalyticsView.tsx
// Trzy pytania właściciela: ile zapytań zamieniam w zlecenia, o co ludzie pytają,
// dlaczego przegrywam. Wspólny PageHeader i kafle KPI (StatTile) jak na Tablicy.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Banknote, Clock3, Inbox, Target, TrendingUp } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { StatTile } from '@/common/components/StatTile';
import { useLeadAnalytics } from '../hooks/useLeads';
import { LEAD_STATUS_LABELS, type LeadStatus } from '../types';
import { EmptyHint, FilterChip, SurfaceCard, formatGrosze } from '../components/shared';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: ${p => p.theme.spacing.md};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

const TileRow = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
`;

const Card = styled(SurfaceCard)`
    padding: 16px 20px;

    h3 {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
`;

const BarLine = styled.div`
    display: grid;
    grid-template-columns: minmax(110px, 160px) 1fr minmax(80px, auto);
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    padding: 5px 0;

    .track {
        background: ${p => p.theme.colors.surfaceAlt};
        border-radius: ${p => p.theme.radii.sm};
        height: 10px;
        overflow: hidden;
    }
    .fill { height: 100%; border-radius: ${p => p.theme.radii.sm}; }
    .meta {
        text-align: right;
        color: ${p => p.theme.colors.textMuted};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
`;

const RANGES = [
    { key: '30', label: '30 dni', days: 30 },
    { key: '90', label: '90 dni', days: 90 },
    { key: '365', label: 'Rok', days: 365 },
] as const;

const percent = (value: number | null | undefined): string =>
    value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;

export default function LeadAnalyticsView() {
    const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key']>('30');
    const range = RANGES.find((entry) => entry.key === rangeKey)!;
    const from = new Date(Date.now() - range.days * 24 * 3600 * 1000).toISOString();
    const { data, isLoading } = useLeadAnalytics(from);

    const maxCategory = Math.max(1, ...(data?.categories.map((entry) => entry.count) ?? [1]));
    const maxLost = Math.max(1, ...(data?.lostReasons.map((entry) => entry.count) ?? [1]));

    return (
        <ViewContainer>
            <PageHeader
                title="Analityka leadów"
                subtitle={`Ostatnie ${range.label.toLowerCase() === 'rok' ? '12 miesięcy' : range.label}`}
                actions={
                    <Link to="/leads">
                        <PageHeaderGhostButton as="span">
                            <ArrowLeft /> Wróć do leadów
                        </PageHeaderGhostButton>
                    </Link>
                }
            />

            <div style={{ display: 'flex', gap: 8 }}>
                {RANGES.map((entry) => (
                    <FilterChip
                        key={entry.key}
                        $active={rangeKey === entry.key}
                        onClick={() => setRangeKey(entry.key)}
                    >
                        {entry.label}
                    </FilterChip>
                ))}
            </div>

            {isLoading && <EmptyHint>Liczenie…</EmptyHint>}

            {data && (
                <>
                    <TileRow>
                        <StatTile
                            icon={Inbox}
                            value={data.totalCreated}
                            label="Zapytania"
                            accentColor="#0ea5e9"
                            bgGradient="linear-gradient(180deg, rgba(14,165,233,0.06) 0%, #ffffff 55%)"
                            iconBg="rgba(14,165,233,0.12)"
                            subContent="nowych leadów w okresie"
                        />
                        <StatTile
                            icon={Target}
                            value={percent(data.conversionRate)}
                            label="Konwersja"
                            accentColor="#16a34a"
                            bgGradient="linear-gradient(180deg, rgba(22,163,74,0.06) 0%, #ffffff 55%)"
                            iconBg="rgba(22,163,74,0.12)"
                            subContent="zrealizowane / zamknięte"
                        />
                        <StatTile
                            icon={Banknote}
                            value={formatGrosze(data.wonValue)}
                            label="Wartość wygranych"
                            accentColor="#16a34a"
                            bgGradient="linear-gradient(180deg, rgba(22,163,74,0.06) 0%, #ffffff 55%)"
                            iconBg="rgba(22,163,74,0.12)"
                        />
                        <StatTile
                            icon={TrendingUp}
                            value={formatGrosze(data.pipelineValue)}
                            label="W pipeline"
                            accentColor="#d97706"
                            bgGradient="linear-gradient(180deg, rgba(217,119,6,0.06) 0%, #ffffff 55%)"
                            iconBg="rgba(217,119,6,0.12)"
                            subContent="wartość otwartych leadów"
                        />
                        <StatTile
                            icon={Clock3}
                            value={
                                data.medianFirstResponseMinutes === null
                                    ? '—'
                                    : data.medianFirstResponseMinutes < 60
                                        ? `${data.medianFirstResponseMinutes} min`
                                        : `${Math.round(data.medianFirstResponseMinutes / 60)} h`
                            }
                            label="Pierwsza odpowiedź"
                            accentColor="#7c3aed"
                            bgGradient="linear-gradient(180deg, rgba(124,58,237,0.06) 0%, #ffffff 55%)"
                            iconBg="rgba(124,58,237,0.12)"
                            subContent="mediana czasu reakcji"
                        />
                    </TileRow>

                    <Card>
                        <h3>Lejek statusów</h3>
                        {Object.entries(data.byStatus).map(([status, count]) => (
                            <BarLine key={status}>
                                <span>{LEAD_STATUS_LABELS[status as LeadStatus] ?? status}</span>
                                <div className="track">
                                    <div
                                        className="fill"
                                        style={{
                                            width: `${Math.round((count / Math.max(1, data.totalCreated)) * 100)}%`,
                                            background: '#0f172a',
                                        }}
                                    />
                                </div>
                                <span className="meta">{count}</span>
                            </BarLine>
                        ))}
                    </Card>

                    <Card>
                        <h3>O co pytają klienci</h3>
                        {data.categories.length === 0 && <EmptyHint>Brak danych w tym okresie</EmptyHint>}
                        {data.categories.map((entry) => (
                            <BarLine key={entry.code ?? 'none'}>
                                <span>{entry.label}</span>
                                <div className="track">
                                    <div
                                        className="fill"
                                        style={{
                                            width: `${Math.round((entry.count / maxCategory) * 100)}%`,
                                            background: '#0ea5e9',
                                        }}
                                    />
                                </div>
                                <span className="meta">
                                    {entry.count} · konw. {percent(entry.conversionRate)}
                                </span>
                            </BarLine>
                        ))}
                    </Card>

                    <Card>
                        <h3>Dlaczego przegrywamy</h3>
                        {data.lostReasons.length === 0 && (
                            <EmptyHint>Brak przegranych leadów z podanym powodem — tak trzymać</EmptyHint>
                        )}
                        {data.lostReasons.map((entry) => (
                            <BarLine key={entry.code}>
                                <span>{entry.label}</span>
                                <div className="track">
                                    <div
                                        className="fill"
                                        style={{
                                            width: `${Math.round((entry.count / maxLost) * 100)}%`,
                                            background: '#dc2626',
                                        }}
                                    />
                                </div>
                                <span className="meta">
                                    {entry.count} · {percent(entry.share)}
                                </span>
                            </BarLine>
                        ))}
                    </Card>
                </>
            )}
        </ViewContainer>
    );
}
