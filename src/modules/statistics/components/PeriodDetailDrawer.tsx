// src/modules/statistics/components/PeriodDetailDrawer.tsx

import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
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
    background: rgba(15, 23, 42, 0.35);
    backdrop-filter: blur(2px);
    animation: ${fadeIn} 180ms ease;
    cursor: pointer;
`;

const Drawer = styled.aside<{ $closing: boolean }>`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 401;
    width: min(480px, 95vw);
    background: ${p => p.theme.colors.surface};
    box-shadow: -4px 0 24px rgba(15, 23, 42, 0.10), -1px 0 4px rgba(15, 23, 42, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ${p => p.$closing
        ? css`${slideOut} 200ms ease forwards`
        : css`${slideIn} 240ms cubic-bezier(0.22, 1, 0.36, 1) forwards`};
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const DrawerHeader = styled.div`
    flex-shrink: 0;
    background: ${p => p.theme.colors.surface};
`;

const HeaderTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 22px 14px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
`;

const HeaderMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

// 10px · 600 · uppercase · +0.06em — matches VisitDateLabel in dashboard
const Eyebrow = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: block;
`;

// 18px · 600 · -0.1px — matches CARD TITLE in design system
const DrawerTitle = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.1px;
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-top: 2px;
    background: transparent;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: 14px;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};
    line-height: 1;

    &:hover {
        background: ${p => p.theme.colors.surfaceAlt};
        border-color: ${p => p.theme.colors.textMuted};
        color: ${p => p.theme.colors.text};
    }
`;

// ─── Filter context banner ────────────────────────────────────────────────────

const FilterBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 22px;
    background: rgba(14, 165, 233, 0.07);
    border-bottom: 1px solid rgba(14, 165, 233, 0.15);
    font-size: 12px;
    font-weight: 500;
    color: #0284c7;
`;

const FilterDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-primary, #0ea5e9);
    flex-shrink: 0;
`;

// ─── KPI strip ────────────────────────────────────────────────────────────────

const KpiStrip = styled.div`
    display: flex;
    gap: 1px;
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
`;

const KpiTile = styled.div`
    flex: 1;
    padding: 12px 16px;
    background: ${p => p.theme.colors.surface};
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

// 10px · 600 · uppercase · +0.06em
const KpiLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

// 20px · 700 · -0.3px — between PAGE TITLE and CARD TITLE
const KpiValue = styled.span<{ $color: string }>`
    font-size: 20px;
    font-weight: 700;
    color: ${p => p.$color};
    letter-spacing: -0.3px;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
`;

// 12px · 500 — matches CAPTION
const KpiSub = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
`;

// ─── Scrollable body ──────────────────────────────────────────────────────────

const DrawerBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 0 72px;
    scrollbar-width: thin;
    scrollbar-color: ${p => p.theme.colors.border} transparent;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: ${p => p.theme.colors.border}; border-radius: 4px; }
`;

// Section label matching dashboard pattern
const SectionLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 22px 8px;
    font-size: 10px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const SectionRule = styled.div`
    flex: 1;
    height: 1px;
    background: ${p => p.theme.colors.surfaceAlt};
`;

// ─── Visit card ───────────────────────────────────────────────────────────────

const VisitCard = styled.div`
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    background: ${p => p.theme.colors.surface};

    &:last-child { border-bottom: none; }
`;

const VisitHeader = styled.button<{ $expanded: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 22px;
    background: ${p => p.$expanded ? p.theme.colors.surfaceAlt : 'transparent'};
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

const VisitAvatar = styled.div<{ $color: string }>`
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${p => p.$color};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.3px;
`;

const VisitInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

// 13px · 600 — matches VisitTitle in dashboard
const VisitClient = styled.span`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
`;

// 12px · 500 — matches CAPTION
const VisitMeta = styled.span`
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
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

// Revenue: 14px · 700 · tabular-nums · success color
const VisitRevenue = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.success};
    letter-spacing: -0.3px;
    font-variant-numeric: tabular-nums;
`;

const VisitRevenueAll = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
`;

const VisitServiceCount = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
`;

const Chevron = styled.span<{ $expanded: boolean }>`
    flex-shrink: 0;
    font-size: 9px;
    color: ${p => p.theme.colors.textMuted};
    transform: ${p => p.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform 200ms ease;
    margin-left: -4px;
`;

// ─── Services accordion ───────────────────────────────────────────────────────

const ServicesPanel = styled.div<{ $expanded: boolean; $maxH: number }>`
    max-height: ${p => p.$expanded ? `${p.$maxH}px` : '0'};
    overflow: hidden;
    transition: max-height 260ms cubic-bezier(0.4, 0, 0.2, 1);
    background: ${p => p.theme.colors.surfaceHover};
    border-top: ${p => p.$expanded ? `1px solid ${p.theme.colors.surfaceAlt}` : 'none'};
`;

const ServicesInner = styled.div`
    padding: 10px 22px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

// In-category section label: 10px · 600 · uppercase with left accent bar
const ServiceSectionLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 2px 0 6px;
    font-size: 10px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const ServiceSectionAccent = styled.span`
    width: 2px;
    height: 12px;
    border-radius: 1px;
    background: ${p => p.theme.colors.success};
    flex-shrink: 0;
`;

const ServiceRow = styled.div<{ $dimmed?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: ${p => p.$dimmed ? 'transparent' : p.theme.colors.surface};
    border: 1px solid ${p => p.$dimmed ? 'transparent' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    opacity: ${p => p.$dimmed ? 0.5 : 1};
    transition: opacity ${p => p.theme.transitions.fast};
`;

const ServiceDot = styled.span<{ $dimmed?: boolean }>`
    flex-shrink: 0;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${p => p.$dimmed ? p.theme.colors.textMuted : p.theme.colors.success};
`;

// 13px · 400 — BODY SMALL
const ServiceName = styled.span`
    flex: 1;
    font-size: 13px;
    font-weight: 400;
    color: ${p => p.theme.colors.textSecondary};
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

// 13px · 600 · tabular-nums
const ServicePrice = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

// Visit summary row (inside services panel)
const VisitSummaryRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px 0;
    margin-top: 4px;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const VisitSummaryLabel = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
`;

const VisitSummaryValue = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.theme.colors.success};
    font-variant-numeric: tabular-nums;
`;

// ─── Contribution bar ─────────────────────────────────────────────────────────

const ContribWrap = styled.div`
    padding: 8px 0 2px;
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const ContribTrack = styled.div`
    height: 3px;
    background: ${p => p.theme.colors.border};
    border-radius: 2px;
    overflow: hidden;
`;

const ContribFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${p => p.$pct}%;
    background: ${p => p.theme.colors.success};
    border-radius: 2px;
    transition: width 360ms ease;
`;

const ContribMeta = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
`;

// ─── "Other services" toggle ──────────────────────────────────────────────────

const OthersToggle = styled.button<{ $open: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    margin-top: 4px;
    background: transparent;
    border: 1px dashed ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
    text-align: left;
    transition: all ${p => p.theme.transitions.fast};
    font-family: inherit;

    &:hover {
        background: ${p => p.theme.colors.surface};
        color: ${p => p.theme.colors.textSecondary};
        border-color: ${p => p.theme.colors.textMuted};
    }
`;

const OthersChevron = styled.span<{ $open: boolean }>`
    font-size: 8px;
    color: ${p => p.theme.colors.textMuted};
    transform: ${p => p.$open ? 'rotate(180deg)' : 'rotate(0)'};
    transition: transform 180ms ease;
`;

const OthersPanel = styled.div<{ $open: boolean; $count: number }>`
    max-height: ${p => p.$open ? `${p.$count * 36}px` : '0'};
    overflow: hidden;
    transition: max-height 220ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: ${p => p.$open ? '3px' : '0'};
`;

// ─── Loading ──────────────────────────────────────────────────────────────────

const LoadingState = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: ${p => p.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 500;
`;

const Spinner = styled.div`
    width: 24px;
    height: 24px;
    border: 2px solid ${p => p.theme.colors.border};
    border-top-color: var(--brand-primary, #0ea5e9);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Mock badge ───────────────────────────────────────────────────────────────

const MockBadge = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 7px 22px;
    background: ${p => p.theme.colors.surface};
    border-top: 1px solid ${p => p.theme.colors.surfaceAlt};
    font-size: 11px;
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
    display: flex;
    align-items: center;
    gap: 6px;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLN = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });

const AVATAR_COLORS = [
    '#0ea5e9', '#16a34a', '#d97706', '#8b5cf6',
    '#dc2626', '#0891b2', '#db2777', '#ea580c',
];

function avatarColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Visit item ───────────────────────────────────────────────────────────────

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

    const estimatedH =
        (inCat.length + (othersOpen ? others.length : 0)) * 36 +
        (hasFilter && inCat.length > 0 ? 24 : 0) +
        (isFiltered ? 44 : 0) +
        (others.length > 0 ? 40 : 0) +
        56;

    return (
        <VisitCard>
            <VisitHeader $expanded={expanded} onClick={() => setExpanded(e => !e)}>
                <VisitAvatar $color={avatarColor(visit.clientName)}>
                    {initials(visit.clientName)}
                </VisitAvatar>
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
                    <VisitServiceCount>
                        {visit.services.length}{' '}
                        {visit.services.length === 1 ? 'usługa' : visit.services.length < 5 ? 'usługi' : 'usług'}
                    </VisitServiceCount>
                </VisitRight>
                <Chevron $expanded={expanded}>▼</Chevron>
            </VisitHeader>

            <ServicesPanel $expanded={expanded} $maxH={estimatedH}>
                <ServicesInner>
                    {hasFilter && inCat.length > 0 && (
                        <ServiceSectionLabel>
                            <ServiceSectionAccent />
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

                    {isFiltered && inCat.length > 0 && (
                        <ContribWrap>
                            <ContribTrack>
                                <ContribFill $pct={contribPct} />
                            </ContribTrack>
                            <ContribMeta>
                                <span>{categoryName}: {PLN(visit.totalRevenueGross)}</span>
                                <span>{contribPct}% wartości wizyty</span>
                            </ContribMeta>
                        </ContribWrap>
                    )}

                    {hasFilter && others.length > 0 && (
                        <>
                            <OthersToggle
                                $open={othersOpen}
                                onClick={e => { e.stopPropagation(); setOthersOpen(o => !o); }}
                            >
                                <OthersChevron $open={othersOpen}>▼</OthersChevron>
                                Pozostałe usługi ({others.length}) —{' '}
                                {PLN(others.reduce((s, sv) => s + sv.priceGross, 0))}
                            </OthersToggle>
                            <OthersPanel $open={othersOpen} $count={others.length}>
                                {others.map(svc => (
                                    <ServiceRow key={svc.serviceId} $dimmed>
                                        <ServiceDot $dimmed />
                                        <ServiceName title={svc.serviceName}>{svc.serviceName}</ServiceName>
                                        <ServicePrice>{PLN(svc.priceGross)}</ServicePrice>
                                    </ServiceRow>
                                ))}
                            </OthersPanel>
                        </>
                    )}

                    <VisitSummaryRow>
                        <VisitSummaryLabel>
                            {isFiltered ? `${categoryName} w wizycie` : 'Suma wizyty'}
                        </VisitSummaryLabel>
                        <VisitSummaryValue>{PLN(visit.totalRevenueGross)}</VisitSummaryValue>
                    </VisitSummaryRow>
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
        setTimeout(() => { setClosing(false); onClose(); }, 200);
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

                {/* ── Header ──────────────────────────────────── */}
                <DrawerHeader>
                    <HeaderTop>
                        <HeaderMeta>
                            <Eyebrow>Szczegóły okresu</Eyebrow>
                            <DrawerTitle>{period}</DrawerTitle>
                        </HeaderMeta>
                        <CloseBtn onClick={handleClose} title="Zamknij (Esc)">✕</CloseBtn>
                    </HeaderTop>

                    {isFiltered && (
                        <FilterBanner>
                            <FilterDot />
                            Filtr aktywny: {categoryName}
                        </FilterBanner>
                    )}

                    {detail && (
                        <KpiStrip>
                            <KpiTile>
                                <KpiLabel>
                                    {isFiltered ? categoryName! : 'Przychód'}
                                </KpiLabel>
                                <KpiValue $color="var(--kpi-revenue, #16a34a)">
                                    {PLN(detail.totalRevenueGross)}
                                </KpiValue>
                                {isFiltered && detail.totalRevenueGrossAll !== detail.totalRevenueGross && (
                                    <KpiSub>{PLN(detail.totalRevenueGrossAll)} łącznie</KpiSub>
                                )}
                            </KpiTile>
                            <KpiTile>
                                <KpiLabel>Wizyty</KpiLabel>
                                <KpiValue $color="var(--brand-primary, #0ea5e9)">
                                    {detail.orderCount}
                                </KpiValue>
                            </KpiTile>
                            <KpiTile>
                                <KpiLabel>Śr. wizyta</KpiLabel>
                                <KpiValue $color="#d97706">
                                    {PLN(avgPerVisit)}
                                </KpiValue>
                                {isFiltered && <KpiSub>z filtra</KpiSub>}
                            </KpiTile>
                        </KpiStrip>
                    )}
                </DrawerHeader>

                {/* ── Body ────────────────────────────────────── */}
                {loading && (
                    <LoadingState>
                        <Spinner />
                        <span>Ładowanie wizyt…</span>
                    </LoadingState>
                )}

                {detail && !loading && (
                    <DrawerBody>
                        <SectionLabel>
                            Wizyty ({detail.visits.length})
                            <SectionRule />
                        </SectionLabel>
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

                {detail && !loading && (
                    <MockBadge>
                        ⚠ Mock API · GET /v1/statistics/periods/{'{period}'}/visits
                        {isFiltered ? `?categoryId=${categoryId}` : ''}
                    </MockBadge>
                )}
            </Drawer>
        </>
    );
};
