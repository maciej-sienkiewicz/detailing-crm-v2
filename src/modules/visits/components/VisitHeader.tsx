import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import type { Visit, VisitStatus } from '../types';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

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

// ─── Eyebrow dot config ───────────────────────────────────────────────────────

const DOT_CONFIG: Record<VisitStatus, { color: string; glow: string; animate: boolean; label: string }> = {
    IN_PROGRESS:      { color: '#10b981', glow: 'rgba(16,185,129,0.28)', animate: true,  label: 'W realizacji'    },
    READY_FOR_PICKUP: { color: '#0ea5e9', glow: 'rgba(14,165,233,0.28)', animate: true,  label: 'Do odbioru'      },
    DRAFT:            { color: '#f59e0b', glow: 'rgba(245,158,11,0.22)', animate: true,  label: 'Szkic'           },
    COMPLETED:        { color: '#10b981', glow: 'transparent',           animate: false, label: 'Zakończona'      },
    REJECTED:         { color: '#94a3b8', glow: 'transparent',           animate: false, label: 'Odrzucona'       },
    ARCHIVED:         { color: '#64748b', glow: 'transparent',           animate: false, label: 'Zarchiwizowana'  },
};

const eyePulse = keyframes`
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const HeroHeader = styled.header`
    position: sticky;
    top: 0;
    z-index: 100;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 32px rgba(0,0,0,0.16);

    &::before {
        content: '';
        position: absolute;
        top: -80px;
        right: 60px;
        width: 340px;
        height: 340px;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.09) 0%, transparent 65%);
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
    padding: 14px 20px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 16px 32px;
    }

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
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

    &:hover { color: rgba(14, 165, 233, 0.9); }
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

const EyebrowRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    color: #7dd3fc;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 4px;
`;

const PulseDot = styled.div<{ $color: string; $glow: string; $animate: boolean }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${p => p.$color};
    box-shadow: 0 0 0 4px ${p => p.$glow};
    flex-shrink: 0;
    ${p => p.$animate && css`animation: ${eyePulse} 2s ease-in-out infinite;`}
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const VisitNumber = styled.h1`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: -0.4px;
    white-space: nowrap;
    line-height: 1.15;
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

    @media (max-width: 768px) {
        gap: 6px;
    }
`;

const TitleEditInput = styled.input`
    background: rgba(255, 255, 255, 0.08);
    border: 1.5px solid rgba(14, 165, 233, 0.45);
    border-radius: 8px;
    color: #f1f5f9;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
    padding: 3px 10px;
    outline: none;
    min-width: 0;
    width: 280px;
    max-width: 100%;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &:focus {
        border-color: rgba(14, 165, 233, 0.8);
        background: rgba(255, 255, 255, 0.12);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }
`;

const TitleIconBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    transition: all 160ms ease;
    flex-shrink: 0;
    padding: 0;

    svg { width: 14px; height: 14px; }
`;

const PencilBtn = styled(TitleIconBtn)`
    color: rgba(148, 163, 184, 0.5);
    &:hover { color: rgba(241, 245, 249, 0.8); background: rgba(255,255,255,0.08); }
`;

const SaveBtn = styled(TitleIconBtn)`
    color: #6EE7B7;
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.1);
    &:hover { background: rgba(16, 185, 129, 0.2); }
`;

const CancelEditBtn = styled(TitleIconBtn)`
    color: rgba(148, 163, 184, 0.6);
    border-color: rgba(148, 163, 184, 0.2);
    background: rgba(255,255,255,0.04);
    &:hover { color: rgba(241, 245, 249, 0.8); background: rgba(255,255,255,0.08); }
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
                    background: rgba(239, 68, 68, 0.09);
                    color: #FCA5A5;
                    border-color: rgba(239, 68, 68, 0.22);
                    &:hover:not(:disabled) {
                        background: rgba(239, 68, 68, 0.16);
                        border-color: rgba(239, 68, 68, 0.38);
                        transform: translateY(-1px);
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
                        transform: translateY(-1px);
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
    onGeneratePost: () => void;
    onTitleUpdate?: (title: string) => Promise<void>;
}

export const VisitHeader = ({
    visit,
    onCompleteVisit,
    onPrintProtocol,
    onCancelVisit,
    onGeneratePost,
    onTitleUpdate,
}: VisitHeaderProps) => {
    const navigate = useNavigate();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingTitle) titleInputRef.current?.focus();
    }, [isEditingTitle]);

    const startEditTitle = () => {
        setDraftTitle(visit.title ?? '');
        setIsEditingTitle(true);
    };

    const saveTitle = async () => {
        if (!onTitleUpdate || isSavingTitle) return;
        setIsSavingTitle(true);
        try {
            await onTitleUpdate(draftTitle.trim());
            setIsEditingTitle(false);
        } finally {
            setIsSavingTitle(false);
        }
    };

    const cancelEditTitle = () => {
        setIsEditingTitle(false);
    };

    const isTerminal = visit.status === 'COMPLETED' || visit.status === 'REJECTED' || visit.status === 'ARCHIVED';
    const statusCfg = STATUS_CONFIG[visit.status];
    const dotCfg = DOT_CONFIG[visit.status];
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

                    <EyebrowRow>
                        <PulseDot $color={dotCfg.color} $glow={dotCfg.glow} $animate={dotCfg.animate} />
                        {dotCfg.label}
                    </EyebrowRow>

                    <TitleRow>
                        {isEditingTitle ? (
                            <>
                                <TitleEditInput
                                    ref={titleInputRef}
                                    value={draftTitle}
                                    onChange={e => setDraftTitle(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveTitle();
                                        if (e.key === 'Escape') cancelEditTitle();
                                    }}
                                    disabled={isSavingTitle}
                                />
                                <SaveBtn onClick={saveTitle} disabled={isSavingTitle} title="Zapisz tytuł">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </SaveBtn>
                                <CancelEditBtn onClick={cancelEditTitle} title="Anuluj">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </CancelEditBtn>
                            </>
                        ) : (
                            <>
                                <VisitNumber>{visit.title}</VisitNumber>
                                {onTitleUpdate && (
                                    <PencilBtn onClick={startEditTitle} title="Edytuj tytuł wizyty">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </PencilBtn>
                                )}
                            </>
                        )}
                        {!isEditingTitle && visit.vehicle.licensePlate && (
                            <LicensePlateBadge>{visit.vehicle.licensePlate}</LicensePlateBadge>
                        )}
                        {!isEditingTitle && vehicleLabel && <VehicleLabel>{vehicleLabel}</VehicleLabel>}
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
                    <ActionButton $variant="secondary" onClick={onGeneratePost} title="Generuj post Instagram">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
                        </svg>
                        Generuj post
                    </ActionButton>

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
