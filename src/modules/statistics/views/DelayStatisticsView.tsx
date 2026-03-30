// src/modules/statistics/views/DelayStatisticsView.tsx
import { useState, useRef } from 'react';
import styled from 'styled-components';
import { StatsFilters } from '../components/StatsFilters';
import { StatsNav } from '../components/StatsNav';
import { DelayKpiBar } from '../components/DelayKpiBar';
import { DelayTrendChart } from '../components/DelayTrendChart';
import { ServiceDelayTable } from '../components/ServiceDelayTable';
import { useDelayStats } from '../hooks/useDelayStats';
import type { Granularity } from '../types';
import { st } from '../components/StatisticsTheme';

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: ${props => props.theme.spacing.lg};
    max-width: 1800px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const PageHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
    }
`;

const PageTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
`;

const PageSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionHeading = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.7px;
`;

const SectionRule = styled.div`
    flex: 1;
    height: 1px;
    background: ${st.border};
`;

const ContentArea = styled.div<{ $fading: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 24px;
    opacity: ${p => p.$fading ? 0.4 : 1};
    transform: ${p => p.$fading ? 'scale(0.995)' : 'scale(1)'};
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: ${p => p.$fading ? 'none' : 'auto'};
`;

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentAmber};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ErrorBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    background: ${st.accentRedDim};
    border: 1px solid ${st.accentRed}33;
    border-radius: ${st.radius};
    text-align: center;
`;

const ErrorText = styled.p`
    margin: 0;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
    font-weight: 500;
`;

const RetryButton = styled.button`
    padding: 8px 20px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlueDim};
    }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const oneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
};

// ─── Component ────────────────────────────────────────────────────────────────

export const DelayStatisticsView = () => {
    const [granularity, setGranularity] = useState<Granularity>('MONTHLY');
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate, setEndDate] = useState(today());

    const { delayStats, isLoading, isFetching, isError, refetch } = useDelayStats(
        granularity,
        startDate,
        endDate
    );

    // Keep previous data visible while refetching
    const lastDataRef = useRef(delayStats);
    if (delayStats !== undefined) lastDataRef.current = delayStats;
    const displayData = delayStats ?? lastDataRef.current;

    // Worst offender: highest occurrences among services
    const worstService = displayData?.services.length
        ? displayData.services.reduce((best, s) =>
            s.occurrences > best.occurrences ? s : best,
            displayData.services[0]
          )
        : null;

    return (
        <ViewContainer>
            {/* ── Page header ──────────────────────────── */}
            <PageHeader>
                <PageTitleGroup>
                    <PageTitle>Statystyki</PageTitle>
                    <PageSubtitle>Analiza terminowości realizacji wizyt</PageSubtitle>
                </PageTitleGroup>
                <StatsNav />
            </PageHeader>

            {/* ── Filters ──────────────────────────────── */}
            <Section>
                <StatsFilters
                    granularity={granularity}
                    startDate={startDate}
                    endDate={endDate}
                    onGranularityChange={setGranularity}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                />
            </Section>

            {/* ── Loading / error ───────────────────────── */}
            {isLoading && !displayData && (
                <LoadingOverlay><Spinner /></LoadingOverlay>
            )}

            {isError && (
                <ErrorBox>
                    <ErrorText>Nie udało się załadować danych o opóźnieniach.</ErrorText>
                    <RetryButton onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
                </ErrorBox>
            )}

            {/* ── Main content ──────────────────────────── */}
            {displayData && (
                <ContentArea $fading={isFetching && !isLoading}>

                    {/* KPI section */}
                    <Section>
                        <SectionHeading>
                            <SectionTitle>Podsumowanie okresu</SectionTitle>
                            <SectionRule />
                        </SectionHeading>
                        <DelayKpiBar
                            overview={displayData.overview}
                            worstService={worstService}
                        />
                    </Section>

                    {/* Trend chart */}
                    <Section>
                        <SectionHeading>
                            <SectionTitle>Trend w czasie</SectionTitle>
                            <SectionRule />
                        </SectionHeading>
                        <DelayTrendChart
                            data={displayData.overview.trend}
                            avgDelay={displayData.overview.avgDelayDays}
                        />
                    </Section>

                    {/* Service breakdown */}
                    <Section>
                        <SectionHeading>
                            <SectionTitle>Usługi powodujące opóźnienia</SectionTitle>
                            <SectionRule />
                        </SectionHeading>
                        <ServiceDelayTable
                            services={displayData.services}
                            isLoading={isLoading}
                        />
                    </Section>

                </ContentArea>
            )}
        </ViewContainer>
    );
};
