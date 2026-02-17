// src/modules/customers/components/CustomerHeader.tsx

import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { CustomerDetailData } from '../types';
import { t } from '@/common/i18n';

const HeaderBar = styled.header`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.sm};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        flex-wrap: wrap;
        gap: ${props => props.theme.spacing.sm};
    }
`;

const BackButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
    background: white;
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;

    &:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: #f0f9ff;
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const Divider = styled.div`
    width: 1px;
    height: 32px;
    background: ${props => props.theme.colors.border};
    flex-shrink: 0;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }
`;

const CustomerIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    flex: 1;
    min-width: 0;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        flex-basis: calc(100% - 52px);
    }
`;

const Avatar = styled.div`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.full};
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 700;
    color: white;
`;

const CustomerInfo = styled.div`
    min-width: 0;
`;

const CustomerName = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const CustomerMeta = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    margin-top: 2px;
`;

const MetaText = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-shrink: 0;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 100%;
        justify-content: flex-end;
    }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    ${props => props.$primary ? `
        background: var(--brand-primary);
        color: white;
        border: none;
        box-shadow: 0 1px 3px rgba(14, 165, 233, 0.3);

        &:hover {
            opacity: 0.9;
            box-shadow: 0 2px 6px rgba(14, 165, 233, 0.4);
        }
    ` : `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 1px solid ${props.theme.colors.border};

        &:hover {
            border-color: var(--brand-primary);
            color: var(--brand-primary);
            background: #f0f9ff;
        }
    `}

    svg {
        width: 16px;
        height: 16px;
    }
`;

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

    const metaParts = [
        customer.contact.email,
        customer.contact.phone,
    ].filter(Boolean).join('  ·  ');

    return (
        <HeaderBar>
            <BackButton onClick={() => navigate('/customers')} title="Powrót do listy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </BackButton>

            <Divider />

            <CustomerIdentity>
                <Avatar>{initials}</Avatar>

                <CustomerInfo>
                    <CustomerName>{fullName}</CustomerName>
                    {metaParts && (
                        <CustomerMeta>
                            <MetaText>{metaParts}</MetaText>
                        </CustomerMeta>
                    )}
                </CustomerInfo>
            </CustomerIdentity>

            <Actions>
                <ActionButton onClick={onEditCompany}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                    Firma
                </ActionButton>
                <ActionButton $primary onClick={onEditCustomer}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {t.common.edit}
                </ActionButton>
            </Actions>
        </HeaderBar>
    );
};
