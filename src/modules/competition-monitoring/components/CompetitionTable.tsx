import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

const TableWrapper = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radiusLg};
    border: 1px solid ${st.border};
    overflow: hidden;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const Th = styled.th`
    text-align: left;
    padding: 16px;
    background: ${st.bg};
    color: ${st.textMuted};
    font-weight: 600;
    border-bottom: 1px solid ${st.border};
`;

const Td = styled.td`
    padding: 16px;
    border-bottom: 1px solid ${st.border};
    color: ${st.text};
`;

const SparklineWrapper = styled.div`
    width: 80px;
    height: 30px;
`;

const Pagination = styled.div`
    display: flex;
    justify-content: flex-end;
    padding: 12px;
    gap: 8px;
    background: ${st.bg};
`;

const PageBtn = styled.button<{ $active?: boolean }>`
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlue : 'transparent'};
    color: ${p => p.$active ? '#fff' : st.text};
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

interface Props {
    summaries: ProfileSummary[];
}

export const CompetitionTable: React.FC<Props> = ({ summaries }) => {
    const [page, setPage] = useState(0);
    const pageSize = 5;

    const sortedData = useMemo(() => {
        return [...summaries].sort((a, b) => {
            const lastA = a.weeklyStats[a.weeklyStats.length - 1]?.postCount || 0;
            const lastB = b.weeklyStats[b.weeklyStats.length - 1]?.postCount || 0;
            return lastB - lastA; // Sortowanie po liczbie postów w zeszłym tygodniu
        });
    }, [summaries]);

    const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(sortedData.length / pageSize);

    return (
        <TableWrapper>
            <Table>
                <thead>
                <tr>
                    <Th>Nazwa firmy</Th>
                    <Th>Posty (ost. tydzień)</Th>
                    <Th>Lajki / Post</Th>
                    <Th>Trend (4 tyg.)</Th>
                </tr>
                </thead>
                <tbody>
                {paginatedData.map(profile => {
                    const lastStats = profile.weeklyStats[profile.weeklyStats.length - 1];
                    const sparklineData = profile.weeklyStats.slice(-4);

                    return (
                        <tr key={profile.id}>
                            <Td><strong>@{profile.username}</strong></Td>
                            <Td>{lastStats?.postCount || 0}</Td>
                            <Td>{Math.round(lastStats?.avgLikes || 0)}</Td>
                            <Td>
                                <SparklineWrapper>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={sparklineData}>
                                            <Line
                                                type="monotone"
                                                dataKey="postCount"
                                                stroke={st.accentBlue}
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </SparklineWrapper>
                            </Td>
                        </tr>
                    );
                })}
                </tbody>
            </Table>
            <Pagination>
                <PageBtn onClick={() => setPage(p => p - 1)} disabled={page === 0}>Poprzednia</PageBtn>
                <PageBtn onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Następna</PageBtn>
            </Pagination>
        </TableWrapper>
    );
};