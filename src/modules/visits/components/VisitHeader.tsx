import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Visit, VisitStatus } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string): string => {
    try {
        return new Date(dateStr).toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

const STATUS_CONFIG: Record<VisitStatus, { label: string; bg: string; color: string; border: string }> = {
    DRAFT:            { label: 'Szkic',         bg: 'rgba(245,158,11,0.18)',  color: '#FCD34D', border: 'rgba(245,158,11,0.3)'  },
    IN_PROGRESS:      { label: 'W realizacji',  bg: 'rgba(59,130,246,0.18)', color: '#93C5FD', border: 'rgba(59,130,246,0.3)'  },
    READY_FOR_PICKUP: { label: 'Do odbioru',    bg: 'rgba(16,185,129,0.18)', color: '#6EE7B7', border: 'rgba(16,185,129,0.3)'  },
    COMPLETED:        { label: 'Zakończona',    bg: 'rgba(16,185,129,0.13)', color: '#6EE7B7', border: 'rgba(16,185,129,0.22)' },
    REJECTED:         { label: 'Odrzucona',     bg: 'rgba(239,68,68,0.18)',  color: '#FCA5A5', border: 'rgba(239,68,68,0.3)'   },
    ARCHIVED:         { label: 'Zarchiwizowana',bg: 'rgba(148,163,184,0.13)',color: '#94A3B8', border: 'rgba(148,163,184,0.22)'},
};

const COMPLETE_LABEL: Partial<Record<VisitStatus, string>> = {
    IN_PROGRESS:      'Oznacz jako gotowe',
    READY_FOR_PICKUP: 'Wydaj pojazd',
};

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
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
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
    transition: color 180ms ease;

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
    max-width: 200px;
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const VisitNumber = styled.h1`
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -0.3px;
    white-space: nowrap;
`;

const LicensePlateBadge = styled.div`
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding: 5px 12px 5px 20px;
    background: linear-gradient(180deg, #ffffff 0%, #efefef 100%);
    border: 2px solid #1a1a1a;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #000;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    position: relative;
    text-transform: uppercase;

    &::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 16px;
        background: linear-gradient(180deg, #003399 0%, #002266 100%);
        border-right: 1px solid #111;
        border-radius: 3px 0 0 3px;
    }

    &::after {
        content: 'PL';
        position: absolute;
        left: 3px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 7px;
        font-weight: 800;
        color: #fff;
        letter-spacing: 0.2px;
    }
`;

const VehicleLabel = styled.span`
    font-size: 15px;
    font-weight: 500;
    color: rgba(241, 245, 249, 0.65);
    white-space: nowrap;
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

const StatusBadge = styled.div<{ $bg: string; $color: string; $border: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    background: ${props => props.$bg};
    color: ${props => props.$color};
    border: 1px solid ${props => props.$border};
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    border: 1px solid transparent;

    ${props => {
        switch (props.$variant) {
            case 'primary':
                return `
                    background: #10B981;
                    color: white;
                    border-color: #10B981;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
                    &:hover:not(:disabled) {
                        background: #059669;
                        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
                        transform: translateY(-1px);
                    }
                `;
            case 'danger':
                return `
                    background: rgba(239, 68, 68, 0.1);
                    color: #FCA5A5;
                    border-color: rgba(239, 68, 68, 0.25);
                    &:hover:not(:disabled) {
                        background: rgba(239, 68, 68, 0.18);
                        border-color: rgba(239, 68, 68, 0.4);
                    }
                `;
            default:
                return `
                    background: rgba(255, 255, 255, 0.06);
                    color: rgba(241, 245, 249, 0.65);
                    border-color: rgba(255, 255, 255, 0.1);
                    &:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.11);
                        color: rgba(241, 245, 249, 0.9);
                        border-color: rgba(255, 255, 255, 0.18);
                    }
                `;
        }
    }}

    &:disabled {
        opacity: 0.32;
        cursor: not-allowed;
    }

    svg { width: 15px; height: 15px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface VisitHeaderProps {
    visit: Visit;
    onCompleteVisit: () => void;
    onPrintProtocol: () => void;
    onCancelVisit: () => void;
}

export const VisitHeader = ({
    visit,
    onCompleteVisit,
    onPrintProtocol,
    onCancelVisit,
}: VisitHeaderProps) => {
    const navigate = useNavigate();

    const isTerminal = visit.status === 'COMPLETED' || visit.status === 'REJECTED' || visit.status === 'ARCHIVED';
    const statusCfg = STATUS_CONFIG[visit.status];
    const completeLabel = COMPLETE_LABEL[visit.status] ?? 'Zakończ wizytę';
    const customerName = `${visit.customer.firstName} ${visit.customer.lastName}`.trim();
    const vehicleLabel = [visit.vehicle.brand, visit.vehicle.model, visit.vehicle.yearOfProduction && `(${visit.vehicle.yearOfProduction})`]
        .filter(Boolean)
        .join(' ');

    return (
        <HeroHeader>
            <HeaderContent>
                <HeaderLeft>
                    <BreadcrumbRow>
                        <BackBtn onClick={() => navigate(-1)} aria-label="Wróć do listy wizyt">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Wizyty
                        </BackBtn>
                        <BreadcrumbSep>/</BreadcrumbSep>
                        <BreadcrumbCurrent>{visit.visitNumber}</BreadcrumbCurrent>
                    </BreadcrumbRow>

                    <TitleRow>
                        <VisitNumber>{visit.visitNumber}</VisitNumber>
                        {visit.vehicle.licensePlate && (
                            <LicensePlateBadge>{visit.vehicle.licensePlate}</LicensePlateBadge>
                        )}
                        {vehicleLabel && <VehicleLabel>{vehicleLabel}</VehicleLabel>}
                    </TitleRow>

                    <MetaRow>
                        {customerName && (
                            <MetaItem>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
                                </svg>
                                {customerName}
                            </MetaItem>
                        )}
                        <MetaDot>·</MetaDot>
                        <MetaItem>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {formatDate(visit.scheduledDate)}
                        </MetaItem>
                        <MetaDot>·</MetaDot>
                        <StatusBadge $bg={statusCfg.bg} $color={statusCfg.color} $border={statusCfg.border}>
                            {statusCfg.label}
                        </StatusBadge>
                    </MetaRow>
                </HeaderLeft>

                <HeaderRight>
                    <ActionButton $variant="secondary" onClick={onPrintProtocol} title="Drukuj protokół">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Drukuj
                    </ActionButton>

                    <ActionButton
                        $variant="primary"
                        onClick={onCompleteVisit}
                        disabled={isTerminal}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {completeLabel}
                    </ActionButton>

                    <ActionButton
                        $variant="danger"
                        onClick={onCancelVisit}
                        disabled={isTerminal}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Odrzuć
                    </ActionButton>
                </HeaderRight>
            </HeaderContent>
        </HeroHeader>
    );
};
