// src/modules/customers/components/CustomerHeader.tsx

import styled from 'styled-components';
import type { CustomerDetailData } from '../types';
import { formatCurrency } from '../utils/customerMappers';
import { formatDate } from '@/common/utils';
import { t } from '@/common/i18n';

const HeaderContainer = styled.header`
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.xl};
    padding: ${props => props.theme.spacing.lg};
    box-shadow: ${props => props.theme.shadows.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const HeaderTop = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
    }
`;

const CustomerInfo = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
`;

const Avatar = styled.div`
    width: 64px;
    height: 64px;
    border-radius: ${props => props.theme.radii.full};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: 80px;
        height: 80px;
        font-size: 32px;
    }
`;

const CustomerDetails = styled.div`
    flex: 1;
`;

const CustomerName = styled.h1`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.02em;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxl};
    }
`;

const CustomerMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
`;

const MetaIcon = styled.span`
    display: flex;
    align-items: center;
    color: ${props => props.theme.colors.textMuted};
`;

const LoyaltyBadge = styled.div<{ $tier: 'bronze' | 'silver' | 'gold' | 'platinum' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: ${({ theme }) => theme.radii.full};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: ${({ theme }) => theme.shadows.sm};

    ${({ $tier }) => {
        const colors: Record<'bronze' | 'silver' | 'gold' | 'platinum', string> = {
            bronze: 'background: linear-gradient(135deg, #cd7f32 0%, #a0522d 100%); color: white;',
            silver: 'background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%); color: #1f2937;',
            gold: 'background: linear-gradient(135deg, #ffd700 0%, #daa520 100%); color: #1f2937;',
            platinum: 'background: linear-gradient(135deg, #e5e4e2 0%, #b0b0b0 100%); color: #1f2937;',
        };
        return colors[$tier];
    }}
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(4, 1fr);
    }

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.lg};
    }
`;

const StatCard = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const StatLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
`;

const StatValue = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const StatSubvalue = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

interface CustomerHeaderProps {
    data: CustomerDetailData;
}

export const CustomerHeader = ({ data }: CustomerHeaderProps) => {
    const { customer, loyaltyTier, lifetimeValue, lastContactDate } = data;
    const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`;

    return (
        <HeaderContainer>
            <HeaderTop>
                <CustomerInfo>
                    <Avatar>{initials}</Avatar>
                    <CustomerDetails>
                        <CustomerName>
                            {customer.firstName} {customer.lastName}
                        </CustomerName>
                        <CustomerMeta>
                            <MetaRow>
                                <MetaIcon>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                </MetaIcon>
                                <span>{customer.contact.email}</span>
                            </MetaRow>
                            <MetaRow>
                                <MetaIcon>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                </MetaIcon>
                                <span>{customer.contact.phone}</span>
                            </MetaRow>
                            {lastContactDate && (
                                <MetaRow>
                                    <MetaIcon>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                    </MetaIcon>
                                    <span>{t.customers.detail.lastContact}: {formatDate(lastContactDate)}</span>
                                </MetaRow>
                            )}
                        </CustomerMeta>
                    </CustomerDetails>
                </CustomerInfo>

                <LoyaltyBadge $tier={loyaltyTier}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {t.customers.detail.loyaltyTier[loyaltyTier]}
                </LoyaltyBadge>
            </HeaderTop>

            <StatsGrid>
                <StatCard>
                    <StatLabel>{t.customers.detail.totalRevenue}</StatLabel>
                    <StatValue>
                        {formatCurrency(lifetimeValue.netAmount, lifetimeValue.currency)}
                    </StatValue>
                    <StatSubvalue>
                        {t.customers.detail.totalRevenueGross}: {formatCurrency(lifetimeValue.grossAmount, lifetimeValue.currency)}
                    </StatSubvalue>
                </StatCard>

                <StatCard>
                    <StatLabel>{t.customers.detail.numberOfVisits}</StatLabel>
                    <StatValue>{customer.totalVisits}</StatValue>
                    <StatSubvalue>
                        {t.customers.detail.lastVisitDate}: {customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '—'}
                    </StatSubvalue>
                </StatCard>

                <StatCard>
                    <StatLabel>{t.customers.detail.vehiclesCount}</StatLabel>
                    <StatValue>{customer.vehicleCount}</StatValue>
                    <StatSubvalue>{t.customers.detail.inDatabase}</StatSubvalue>
                </StatCard>

                <StatCard>
                    <StatLabel>{t.customers.detail.customerSince}</StatLabel>
                    <StatValue>{formatDate(customer.createdAt).split('.')[2]}</StatValue>
                    <StatSubvalue>{formatDate(customer.createdAt)}</StatSubvalue>
                </StatCard>
            </StatsGrid>
        </HeaderContainer>
    );
};