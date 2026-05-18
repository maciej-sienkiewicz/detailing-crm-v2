// src/modules/statistics/views/DelayStatisticsView.tsx
import { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { EyeOff, X } from 'lucide-react';
import { StatsFilters } from '../components/StatsFilters';
import { StatsNav } from '../components/StatsNav';
import { DelayKpiBar } from '../components/DelayKpiBar';
import { DelayTrendChart } from '../components/DelayTrendChart';
import { ServiceDelayTable } from '../components/ServiceDelayTable';
import { useDelayStats } from '../hooks/useDelayStats';
import type { Granularity } from '../types';
import { st } from '../components/StatisticsTheme';
import { PageHeader } from '@/common/components/PageHeader';

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

// ─── Exclusion banner ─────────────────────────────────────────────────────────

const ExclusionBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    flex-wrap: wrap;
`;

const BannerIcon = styled.span`
    display: flex;
    align-items: center;
    color: ${st.textMuted};
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }
`;

const BannerLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
`;

const ChipList = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
`;

const Chip = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px 3px 10px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 500;
    color: ${st.textSecondary};
`;

const ChipRemove = styled.button`
    all: unset;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: ${st.textMuted};
    border-radius: 50%;
    padding: 1px;
    transition: color ${st.transition};

    svg { width: 11px; height: 11px; }

    &:hover { color: ${st.accentRed}; }
`;

const ClearAllBtn = styled.button`
    all: unset;
    cursor: pointer;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    white-space: nowrap;
    padding: 3px 6px;
    border-radius: 4px;
    transition: background ${st.transition};

    &:hover { background: ${st.accentBlueDim}; }
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
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

    const excludedArray = Array.from(excludedIds);

    const { delayStats, isLoading, isFetching, isError, refetch } = useDelayStats(
        granularity,
        startDate,
        endDate,
        excludedArray
    );

    const lastDataRef = useRef(delayStats);
    if (delayStats !== undefined) lastDataRef.current = delayStats;
    const displayData = delayStats ?? lastDataRef.current;

    const handleToggleExclude = useCallback((serviceId: string) => {
        setExcludedIds(prev => {
            const next = new Set(prev);
            if (next.has(serviceId)) {
                next.delete(serviceId);
            } else {
                next.add(serviceId);
            }
            return next;
        });
    }, []);

    const handleClearAll = useCallback(() => {
        setExcludedIds(new Set());
    }, []);

    // Build name map for banner chips
    const serviceNameMap = new Map(
        displayData?.services.map(s => [s.serviceId, s.serviceName]) ?? []
    );

    const worstService = displayData?.services.length
        ? displayData.services
            .filter(s => !excludedIds.has(s.serviceId))
            .reduce((best, s) => s.occurrences > best.occurrences ? s : best,
                displayData.services.filter(s => !excludedIds.has(s.serviceId))[0] ?? displayData.services[0]
            )
        : null;

    return (
        <ViewContainer>
            <PageHeader
                title="Statystyki"
                subtitle="Analiza terminowości realizacji wizyt"
                actions={<StatsNav />}
            />

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

                    {/* Exclusion banner */}
                    {excludedIds.size > 0 && (
                        <ExclusionBanner>
                            <BannerIcon><EyeOff /></BannerIcon>
                            <BannerLabel>Wykluczone:</BannerLabel>
                            <ChipList>
                                {excludedArray.map(id => (
                                    <Chip key={id}>
                                        {serviceNameMap.get(id) ?? id}
                                        <ChipRemove onClick={() => handleToggleExclude(id)} title="Przywróć">
                                            <X />
                                        </ChipRemove>
                                    </Chip>
                                ))}
                            </ChipList>
                            <ClearAllBtn onClick={handleClearAll}>
                                Wyczyść wszystko
                            </ClearAllBtn>
                        </ExclusionBanner>
                    )}

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
                            excludedIds={excludedIds}
                            onToggleExclude={handleToggleExclude}
                        />
                    </Section>

                </ContentArea>
            )}
        </ViewContainer>
    );
};
