import styled from 'styled-components';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

interface Props {
    profiles: ProfileSummary[];
    colorMap: Record<string, string>;
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
}

// ─── Styled components ────────────────────────────────────────────────────────

const Wrapper = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${st.border};
`;

const Title = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const Hint = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const TableScroll = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
    min-width: 700px;
`;

const Th = styled.th<{ $right?: boolean }>`
    text-align: ${p => p.$right ? 'right' : 'left'};
    padding: 9px 16px;
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    font-weight: 600;
    font-size: ${st.fontXs};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

const Td = styled.td<{ $right?: boolean }>`
    padding: 13px 16px;
    border-bottom: 1px solid ${st.border};
    color: ${st.text};
    vertical-align: middle;
    text-align: ${p => p.$right ? 'right' : 'left'};
`;

const Tr = styled.tr<{ $selected: boolean }>`
    cursor: pointer;
    background: ${p => p.$selected ? 'rgba(14,165,233,0.04)' : 'transparent'};
    transition: background ${st.transition};

    &:last-child td { border-bottom: none; }
    &:hover { background: ${p => p.$selected ? 'rgba(14,165,233,0.07)' : st.bgCardAlt}; }
`;

const ProfileName = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const ColorDot = styled.div<{ $color: string; $selected: boolean }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$selected ? p.$color : st.border};
    flex-shrink: 0;
    transition: background ${st.transition};
`;

const Username = styled.span`
    font-weight: 600;
    color: ${st.text};
`;

const Rank = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-weight: 700;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
`;

const MetricPrimary = styled.span`
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const MetricSub = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    margin-top: 1px;
    font-variant-numeric: tabular-nums;
`;

const Sparkline = styled.div`
    width: 80px;
    height: 32px;
`;

const ApiErrorBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(239,68,68,0.08);
    color: #dc2626;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    margin-left: 6px;
`;

const NullVal = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, decimals = 0) =>
    v == null ? null : decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));

const fmtK = (v: number | null | undefined) =>
    v == null ? null : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

// ─── Component ────────────────────────────────────────────────────────────────

export const RankingTable = ({ profiles, colorMap, selectedIds, onToggle }: Props) => {
    const sorted = [...profiles].sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0));

    return (
        <Wrapper>
            <Header>
                <Title>Ranking profili</Title>
                <Hint>Kliknij wiersz, aby dodać/usunąć z wykresu</Hint>
            </Header>
            <TableScroll>
                <Table>
                    <thead>
                        <tr>
                            <Th>#</Th>
                            <Th>Profil</Th>
                            <Th $right>Obserwujący</Th>
                            <Th $right>Śr. lajki</Th>
                            <Th $right>Śr. komentarze</Th>
                            <Th $right>Posty/tydz.</Th>
                            <Th $right>Stories/tydz.</Th>
                            <Th $right>Zaangażowanie</Th>
                            <Th $right>Trend lajków</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((p, idx) => {
                            const selected = selectedIds.has(p.id);
                            const color    = colorMap[p.id] ?? st.textMuted;
                            const sparkData = p.weeklyStats.slice(-12).map(w => ({ v: w.avgLikes }));
                            return (
                                <Tr key={p.id} $selected={selected} onClick={() => onToggle(p.id)}>
                                    <Td style={{ width: 36 }}>
                                        <Rank>{idx + 1}</Rank>
                                    </Td>
                                    <Td>
                                        <ProfileName>
                                            <ColorDot $color={color} $selected={selected} />
                                            <div>
                                                <Username>@{p.username}</Username>
                                                {p.apiError && (
                                                    <ApiErrorBadge>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                            <line x1="12" y1="9" x2="12" y2="13" />
                                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                                        </svg>
                                                        Błąd API
                                                    </ApiErrorBadge>
                                                )}
                                                {p.category && <MetricSub>{p.category}</MetricSub>}
                                            </div>
                                        </ProfileName>
                                    </Td>
                                    <Td $right>
                                        <MetricPrimary>{fmtK(p.followerCount) ?? <NullVal>—</NullVal>}</MetricPrimary>
                                        {p.followingCount != null && (
                                            <MetricSub>{p.followingCount} obserwuje</MetricSub>
                                        )}
                                    </Td>
                                    <Td $right>
                                        <MetricPrimary>{fmt(p.avgLikes) ?? <NullVal>—</NullVal>}</MetricPrimary>
                                        <MetricSub>Σ {fmtK(p.weeklyStats.reduce((s, w) => s + w.totalLikes, 0))}</MetricSub>
                                    </Td>
                                    <Td $right>
                                        <MetricPrimary>{fmt(p.avgComments) ?? <NullVal>—</NullVal>}</MetricPrimary>
                                        <MetricSub>Σ {fmtK(p.weeklyStats.reduce((s, w) => s + w.totalComments, 0))}</MetricSub>
                                    </Td>
                                    <Td $right>
                                        <MetricPrimary>{fmt(p.postsPerWeek, 1) ?? <NullVal>—</NullVal>}</MetricPrimary>
                                    </Td>
                                    <Td $right>
                                        <MetricPrimary>{fmt(p.storiesPerWeek, 1) ?? <NullVal>—</NullVal>}</MetricPrimary>
                                    </Td>
                                    <Td $right>
                                        <MetricPrimary>{fmt(p.avgEngagement, 1) ?? <NullVal>—</NullVal>}</MetricPrimary>
                                        <MetricSub>lajki + komentarze / post</MetricSub>
                                    </Td>
                                    <Td $right>
                                        <Sparkline>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={sparkData}>
                                                    <Line type="monotone" dataKey="v" stroke={selected ? color : st.border}
                                                        strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </Sparkline>
                                    </Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </Table>
            </TableScroll>
        </Wrapper>
    );
};
