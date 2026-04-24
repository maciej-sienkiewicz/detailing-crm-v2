import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
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

// ─── Status & dot config ──────────────────────────────────────────────────────

const COMPLETE_LABEL: Partial<Record<VisitStatus, string>> = {
    IN_PROGRESS:      'Oznacz jako gotowe',
    READY_FOR_PICKUP: 'Wydaj pojazd',
};

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
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1f35 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 28px rgba(0,0,0,0.14);

    &::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -60px;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 60%);
        pointer-events: none;
    }
`;

const HeaderContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 22px 28px 18px;

    @media (max-width: 900px) {
        padding: 18px 20px 14px;
    }

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 16px 14px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
`;

/* ── Breadcrumb ── */

const BreadcrumbRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
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

    &:hover { color: rgba(241, 245, 249, 0.85); }
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
    max-width: 220px;
`;

/* ── Eyebrow ── */

const EyebrowRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    color: #7dd3fc;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
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

/* ── Title ── */

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
`;

const VisitTitle = styled.h1`
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.15;
    color: #fff;
    white-space: nowrap;
`;

const TitleMutedSep = styled.span`
    color: #64748b;
    font-weight: 400;
    margin: 0 2px;
`;

const TitleEditInput = styled.input`
    background: rgba(255, 255, 255, 0.08);
    border: 1.5px solid rgba(14, 165, 233, 0.45);
    border-radius: 8px;
    color: #f1f5f9;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.4px;
    padding: 4px 12px;
    outline: none;
    min-width: 0;
    width: 300px;
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
    color: rgba(148, 163, 184, 0.45);
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

/* ── Meta row ── */

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
    font-size: 13px;
    color: #94a3b8;
`;

const MetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;

    svg { width: 14px; height: 14px; opacity: 0.7; flex-shrink: 0; }
`;

const WizPlate = styled.span`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f1f5f9;
    font-family: 'Courier New', 'Courier', monospace;
    letter-spacing: 0.12em;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
`;

/* ── Right actions ── */

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 4px;

    @media (max-width: 640px) {
        width: 100%;
        flex-wrap: wrap;
        padding-top: 0;
    }
`;

const ActionButton = styled.button<{ $variant?: 'complete' | 'ghost' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;

    svg { width: 15px; height: 15px; }

    &:disabled {
        opacity: 0.32;
        cursor: not-allowed;
    }

    ${p => {
        switch (p.$variant) {
            case 'complete':
                return css`
                    background: #10B981;
                    color: #fff;
                    border: 1px solid #10B981;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
                    &:hover:not(:disabled) {
                        background: #059669;
                        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
                        transform: translateY(-1px);
                    }
                `;
            case 'danger':
                return css`
                    background: transparent;
                    color: #fca5a5;
                    border: 1px solid rgba(239, 68, 68, 0.22);
                    &:hover:not(:disabled) {
                        background: rgba(239, 68, 68, 0.1);
                        border-color: rgba(239, 68, 68, 0.4);
                        color: #fca5a5;
                        transform: translateY(-1px);
                    }
                `;
            default: // ghost = on-dark
                return css`
                    background: rgba(255, 255, 255, 0.08);
                    color: #f1f5f9;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    backdrop-filter: blur(4px);
                    &:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.16);
                        transform: translateY(-1px);
                    }
                `;
        }
    }}
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

    const startEditTitle = () => { setDraftTitle(visit.title ?? ''); setIsEditingTitle(true); };

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

    const cancelEditTitle = () => setIsEditingTitle(false);

    const isTerminal = visit.status === 'COMPLETED' || visit.status === 'REJECTED' || visit.status === 'ARCHIVED';
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
                    {/* Breadcrumb */}
                    <BreadcrumbRow>
                        <BackBtn onClick={() => navigate(-1)} aria-label="Wróć do listy wizyt">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Wizyty
                        </BackBtn>
                        <BreadcrumbSep>›</BreadcrumbSep>
                        <BreadcrumbCurrent>{visit.visitNumber}</BreadcrumbCurrent>
                    </BreadcrumbRow>

                    {/* Eyebrow */}
                    <EyebrowRow>
                        <PulseDot $color={dotCfg.color} $glow={dotCfg.glow} $animate={dotCfg.animate} />
                        {dotCfg.label}
                    </EyebrowRow>

                    {/* Title + vehicle inline */}
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
                                <VisitTitle>
                                    {visit.title}
                                    {vehicleLabel && (
                                        <> <TitleMutedSep>·</TitleMutedSep> {vehicleLabel}</>
                                    )}
                                </VisitTitle>
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
                    </TitleRow>

                    {/* Meta: customer · date · plate */}
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
                        <MetaItem>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {formatDate(visit.scheduledDate)}
                        </MetaItem>
                        {visit.vehicle.licensePlate && (
                            <WizPlate>{visit.vehicle.licensePlate}</WizPlate>
                        )}
                    </MetaRow>
                </HeaderLeft>

                {/* Actions */}
                <HeaderRight>
                    <ActionButton $variant="ghost" onClick={onGeneratePost} title="Generuj post Instagram">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
                        </svg>
                        Generuj post
                    </ActionButton>

                    <ActionButton $variant="ghost" onClick={onPrintProtocol} title="Drukuj protokół">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Drukuj
                    </ActionButton>

                    <ActionButton
                        $variant="complete"
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
