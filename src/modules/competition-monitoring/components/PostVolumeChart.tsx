import React, { useMemo } from 'react';
import styled from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

const ChartCard = styled.div`
    background: ${st.bgCard};
    padding: 24px;
    border-radius: ${st.radiusLg};
    border: 1px solid ${st.border};
    margin-top: 24px;
`;

const Title = styled.h3`
    margin: 0 0 20px 0;
    font-size: ${st.fontMd};
    color: ${st.text};
`;

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

export const PostVolumeChart: React.FC<{ summaries: ProfileSummary[] }> = ({ summaries }) => {
    const chartData = useMemo(() => {
        const weeksMap: Record<string, any> = {};

        summaries.forEach(profile => {
            profile.weeklyStats.forEach(stat => {
                if (!weeksMap[stat.weekStart]) {
                    weeksMap[stat.weekStart] = { name: stat.weekStart };
                }
                weeksMap[stat.weekStart][profile.username] = stat.postCount;
            });
        });

        return Object.values(weeksMap).sort((a: any, b: any) =>
            new Date(a.name).getTime() - new Date(b.name).getTime()
        );
    }, [summaries]);

    return (
        <ChartCard>
            <Title>Trend aktywności (liczba postów tygodniowo)</Title>
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={st.border} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: st.textMuted }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ background: st.bgCard, border: `1px solid ${st.border}`, borderRadius: '8px' }}
                        />
                        <Legend />
                        {summaries.map((profile, idx) => (
                            <Line
                                key={profile.id}
                                type="monotone"
                                dataKey={profile.username}
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={2.5}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
};