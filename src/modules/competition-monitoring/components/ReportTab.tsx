import React, { useState } from 'react';
import styled from 'styled-components';
import { Trophy, Sparkles, ExternalLink, Lightbulb, CalendarDays } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Report, InsightSeverity } from '../types';
import { FORMAT_LABELS } from '../types';
import { useLatestReport, useReportById, useReportList } from '../hooks/useAnalytics';
import { Card, CardTitle, CardHint, CenterState, MetricCell, Pill, Spinner, formatNumber } from './MetricBits';

/**
 * Raport tygodnia: jedna strona do przeczytania w 3 minuty.
 * Liczby pochodzą z agregatów backendu; narracja wstępu z LLM (lub szablonu).
 */

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// ─── Hero ─────────────────────────────────────────────────────────────────────

const Hero = styled.section`
    position: relative;
    overflow: hidden;
    border-radius: ${st.radiusLg};
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    color: #f1f5f9;
    padding: 28px 32px;
    box-shadow: ${st.shadowMd};

    &::before {
        content: '';
        position: absolute;
        top: -90px;
        right: -70px;
        width: 340px;
        height: 340px;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, transparent 65%);
        pointer-events: none;
    }
`;

const HeroKicker = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #7dd3fc;
    margin-bottom: 8px;

    svg { width: 13px; height: 13px; }
`;

const HeroTitle = styled.h2`
    margin: 0 0 12px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.4px;
`;

const HeroLead = styled.p`
    margin: 0;
    max-width: 720px;
    font-size: ${st.fontMd};
    line-height: 1.65;
    color: #cbd5e1;
`;

const HeroBadgeRow = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
    flex-wrap: wrap;
`;

const RankChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(14, 165, 233, 0.16);
    border: 1px solid rgba(14, 165, 233, 0.35);
    color: #7dd3fc;
    font-size: ${st.fontSm};
    font-weight: 700;
    padding: 6px 14px;
    border-radius: ${st.radiusFull};

    svg { width: 14px; height: 14px; }
`;

// ─── Sekcje ───────────────────────────────────────────────────────────────────

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 20px;

    @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

const MetricsStrip = styled(Card)`
    display: grid;
    grid-template-columns: repeat(3, minmax(140px, 1fr));
    gap: 20px;

    @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const StripBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    > label {
        font-size: ${st.fontXs};
        font-weight: 700;
        color: ${st.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }
`;

const EventItem = styled.div<{ $severity: InsightSeverity }>`
    border-left: 3px solid ${p =>
        p.$severity === 'HIGH' ? st.accentRed : p.$severity === 'MEDIUM' ? st.accentAmber : st.accentBlue};
    padding: 8px 0 8px 14px;

    & + & { margin-top: 10px; }

    strong { display: block; font-size: ${st.fontSm}; color: ${st.text}; margin-bottom: 2px; }
    p { margin: 0; font-size: ${st.fontSm}; color: ${st.textSecondary}; line-height: 1.5; }
    a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        font-size: ${st.fontXs};
        font-weight: 600;
        color: ${st.accentBlue};
        text-decoration: none;
        &:hover { text-decoration: underline; }
        svg { width: 11px; height: 11px; }
    }
`;

const RecommendationCard = styled(Card)`
    background: ${st.gradientCardBlue};
    border-color: rgba(59, 130, 246, 0.25);
`;

const RecoHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;

    svg { width: 20px; height: 20px; color: ${st.accentBlue}; }
    h3 { margin: 0; font-size: ${st.fontLg}; color: ${st.text}; }
`;

const RecoText = styled.p`
    margin: 0 0 8px;
    font-size: ${st.fontMd};
    font-weight: 600;
    color: ${st.text};
    line-height: 1.5;
`;

const RecoReason = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const TopPostRow = styled.a`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    text-decoration: none;
    color: ${st.text};
    font-size: ${st.fontSm};
    transition: background ${st.transition};

    &:hover { background: ${st.accentBlueDim}; }

    strong { font-weight: 700; }
    span { color: ${st.textMuted}; }
`;

const ArchiveRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const formatPeriod = (start: string, end: string) => {
    const fmt = (iso: string) =>
        new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    return `${fmt(start)} - ${fmt(end)}`;
};

const ReportBody: React.FC<{ report: Report }> = ({ report }) => {
    const p = report.payload;

    return (
        <Layout>
            <Hero>
                <HeroKicker><Sparkles /> {report.title}</HeroKicker>
                <HeroTitle>Twój tydzień na Instagramie</HeroTitle>
                <HeroLead>{report.lead}</HeroLead>
                <HeroBadgeRow>
                    {p.position && (
                        <RankChip>
                            <Trophy /> miejsce {p.position.rank} z {p.position.total}
                        </RankChip>
                    )}
                    <RankChip>
                        <CalendarDays /> {formatPeriod(report.periodStart, report.periodEnd)}
                    </RankChip>
                </HeroBadgeRow>
            </Hero>

            <MetricsStrip>
                <StripBox>
                    <label>Zaangażowanie</label>
                    <MetricCell metric={p.erPct} decimals={1} unit="%" />
                    <CardHint style={{ margin: 0 }}>reakcje na 100 obserwujących</CardHint>
                </StripBox>
                <StripBox>
                    <label>Posty / tydzień</label>
                    <MetricCell metric={p.postsPerWeek} decimals={1} />
                    <CardHint style={{ margin: 0 }}>tempo publikacji</CardHint>
                </StripBox>
                <StripBox>
                    <label>Aktywność (0-100)</label>
                    <MetricCell metric={p.activityIndex} decimals={0} />
                    <CardHint style={{ margin: 0 }}>tempo + regularność + reakcje</CardHint>
                </StripBox>
            </MetricsStrip>

            <TwoCol>
                <Card>
                    <CardTitle>Co się wydarzyło</CardTitle>
                    <CardHint>Najważniejsze zdarzenia w Twojej grupie z minionego tygodnia.</CardHint>
                    {p.events.length === 0 ? (
                        <CardHint style={{ marginBottom: 0 }}>
                            Spokojny tydzień, bez promocji, konkursów i nagłych zmian u konkurencji.
                        </CardHint>
                    ) : (
                        p.events.map((event, index) => (
                            <EventItem key={index} $severity={event.severity}>
                                <strong>{event.title}</strong>
                                <p>{event.body}</p>
                                {event.permalink && (
                                    <a href={event.permalink} target="_blank" rel="noopener noreferrer">
                                        Zobacz post <ExternalLink />
                                    </a>
                                )}
                            </EventItem>
                        ))
                    )}
                </Card>

                <Layout>
                    <RecommendationCard>
                        <RecoHeader>
                            <Lightbulb />
                            <h3>Sugestia na ten tydzień</h3>
                        </RecoHeader>
                        <RecoText>{p.recommendation.text}</RecoText>
                        <RecoReason>{p.recommendation.reason}</RecoReason>
                    </RecommendationCard>

                    {p.topPost && (
                        <Card>
                            <CardTitle>Post tygodnia w Twojej grupie</CardTitle>
                            <CardHint>Najwięcej reakcji w ostatnich tygodniach.</CardHint>
                            <TopPostRow href={p.topPost.permalink} target="_blank" rel="noopener noreferrer">
                                <div>
                                    <strong>@{p.topPost.username}</strong>{' '}
                                    <span>
                                        · {FORMAT_LABELS[p.topPost.format]} · {p.topPost.topicLabel}
                                    </span>
                                </div>
                                <strong>{formatNumber(p.topPost.engagement)} reakcji</strong>
                            </TopPostRow>
                        </Card>
                    )}
                </Layout>
            </TwoCol>
        </Layout>
    );
};

export const ReportTab: React.FC = () => {
    const latestQuery = useLatestReport();
    const listQuery = useReportList();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const byIdQuery = useReportById(selectedId);

    const report = selectedId ? byIdQuery.data : latestQuery.data;
    const isLoading = selectedId ? byIdQuery.isLoading : latestQuery.isLoading;

    if (isLoading) {
        return <CenterState><Spinner /></CenterState>;
    }

    return (
        <Layout>
            {(listQuery.data?.length ?? 0) > 1 && (
                <ArchiveRow>
                    <Pill $active={selectedId === null} onClick={() => setSelectedId(null)}>
                        Najnowszy
                    </Pill>
                    {listQuery.data!.map(brief => (
                        <Pill
                            key={brief.id}
                            $active={selectedId === brief.id}
                            onClick={() => setSelectedId(brief.id)}
                        >
                            {formatPeriod(brief.periodStart, brief.periodEnd)}
                        </Pill>
                    ))}
                </ArchiveRow>
            )}

            {report ? (
                <ReportBody report={report} />
            ) : (
                <Card>
                    <CenterState>
                        <strong>Raport jeszcze się nie zebrał</strong>
                        <span>
                            Pierwszy raport tygodnia powstaje po pierwszej pełnej synchronizacji danych
                            (niedziela). Dodaj profile konkurencji i wróć tu w poniedziałek.
                        </span>
                    </CenterState>
                </Card>
            )}
        </Layout>
    );
};
