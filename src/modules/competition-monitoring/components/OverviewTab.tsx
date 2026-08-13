import React from 'react';
import styled from 'styled-components';
import { Trophy, Star } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Overview } from '../types';
import { useDismissInsight } from '../hooks/useAnalytics';
import { InsightCard } from './InsightCard';
import {
    Card, CardTitle, CardHint, CenterState, DeltaBadge, MetricCell, SelfTag, formatNumber,
} from './MetricBits';

/**
 * Przegląd – domyślny ekran modułu. Odpowiada na jedno pytanie:
 * "jak stoję na tle konkurencji i co wymaga mojej uwagi?"
 * Zero surowych tabel – pozycja, 3 kluczowe liczby z kontekstem i gotowe wnioski.
 */

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// ─── Pasek "Twoja pozycja" ────────────────────────────────────────────────────

const PositionBar = styled(Card)`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 20px 28px;
    align-items: center;

    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const RankBox = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const RankBadge = styled.div`
    width: 64px;
    height: 64px;
    border-radius: ${st.radius};
    background: ${st.gradientBlue};
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    box-shadow: ${st.shadowMd};

    svg { width: 16px; height: 16px; margin-bottom: 2px; }
`;

const RankNumber = styled.span`
    font-size: 20px;
    line-height: 1;
`;

const RankText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: ${st.fontLg}; color: ${st.text}; }
    span { font-size: ${st.fontSm}; color: ${st.textMuted}; }
`;

const MetricsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(140px, 1fr));
    gap: 20px;

    @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const MetricBox = styled.div`
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

// ─── Wizytówka ────────────────────────────────────────────────────────────────

const StorefrontCard = styled(Card)``;

const ScoreRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
`;

const ScoreCircle = styled.div<{ $good: boolean }>`
    min-width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${st.fontLg};
    font-weight: 800;
    color: ${p => (p.$good ? st.accentGreen : st.accentAmber)};
    background: ${p => (p.$good ? st.accentGreenDim : st.accentAmberDim)};
`;

const GapList = styled.ul`
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

// ─── Mini-ranking ─────────────────────────────────────────────────────────────

const RankTable = styled.table`
    width: 100%;
    border-collapse: collapse;

    th {
        text-align: left;
        font-size: ${st.fontXs};
        font-weight: 700;
        color: ${st.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 8px 10px;
        border-bottom: 1px solid ${st.border};
    }

    td {
        padding: 12px 10px;
        border-bottom: 1px solid ${st.border};
        font-size: ${st.fontSm};
        color: ${st.text};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
`;

const RowHighlight = styled.tr<{ $self: boolean }>`
    background: ${p => (p.$self ? st.bgAccentBlue : 'transparent')};
`;

const UserCell = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
`;

const InsightsGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SyncNote = styled.p`
    margin: 0;
    text-align: center;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const OverviewTab: React.FC<{ overview: Overview }> = ({ overview }) => {
    const dismiss = useDismissInsight();

    const hasData = overview.profilesCount > 0;

    if (!hasData) {
        return (
            <Card>
                <CenterState>
                    <strong>Zacznij od dodania profili konkurencji</strong>
                    <span>
                        Kliknij „Profile" i dodaj 3–5 studiów detailingowych z Twojej okolicy oraz własny
                        profil. Pierwsze dane pojawią się po najbliższej synchronizacji.
                    </span>
                </CenterState>
            </Card>
        );
    }

    return (
        <Layout>
            <PositionBar>
                <RankBox>
                    {overview.position ? (
                        <>
                            <RankBadge>
                                <Trophy />
                                <RankNumber>{overview.position.rank}</RankNumber>
                            </RankBadge>
                            <RankText>
                                <strong>
                                    miejsce {overview.position.rank} z {overview.position.total}
                                </strong>
                                <span>@{overview.selfUsername} na tle obserwowanych studiów</span>
                            </RankText>
                        </>
                    ) : (
                        <RankText>
                            <strong>Obserwujesz {overview.profilesCount} profili</strong>
                            <span>
                                Oznacz swój profil gwiazdką w zakładce „Profile", a pokażemy Twoje miejsce
                                w rankingu. Poniżej – typowe wartości u Twojej konkurencji.
                            </span>
                        </RankText>
                    )}
                </RankBox>

                <MetricsRow>
                    <MetricBox>
                        <label>Zaangażowanie</label>
                        <MetricCell metric={overview.erPct} decimals={1} unit="%" />
                        <CardHint style={{ margin: 0 }}>reakcje na 100 obserwujących</CardHint>
                    </MetricBox>
                    <MetricBox>
                        <label>Posty / tydzień</label>
                        <MetricCell metric={overview.postsPerWeek} decimals={1} />
                        <CardHint style={{ margin: 0 }}>jak często pojawiają się treści</CardHint>
                    </MetricBox>
                    <MetricBox>
                        <label>Aktywność (0–100)</label>
                        <MetricCell metric={overview.activityIndex} decimals={0} />
                        <CardHint style={{ margin: 0 }}>tempo + regularność + reakcje</CardHint>
                    </MetricBox>
                </MetricsRow>
            </PositionBar>

            {overview.insights.length > 0 && (
                <Card>
                    <CardTitle>Co wymaga Twojej uwagi</CardTitle>
                    <CardHint>
                        Gotowe wnioski z ostatnich dni – maksymalnie kilka tygodniowo, tylko to, co istotne.
                    </CardHint>
                    <InsightsGrid>
                        {overview.insights.map(insight => (
                            <InsightCard key={insight.id} insight={insight} onDismiss={id => dismiss.mutate(id)} />
                        ))}
                    </InsightsGrid>
                </Card>
            )}

            {overview.storefront && overview.storefront.gaps.length > 0 && (
                <StorefrontCard>
                    <CardTitle>Twoja wizytówka na Instagramie</CardTitle>
                    <CardHint>
                        Profil to pierwsza rzecz, którą widzi klient porównujący studia – te braki możesz
                        uzupełnić w kilka minut.
                    </CardHint>
                    <ScoreRow>
                        <ScoreCircle $good={overview.storefront.score >= 70}>
                            {overview.storefront.score}
                        </ScoreCircle>
                        <GapList>
                            {overview.storefront.gaps.map(gap => (
                                <li key={gap}>{gap}</li>
                            ))}
                        </GapList>
                    </ScoreRow>
                </StorefrontCard>
            )}

            <Card>
                <CardTitle>Kto prowadzi w Twojej okolicy</CardTitle>
                <CardHint>
                    Ranking według aktywności. Pełne porównanie znajdziesz w zakładce „Porównanie".
                </CardHint>
                <div style={{ overflowX: 'auto' }}>
                    <RankTable>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Profil</th>
                                <th>Obserwujący</th>
                                <th>Zaangażowanie</th>
                                <th>Posty / tydz.</th>
                                <th>Aktywność</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.miniRanking.map((row, index) => (
                                <RowHighlight key={row.studioProfileId} $self={row.isSelf}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <UserCell>
                                            @{row.username}
                                            {row.isSelf && (
                                                <SelfTag>
                                                    <Star size={10} style={{ marginRight: 3 }} /> Ty
                                                </SelfTag>
                                            )}
                                        </UserCell>
                                    </td>
                                    <td>
                                        {formatNumber(row.followers)}{' '}
                                        {row.followerDelta30d !== null && (
                                            <DeltaBadge
                                                deltaPct={
                                                    row.followers && row.followers > 0
                                                        ? (row.followerDelta30d / row.followers) * 100
                                                        : null
                                                }
                                            />
                                        )}
                                    </td>
                                    <td>{row.erPct !== null ? `${row.erPct.toFixed(1)}%` : '—'}</td>
                                    <td>{row.postsPerWeek !== null ? row.postsPerWeek.toFixed(1) : '—'}</td>
                                    <td>
                                        <strong>{row.activityIndex}</strong>/100
                                    </td>
                                </RowHighlight>
                            ))}
                        </tbody>
                    </RankTable>
                </div>
            </Card>

            {overview.lastSyncAt && (
                <SyncNote>
                    Dane z{' '}
                    {new Date(overview.lastSyncAt).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                    })}
                    {' '}· odświeżamy codziennie rano, pełna analiza w każdą niedzielę
                </SyncNote>
            )}
        </Layout>
    );
};
