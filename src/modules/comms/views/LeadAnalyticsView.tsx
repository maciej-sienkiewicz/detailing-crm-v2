// src/modules/comms/views/LeadAnalyticsView.tsx
// „Pieniądze w zapytaniach" - wynik zapytań z wybranego okresu, prostymi liczbami.
//
// Odpowiada na trzy pytania właściciela, w tej kolejności:
//   1. Ile przyszło zapytań, ile z nich zostało zleceniami i za ile (lejek w jednej karcie).
//   2. Co z resztą: ile spraw jeszcze trwa, ile przepadło i dlaczego (dwa wiersze,
//      każdy prowadzi do tych spraw).
//   3. Skąd przychodzą zlecenia (kanał po kanale, z wartością zleceń).
//   4. Jak to wygląda w roku (słupki wartości zleceń miesiąc po miesiącu).
//
// Poprzednia wersja liczyła to samo, ale pokazywała belkę czterech pojęć („zamknięte,
// w toku, ucichło, stracone"), kwotę-bohatera bez liczby zapytań, pasek z wezwaniem,
// wykres liniowy z przełącznikiem jednostki i zwinięte „Zobacz szczegóły" z trzema
// kolejnymi kartami. Biznes ocenił ją jako nieczytelną - stąd jedna karta, dwa wiersze
// i jeden wykres, wszystko z samymi liczbami i krótkimi podpisami.
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ChevronRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { Card, SectionTitle, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { useLeadAnalytics } from '../hooks/useLeads';
import type { LeadAnalytics } from '../types';
import { PeriodPicker } from '../components/analytics/PeriodPicker';
import { buildPeriod, type Period } from '../components/analytics/period';
import { buildDemoAnalytics } from '../components/analytics/demoData';
import { formatMinutes, formatMoney } from '../components/analytics/tokens';
import { leadSourceLabel } from '../utils/leadFormat';

/** Poniżej tylu zapytań procenty skaczą od jednej sprawy - mówimy to wprost. */
const THIN_DATA_BELOW = 10;

const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const orders = (n: number) => `${n} ${pluralPl(n, 'zlecenie', 'zlecenia', 'zleceń')}`;
const cases = (n: number) => `${n} ${pluralPl(n, 'sprawa', 'sprawy', 'spraw')}`;

// ── Układ ────────────────────────────────────────────────────────────────────

const Page = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: 16px;
    container-type: inline-size;

    @media (min-width: 768px) { padding: 32px; }
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

/* Lejek: trzy liczby obok siebie, w wąskiej szerokości jedna pod drugą. */
const Funnel = styled(Card)`
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 24px;

    @container (max-width: 620px) {
        grid-template-columns: 1fr;
        gap: 18px;
        padding: 20px;
        .arrow { display: none; }
    }

    .arrow { width: 20px; height: 20px; color: ${ui.textFaint}; }
`;

const Step = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    .label { font-size: 13px; font-weight: 600; color: ${ui.textSecondary}; }
    .value {
        font-size: 30px;
        line-height: 1.15;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: ${ui.ink};
        font-variant-numeric: tabular-nums;
    }
    .note { font-size: 13px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

const Rows = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
    overflow: hidden;
`;

const Row = styled.button`
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 18px;
    border: none;
    border-top: 1px solid ${ui.lineSoft};
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: ${ui.ink};
    cursor: pointer;

    &:first-child { border-top: none; }
    &:is(button):hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
    &:is(div) { cursor: default; }

    .text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .title { font-size: 14.5px; font-weight: 600; }
    .note {
        font-size: 13px;
        color: ${ui.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .amount {
        flex: none;
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
    svg { flex: none; width: 16px; height: 16px; color: ${ui.textFaint}; }
`;

const ChartFrame = styled.div`
    padding: 16px 12px 8px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
`;

const Banner = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border: 1px solid ${ui.warnLine};
    border-radius: ${ui.radiusStrip};
    background: ${ui.warnTint};
    color: ${ui.warnInk};
    font-size: 13.5px;

    > svg { width: 16px; height: 16px; flex: none; }
    .grow { flex: 1; min-width: 200px; }
`;

const GhostButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface};
    color: ${ui.inkSoft};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    svg { width: 15px; height: 15px; }
    &:hover { border-color: ${ui.lineStrong}; }
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 24px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};

    h2 { margin: 0; font-size: 16px; color: ${ui.ink}; }
    p { margin: 0; font-size: 14px; color: ${ui.textMuted}; }
`;

const Muted = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.textMuted};
`;

// ── Widok ────────────────────────────────────────────────────────────────────

export default function LeadAnalyticsView() {
    // „Ten miesiąc" domyślnie: właściciel rozlicza się miesiącami (księgowa, podatek, ZUS).
    const [period, setPeriod] = useState<Period>(() => buildPeriod('current', new Date()));
    const [demo, setDemo] = useState(false);
    const { data, isLoading } = useLeadAnalytics(period.from, period.to);

    // Wykres zawsze za pełny bieżący rok, niezależnie od wybranego okresu.
    const year = new Date().getFullYear();
    const yearQuery = useLeadAnalytics(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59, 999));

    const shown = demo ? buildDemoAnalytics(period.from, period.to) : data;
    const yearSeries = demo ? buildDemoYearSeries() : buildYearSeries(yearQuery.data);

    return (
        <Page>
            <PageHeader
                title="Pieniądze w zapytaniach"
                subtitle={`Zapytania z okresu: ${period.label}`}
                actions={
                    <>
                        <PeriodPicker value={period} onChange={setPeriod} />
                        <Link to="/inbox">
                            <PageHeaderGhostButton as="span">
                                <ArrowLeft /> Zapytania
                            </PageHeaderGhostButton>
                        </Link>
                    </>
                }
            />

            {isLoading && !demo && <Muted>Liczę…</Muted>}

            {demo && (
                <Banner role="status">
                    <Sparkles />
                    <span className="grow"><strong>Dane przykładowe.</strong> Tak wygląda ten widok w studiu z około stoma zapytaniami miesięcznie.</span>
                    <GhostButton type="button" onClick={() => setDemo(false)}><EyeOff /> Schowaj</GhostButton>
                </Banner>
            )}

            {!demo && data && data.totalCreated === 0 && (
                <Empty>
                    <h2>Brak zapytań w tym okresie</h2>
                    <p>Wybierz inny okres albo zobacz, jak ten widok wygląda z danymi.</p>
                    <GhostButton type="button" onClick={() => setDemo(true)}><Eye /> Pokaż przykład</GhostButton>
                </Empty>
            )}

            {shown && shown.totalCreated > 0 && (
                <Report data={shown} thin={!demo && shown.totalCreated < THIN_DATA_BELOW} yearSeries={yearSeries} year={year} />
            )}
        </Page>
    );
}

function Report({ data, thin, yearSeries, year }: {
    data: LeadAnalytics;
    thin: boolean;
    yearSeries: YearPoint[];
    year: number;
}) {
    const navigate = useNavigate();
    const count = (status: string) => data.byStatus[status] ?? 0;
    const won = count('COMPLETED');
    const open = count('NEW') + count('IN_PROGRESS') + count('CONFIRMED');
    const lost = count('LOST') + count('NO_SHOW');
    const openValue = data.pipelineValue + data.silentValue;
    const totalValue = data.wonValue + openValue + data.lostValue;
    const conversion = data.totalCreated > 0 ? Math.round((won / data.totalCreated) * 100) : 0;
    const reasons = [...data.lostReasons].sort((a, b) => b.count - a.count).slice(0, 3);
    // Najpierw kanał, który przyniósł najwięcej pieniędzy - o to pyta właściciel
    // („czy Instagram daje klientów?"), a nie o to, skąd przyszło najwięcej pytań.
    const sources = [...(data.bySource ?? [])].sort((a, b) => b.wonValue - a.wonValue || b.count - a.count);

    return (
        <>
            <Funnel as="section" aria-label="Wynik zapytań">
                <Step>
                    <span className="label">Zapytania</span>
                    <span className="value">{data.totalCreated}</span>
                    {/* Kwota z serwera to potencjał: przyjęte pozycje i sugestie asystenta razem.
                        Panel sprawy pokazuje samą wycenę, więc tutaj mówimy wprost, co jest w sumie. */}
                    <span className="note">warte {formatMoney(totalValue)} z sugestiami</span>
                </Step>
                <ChevronRight className="arrow" aria-hidden="true" />
                <Step>
                    <span className="label">Zlecenia</span>
                    <span className="value">{won}</span>
                    <span className="note">{conversion}% zapytań{thin ? ', mało danych' : ''}</span>
                </Step>
                <ChevronRight className="arrow" aria-hidden="true" />
                <Step>
                    <span className="label">Wartość zleceń</span>
                    <span className="value">{formatMoney(data.wonValue)}</span>
                    {data.wonValuePrevious > 0 && (
                        <span className="note">okres wcześniej: {formatMoney(data.wonValuePrevious)}</span>
                    )}
                </Step>
            </Funnel>

            <Section aria-labelledby="leads-rest">
                <SectionTitle id="leads-rest">Co z resztą</SectionTitle>
                <Rows>
                    <Row type="button" onClick={() => navigate('/inbox')}>
                        <span className="text">
                            <span className="title">W toku: {cases(open)}</span>
                            <span className="note">
                                {data.silentValue > 0
                                    ? `w tym ucichłe: ${formatMoney(data.silentValue)}`
                                    : 'czekają na odpowiedź albo decyzję'}
                            </span>
                        </span>
                        <span className="amount">{formatMoney(openValue)}</span>
                        <ChevronRight aria-hidden="true" />
                    </Row>
                    <Row type="button" onClick={() => navigate('/inbox?archive=1')}>
                        <span className="text">
                            <span className="title">Przegrane: {cases(lost)}</span>
                            <span className="note">
                                {reasons.length > 0
                                    ? reasons.map(r => `${r.label} (${r.count})`).join(', ')
                                    : 'bez podanych powodów'}
                            </span>
                        </span>
                        <span className="amount">{formatMoney(data.lostValue)}</span>
                        <ChevronRight aria-hidden="true" />
                    </Row>
                    {data.medianFirstResponseMinutes !== null && (
                        <Row as="div">
                            <span className="text">
                                <span className="title">Pierwsza odpowiedź</span>
                                <span className="note">połowa zapytań dostaje ją szybciej niż w tym czasie</span>
                            </span>
                            <span className="amount">{formatMinutes(data.medianFirstResponseMinutes)}</span>
                        </Row>
                    )}
                </Rows>
            </Section>

            {sources.length > 0 && (
                <Section aria-labelledby="leads-sources">
                    <SectionTitle id="leads-sources">Skąd przychodzą zlecenia</SectionTitle>
                    <Rows>
                        {sources.map(source => (
                            <Row as="div" key={source.source}>
                                <span className="text">
                                    <span className="title">{leadSourceLabel(source.source)}: {cases(source.count)}</span>
                                    <span className="note">{orders(source.won)}</span>
                                </span>
                                {/* Brutto zleceń z serwera (suma pozycji leada) - bez przeliczania. */}
                                <span className="amount">{formatMoney(source.wonValue ?? 0)}</span>
                            </Row>
                        ))}
                    </Rows>
                </Section>
            )}

            <Section aria-labelledby="leads-year">
                <SectionTitle id="leads-year" count={String(year)}>Wartość zleceń miesiąc po miesiącu</SectionTitle>
                <ChartFrame>
                    <YearChart points={yearSeries} />
                </ChartFrame>
            </Section>
        </>
    );
}

// ── Wykres roku ──────────────────────────────────────────────────────────────

interface YearPoint {
    month: string;
    /** Wartość zleceń w groszach; null - miesiąc jeszcze nie nadszedł. */
    value: number | null;
    won: number;
    current: boolean;
}

/** Zlecenia z zapytań każdego miesiąca bieżącego roku (kubełki osi czasu zsumowane po miesiącu). */
function buildYearSeries(analytics: LeadAnalytics | undefined): YearPoint[] {
    const now = new Date().getMonth();
    const value = new Array<number>(12).fill(0);
    const won = new Array<number>(12).fill(0);
    for (const point of analytics?.timeline ?? []) {
        const month = new Date(`${point.periodStart}T00:00:00`).getMonth();
        if (month < 0 || month > 11) continue;
        value[month] += point.wonValue;
        won[month] += point.won;
    }
    return MONTH_ABBR.map((month, i) => ({
        month,
        value: i > now ? null : value[i],
        won: won[i],
        current: i === now,
    }));
}

/**
 * Przykładowy rok do trybu pokazowego. Dane przykładowe okresu mają oś czasu tylko
 * dla wybranego okresu, więc pełny rok z nich nie wychodzi - stąd osobne liczby
 * o realistycznym, nierównym kształcie (sezon wiosną, dołek w wakacje).
 */
function buildDemoYearSeries(): YearPoint[] {
    const now = new Date().getMonth();
    const values = [
        9_800_000, 11_200_000, 13_400_000, 12_100_000, 14_900_000, 13_300_000,
        9_900_000, 10_800_000, 12_600_000, 12_580_000, 13_900_000, 15_200_000,
    ];
    const won = [31, 35, 42, 38, 46, 41, 30, 33, 39, 41, 44, 47];
    return MONTH_ABBR.map((month, i) => ({
        month,
        value: i > now ? null : values[i],
        won: won[i],
        current: i === now,
    }));
}

function YearChart({ points }: { points: YearPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: ui.textMuted }}
                    tickLine={false}
                    axisLine={{ stroke: ui.line }}
                    interval={0}
                />
                <Tooltip
                    cursor={{ fill: ui.surfaceAlt }}
                    content={({ active, payload }) => {
                        const point = payload?.[0]?.payload as YearPoint | undefined;
                        if (!active || !point || point.value === null) return null;
                        return (
                            <div style={{ padding: '8px 10px', background: '#fff', border: `1px solid ${ui.line}`, borderRadius: 8, fontSize: 13 }}>
                                <strong>{formatMoney(point.value)}</strong>
                                <div style={{ color: ui.textMuted }}>{orders(point.won)}</div>
                            </div>
                        );
                    }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {points.map(point => (
                        <Cell key={point.month} fill={point.current ? ui.brand : ui.brandLineSoft} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

