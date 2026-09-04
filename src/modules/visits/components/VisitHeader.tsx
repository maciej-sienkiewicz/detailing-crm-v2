import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import type { Visit, VisitStatus } from '../types';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { usePermissions } from '@/core/permissions';
import { DateTimePicker } from '@/common/components/DateTimePicker';

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

const formatDateRange = (startStr: string, endStr?: string): string => {
    try {
        const start = new Date(startStr);
        if (!endStr) return formatDate(startStr);
        const end = new Date(endStr);
        const sameYear = start.getFullYear() === end.getFullYear();
        const sameMonth = sameYear && start.getMonth() === end.getMonth();
        const startFmt = start.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: sameMonth ? undefined : 'long',
            year: sameYear ? undefined : 'numeric',
        });
        const endFmt = end.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        return `${startFmt} - ${endFmt}`;
    } catch {
        return formatDate(startStr);
    }
};

// ─── Status config ────────────────────────────────────────────────────────────

const COMPLETE_LABEL: Partial<Record<VisitStatus, string>> = {
    IN_PROGRESS:      'Oznacz jako gotowe',
    READY_FOR_PICKUP: 'Wydaj pojazd',
};

// ─── Styled components ────────────────────────────────────────────────────────

const HeroHeader = styled.header`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1f35 100%);
    border-radius: 16px;
    margin-bottom: 22px;
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

    @media (max-width: 640px) {
        border-radius: 12px;
        margin-bottom: 14px;
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
    min-width: 0;

    @media (max-width: 900px) {
        gap: 16px;
        padding: 18px 20px 14px;
    }

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px 14px 12px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
    flex: 1;

    @media (max-width: 640px) {
        width: 100%;
    }
`;

/* ── Title ── */

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
    min-width: 0;

    @media (max-width: 640px) {
        flex: 0 0 100%;
        margin-top: 10px;
        margin-bottom: 6px;
        gap: 6px;
    }
`;

const VisitTitle = styled.h1`
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.15;
    color: #fff;
    word-break: break-word;

    @media (max-width: 900px) {
        font-size: 22px;
    }

    @media (max-width: 768px) {
        font-size: 18px;
        letter-spacing: -0.2px;
    }
`;

const TitlePlaceholder = styled.h1`
    margin: 0;
    font-size: 26px;
    font-weight: 300;
    font-style: italic;
    letter-spacing: -0.2px;
    line-height: 1.15;
    color: rgba(148, 163, 184, 0.45);
    word-break: break-word;

    @media (max-width: 900px) {
        font-size: 22px;
    }

    @media (max-width: 768px) {
        font-size: 18px;
    }
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

    /* Doubled selector so the global touch-device 16px floor cannot shrink the
       hero title field below its intended display size. */
    && { font-size: 22px; }

    @media (max-width: 640px) {
        width: 100%;
        && { font-size: 17px; }
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
    width: auto;
    height: auto;
    padding: 3px 8px;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    &:hover { color: rgba(241, 245, 249, 0.8); background: rgba(255,255,255,0.08); }

    @media (max-width: 640px) {
        padding: 5px 6px;
        span { display: none; }
    }
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
    min-width: 0;
    font-size: 13px;
    color: #94a3b8;
    overflow-wrap: anywhere;

    @media (max-width: 640px) {
        flex: 0 0 100%;
        gap: 8px;
        row-gap: 3px;
        font-size: 12px;
        margin-bottom: 2px;
    }
`;

const MetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    svg { width: 14px; height: 14px; opacity: 0.7; flex-shrink: 0; }
`;


/* ── Vehicle row (pod tytułem, osobna linia) ── */

const VehicleRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 14px;
    color: rgba(148, 163, 184, 0.85);
    font-weight: 500;
    margin-bottom: 8px;
    letter-spacing: 0.01em;

    svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.7; }

    @media (max-width: 640px) {
        flex: 0 0 100%;
        font-size: 13px;
    }
`;

/* ── Date edit modal ── */

/* ── Right actions ── */

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 4px;

    /* 900-640px: the hero is still a row, but three pill buttons plus a kebab no
       longer fit next to the title, so let them wrap under each other. */
    @media (max-width: 900px) {
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    /* On phones the primary action and the kebab share a single row: the
       action stretches, the kebab keeps its fixed 38px next to it. */
    @media (max-width: 640px) {
        width: 100%;
        padding-top: 0;
        gap: 8px;
        flex-wrap: nowrap;
        align-items: center;
    }
`;

const ActionButton = styled.button<{ $variant?: 'complete' | 'ghost' | 'danger'; $mobilePrimary?: boolean; $hideOnMobile?: boolean }>`
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

    @media (max-width: 640px) {
        min-width: 0;
        padding: 9px 14px;
        ${p => p.$hideOnMobile && 'display: none;'}
        ${p => p.$mobilePrimary && 'flex: 1 1 auto; justify-content: center; padding: 11px 16px; font-size: 14px; min-height: 44px;'}
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

/* ── Kebab menu ── */

const KebabWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

const KebabBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.08);
    color: #f1f5f9;
    cursor: pointer;
    transition: background 180ms ease;
    flex-shrink: 0;

    &:hover { background: rgba(255, 255, 255, 0.16); }
    svg { width: 4px; height: 18px; }
`;

const KebabMenu = styled.div`
    position: fixed;
    min-width: 200px;
    max-width: calc(100vw - 16px);
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    z-index: 9000;
    overflow: hidden;
`;

const KebabItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    text-align: left;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 140ms ease;
    color: ${p => p.$danger ? '#fca5a5' : '#e2e8f0'};

    &:last-child { border-bottom: none; }
    &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
    svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.8; }
`;

/* "Door to door" lives in the header on desktop and inside the kebab on phones,
   where the row only has space for the primary action plus the kebab. */
const MobileKebabItem = styled(KebabItem)`
    display: none;
    @media (max-width: 640px) { display: flex; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface VisitHeaderProps {
    visit: Visit;
    onCompleteVisit: () => void;
    /** Wizyta zakończona bez faktury: wystawienie faktury konsumenckiej. */
    onIssueConsumerInvoice?: () => void;
    /** Wizyta zakończona z fakturą: podgląd wystawionego dokumentu. */
    onPreviewInvoice?: () => void;
    onCancelVisit: () => void;
    onGeneratePost: () => void;
    onDoorToDoor?: () => void;
    onTitleUpdate?: (title: string) => Promise<void>;
    onEstimatedCompletionDateUpdate?: (isoDate: string) => Promise<void>;
}

export const VisitHeader = ({
    visit,
    onCompleteVisit,
    onIssueConsumerInvoice,
    onPreviewInvoice,
    onCancelVisit,
    onGeneratePost,
    onDoorToDoor,
    onTitleUpdate,
    onEstimatedCompletionDateUpdate,
}: VisitHeaderProps) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
    /** Kotwica menu: przycisk „⋮". Po niej liczona jest pozycja panelu. */
    const menuRef = useRef<HTMLDivElement>(null);
    /**
     * Sam panel menu. Osobna referencja, bo panel renderuje się PORTALEM do document.body
     * - poza drzewem przycisku. Bez niej zamykanie „po kliknięciu obok" uznawało za
     * „obok" także kliknięcie we własną pozycję menu.
     */
    const menuPanelRef = useRef<HTMLDivElement>(null);

    const syncMenuPos = useCallback(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
        setMenuPos({
            top: rect.bottom + 6,
            // Never let the 200px panel hang off the left edge on a narrow phone.
            right: Math.max(8, viewportWidth - rect.right),
        });
    }, []);

    const openMenu = () => {
        syncMenuPos();
        setIsMenuOpen(v => !v);
    };

    useEffect(() => {
        if (!isMenuOpen) return;
        /*
         * Zamknięcie na `mousedown`, nie na `click` - żeby menu znikało od razu przy
         * kliknięciu w tło. Cena jest taka, że kliknięcie w POZYCJĘ menu też zaczyna się
         * od `mousedown`: jeśli uznamy je za „obok", panel zniknie przed `click`, a
         * `onClick` pozycji nigdy się nie wykona. Dokładnie tak umarły „Generuj post",
         * „Door to door" i „Usuń wizytę": przycisk reagował, menu się zamykało i nic
         * więcej się nie działo.
         *
         * Dlatego sprawdzamy oba elementy - kotwicę i panel z portalu.
         */
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideAnchor = menuRef.current?.contains(target) ?? false;
            const insidePanel = menuPanelRef.current?.contains(target) ?? false;
            if (!insideAnchor && !insidePanel) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        // A fixed panel anchored once would drift away from its button the moment
        // the page scrolls or the phone is rotated.
        window.addEventListener('scroll', syncMenuPos, true);
        window.addEventListener('resize', syncMenuPos);
        window.addEventListener('orientationchange', syncMenuPos);
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', syncMenuPos, true);
            window.removeEventListener('resize', syncMenuPos);
            window.removeEventListener('orientationchange', syncMenuPos);
        };
    }, [isMenuOpen, syncMenuPos]);

    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [draftDate, setDraftDate] = useState('');
    const [isSavingDate, setIsSavingDate] = useState(false);

    const openDateModal = () => {
        const current = visit.estimatedCompletionDate
            ? new Date(visit.estimatedCompletionDate).toISOString().slice(0, 16)
            : '';
        setDraftDate(current);
        setIsDateModalOpen(true);
    };

    const saveDateModal = async () => {
        if (!onEstimatedCompletionDateUpdate || !draftDate || isSavingDate) return;
        setIsSavingDate(true);
        try {
            await onEstimatedCompletionDateUpdate(new Date(draftDate).toISOString());
            setIsDateModalOpen(false);
        } finally {
            setIsSavingDate(false);
        }
    };

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

    const { can } = usePermissions();
    const isTerminal = visit.status === 'COMPLETED' || visit.status === 'REJECTED' || visit.status === 'ARCHIVED';
    const completeLabel = COMPLETE_LABEL[visit.status] ?? 'Zakończ wizytę';

    /*
     * Wizyta zakończona: „Zakończ wizytę" nie ma już czego zrobić i wisiał tu
     * wyłącznie jako wygaszony przycisk. Zastępuje go akcja wynikająca z tego,
     * czym wizytę rozliczono:
     *   faktura w KSeF  → podgląd dokumentu,
     *   inny dokument   → wystawienie brakującej faktury konsumenckiej.
     * Sprawdzamy revenueInvoiceId, nie documentType: dokument finansowy typu
     * INVOICE może istnieć bez rekordu KSeF (adnotacja bez wysyłki), a wtedy
     * nie ma czego pokazać w podglądzie.
     */
    const isCompleted = visit.status === 'COMPLETED';
    const invoiceId = visit.settlement?.revenueInvoiceId ?? null;
    const settlementAction: 'preview' | 'issue' | null =
        !isCompleted ? null
        : invoiceId && onPreviewInvoice ? 'preview'
        : visit.settlement?.documentType && visit.settlement.documentType !== 'INVOICE' && onIssueConsumerInvoice ? 'issue'
        : null;
    const vehicleLabel = [visit.vehicle.brand, visit.vehicle.model, visit.vehicle.licensePlate && `(${visit.vehicle.licensePlate})`]
        .filter(Boolean)
        .join(' ');

    return (
        <HeroHeader>
            <HeaderContent>
                <HeaderLeft>
                    {/* Title row: tylko tytuł + ikona ołówka */}
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
                                {visit.title ? (
                                    <VisitTitle>
                                        {visit.title}
                                    </VisitTitle>
                                ) : (
                                    <TitlePlaceholder onClick={onTitleUpdate && can('VISITS_CREATE') ? startEditTitle : undefined} style={onTitleUpdate && can('VISITS_CREATE') ? { cursor: 'pointer' } : undefined}>
                                        Kliknij, żeby ustawić tytuł...
                                    </TitlePlaceholder>
                                )}
                                {onTitleUpdate && !isEditingTitle && can('VISITS_CREATE') && (
                                    <PencilBtn onClick={startEditTitle} title="Edytuj tytuł wizyty">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        <span>Edytuj tytuł...</span>
                                    </PencilBtn>
                                )}
                            </>
                        )}
                    </TitleRow>

                    {/* Wiersz pojazdu: marka, model, nr rejestracyjny */}
                    {vehicleLabel && (
                        <VehicleRow>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h10l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                                <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                            </svg>
                            {vehicleLabel}
                        </VehicleRow>
                    )}

                    {/* Meta: accepted by · date */}
                    <MetaRow>
                        {visit.acceptedByName && (
                            <MetaItem title="Pracownik, który przyjął pojazd">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="8" r="4" />
                                    <path d="M2 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
                                    <polyline points="16 11 18 13 22 9" />
                                </svg>
                                Przyjął: {visit.acceptedByName}
                            </MetaItem>
                        )}
                        <MetaItem>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {formatDateRange(visit.scheduledDate, visit.estimatedCompletionDate)}
                            {onEstimatedCompletionDateUpdate && can('VISITS_CREATE') && (
                                <PencilBtn onClick={openDateModal} title="Edytuj datę zakończenia">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <span>Edytuj datę...</span>
                                </PencilBtn>
                            )}
                        </MetaItem>
                    </MetaRow>
                </HeaderLeft>

                {/* Actions */}
                <HeaderRight>
                    {onDoorToDoor && can('VISITS_CREATE') && (
                        <ActionButton $variant="ghost" $hideOnMobile onClick={onDoorToDoor}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Door to door
                        </ActionButton>
                    )}

                    {settlementAction === 'preview' && can('VISITS_VIEW') && (
                        <ActionButton $variant="complete" $mobilePrimary onClick={onPreviewInvoice}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="8" y1="13" x2="16" y2="13" />
                                <line x1="8" y1="17" x2="14" y2="17" />
                            </svg>
                            Podgląd faktury
                        </ActionButton>
                    )}

                    {settlementAction === 'issue' && can('VISITS_CREATE') && (
                        <ActionButton $variant="complete" $mobilePrimary onClick={onIssueConsumerInvoice}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                            Wystaw fakturę konsumencką
                        </ActionButton>
                    )}

                    {settlementAction === null && can('VISITS_VIEW') && (
                        <ActionButton $variant="complete" $mobilePrimary onClick={onCompleteVisit} disabled={isTerminal}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {completeLabel}
                        </ActionButton>
                    )}

                    {can('VISITS_CREATE') && (
                    <KebabWrap ref={menuRef}>
                        <KebabBtn onClick={openMenu} title="Więcej opcji">
                            <svg viewBox="0 0 4 18" fill="currentColor">
                                <circle cx="2" cy="2" r="2" />
                                <circle cx="2" cy="9" r="2" />
                                <circle cx="2" cy="16" r="2" />
                            </svg>
                        </KebabBtn>
                    </KebabWrap>
                    )}
                </HeaderRight>
            </HeaderContent>

            {can('VISITS_CREATE') && isMenuOpen && menuPos && createPortal(
                <KebabMenu ref={menuPanelRef} style={{ top: menuPos.top, right: menuPos.right }}>
                    {onDoorToDoor && (
                        <MobileKebabItem onClick={() => { setIsMenuOpen(false); onDoorToDoor(); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Door to door
                        </MobileKebabItem>
                    )}
                    <KebabItem onClick={() => { setIsMenuOpen(false); onGeneratePost(); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
                        </svg>
                        Generuj post
                    </KebabItem>
                    {can('VISITS_DELETE') && (
                        <KebabItem $danger disabled={isTerminal} onClick={() => { setIsMenuOpen(false); onCancelVisit(); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Usuń wizytę
                        </KebabItem>
                    )}
                </KebabMenu>,
                document.body
            )}

            <ModalShell isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Planowana data zakończenia</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setIsDateModalOpen(false)} />
                </ModalHeader>
                <ModalContent>
                    <DateTimePicker
                        value={draftDate}
                        onChange={setDraftDate}
                        showTime
                        placeholder="Wybierz datę i godzinę"
                        accentColor="#6366f1"
                    />
                </ModalContent>
                <ModalFooter>
                    <SharedButton $variant="secondary" onClick={() => setIsDateModalOpen(false)}>Anuluj</SharedButton>
                    <SharedButton $variant="primary" onClick={saveDateModal} disabled={!draftDate || isSavingDate}>
                        {isSavingDate ? 'Zapisywanie...' : 'Zapisz'}
                    </SharedButton>
                </ModalFooter>
            </ModalShell>
        </HeroHeader>
    );
};
