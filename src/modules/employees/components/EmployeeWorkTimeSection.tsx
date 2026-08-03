import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useToast } from '@/common/components/Toast';
import {
    useTeamWorkTimePeriods,
    useTeamWorkTimePeriod,
    useApproveTeamPeriod,
    useReturnTeamPeriod,
} from '../hooks/useWorkTime';
import type { WorkTimePeriodStatus } from '../types';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<WorkTimePeriodStatus, string> = {
    DRAFT: 'Szkic',
    SUBMITTED: 'Do zatwierdzenia',
    APPROVED: 'Zatwierdzona',
    RETURNED: 'Zwrócona',
};

const STATUS_COLOR: Record<WorkTimePeriodStatus, { bg: string; text: string }> = {
    DRAFT:     { bg: '#1e293b', text: '#94a3b8' },
    SUBMITTED: { bg: '#1e3a5f', text: '#60a5fa' },
    APPROVED:  { bg: '#14532d', text: '#4ade80' },
    RETURNED:  { bg: '#450a0a', text: '#f87171' },
};

const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('pl-PL', {
        weekday: 'short', day: 'numeric', month: 'short',
    });

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 20px;
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    overflow: hidden;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid ${st.border};
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const PeriodRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 20px;
    border-bottom: 1px solid ${st.bgCardAlt};
    transition: background ${st.transition};

    &:last-child { border-bottom: none; }
    &:hover { background: #FAFBFD; }
`;

const PeriodIconBox = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${st.bgCardAlt};
    color: ${st.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg { width: 16px; height: 16px; }
`;

const PeriodInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PeriodLabel = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const PeriodMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const StatusBadge = styled.span<{ $status: WorkTimePeriodStatus }>`
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
    background: ${({ $status }) => STATUS_COLOR[$status].bg};
    color: ${({ $status }) => STATUS_COLOR[$status].text};
`;

const HoursChip = styled.span`
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textSecondary};
    white-space: nowrap;
    flex-shrink: 0;
`;

const Actions = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;

const IconBtn = styled.button<{ $variant?: 'approve' | 'return' | 'ghost' }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: none;
    cursor: pointer;
    transition: all ${st.transition};
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }

    ${({ $variant }) => $variant === 'approve' && `
        color: #4ade80;
        &:hover { background: #14532d; border-color: #166534; }
    `}
    ${({ $variant }) => $variant === 'return' && `
        color: #f87171;
        &:hover { background: #450a0a; border-color: #7f1d1d; }
    `}
    ${({ $variant }) => (!$variant || $variant === 'ghost') && `
        color: ${st.textMuted};
        &:hover { background: ${st.bgCardAlt}; border-color: ${st.borderHover}; color: ${st.text}; }
    `}

    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Detail panel ─────────────────────────────────────────────────────────────

const DetailPanel = styled.div`
    background: ${st.bgCardAlt};
    border-top: 1px solid ${st.border};
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DetailHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
`;

const DetailTitle = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const EntryRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const EntryDate = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    min-width: 140px;
`;

const EntryHours = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.accentBlue};
    min-width: 60px;
`;

const EntryNote = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ReturnNoteBox = styled.div`
    margin-top: 4px;
    padding: 10px 14px;
    background: #450a0a33;
    border: 1px solid #7f1d1d;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: #f87171;
`;

const Spinner = styled.div`
    width: 24px;
    height: 24px;
    border: 2px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 16px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 48px 24px;
    text-align: center;
`;

const EmptyIconCircle = styled.div`
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    justify-content: center;
    svg { width: 22px; height: 22px; }
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const EmptyDesc = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    max-width: 280px;
`;

// ─── Return dialog ────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
`;

const Dialog = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    padding: 24px;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const DialogTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const DialogTextarea = styled.textarea`
    padding: 10px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    resize: vertical;
    min-height: 80px;
    outline: none;
    font-family: inherit;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    &:focus { border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const DialogFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const GhostBtn = styled.button`
    padding: 8px 16px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
`;

const DangerBtn = styled.button`
    padding: 8px 18px;
    background: #b91c1c;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #991b1b; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const UndoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

const ChevronUpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

// ─── Return dialog component ──────────────────────────────────────────────────

interface ReturnDialogProps {
    periodLabel: string;
    isPending: boolean;
    onConfirm: (note: string) => void;
    onCancel: () => void;
}

const ReturnDialog = ({ periodLabel, isPending, onConfirm, onCancel }: ReturnDialogProps) => {
    const [note, setNote] = useState('');
    return (
        <Overlay onClick={onCancel}>
            <Dialog onClick={e => e.stopPropagation()}>
                <DialogTitle>Zwróć kartę do poprawy</DialogTitle>
                <p style={{ margin: 0, fontSize: st.fontSm, color: st.textSecondary }}>
                    Karta za <strong style={{ color: st.text }}>{periodLabel}</strong> zostanie zwrócona
                    pracownikowi. Możesz dodać notatkę z informacją co należy poprawić.
                </p>
                <DialogTextarea
                    placeholder="Notatka dla pracownika (opcjonalnie)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={1000}
                    autoFocus
                />
                <DialogFooter>
                    <GhostBtn onClick={onCancel}>Anuluj</GhostBtn>
                    <DangerBtn onClick={() => onConfirm(note)} disabled={isPending}>
                        {isPending ? 'Zwracanie…' : 'Zwróć kartę'}
                    </DangerBtn>
                </DialogFooter>
            </Dialog>
        </Overlay>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    userId: string;
}

export const EmployeeWorkTimeSection = ({ userId }: Props) => {
    const { showSuccess } = useToast();
    const { periods, isLoading } = useTeamWorkTimePeriods(userId);
    const approveMutation = useApproveTeamPeriod(userId);
    const returnMutation = useReturnTeamPeriod(userId);

    const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
    const [returningPeriod, setReturningPeriod] = useState<{ period: string; label: string } | null>(null);

    const { detail, isLoading: isDetailLoading } = useTeamWorkTimePeriod(userId, expandedPeriod);

    const toggleExpand = (period: string) => {
        setExpandedPeriod(prev => (prev === period ? null : period));
    };

    const handleApprove = async (period: string, label: string) => {
        try {
            await approveMutation.mutateAsync(period);
            showSuccess(`Karta za ${label} zatwierdzona`);
        } catch {
            // error handled by mutation
        }
    };

    const handleReturn = async (note: string) => {
        if (!returningPeriod) return;
        try {
            await returnMutation.mutateAsync({ period: returningPeriod.period, note: note || undefined });
            showSuccess(`Karta za ${returningPeriod.label} zwrócona`);
            setReturningPeriod(null);
        } catch {
            // error handled by mutation
        }
    };

    return (
        <Wrap>
            <Card>
                <CardHeader>
                    <CardTitle>Czas pracy</CardTitle>
                </CardHeader>

                {isLoading && <Spinner />}

                {!isLoading && periods.length === 0 && (
                    <EmptyState>
                        <EmptyIconCircle><ClockIcon /></EmptyIconCircle>
                        <EmptyTitle>Brak kart czasu pracy</EmptyTitle>
                        <EmptyDesc>
                            Pracownik nie uzupełnił jeszcze żadnego miesiąca.
                        </EmptyDesc>
                    </EmptyState>
                )}

                {!isLoading && periods.map(p => (
                    <div key={p.period}>
                        <PeriodRow>
                            <PeriodIconBox>
                                <CalendarIcon />
                            </PeriodIconBox>

                            <PeriodInfo>
                                <PeriodLabel>{p.label}</PeriodLabel>
                                <PeriodMeta>
                                    {p.entryCount} {p.entryCount === 1 ? 'dzień' : 'dni'}
                                    {p.returnNote ? ' · Notatka zwrotu poniżej' : ''}
                                </PeriodMeta>
                            </PeriodInfo>

                            <HoursChip>{p.totalHours} h</HoursChip>
                            <StatusBadge $status={p.status}>{STATUS_LABEL[p.status]}</StatusBadge>

                            <Actions>
                                {p.status === 'SUBMITTED' && (
                                    <>
                                        <IconBtn
                                            $variant="approve"
                                            title="Zatwierdź kartę"
                                            disabled={approveMutation.isPending}
                                            onClick={() => handleApprove(p.period, p.label)}
                                        >
                                            <CheckIcon />
                                        </IconBtn>
                                        <IconBtn
                                            $variant="return"
                                            title="Zwróć do poprawy"
                                            disabled={returnMutation.isPending}
                                            onClick={() => setReturningPeriod({ period: p.period, label: p.label })}
                                        >
                                            <UndoIcon />
                                        </IconBtn>
                                    </>
                                )}
                                <IconBtn
                                    title={expandedPeriod === p.period ? 'Zwiń' : 'Podgląd miesiąca'}
                                    onClick={() => toggleExpand(p.period)}
                                >
                                    {expandedPeriod === p.period ? <ChevronUpIcon /> : <SearchIcon />}
                                </IconBtn>
                            </Actions>
                        </PeriodRow>

                        {expandedPeriod === p.period && (
                            <DetailPanel>
                                <DetailHeader>
                                    <DetailTitle>Dni robocze · {p.label}</DetailTitle>
                                </DetailHeader>

                                {isDetailLoading && <Spinner />}

                                {p.returnNote && (
                                    <ReturnNoteBox>
                                        <strong>Notatka zwrotu:</strong> {p.returnNote}
                                    </ReturnNoteBox>
                                )}

                                {!isDetailLoading && detail && detail.entries.length === 0 && (
                                    <p style={{ margin: 0, fontSize: st.fontXs, color: st.textMuted, textAlign: 'center', padding: '12px 0' }}>
                                        Brak wpisów w tym miesiącu.
                                    </p>
                                )}

                                {!isDetailLoading && detail?.entries.map(e => (
                                    <EntryRow key={e.date}>
                                        <EntryDate>{fmtDate(e.date)}</EntryDate>
                                        <EntryHours>{e.hours} h</EntryHours>
                                        {e.note && <EntryNote>{e.note}</EntryNote>}
                                    </EntryRow>
                                ))}
                            </DetailPanel>
                        )}
                    </div>
                ))}
            </Card>

            {returningPeriod && (
                <ReturnDialog
                    periodLabel={returningPeriod.label}
                    isPending={returnMutation.isPending}
                    onConfirm={handleReturn}
                    onCancel={() => setReturningPeriod(null)}
                />
            )}
        </Wrap>
    );
};
