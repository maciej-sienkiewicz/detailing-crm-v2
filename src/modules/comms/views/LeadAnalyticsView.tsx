// src/modules/comms/views/LeadAnalyticsView.tsx
// Trzy pytania właściciela: ile zapytań zamieniam w zlecenia, o co ludzie pytają,
// dlaczego przegrywam. Duże liczby na górze, rozkłady niżej — bez choinki wykresów.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { useLeadAnalytics } from '../hooks/useLeads';
import { LEAD_STATUS_LABELS, type LeadStatus } from '../types';
import { EmptyHint, formatGrosze } from '../components/shared';

const Screen = styled.div`
    padding: 20px 24px;
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    h2 { margin: 0; font-size: 20px; font-weight: 700; color: #111827; }
    a { color: #6b7280; display: inline-flex; }
`;

const RangeTabs = styled.div`
    display: flex;
    gap: 6px;
`;

const RangeChip = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active }) => ($active ? '#111827' : '#e5e7eb')};
    background: ${({ $active }) => ($active ? '#111827' : '#ffffff')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#4b5563')};
    border-radius: 999px;
    font-size: 13px;
    padding: 6px 14px;
    cursor: pointer;
`;

const TileRow = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
`;

const Tile = styled.div`
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;

    .label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .value { font-size: 24px; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
    .hint { font-size: 11px; color: #9ca3af; margin-top: 2px; }
`;

const Card = styled.section`
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px 18px;

    h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #111827; }
`;

const BarLine = styled.div`
    display: grid;
    grid-template-columns: 160px 1fr 90px;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #374151;
    padding: 5px 0;

    .track { background: #f3f4f6; border-radius: 4px; height: 10px; overflow: hidden; }
    .fill { height: 100%; border-radius: 4px; }
    .meta { text-align: right; color: #6b7280; font-variant-numeric: tabular-nums; }
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
        <Screen>
            <HeaderRow>
                <Link to="/leads" aria-label="Wróć do leadów"><ArrowLeft size={18} /></Link>
                <h2>Analityka leadów</h2>
                <div style={{ marginLeft: 'auto' }}>
                    <RangeTabs>
                        {RANGES.map((entry) => (
                            <RangeChip
                                key={entry.key}
                                $active={rangeKey === entry.key}
                                onClick={() => setRangeKey(entry.key)}
                            >
                                {entry.label}
                            </RangeChip>
                        ))}
                    </RangeTabs>
                </div>
            </HeaderRow>

            {isLoading && <EmptyHint>Liczenie…</EmptyHint>}

            {data && (
                <>
                    <TileRow>
                        <Tile>
                            <div className="label">Zapytania</div>
                            <div className="value">{data.totalCreated}</div>
                            <div className="hint">nowych leadów w okresie</div>
                        </Tile>
                        <Tile>
                            <div className="label">Konwersja</div>
                            <div className="value">{percent(data.conversionRate)}</div>
                            <div className="hint">zrealizowane / wszystkie zamknięte</div>
                        </Tile>
                        <Tile>
                            <div className="label">Wartość wygranych</div>
                            <div className="value">{formatGrosze(data.wonValue)}</div>
                        </Tile>
                        <Tile>
                            <div className="label">W pipeline</div>
                            <div className="value">{formatGrosze(data.pipelineValue)}</div>
                            <div className="hint">wartość otwartych leadów</div>
                        </Tile>
                        <Tile>
                            <div className="label">Pierwsza odpowiedź</div>
                            <div className="value">
                                {data.medianFirstResponseMinutes === null
                                    ? '—'
                                    : data.medianFirstResponseMinutes < 60
                                        ? `${data.medianFirstResponseMinutes} min`
                                        : `${Math.round(data.medianFirstResponseMinutes / 60)} h`}
                            </div>
                            <div className="hint">mediana czasu reakcji</div>
                        </Tile>
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
                                            background: '#111827',
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
                                            background: '#2563eb',
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
        </Screen>
    );
}
