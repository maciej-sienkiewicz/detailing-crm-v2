// src/modules/customers/components/CustomerHeader.tsx

import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { CustomerDetailData } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

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
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 65%);
        pointer-events: none;
    }
`;

const HeaderContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 14px 28px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 16px 32px;
    }

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        flex-wrap: wrap;
        gap: 12px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    flex: 1;
`;

const BreadcrumbRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
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
    color: rgba(148, 163, 184, 0.7);
    transition: color ${st.transition};

    &:hover { color: rgba(241, 245, 249, 0.9); }
    svg { width: 13px; height: 13px; }
`;

const BreadcrumbSep = styled.span`
    color: rgba(148, 163, 184, 0.3);
    font-size: 12px;
`;

const BreadcrumbCurrent = styled.span`
    font-size: 12px;
    color: rgba(148, 163, 184, 0.5);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 240px;
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const AvatarBadge = styled.div`
    width: 34px;
    height: 34px;
    border-radius: ${st.radiusFull};
    background: ${st.gradientBlue};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
`;

const CustomerTitle = styled.h1`
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 400px;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 17px;
        max-width: 240px;
    }
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const MetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.75);

    svg { width: 12px; height: 12px; opacity: 0.6; }
`;

const MetaDot = styled.span`
    color: rgba(148, 163, 184, 0.25);
    user-select: none;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
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
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
        &:hover {
            background: #2563EB;
            box-shadow: 0 4px 14px rgba(59, 130, 246, 0.45);
            transform: translateY(-1px);
        }
    ` : `
        background: rgba(255, 255, 255, 0.06);
        color: rgba(241, 245, 249, 0.65);
        border-color: rgba(255, 255, 255, 0.1);
        &:hover {
            background: rgba(255, 255, 255, 0.11);
            color: rgba(241, 245, 249, 0.9);
            border-color: rgba(255, 255, 255, 0.18);
        }
    `}

    svg { width: 15px; height: 15px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomerHeaderProps {
    data: CustomerDetailData;
    onEditCustomer: () => void;
    onEditCompany: () => void;
}

export const CustomerHeader = ({ data, onEditCustomer, onEditCompany }: CustomerHeaderProps) => {
    const navigate = useNavigate();
    const { customer } = data;

    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Klient';
    const initials = `${(customer.firstName || '?').charAt(0)}${(customer.lastName || '?').charAt(0)}`.toUpperCase();

    const hasEmail = Boolean(customer.contact.email);
    const hasPhone = Boolean(customer.contact.phone);

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
                        {customer.company && (
                            <>
                                {(hasEmail || hasPhone) && <MetaDot>·</MetaDot>}
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
        </HeroHeader>
    );
};
