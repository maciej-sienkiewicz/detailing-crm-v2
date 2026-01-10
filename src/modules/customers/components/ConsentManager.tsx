// src/modules/customers/components/ConsentManager.tsx

import styled from 'styled-components';
import type { MarketingConsent } from '../types';
import { formatDateTime } from '@/common/utils';
import { t } from '@/common/i18n';

const ConsentContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const ConsentHeader = styled.header`
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const ConsentTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;
`;

const ConsentSubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const ConsentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const ConsentItem = styled.label<{ $isGranted: boolean }>`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.$isGranted ? '#f0f9ff' : '#fafbfc'};
    border: 1.5px solid ${props => props.$isGranted ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
        background: ${props => props.$isGranted ? '#e0f2fe' : '#f8fafc'};
    }
`;

const ToggleSwitch = styled.div<{ $isActive: boolean }>`
    position: relative;
    width: 48px;
    height: 26px;
    background: ${props => props.$isActive ? 'var(--brand-primary)' : '#cbd5e1'};
    border-radius: 13px;
    transition: all 0.2s ease;
    flex-shrink: 0;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${props => props.$isActive ? '24px' : '2px'};
        width: 22px;
        height: 22px;
        background: white;
        border-radius: 11px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);
    }
`;

const HiddenCheckbox = styled.input`
    position: absolute;
    opacity: 0;
    pointer-events: none;
`;

const ConsentIcon = styled.div<{ $type: MarketingConsent['type'] }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.md};
    flex-shrink: 0;

    ${props => {
        const styles = {
            email: 'background: #dbeafe; color: #1e40af;',
            sms: 'background: #fef3c7; color: #92400e;',
            phone: 'background: #dcfce7; color: #166534;',
            postal: 'background: #f3e8ff; color: #6b21a8;',
        };
        return styles[props.$type];
    }}

    svg {
        width: 20px;
        height: 20px;
    }
`;

const ConsentContent = styled.div`
    flex: 1;
`;

const ConsentName = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin-bottom: 2px;
`;

const ConsentMeta = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const consentIcons = {
    email: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
        </svg>
    ),
    sms: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    phone: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
    ),
    postal: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
    ),
};

interface ConsentManagerProps {
    consents: MarketingConsent[];
    onConsentToggle: (consentId: string, granted: boolean) => void;
    isUpdating?: boolean;
}

export const ConsentManager = ({
                                   consents,
                                   onConsentToggle,
                                   isUpdating = false,
                               }: ConsentManagerProps) => {
    const getConsentMeta = (consent: MarketingConsent): string => {
        if (consent.granted) {
            return `${t.customers.detail.consents.granted}: ${formatDateTime(consent.grantedAt!)} • ${consent.lastModifiedBy}`;
        }
        if (consent.revokedAt) {
            return `${t.customers.detail.consents.revoked}: ${formatDateTime(consent.revokedAt)} • ${consent.lastModifiedBy}`;
        }
        return t.customers.detail.consents.never;
    };

    return (
        <ConsentContainer>
            <ConsentHeader>
                <ConsentTitle>{t.customers.detail.consents.title}</ConsentTitle>
                <ConsentSubtitle>{t.customers.detail.consents.subtitle}</ConsentSubtitle>
            </ConsentHeader>

            <ConsentList>
                {consents.map(consent => (
                    <ConsentItem
                        key={consent.id}
                        $isGranted={consent.granted}
                    >
                        <HiddenCheckbox
                            type="checkbox"
                            checked={consent.granted}
                            onChange={e => onConsentToggle(consent.id, e.target.checked)}
                            disabled={isUpdating}
                        />
                        <ToggleSwitch $isActive={consent.granted} />
                        <ConsentIcon $type={consent.type}>
                            {consentIcons[consent.type]}
                        </ConsentIcon>
                        <ConsentContent>
                            <ConsentName>{t.customers.detail.consents[consent.type]}</ConsentName>
                            <ConsentMeta>{getConsentMeta(consent)}</ConsentMeta>
                        </ConsentContent>
                    </ConsentItem>
                ))}
            </ConsentList>
        </ConsentContainer>
    );
};