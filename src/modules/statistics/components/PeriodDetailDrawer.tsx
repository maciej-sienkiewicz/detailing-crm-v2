// src/modules/statistics/components/PeriodDetailDrawer.tsx
// Right slide-over drawer showing per-visit revenue breakdown for a chart bar.

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

// ─── Layout ───────────────────────────────────────────────────────────────────

const Backdrop = styled.div<{ $visible: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(15, 23, 42, 0.25);
    backdrop-filter: blur(2px);
    animation: ${fadeIn} 200ms ease;
    cursor: pointer;
    display: ${p => p.$visible ? 'block' : 'none'};
`;

const Drawer = styled.aside<{ $closing: boolean }>`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 401;
    width: min(460px, 95vw);
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
    background: ${st.bgCard};
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
`;

const HeaderMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all ${st.transition};

    &:hover {
        background: ${st.bgCard};
        border-color: ${st.borderHover};
        color: ${st.text};
        box-shadow: ${st.shadowXs};
    }
`;

// ─── KPI strip ────────────────────────────────────────────────────────────────

const KpiStrip = styled.div`
    display: flex;
    gap: 12px;
    padding-bottom: 16px;
`;

const KpiTile = styled.div<{ $color: string; $dimColor: string }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 12px 14px;
    background: ${p => p.$dimColor};
    border: 1px solid ${p => p.$color}22;
    border-radius: ${st.radiusSm};
`;

const KpiLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const KpiValue = styled.span<{ $color: string }>`
    font-size: 17px;
    font-weight: 800;
    color: ${p => p.$color};
    letter-spacing: -0.3px;
    line-height: 1.2;
`;

const Divider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 0 -24px;
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

const DrawerBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 32px;

    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: ${st.border} transparent;
    &::-webkit-scrollbar { width: 5px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: ${st.border}; border-radius: 4px; }
`;

const VisitListLabel = styled.div`
    padding: 16px 0 10px;
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    gap: 8px;

    &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: ${st.border};
    }
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

const VisitHeader = styled.button<{ $expanded: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover {
        background: rgba(15, 23, 42, 0.025);
    }
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
    font-size: 13px;
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
    gap: 3px;
`;

const VisitTotal = styled.span`
    font-size: 14px;
    font-weight: 800;
    color: ${st.accentGreen};
    letter-spacing: -0.3px;
`;

const VisitServiceCount = styled.span<{ $expanded: boolean }>`
    font-size: 10px;
    color: ${p => p.$expanded ? st.accentBlue : st.textMuted};
    font-weight: 500;
    transition: color ${st.transition};
`;

const ChevronIcon = styled.span<{ $expanded: boolean }>`
    flex-shrink: 0;
    font-size: 10px;
    color: ${st.textMuted};
    transform: ${p => p.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
    transition: transform 220ms ease;
    margin-left: -4px;
`;

// ─── Services list ────────────────────────────────────────────────────────────

const ServicesPanel = styled.div<{ $expanded: boolean; $count: number }>`
    max-height: ${p => p.$expanded ? `${p.$count * 44 + 44}px` : '0'};
    overflow: hidden;
    transition: max-height 280ms cubic-bezier(0.4, 0, 0.2, 1);
`;

const ServicesInner = styled.div`
    padding: 0 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ServiceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 6px;
`;

const ServiceDot = styled.span`
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${st.accentGreen};
    opacity: 0.7;
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

const ServicesTotalRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px 0;
    border-top: 1px solid ${st.border};
    margin-top: 4px;
`;

const ServicesTotalLabel = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    font-weight: 600;
`;

const ServicesTotalValue = styled.span`
    font-size: 13px;
    font-weight: 800;
    color: ${st.accentGreen};
`;

// ─── Loading / Error ──────────────────────────────────────────────────────────

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
    bottom: 16px;
    left: 24px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: ${st.accentAmberDim};
    border: 1px solid ${st.accentAmber}44;
    border-radius: 6px;
    font-size: 11px;
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

const VisitItem = ({ visit, index }: { visit: PeriodVisit; index: number }) => {
    const [expanded, setExpanded] = useState(index === 0);
    const color = avatarColor(visit.clientName);

    return (
        <VisitCard $expanded={expanded}>
            <VisitHeader $expanded={expanded} onClick={() => setExpanded(e => !e)}>
                <VisitAvatar $color={color}>{initials(visit.clientName)}</VisitAvatar>
                <VisitInfo>
                    <VisitClient>{visit.clientName}</VisitClient>
                    <VisitMeta>{visit.vehicleInfo} · {visit.visitDate}</VisitMeta>
                </VisitInfo>
                <VisitRight>
                    <VisitTotal>{PLN(visit.totalRevenueGross)}</VisitTotal>
                    <VisitServiceCount $expanded={expanded}>
                        {visit.services.length} {visit.services.length === 1 ? 'usługa' : visit.services.length < 5 ? 'usługi' : 'usług'}
                    </VisitServiceCount>
                </VisitRight>
                <ChevronIcon $expanded={expanded}>▼</ChevronIcon>
            </VisitHeader>

            <ServicesPanel $expanded={expanded} $count={visit.services.length}>
                <ServicesInner>
                    {visit.services.map(svc => (
                        <ServiceRow key={svc.serviceId}>
                            <ServiceDot />
                            <ServiceName title={svc.serviceName}>{svc.serviceName}</ServiceName>
                            <ServicePrice>{PLN(svc.priceGross)}</ServicePrice>
                        </ServiceRow>
                    ))}
                    <ServicesTotalRow>
                        <ServicesTotalLabel>Suma wizyty</ServicesTotalLabel>
                        <ServicesTotalValue>{PLN(visit.totalRevenueGross)}</ServicesTotalValue>
                    </ServicesTotalRow>
                </ServicesInner>
            </ServicesPanel>
        </VisitCard>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

export interface PeriodDetailDrawerProps {
    period: string | null;
    granularity: Granularity;
    onClose: () => void;
}

export const PeriodDetailDrawer = ({ period, granularity, onClose }: PeriodDetailDrawerProps) => {
    const [detail, setDetail] = useState<PeriodDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);

    const handleClose = useCallback(() => {
        setClosing(true);
        setTimeout(() => {
            setClosing(false);
            onClose();
        }, 220);
    }, [onClose]);

    useEffect(() => {
        if (!period) return;
        setDetail(null);
        setLoading(true);
        fetchPeriodDetail(period, granularity)
            .then(setDetail)
            .finally(() => setLoading(false));
    }, [period, granularity]);

    // Close on Escape key
    useEffect(() => {
        if (!period) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [period, handleClose]);

    if (!period) return null;

    return (
        <>
            <Backdrop $visible={!closing} onClick={handleClose} />
            <Drawer $closing={closing}>
                <DrawerHeader>
                    <HeaderRow>
                        <HeaderMeta>
                            <PeriodLabel>Szczegóły okresu</PeriodLabel>
                            <DrawerTitle>{period}</DrawerTitle>
                        </HeaderMeta>
                        <CloseBtn onClick={handleClose} title="Zamknij (Esc)">✕</CloseBtn>
                    </HeaderRow>

                    {detail && (
                        <KpiStrip>
                            <KpiTile $color={st.accentGreen} $dimColor={st.accentGreenDim}>
                                <KpiLabel>Przychód</KpiLabel>
                                <KpiValue $color={st.accentGreen}>{PLN(detail.totalRevenueGross)}</KpiValue>
                            </KpiTile>
                            <KpiTile $color={st.accentBlue} $dimColor={st.accentBlueDim}>
                                <KpiLabel>Wizyty</KpiLabel>
                                <KpiValue $color={st.accentBlue}>{detail.orderCount}</KpiValue>
                            </KpiTile>
                            <KpiTile $color={st.accentAmber} $dimColor={st.accentAmberDim}>
                                <KpiLabel>Śr. wizyta</KpiLabel>
                                <KpiValue $color={st.accentAmber}>
                                    {PLN(Math.round(detail.totalRevenueGross / detail.orderCount))}
                                </KpiValue>
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
                        <VisitListLabel>
                            Wizyty ({detail.visits.length})
                        </VisitListLabel>
                        {detail.visits.map((visit, idx) => (
                            <VisitItem key={visit.visitId} visit={visit} index={idx} />
                        ))}

                        <MockBadge>
                            ⚠ Dane testowe — mock API · Endpoint: GET /v1/statistics/periods/{'{period}'}/visits
                        </MockBadge>
                    </DrawerBody>
                )}
            </Drawer>
        </>
    );
};
