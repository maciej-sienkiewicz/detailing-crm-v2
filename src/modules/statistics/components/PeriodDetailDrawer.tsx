// src/modules/statistics/components/PeriodDetailDrawer.tsx

import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { st } from './StatisticsTheme';
import type { PeriodDetail, PeriodVisit, Granularity } from '../types';
import { fetchPeriodDetail } from '../api/periodDetailMockApi';

// ─── Animations ───────────────────────────────────────────────────────────────

const slideIn = keyframes`
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
`;

const slideOut = keyframes`
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(100%); opacity: 0; }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

// ─── Shell ────────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(15, 23, 42, 0.25);
    backdrop-filter: blur(2px);
    animation: ${fadeIn} 200ms ease;
    cursor: pointer;
`;

const Drawer = styled.aside<{ $closing: boolean }>`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 401;
    width: min(480px, 95vw);
    background: ${st.bgCard};
    box-shadow: -8px 0 40px rgba(15, 23, 42, 0.14), -2px 0 8px rgba(15, 23, 42, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${p => p.$closing
        ? css`${slideOut} 220ms ease forwards`
        : css`${slideIn} 240ms cubic-bezier(0.22, 1, 0.36, 1) forwards`};
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const DrawerHeader = styled.div`
    flex-shrink: 0;
    padding: 20px 24px 0;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
`;

const HeaderMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const PeriodLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.8px;
`;

const DrawerTitle = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.3px;
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bg};
    color: ${st.textMuted};
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all ${st.transition};
    &:hover { background: ${st.bgCard}; border-color: ${st.borderHover}; color: ${st.text}; }
`;

// ─── Category filter badge ────────────────────────────────────────────────────

const FilterBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: ${st.accentBlueDim};
    border: 1px solid ${st.accentBlue}33;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    color: ${st.accentBlue};
    margin-bottom: 12px;
    align-self: flex-start;
`;

const FilterDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${st.accentBlue};
    flex-shrink: 0;
`;

// ─── KPI strip ────────────────────────────────────────────────────────────────

const KpiStrip = styled.div`
    display: flex;
    gap: 10px;
    padding-bottom: 14px;
`;

const KpiTile = styled.div<{ $color: string; $dimColor: string }>`
    flex: 1;
    padding: 10px 12px;
    background: ${p => p.$dimColor};
    border: 1px solid ${p => p.$color}22;
    border-radius: ${st.radiusSm};
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const KpiLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const KpiValue = styled.span<{ $color: string }>`
    font-size: 16px;
    font-weight: 800;
    color: ${p => p.$color};
    letter-spacing: -0.3px;
    line-height: 1.2;
`;

const KpiSub = styled.span`
    font-size: 10px;
    color: ${st.textMuted};
    font-weight: 500;
`;

const Divider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 0 -24px;
`;

// ─── Scrollable body ──────────────────────────────────────────────────────────

const DrawerBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 80px;
    scrollbar-width: thin;
    scrollbar-color: ${st.border} transparent;
    &::-webkit-scrollbar { width: 5px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: ${st.border}; border-radius: 4px; }
`;

const VisitListLabel = styled.div`
    padding: 14px 0 8px;
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    gap: 8px;
    &::after { content: ''; flex: 1; height: 1px; background: ${st.border}; }
`;

// ─── Visit card ───────────────────────────────────────────────────────────────

const VisitCard = styled.div<{ $expanded: boolean }>`
    border: 1px solid ${p => p.$expanded ? st.accentBlue + '44' : st.border};
    border-radius: ${st.radiusSm};
    background: ${p => p.$expanded ? st.accentBlueDim : st.bgCard};
    margin-bottom: 8px;
    overflow: hidden;
    transition: border-color ${st.transition}, background ${st.transition};
`;

const VisitHeader = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};
    &:hover { background: rgba(15, 23, 42, 0.025); }
`;

const VisitAvatar = styled.div<{ $color: string }>`
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: ${p => p.$color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
`;

const VisitInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const VisitClient = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const VisitMeta = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const VisitRight = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
`;

const VisitRevenue = styled.span`
    font-size: 14px;
    font-weight: 800;
    color: ${st.accentGreen};
    letter-spacing: -0.3px;
`;

// When filter active: show full visit total as secondary/muted
const VisitRevenueAll = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    font-weight: 500;
`;

const VisitServiceCount = styled.span<{ $expanded: boolean }>`
    font-size: 10px;
    color: ${p => p.$expanded ? st.accentBlue : st.textMuted};
    font-weight: 500;
    transition: color ${st.transition};
`;

const Chevron = styled.span<{ $expanded: boolean }>`
    flex-shrink: 0;
    font-size: 10px;
    color: ${st.textMuted};
    transform: ${p => p.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform 220ms ease;
    margin-left: -4px;
`;

// ─── Services panel (accordion) ───────────────────────────────────────────────

const ServicesPanel = styled.div<{ $expanded: boolean; $maxH: number }>`
    max-height: ${p => p.$expanded ? `${p.$maxH}px` : '0'};
    overflow: hidden;
    transition: max-height 280ms cubic-bezier(0.4, 0, 0.2, 1);
`;

const ServicesInner = styled.div`
    padding: 0 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

// Section label inside the expanded panel
const ServiceSectionLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 2px 0 4px;
`;

const ServiceRow = styled.div<{ $dimmed?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: ${p => p.$dimmed ? st.bgCardAlt : st.bgCard};
    border: 1px solid ${p => p.$dimmed ? 'transparent' : st.border};
    border-radius: 6px;
    opacity: ${p => p.$dimmed ? 0.55 : 1};
    transition: opacity ${st.transition};
`;

const ServiceDot = styled.span<{ $dimmed?: boolean }>`
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$dimmed ? st.textMuted : st.accentGreen};
`;

const ServiceName = styled.span`
    flex: 1;
    font-size: 12px;
    color: ${st.textSecondary};
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ServicePrice = styled.span`
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const SummaryRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 10px 0;
    margin-top: 2px;
    border-top: 1px solid ${st.border};
`;

const SummaryLabel = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    font-weight: 600;
`;

const SummaryValue = styled.span<{ $color?: string }>`
    font-size: 13px;
    font-weight: 800;
    color: ${p => p.$color ?? st.accentGreen};
`;

// ─── "Other services" collapse toggle ────────────────────────────────────────

const OtherServicesToggle = styled.button<{ $open: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    margin-top: 2px;
    background: transparent;
    border: 1px dashed ${st.border};
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    transition: all ${st.transition};
    text-align: left;
    &:hover { background: ${st.bgCardAlt}; border-color: ${st.borderHover}; color: ${st.textSecondary}; }
`;

const OtherChevron = styled.span<{ $open: boolean }>`
    font-size: 9px;
    transform: ${p => p.$open ? 'rotate(180deg)' : 'rotate(0)'};
    transition: transform 200ms ease;
`;

const OtherServicesList = styled.div<{ $open: boolean; $count: number }>`
    max-height: ${p => p.$open ? `${p.$count * 36}px` : '0'};
    overflow: hidden;
    transition: max-height 240ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: ${p => p.$open ? '3px' : '0'};
`;

// ─── Contribution bar (% of visit revenue) ────────────────────────────────────

const ContribBar = styled.div`
    margin: 6px 0 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ContribTrack = styled.div`
    height: 4px;
    background: ${st.bgCardAlt};
    border-radius: 2px;
    overflow: hidden;
`;

const ContribFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${p => p.$pct}%;
    background: ${st.accentGreen};
    border-radius: 2px;
    transition: width 400ms ease;
`;

const ContribLabel = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: ${st.textMuted};
`;

// ─── Loading / footer ─────────────────────────────────────────────────────────

const LoadingState = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: ${st.textMuted};
    font-size: 13px;
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 2.5px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const MockBadge = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 24px;
    background: ${st.bgCard};
    border-top: 1px solid ${st.border};
    font-size: 10px;
    color: ${st.textMuted};
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLN = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

const AVATAR_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EF4444', '#06B6D4', '#EC4899', '#F97316',
];

function avatarColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Visit card component ─────────────────────────────────────────────────────

const VisitItem = ({
    visit,
    index,
    categoryName,
}: {
    visit: PeriodVisit;
    index: number;
    categoryName: string | null;
}) => {
    const [expanded, setExpanded] = useState(index === 0);
    const [othersOpen, setOthersOpen] = useState(false);

    const hasFilter = categoryName != null;
    const inCat = hasFilter ? visit.services.filter(s => s.inCategory) : visit.services;
    const others = hasFilter ? visit.services.filter(s => !s.inCategory) : [];

    const isFiltered = hasFilter && visit.totalRevenueGross !== visit.totalRevenueGrossAll;
    const contribPct = isFiltered
        ? Math.round((visit.totalRevenueGross / visit.totalRevenueGrossAll) * 100)
        : 100;

    // Estimate expanded height for smooth animation
    const inCatRows = inCat.length;
    const otherRows = othersOpen ? others.length : 0;
    const sectionLabels = hasFilter && inCat.length > 0 ? 1 : 0;
    const contribBarH = isFiltered ? 40 : 0;
    const estimatedH = (inCatRows + otherRows + sectionLabels) * 40 + 60 + contribBarH + (others.length > 0 ? 40 : 0);

    const color = avatarColor(visit.clientName);

    return (
        <VisitCard $expanded={expanded}>
            <VisitHeader onClick={() => setExpanded(e => !e)}>
                <VisitAvatar $color={color}>{initials(visit.clientName)}</VisitAvatar>
                <VisitInfo>
                    <VisitClient>{visit.clientName}</VisitClient>
                    <VisitMeta>{visit.vehicleInfo} · {visit.visitDate}</VisitMeta>
                </VisitInfo>
                <VisitRight>
                    <VisitRevenue>{PLN(visit.totalRevenueGross)}</VisitRevenue>
                    {isFiltered && (
                        <VisitRevenueAll title="Łączna wartość wizyty">
                            {PLN(visit.totalRevenueGrossAll)} łącznie
                        </VisitRevenueAll>
                    )}
                    <VisitServiceCount $expanded={expanded}>
                        {visit.services.length} {visit.services.length === 1 ? 'usługa' : visit.services.length < 5 ? 'usługi' : 'usług'}
                    </VisitServiceCount>
                </VisitRight>
                <Chevron $expanded={expanded}>▼</Chevron>
            </VisitHeader>

            <ServicesPanel $expanded={expanded} $maxH={estimatedH}>
                <ServicesInner>
                    {/* In-category services */}
                    {hasFilter && inCat.length > 0 && (
                        <ServiceSectionLabel>
                            <FilterDot />
                            {categoryName}
                        </ServiceSectionLabel>
                    )}
                    {inCat.map(svc => (
                        <ServiceRow key={svc.serviceId}>
                            <ServiceDot />
                            <ServiceName title={svc.serviceName}>{svc.serviceName}</ServiceName>
                            <ServicePrice>{PLN(svc.priceGross)}</ServicePrice>
                        </ServiceRow>
                    ))}

                    {/* Contribution bar — only when filter is active */}
                    {isFiltered && inCat.length > 0 && (
                        <ContribBar>
                            <ContribTrack>
                                <ContribFill $pct={contribPct} />
                            </ContribTrack>
                            <ContribLabel>
                                <span>{categoryName}: {PLN(visit.totalRevenueGross)}</span>
                                <span>{contribPct}% wartości wizyty</span>
                            </ContribLabel>
                        </ContribBar>
                    )}

                    {/* Other services toggle */}
                    {hasFilter && others.length > 0 && (
                        <>
                            <OtherServicesToggle
                                $open={othersOpen}
                                onClick={e => { e.stopPropagation(); setOthersOpen(o => !o); }}
                            >
                                <OtherChevron $open={othersOpen}>▼</OtherChevron>
                                Pozostałe usługi ({others.length}) —{' '}
                                {PLN(others.reduce((s, sv) => s + sv.priceGross, 0))}
                            </OtherServicesToggle>
                            <OtherServicesList $open={othersOpen} $count={others.length}>
                                {others.map(svc => (
                                    <ServiceRow key={svc.serviceId} $dimmed>
                                        <ServiceDot $dimmed />
                                        <ServiceName title={svc.serviceName}>{svc.serviceName}</ServiceName>
                                        <ServicePrice>{PLN(svc.priceGross)}</ServicePrice>
                                    </ServiceRow>
                                ))}
                            </OtherServicesList>
                        </>
                    )}

                    {/* Summary row */}
                    <SummaryRow>
                        <SummaryLabel>
                            {isFiltered ? `${categoryName} w wizycie` : 'Suma wizyty'}
                        </SummaryLabel>
                        <SummaryValue>{PLN(visit.totalRevenueGross)}</SummaryValue>
                    </SummaryRow>
                </ServicesInner>
            </ServicesPanel>
        </VisitCard>
    );
};

// ─── Main drawer ──────────────────────────────────────────────────────────────

export interface PeriodDetailDrawerProps {
    period: string | null;
    granularity: Granularity;
    categoryId?: string | null;
    categoryName?: string | null;
    onClose: () => void;
}

export const PeriodDetailDrawer = ({
    period,
    granularity,
    categoryId,
    categoryName,
    onClose,
}: PeriodDetailDrawerProps) => {
    const [detail, setDetail] = useState<PeriodDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);

    const handleClose = useCallback(() => {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 220);
    }, [onClose]);

    useEffect(() => {
        if (!period) return;
        setDetail(null);
        setLoading(true);
        fetchPeriodDetail(period, granularity, { categoryId, categoryName })
            .then(setDetail)
            .finally(() => setLoading(false));
    }, [period, granularity, categoryId, categoryName]);

    useEffect(() => {
        if (!period) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [period, handleClose]);

    if (!period) return null;

    const isFiltered = !!categoryId;
    const avgPerVisit = detail && detail.orderCount > 0
        ? Math.round(detail.totalRevenueGross / detail.orderCount)
        : 0;

    return (
        <>
            <Backdrop onClick={handleClose} />
            <Drawer $closing={closing}>
                <DrawerHeader>
                    <HeaderRow>
                        <HeaderMeta>
                            <PeriodLabel>Szczegóły okresu</PeriodLabel>
                            <DrawerTitle>{period}</DrawerTitle>
                        </HeaderMeta>
                        <CloseBtn onClick={handleClose} title="Zamknij (Esc)">✕</CloseBtn>
                    </HeaderRow>

                    {isFiltered && (
                        <FilterBadge>
                            <FilterDot />
                            Filtr: {categoryName}
                        </FilterBadge>
                    )}

                    {detail && (
                        <KpiStrip>
                            <KpiTile $color={st.accentGreen} $dimColor={st.accentGreenDim}>
                                <KpiLabel>{isFiltered ? `Przychód (${categoryName})` : 'Przychód'}</KpiLabel>
                                <KpiValue $color={st.accentGreen}>{PLN(detail.totalRevenueGross)}</KpiValue>
                                {isFiltered && detail.totalRevenueGrossAll !== detail.totalRevenueGross && (
                                    <KpiSub>{PLN(detail.totalRevenueGrossAll)} łącznie</KpiSub>
                                )}
                            </KpiTile>
                            <KpiTile $color={st.accentBlue} $dimColor={st.accentBlueDim}>
                                <KpiLabel>Wizyty</KpiLabel>
                                <KpiValue $color={st.accentBlue}>{detail.orderCount}</KpiValue>
                            </KpiTile>
                            <KpiTile $color={st.accentAmber} $dimColor={st.accentAmberDim}>
                                <KpiLabel>Śr. wizyta</KpiLabel>
                                <KpiValue $color={st.accentAmber}>{PLN(avgPerVisit)}</KpiValue>
                                {isFiltered && <KpiSub>z filtra</KpiSub>}
                            </KpiTile>
                        </KpiStrip>
                    )}

                    <Divider />
                </DrawerHeader>

                {loading && (
                    <LoadingState>
                        <Spinner />
                        <span>Ładowanie wizyt…</span>
                    </LoadingState>
                )}

                {detail && !loading && (
                    <DrawerBody>
                        <VisitListLabel>Wizyty ({detail.visits.length})</VisitListLabel>
                        {detail.visits.map((visit, idx) => (
                            <VisitItem
                                key={visit.visitId}
                                visit={visit}
                                index={idx}
                                categoryName={detail.categoryName}
                            />
                        ))}
                    </DrawerBody>
                )}

                <MockBadge>
                    ⚠ Mock API · GET /v1/statistics/periods/{'{period}'}/visits{isFiltered ? `?categoryId=${categoryId}` : ''}
                </MockBadge>
            </Drawer>
        </>
    );
};

