import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';
import type { VehicleInfo, CustomerInfo } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const BRAND = '#0ea5e9';

// ─── Shared card shell ────────────────────────────────────────────────────────

const SidebarCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bgCard};
`;

const CardTitleGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CardIconWrap = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${st.textMuted};
    flex-shrink: 0;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 600;
    letter-spacing: -0.1px;
    color: ${st.text};
`;

const ViewBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    color: ${st.textSecondary};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
    }

    svg { width: 11px; height: 11px; }
`;

// ─── Customer-specific ────────────────────────────────────────────────────────

const CustomerBody = styled.div`
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const CustomerRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
`;

const CustomerAvatar = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${BRAND} 0%, #6366f1 100%);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const CustomerName = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.2px;
    line-height: 1.3;
`;

const CustomerSub = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    margin-top: 2px;
    font-weight: 500;
`;

const ContactLinks = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const ContactLink = styled.a`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${st.textSecondary};
    text-decoration: none;
    padding: 6px 0;
    transition: color ${st.transition};
    border-bottom: 1px solid ${st.border};
    word-break: break-all;
    min-width: 0;

    &:last-child { border-bottom: none; }

    &:hover { color: ${BRAND}; }

    svg { flex-shrink: 0; color: ${st.textMuted}; }
`;

const ContactPlaceholder = styled.span`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${st.textMuted};
    padding: 6px 0;
    font-style: italic;
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }

    svg { flex-shrink: 0; opacity: 0.4; }
`;

const CompanyRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${st.textSecondary};
    padding: 6px 0;
    border-bottom: 1px solid ${st.border};

    svg { flex-shrink: 0; color: ${st.textMuted}; }
`;

const StatsDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 10px 0 12px;
`;

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
`;

const StatBlock = styled.div`
    padding: 0;

    &:first-child {
        padding-right: 12px;
        border-right: 1px solid ${st.border};
    }

    &:last-child {
        padding-left: 12px;
    }
`;

const StatEyebrow = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 3px;
`;

const StatBigValue = styled.div`
    font-size: 18px;
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.4px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
`;

const StatMiniRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid ${st.border};
`;

const StatMiniLabel = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
    font-weight: 500;
`;

const StatMiniValue = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textSecondary};
`;

// ─── Vehicle-specific ─────────────────────────────────────────────────────────

const VehicleBody = styled.div`
    padding: 6px 0 0;
`;

const KvRow = styled.div`
    display: grid;
    grid-template-columns: 108px 1fr;
    gap: 8px;
    padding: 9px 16px;
    border-bottom: 1px dashed #f1f5f9;
    align-items: baseline;
    font-size: 13px;

    &:last-child { border-bottom: none; }

    @media (max-width: 400px) { grid-template-columns: 84px 1fr; }
`;

const KvLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding-top: 1px;
`;

const KvValue = styled.span`
    color: ${st.text};
    font-weight: 500;
    word-break: break-word;
    min-width: 0;
`;

const KvMissing = styled.span`
    color: ${st.textMuted};
    font-style: italic;
    font-weight: 400;
`;

const StatusPill = styled.span<{ $ok: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    width: fit-content;

    ${props => props.$ok ? `
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
        border: 1px solid rgba(16, 185, 129, 0.2);
    ` : `
        background: ${st.bg};
        color: ${st.textMuted};
        border: 1px solid ${st.border};
    `}
`;

const HandoffBanner = styled.div`
    margin: 0 12px 12px;
    padding: 10px 12px;
    background: rgba(245, 158, 11, 0.07);
    border: 1px solid rgba(245, 158, 11, 0.22);
    border-radius: 10px;
`;

const HandoffLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: ${st.accentAmber};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 5px;
`;

const HandoffKv = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const HandoffRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
`;

const HandoffKey = styled.span`
    color: ${st.textMuted};
    font-weight: 600;
    min-width: 80px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const HandoffVal = styled.span`
    color: ${st.text};
    font-weight: 500;
`;

// ─── Helper ───────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
    return [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase();
}

// ─── CustomerInfoCard ─────────────────────────────────────────────────────────

interface CustomerInfoCardProps {
    customer: CustomerInfo;
    onViewDetails?: () => void;
}

export const CustomerInfoCard = ({ customer, onViewDetails }: CustomerInfoCardProps) => {
    const initials = getInitials(customer.firstName, customer.lastName);
    const fullName = `${customer.firstName} ${customer.lastName}`.trim();

    return (
        <SidebarCard>
            <CardHeader>
                <CardTitleGroup>
                    <CardIconWrap aria-hidden="true">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
                        </svg>
                    </CardIconWrap>
                    <CardTitle>Klient</CardTitle>
                </CardTitleGroup>
                {onViewDetails && (
                    <ViewBtn onClick={onViewDetails} aria-label="Otwórz profil klienta">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Profil
                    </ViewBtn>
                )}
            </CardHeader>

            <CustomerBody>
                {/* Avatar + name */}
                <CustomerRow>
                    <CustomerAvatar aria-hidden="true">{initials || '?'}</CustomerAvatar>
                    <div>
                        <CustomerName>{fullName || 'Brak nazwy'}</CustomerName>
                        {customer.companyName && (
                            <CustomerSub>{customer.companyName}</CustomerSub>
                        )}
                    </div>
                </CustomerRow>

                {/* Contact links */}
                <ContactLinks>
                    {customer.phone ? (
                        <ContactLink href={`tel:${customer.phone}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                            </svg>
                            {customer.phone}
                        </ContactLink>
                    ) : (
                        <ContactPlaceholder>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                            </svg>
                            Brak numeru
                        </ContactPlaceholder>
                    )}

                    {customer.email ? (
                        <ContactLink href={`mailto:${customer.email}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M2 7l10 7 10-7" />
                            </svg>
                            {customer.email}
                        </ContactLink>
                    ) : (
                        <ContactPlaceholder>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M2 7l10 7 10-7" />
                            </svg>
                            Brak adresu e-mail
                        </ContactPlaceholder>
                    )}
                </ContactLinks>

                {/* Stats */}
                <StatsDivider />
                <StatsRow>
                    <StatBlock>
                        <StatEyebrow>Przychód</StatEyebrow>
                        <StatBigValue>
                            {formatCurrency(
                                customer.stats.totalSpent.grossAmount / 100,
                                customer.stats.totalSpent.currency
                            )}
                        </StatBigValue>
                    </StatBlock>
                    <StatBlock>
                        <StatEyebrow>Wizyty</StatEyebrow>
                        <StatBigValue>{customer.stats.totalVisits}</StatBigValue>
                    </StatBlock>
                </StatsRow>
            </CustomerBody>
        </SidebarCard>
    );
};

// ─── VehicleInfoCard ──────────────────────────────────────────────────────────

interface VehicleInfoCardProps {
    vehicle: VehicleInfo;
    mileageAtArrival?: number;
    keysHandedOver: boolean;
    documentsHandedOver: boolean;
    vehicleHandoff?: {
        isHandedOffByOtherPerson: boolean;
        contactPerson: {
            firstName: string;
            lastName: string;
            phone: string;
            email: string;
        };
    };
    onMileageChange: (mileage: number) => void;
    onKeysToggle: (checked: boolean) => void;
    onDocumentsToggle: (checked: boolean) => void;
    onViewDetails?: () => void;
}

export const VehicleInfoCard = ({
    vehicle,
    mileageAtArrival,
    keysHandedOver,
    documentsHandedOver,
    vehicleHandoff,
    onViewDetails,
}: VehicleInfoCardProps) => {
    const hasMileage = typeof mileageAtArrival === 'number' && mileageAtArrival > 0;
    const mileageStr = hasMileage ? `${mileageAtArrival!.toLocaleString('pl-PL')} km` : null;

    return (
        <SidebarCard>
            <CardHeader>
                <CardTitleGroup>
                    {/* Premium car silhouette SVG — canonical per design system */}
                    <CardIconWrap aria-hidden="true">
                        <svg width="18" height="10" viewBox="0 0 120 56" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 40 C 6 40, 12 38, 18 38 L 30 38 L 36 28 C 40 23, 48 19, 60 19 C 72 19, 80 22, 86 27 L 95 34 L 108 35 C 112 35, 114 37, 114 40 L 114 44 L 6 44 Z"/>
                            <line x1="36" y1="28" x2="95" y2="34"/>
                            <line x1="60" y1="19" x2="64" y2="34"/>
                            <circle cx="28" cy="44" r="7" fill="currentColor" stroke="none"/>
                            <circle cx="92" cy="44" r="7" fill="currentColor" stroke="none"/>
                        </svg>
                    </CardIconWrap>
                    <CardTitle>Stan przy przyjęciu</CardTitle>
                </CardTitleGroup>
                {onViewDetails && (
                    <ViewBtn onClick={onViewDetails} aria-label="Otwórz kartę pojazdu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Karta
                    </ViewBtn>
                )}
            </CardHeader>

            <VehicleBody>
                <KvRow>
                    <KvLabel>Przebieg</KvLabel>
                    {mileageStr
                        ? <KvValue style={{ fontVariantNumeric: 'tabular-nums' }}>{mileageStr}</KvValue>
                        : <KvMissing>Nie podano</KvMissing>
                    }
                </KvRow>

                <KvRow>
                    <KvLabel>Kluczyki</KvLabel>
                    <StatusPill $ok={keysHandedOver}>
                        {keysHandedOver
                            ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Przekazane</>
                            : '—  Nie'}
                    </StatusPill>
                </KvRow>

                <KvRow>
                    <KvLabel>Dokumenty</KvLabel>
                    <StatusPill $ok={documentsHandedOver}>
                        {documentsHandedOver
                            ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Przekazane</>
                            : '—  Nie'}
                    </StatusPill>
                </KvRow>

                {vehicleHandoff?.isHandedOffByOtherPerson && (
                    <HandoffBanner>
                        <HandoffLabel>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Przekazano przez inną osobę
                        </HandoffLabel>
                        <HandoffKv>
                            <HandoffRow>
                                <HandoffKey>Imię</HandoffKey>
                                <HandoffVal>
                                    {vehicleHandoff.contactPerson.firstName} {vehicleHandoff.contactPerson.lastName}
                                </HandoffVal>
                            </HandoffRow>
                            {vehicleHandoff.contactPerson.phone && (
                                <HandoffRow>
                                    <HandoffKey>Telefon</HandoffKey>
                                    <HandoffVal>{vehicleHandoff.contactPerson.phone}</HandoffVal>
                                </HandoffRow>
                            )}
                            {vehicleHandoff.contactPerson.email && (
                                <HandoffRow>
                                    <HandoffKey>E-mail</HandoffKey>
                                    <HandoffVal>{vehicleHandoff.contactPerson.email}</HandoffVal>
                                </HandoffRow>
                            )}
                        </HandoffKv>
                    </HandoffBanner>
                )}
            </VehicleBody>
        </SidebarCard>
    );
};
