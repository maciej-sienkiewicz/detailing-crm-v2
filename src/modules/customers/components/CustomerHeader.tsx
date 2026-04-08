// src/modules/customers/components/CustomerHeader.tsx

import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { CustomerDetailData } from '../types';
import { formatCurrency } from '../utils/customerMappers';
import { formatDate } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Loyalty tier config ──────────────────────────────────────────────────────

const TIER_CONFIG = {
    bronze:   { label: 'Bronze',   bg: 'rgba(180,120,60,0.18)',  color: '#c8874a', border: 'rgba(180,120,60,0.3)'  },
    silver:   { label: 'Silver',   bg: 'rgba(148,163,184,0.18)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
    gold:     { label: 'Gold',     bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
    platinum: { label: 'Platinum', bg: 'rgba(139,92,246,0.18)',  color: '#a78bfa', border: 'rgba(139,92,246,0.3)'  },
} as const;

// ─── Styled components ────────────────────────────────────────────────────────

const HeroHeader = styled.header`
    position: sticky;
    top: 0;
    z-index: 100;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0d1f38 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.28);

    &::before {
        content: '';
        position: absolute;
        top: -90px;
        right: 80px;
        width: 380px;
        height: 380px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 65%);
        pointer-events: none;
    }
`;

const HeaderContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 28px 12px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 16px 32px 14px;
    }

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-wrap: wrap;
        gap: 10px;
        padding: 12px 20px 10px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
`;

const BreadcrumbRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
`;

const BackBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: rgba(148, 163, 184, 0.65);
    transition: color ${st.transition};

    &:hover { color: rgba(241, 245, 249, 0.9); }
    svg { width: 13px; height: 13px; }
`;

const BreadcrumbSep = styled.span`
    color: rgba(148, 163, 184, 0.25);
    font-size: 12px;
`;

const BreadcrumbCurrent = styled.span`
    font-size: 12px;
    color: rgba(148, 163, 184, 0.4);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 11px;
    flex-wrap: wrap;
`;

const AvatarBadge = styled.div`
    width: 32px;
    height: 32px;
    border-radius: ${st.radiusFull};
    background: ${st.gradientBlue};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
`;

const CustomerTitle = styled.h1`
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 380px;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 16px;
        max-width: 200px;
    }
`;

const TierBadge = styled.span<{ $tier: keyof typeof TIER_CONFIG }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: ${props => TIER_CONFIG[props.$tier].bg};
    color: ${props => TIER_CONFIG[props.$tier].color};
    border: 1px solid ${props => TIER_CONFIG[props.$tier].border};
    flex-shrink: 0;
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const MetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.7);

    svg { width: 11px; height: 11px; opacity: 0.55; flex-shrink: 0; }
`;

const MetaDot = styled.span`
    color: rgba(148, 163, 184, 0.2);
    user-select: none;
    font-size: 11px;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 2px;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    border: 1px solid transparent;

    ${props => props.$primary ? `
        background: ${st.accentBlue};
        color: white;
        border-color: ${st.accentBlue};
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        &:hover {
            background: #2563EB;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transform: translateY(-1px);
        }
    ` : `
        background: rgba(255, 255, 255, 0.05);
        color: rgba(241, 245, 249, 0.6);
        border-color: rgba(255, 255, 255, 0.09);
        &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(241, 245, 249, 0.9);
            border-color: rgba(255, 255, 255, 0.16);
        }
    `}

    svg { width: 14px; height: 14px; }
`;

// ─── Stats strip ──────────────────────────────────────────────────────────────

const StatsStrip = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 28px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 0 32px;
    }

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        padding: 0 20px;
        overflow-x: auto;
        scrollbar-width: none;
        &::-webkit-scrollbar { display: none; }
    }
`;

const StatItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 8px 20px 9px 0;
    margin-right: 20px;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;

    &:last-child {
        border-right: none;
        margin-right: 0;
    }
`;

const StatLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(148, 163, 184, 0.45);
`;

const StatValue = styled.span<{ $accent?: boolean }>`
    font-size: 13px;
    font-weight: 700;
    color: ${props => props.$accent ? st.accentBlue : 'rgba(241, 245, 249, 0.85)'};
    letter-spacing: -0.01em;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomerHeaderProps {
    data: CustomerDetailData;
    onEditCustomer: () => void;
    onEditCompany: () => void;
}

export const CustomerHeader = ({ data, onEditCustomer, onEditCompany }: CustomerHeaderProps) => {
    const navigate = useNavigate();
    const { customer, loyaltyTier, lifetimeValue } = data;

    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Klient';
    const initials = `${(customer.firstName || '?').charAt(0)}${(customer.lastName || '?').charAt(0)}`.toUpperCase();
    const hasEmail  = Boolean(customer.contact.email);
    const hasPhone  = Boolean(customer.contact.phone);
    const hasAddr   = Boolean(customer.homeAddress);

    const addressLine = customer.homeAddress
        ? `${customer.homeAddress.street}, ${customer.homeAddress.postalCode} ${customer.homeAddress.city}`
        : null;

    const visitCount = customer.totalVisits;
    const visitsLabel = visitCount === 1 ? 'wizyta' : visitCount < 5 ? 'wizyty' : 'wizyt';

    return (
        <HeroHeader>
            <HeaderContent>
                <HeaderLeft>
                    <BreadcrumbRow>
                        <BackBtn onClick={() => navigate('/customers')} aria-label="Wróć do listy klientów">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Klienci
                        </BackBtn>
                        <BreadcrumbSep>/</BreadcrumbSep>
                        <BreadcrumbCurrent>{fullName}</BreadcrumbCurrent>
                    </BreadcrumbRow>

                    <TitleRow>
                        <AvatarBadge>{initials}</AvatarBadge>
                        <CustomerTitle>{fullName}</CustomerTitle>
                        {loyaltyTier && loyaltyTier !== 'bronze' && (
                            <TierBadge $tier={loyaltyTier}>
                                {TIER_CONFIG[loyaltyTier].label}
                            </TierBadge>
                        )}
                    </TitleRow>

                    <MetaRow>
                        {hasEmail && (
                            <MetaItem>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                    <polyline points="22,6 12,13 2,6"/>
                                </svg>
                                {customer.contact.email}
                            </MetaItem>
                        )}
                        {hasEmail && hasPhone && <MetaDot>·</MetaDot>}
                        {hasPhone && (
                            <MetaItem>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                                {customer.contact.phone}
                            </MetaItem>
                        )}
                        {hasAddr && addressLine && (
                            <>
                                {(hasEmail || hasPhone) && <MetaDot>·</MetaDot>}
                                <MetaItem>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    {addressLine}
                                </MetaItem>
                            </>
                        )}
                        {customer.company && (
                            <>
                                {(hasEmail || hasPhone || hasAddr) && <MetaDot>·</MetaDot>}
                                <MetaItem>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9,22 9,12 15,12 15,22"/>
                                    </svg>
                                    {customer.company.name}
                                </MetaItem>
                            </>
                        )}
                    </MetaRow>
                </HeaderLeft>

                <HeaderRight>
                    <ActionButton onClick={onEditCompany}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg>
                        Firma
                    </ActionButton>
                    <ActionButton $primary onClick={onEditCustomer}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edytuj
                    </ActionButton>
                </HeaderRight>
            </HeaderContent>

            {/* ─── Stats strip ──────────────────────────── */}
            <StatsStrip>
                <StatItem>
                    <StatLabel>Przychód</StatLabel>
                    <StatValue $accent>
                        {formatCurrency(lifetimeValue.grossAmount, lifetimeValue.currency)}
                    </StatValue>
                </StatItem>
                <StatItem>
                    <StatLabel>Wizyty</StatLabel>
                    <StatValue>{visitCount} {visitsLabel}</StatValue>
                </StatItem>
                {customer.lastVisitDate && (
                    <StatItem>
                        <StatLabel>Ostatnia wizyta</StatLabel>
                        <StatValue>{formatDate(customer.lastVisitDate)}</StatValue>
                    </StatItem>
                )}
                <StatItem>
                    <StatLabel>Klient od</StatLabel>
                    <StatValue>{formatDate(customer.createdAt)}</StatValue>
                </StatItem>
                {customer.vehicleCount > 0 && (
                    <StatItem>
                        <StatLabel>Pojazdy</StatLabel>
                        <StatValue>{customer.vehicleCount}</StatValue>
                    </StatItem>
                )}
            </StatsStrip>
        </HeroHeader>
    );
};
