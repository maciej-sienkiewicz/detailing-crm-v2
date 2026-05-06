import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { TrendingUp, LayoutGrid, Table2, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useTrendsSummary } from '../hooks/useTrendsSummary';
import { useKeywordsList } from '../hooks/useKeywordsList';
import { useLocations } from '../hooks/useLocations';
import { LocationFilter } from '../components/LocationFilter';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { TrendsSummaryTiles } from '../components/TrendsSummaryTiles';
import { TopKeywordsGrid } from '../components/TopKeywordsGrid';
import { KeywordsTable } from '../components/KeywordsTable';
import { VoivodeshipChart } from '../components/VoivodeshipChart';
import { KeywordHistoryModal } from '../components/KeywordHistoryModal';
import type { Tab } from '../types';

const COUNTRY_CODE = 2616;

// ─── Animations ──────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
`;

// ─── Page layout ─────────────────────────────────────────────────────────────

const View = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: ${p => p.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    animation: ${fadeUp} 280ms ease both;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: ${p => p.theme.spacing.xl};
    }
`;

// ─── Hero card ───────────────────────────────────────────────────────────────

const Hero = styled.div`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    border-radius: ${p => p.theme.radii.xl};
    padding: 28px 32px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.16);

    &::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -60px;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 60%);
        pointer-events: none;
    }

    &::after {
        content: '';
        position: absolute;
        bottom: -80px;
        left: 30%;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%);
        pointer-events: none;
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 22px 20px;
    }
`;

const HeroInner = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        flex-direction: column;
        gap: 20px;
    }
`;

const HeroLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

const HeroEyebrow = styled.p`
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const LiveDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${st.accentGreen};
    box-shadow: 0 0 0 3px rgba(16,185,129,0.2);
    animation: ${pulse} 2s infinite;
`;

const HeroTitle = styled.h1`
    margin: 0;
    font-size: 34px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.5px;
    line-height: 1.1;
    display: flex;
    align-items: center;
    gap: 14px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        font-size: 26px;
    }
`;

const HeroIconRing = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #3b82f6, #0ea5e9);
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(59,130,246,0.4);
`;

const HeroDesc = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.55;
    max-width: 480px;
`;

const HeroRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    flex-shrink: 0;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        align-items: flex-start;
        flex-direction: row;
        flex-wrap: wrap;
    }
`;

const HeroStat = styled.div`
    text-align: right;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        text-align: left;
    }
`;

const HeroStatNum = styled.div`
    font-size: 36px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -1.5px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
`;

const HeroStatLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 4px;
`;

const HeroDivider = styled.div`
    width: 1px;
    height: 40px;
    background: rgba(255,255,255,0.08);
    align-self: center;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        display: none;
    }
`;

const HeroStatsRow = styled.div`
    display: flex;
    gap: 24px;
    align-items: center;
`;

const HeroRefreshBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: ${p => p.theme.radii.full};
    background: rgba(255,255,255,0.06);
    color: #94a3b8;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    white-space: nowrap;

    &:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; border-color: rgba(255,255,255,0.2); }
`;

// ─── Tab nav ─────────────────────────────────────────────────────────────────

const TabNav = styled.div`
    display: flex;
    gap: 2px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 4px;
    width: fit-content;
`;

const TabBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    border-radius: ${st.radiusSm};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all ${st.transition};
    white-space: nowrap;

    background: ${p => p.$active ? st.bgCard : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.textSecondary};
    box-shadow: ${p => p.$active ? st.shadowXs : 'none'};

    &:hover {
        background: ${p => p.$active ? st.bgCard : 'rgba(59,130,246,0.04)'};
        color: ${p => p.$active ? st.accentBlue : st.text};
    }
`;

// ─── Section heading ─────────────────────────────────────────────────────────

const SectionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: -4px;
`;

const SectionLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
`;

const SectionLine = styled.div`
    flex: 1;
    height: 1px;
    background: ${st.border};
`;

// ─── Cards ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const CardHeader = styled.div`
    padding: 18px 20px 14px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
`;

const CardTitle = styled.h2`
    margin: 0 0 2px;
    font-size: 15px;
    font-weight: 600;
    color: ${st.text};
    letter-spacing: -0.1px;
`;

const CardSub = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${st.textMuted};
    font-weight: 400;
`;

const CardBody = styled.div`
    padding: 20px;
`;

// ─── Error ───────────────────────────────────────────────────────────────────

const ErrorBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: ${st.accentRedDim};
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: ${st.radiusSm};
    color: ${st.accentRed};
    font-size: 13px;
    font-weight: 500;
`;

// ─── Skeleton rows ───────────────────────────────────────────────────────────

const shimmer = keyframes`
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
`;

const Skeleton = styled.div<{ $h?: string }>`
    height: ${p => p.$h ?? '48px'};
    border-radius: ${st.radiusSm};
    background: linear-gradient(90deg, ${st.bgCardAlt} 25%, ${st.border} 50%, ${st.bgCardAlt} 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
`;

const SkeletonGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
`;

// ─── View ────────────────────────────────────────────────────────────────────

export function TrendsView() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    const [regionKeyword, setRegionKeyword] = useState<string | null>(null);
    const [locationCode, setLocationCode] = useState<number>(COUNTRY_CODE);

    const { locations, isLoading: locLoading } = useLocations();
    const { summary, isLoading: sumLoading, isError: sumError, refetch: refetchSum } = useTrendsSummary();
    const { data: kwData, isLoading: kwLoading, isFetching: kwFetching, isError: kwError, refetch: refetchKw } = useKeywordsList({ locationCode });

    const locationName = locationCode === COUNTRY_CODE
        ? (locations?.country.polishName ?? 'Polska')
        : (locations?.voivodeships.find(v => v.locationCode === locationCode)?.polishName ?? 'Lokalizacja');

    function openKeyword(kw: string) {
        setSelectedKeyword(kw);
    }

    function handleTabChange(tab: Tab) {
        setActiveTab(tab);
        if (tab === 'regions' && !regionKeyword && kwData?.keywords[0]) {
            setRegionKeyword(kwData.keywords[0].keyword);
        }
    }

    function handleKeywordSelectForRegion(kw: string) {
        setRegionKeyword(kw);
        handleTabChange('regions');
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview',  label: 'Przegląd',         icon: LayoutGrid },
        { id: 'keywords',  label: 'Słowa kluczowe',   icon: Table2 },
        { id: 'regions',   label: 'Regiony',           icon: MapPin },
    ];

    return (
        <View>
            {/* ── HERO ─────────────────────────────────────────── */}
            <Hero>
                <HeroInner>
                    <HeroLeft>
                        <HeroEyebrow>
                            <LiveDot />
                            Analityka wyszukiwań · Google Search Console
                        </HeroEyebrow>
                        <HeroTitle>
                            <HeroIconRing><TrendingUp size={22} color="#fff" /></HeroIconRing>
                            Google Trends
                        </HeroTitle>
                        <HeroDesc>
                            Wolumeny wyszukiwań, indeksy trendów i konkurencja dla śledzonych fraz kluczowych — Polska i poszczególne województwa.
                        </HeroDesc>
                        {summary?.syncStatuses && summary.syncStatuses.length > 0 && (
                            <SyncStatusBar syncStatuses={summary.syncStatuses} />
                        )}
                    </HeroLeft>

                    <HeroRight>
                        {summary && (
                            <HeroStatsRow>
                                <HeroStat>
                                    <HeroStatNum>{summary.totalTrackedKeywords}</HeroStatNum>
                                    <HeroStatLabel>Śledzone frazy</HeroStatLabel>
                                </HeroStat>
                                <HeroDivider />
                                <HeroStat>
                                    <HeroStatNum>{summary.locations.voivodeshipCount}</HeroStatNum>
                                    <HeroStatLabel>Województw</HeroStatLabel>
                                </HeroStat>
                            </HeroStatsRow>
                        )}
                        <HeroRefreshBtn onClick={() => { refetchSum(); refetchKw(); }}>
                            <RefreshCw size={13} />
                            Odśwież dane
                        </HeroRefreshBtn>
                    </HeroRight>
                </HeroInner>
            </Hero>

            {/* ── LOCATION FILTER ──────────────────────────────── */}
            <LocationFilter
                locations={locations}
                isLoading={locLoading}
                selectedCode={locationCode}
                onChange={setLocationCode}
            />

            {/* ── KPI TILES ────────────────────────────────────── */}
            <TrendsSummaryTiles
                keywords={kwData?.keywords ?? []}
                locationName={locationName}
                isLoading={kwLoading}
            />

            {/* ── TAB NAV ──────────────────────────────────────── */}
            <TabNav>
                {tabs.map(t => (
                    <TabBtn key={t.id} $active={activeTab === t.id} onClick={() => handleTabChange(t.id)}>
                        <t.icon size={14} />
                        {t.label}
                    </TabBtn>
                ))}
            </TabNav>

            {/* ── ERROR BANNERS ─────────────────────────────────── */}
            {(sumError || kwError) && (
                <ErrorBanner>
                    <AlertCircle size={16} />
                    Nie udało się załadować danych. Sprawdź połączenie z backendem.
                </ErrorBanner>
            )}

            {/* ── OVERVIEW ─────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <>
                    <SectionRow>
                        <SectionLabel>Top frazy wg. wolumenu wyszukiwań</SectionLabel>
                        <SectionLine />
                    </SectionRow>
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>
                                    {sumLoading ? 'Ładowanie…' : `Top ${summary?.topKeywordsByVolume.length ?? 0} fraz kluczowych`}
                                </CardTitle>
                                <CardSub>
                                    Kliknij kartę, aby zobaczyć historię i trendy · {locationName}
                                </CardSub>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {sumLoading ? (
                                <SkeletonGrid>
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <Skeleton key={i} $h="140px" />
                                    ))}
                                </SkeletonGrid>
                            ) : (
                                <TopKeywordsGrid
                                    keywords={summary?.topKeywordsByVolume ?? []}
                                    onSelect={kw => {
                                        openKeyword(kw);
                                    }}
                                />
                            )}
                        </CardBody>
                    </Card>
                </>
            )}

            {/* ── KEYWORDS TABLE ───────────────────────────────── */}
            {activeTab === 'keywords' && (
                <>
                    <SectionRow>
                        <SectionLabel>Wszystkie śledzone frazy</SectionLabel>
                        <SectionLine />
                    </SectionRow>
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Frazy kluczowe</CardTitle>
                                <CardSub>
                                    {kwData
                                        ? `${kwData.totalKeywords} aktywnych fraz · ${kwData.locationName}`
                                        : 'Ładowanie…'}
                                </CardSub>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {kwLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <Skeleton key={i} $h="46px" />
                                    ))}
                                </div>
                            ) : (
                                <KeywordsTable
                                    keywords={kwData?.keywords ?? []}
                                    isFetching={kwFetching}
                                    onSelect={kw => {
                                        openKeyword(kw);
                                    }}
                                />
                            )}
                        </CardBody>
                    </Card>
                </>
            )}

            {/* ── REGIONS ──────────────────────────────────────── */}
            {activeTab === 'regions' && (
                <>
                    <SectionRow>
                        <SectionLabel>Popularność w województwach</SectionLabel>
                        <SectionLine />
                    </SectionRow>

                    {kwData && kwData.keywords.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div>
                                    <CardTitle>Wybierz frazę</CardTitle>
                                    <CardSub>Dane regionalne są niezależne od filtra lokalizacji powyżej</CardSub>
                                </div>
                            </CardHeader>
                            <CardBody style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {kwData.keywords.slice(0, 20).map(kw => (
                                        <button
                                            key={kw.keyword}
                                            onClick={() => setRegionKeyword(kw.keyword)}
                                            style={{
                                                padding: '5px 14px',
                                                borderRadius: 9999,
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                border: `1px solid ${regionKeyword === kw.keyword ? st.accentBlue : st.border}`,
                                                background: regionKeyword === kw.keyword ? st.accentBlue : 'transparent',
                                                color: regionKeyword === kw.keyword ? '#fff' : st.textSecondary,
                                                fontFamily: 'inherit',
                                                transition: `all ${st.transition}`,
                                            }}
                                        >
                                            {kw.keyword}
                                        </button>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    <VoivodeshipChart keyword={regionKeyword} />
                </>
            )}

            {/* ── KEYWORD DETAIL MODAL ─────────────────────────── */}
            {selectedKeyword && (
                <KeywordHistoryModal
                    keyword={selectedKeyword}
                    locationCode={locationCode}
                    onClose={() => setSelectedKeyword(null)}
                />
            )}
        </View>
    );
}
