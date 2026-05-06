import { useState } from 'react';
import styled from 'styled-components';
import { TrendingUp, LayoutGrid, Table2, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { useTrendsSummary } from '../hooks/useTrendsSummary';
import { useKeywordsList } from '../hooks/useKeywordsList';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { TopKeywordsGrid } from '../components/TopKeywordsGrid';
import { KeywordsTable } from '../components/KeywordsTable';
import { VoivodeshipChart } from '../components/VoivodeshipChart';
import { KeywordHistoryModal } from '../components/KeywordHistoryModal';

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: ${p => p.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: ${p => p.theme.spacing.xl};
    }
`;

const PageHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const HeaderTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
`;

const TitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const TitleIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
    border-radius: ${p => p.theme.radii.lg};
    color: white;
    flex-shrink: 0;
`;

const PageSubtitle = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
`;

const StatsRow = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
`;

const StatChip = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    font-size: ${p => p.theme.fontSizes.sm};
    box-shadow: ${p => p.theme.shadows.sm};
`;

const StatValue = styled.span`
    font-weight: ${p => p.theme.fontWeights.bold};
    color: var(--brand-primary);
`;

const StatLabel = styled.span`
    color: ${p => p.theme.colors.textMuted};
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabNav = styled.div`
    display: flex;
    gap: 2px;
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 4px;
    width: fit-content;
    flex-wrap: wrap;
`;

const TabBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    border: none;
    transition: all ${p => p.theme.transitions.fast};
    white-space: nowrap;

    ${p => p.$active ? `
        background: ${p.theme.colors.surface};
        color: var(--brand-primary);
        box-shadow: ${p.theme.shadows.sm};
    ` : `
        background: transparent;
        color: ${p.theme.colors.textSecondary};
        &:hover { background: ${p.theme.colors.surface}; color: ${p.theme.colors.text}; }
    `}
`;

// ─── Section cards ────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.xl};
    padding: 24px;
    box-shadow: ${p => p.theme.shadows.sm};
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 12px;
    flex-wrap: wrap;
`;

const CardTitle = styled.h2`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

const CardSub = styled.p`
    margin: 4px 0 0;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
`;

// ─── Error / loading ──────────────────────────────────────────────────────────

const ErrorBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: ${p => p.theme.colors.errorLight};
    border: 1px solid #fecaca;
    border-radius: ${p => p.theme.radii.lg};
    color: ${p => p.theme.colors.error};
    font-size: ${p => p.theme.fontSizes.sm};
`;

const RefreshBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: ${p => p.theme.fontSizes.sm};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
`;

const LoadingGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
`;

const SkeletonCard = styled.div`
    height: 120px;
    background: linear-gradient(90deg, ${p => p.theme.colors.surfaceAlt} 25%, ${p => p.theme.colors.border} 50%, ${p => p.theme.colors.surfaceAlt} 75%);
    background-size: 200% 100%;
    border-radius: ${p => p.theme.radii.lg};
    animation: shimmer 1.5s infinite;

    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'keywords' | 'regions';

// ─── View ─────────────────────────────────────────────────────────────────────

export function TrendsView() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

    const { summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useTrendsSummary();
    const { data: keywordsData, isLoading: kwLoading, isError: kwError, refetch: refetchKw } = useKeywordsList();

    function openKeyword(kw: string) {
        setSelectedKeyword(kw);
    }

    const tabs = [
        { id: 'overview' as Tab, label: 'Przegląd', icon: LayoutGrid },
        { id: 'keywords' as Tab, label: 'Słowa kluczowe', icon: Table2 },
        { id: 'regions' as Tab, label: 'Regiony', icon: MapPin },
    ];

    return (
        <ViewContainer>
            <PageHeader>
                <HeaderTop>
                    <TitleGroup>
                        <PageTitle>
                            <TitleIcon><TrendingUp size={20} /></TitleIcon>
                            Google Trends
                        </PageTitle>
                        <PageSubtitle>
                            Dane o wyszukiwaniach fraz kluczowych w Google — Polska i województwa
                        </PageSubtitle>
                    </TitleGroup>
                    <RefreshBtn onClick={() => { refetchSummary(); refetchKw(); }}>
                        <RefreshCw size={14} />
                        Odśwież
                    </RefreshBtn>
                </HeaderTop>

                {summary && (
                    <StatsRow>
                        <StatChip>
                            <StatValue>{summary.totalTrackedKeywords}</StatValue>
                            <StatLabel>śledzonych fraz</StatLabel>
                        </StatChip>
                        <StatChip>
                            <StatValue>{summary.locations.voivodeshipCount}</StatValue>
                            <StatLabel>województw</StatLabel>
                        </StatChip>
                        <StatChip>
                            <StatLabel>{summary.locations.country}</StatLabel>
                        </StatChip>
                    </StatsRow>
                )}

                {summary?.syncStatuses && summary.syncStatuses.length > 0 && (
                    <SyncStatusBar syncStatuses={summary.syncStatuses} />
                )}
            </PageHeader>

            <TabNav>
                {tabs.map(t => (
                    <TabBtn key={t.id} $active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
                        <t.icon size={15} />
                        {t.label}
                    </TabBtn>
                ))}
            </TabNav>

            {/* ── OVERVIEW TAB ─────────────────────────────────── */}
            {activeTab === 'overview' && (
                <>
                    {summaryError && (
                        <ErrorBanner>
                            <AlertCircle size={18} />
                            Błąd ładowania danych. Sprawdź połączenie z backendem.
                        </ErrorBanner>
                    )}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Top 10 fraz wg. wolumenu</CardTitle>
                                <CardSub>Kliknij kartę, aby zobaczyć szczegółową historię</CardSub>
                            </div>
                        </CardHeader>
                        {summaryLoading ? (
                            <LoadingGrid>
                                {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
                            </LoadingGrid>
                        ) : (
                            <TopKeywordsGrid
                                keywords={summary?.topKeywordsByVolume ?? []}
                                onSelect={openKeyword}
                            />
                        )}
                    </Card>
                </>
            )}

            {/* ── KEYWORDS TAB ─────────────────────────────────── */}
            {activeTab === 'keywords' && (
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Wszystkie frazy kluczowe</CardTitle>
                            <CardSub>
                                {keywordsData ? `${keywordsData.totalKeywords} aktywnych fraz · ${keywordsData.locationName}` : ''}
                            </CardSub>
                        </div>
                    </CardHeader>
                    {kwError && (
                        <ErrorBanner>
                            <AlertCircle size={18} />
                            Nie można załadować listy fraz.
                        </ErrorBanner>
                    )}
                    {kwLoading ? (
                        <LoadingGrid>
                            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} style={{ height: 48 }} />)}
                        </LoadingGrid>
                    ) : (
                        <KeywordsTable
                            keywords={keywordsData?.keywords ?? []}
                            onSelect={openKeyword}
                        />
                    )}
                </Card>
            )}

            {/* ── REGIONS TAB ──────────────────────────────────── */}
            {activeTab === 'regions' && (
                <VoivodeshipChart />
            )}

            {/* ── KEYWORD DETAIL MODAL ─────────────────────────── */}
            {selectedKeyword && (
                <KeywordHistoryModal
                    keyword={selectedKeyword}
                    onClose={() => setSelectedKeyword(null)}
                />
            )}
        </ViewContainer>
    );
}
