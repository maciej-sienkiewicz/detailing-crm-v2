// src/modules/customers/components/ConsentManager.tsx

import styled from 'styled-components';
import type { MarketingConsent } from '../types';
import { formatDateTime } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { t } from '@/common/i18n';

// ─── Styles ───────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.header`
    padding: 13px 18px 10px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

const CardTitle = styled.h4`
    margin: 0 0 2px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 8px;

    svg { width: 15px; height: 15px; color: ${st.accentBlue}; }
`;

const CardSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const ConsentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const ConsentItem = styled.label<{ $isGranted: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 18px;
    background: ${props => props.$isGranted ? st.bgAccentBlue : st.bgCard};
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};

    &:last-child { border-bottom: none; }

    &:hover {
        background: ${props => props.$isGranted ? 'rgba(59,130,246,0.08)' : st.bgCardAlt};
    }
`;

const ToggleSwitch = styled.div<{ $isActive: boolean }>`
    position: relative;
    width: 44px;
    height: 24px;
    background: ${props => props.$isActive ? st.accentBlue : st.border};
    border-radius: ${st.radiusFull};
    transition: background ${st.transition};
    flex-shrink: 0;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${props => props.$isActive ? '22px' : '2px'};
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
        transition: left 200ms cubic-bezier(0.32, 0.72, 0, 1);
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
    width: 34px;
    height: 34px;
    border-radius: ${st.radiusSm};
    flex-shrink: 0;

    ${props => {
        const styles: Record<string, string> = {
            email:   `background: ${st.accentBlueDim}; color: ${st.accentBlue};`,
            sms:     `background: ${st.accentAmberDim}; color: ${st.accentAmber};`,
            phone:   `background: ${st.accentGreenDim}; color: ${st.accentGreen};`,
            postal:  'background: rgba(139,92,246,0.12); color: #7c3aed;',
        };
        return styles[props.$type] || `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
    }}

    svg { width: 17px; height: 17px; }
`;

const ConsentContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const ConsentName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    margin-bottom: 1px;
`;

const ConsentMeta = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

interface ConsentManagerProps {
    consents: MarketingConsent[];
    onConsentToggle: (consentId: string, granted: boolean) => void;
    isUpdating?: boolean;
}

export const ConsentManager = ({ consents, onConsentToggle, isUpdating = false }: ConsentManagerProps) => {
    const getConsentMeta = (consent: MarketingConsent): string => {
        if (consent.granted) {
            return `${t.customers.detail.consents.granted}: ${formatDateTime(consent.grantedAt!)} · ${consent.lastModifiedBy}`;
        }
        if (consent.revokedAt) {
            return `${t.customers.detail.consents.revoked}: ${formatDateTime(consent.revokedAt)} · ${consent.lastModifiedBy}`;
        }
        return t.customers.detail.consents.never;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    {t.customers.detail.consents.title}
                </CardTitle>
                <CardSubtitle>{t.customers.detail.consents.subtitle}</CardSubtitle>
            </CardHeader>

            <ConsentList>
                {consents.map(consent => (
                    <ConsentItem key={consent.id} $isGranted={consent.granted}>
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
        </Card>
    );
};
