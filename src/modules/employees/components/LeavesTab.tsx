import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useLeaves, useAddLeave, useDeleteLeave } from '../hooks/useLeaves';
import type { LeaveType, AddLeavePayload, EmployeeLeave } from '../types';

// ─── Typy urlopów: etykiety + kolory ─────────────────────────────────────────

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    ANNUAL: 'Urlop wypoczynkowy',
    SICK: 'Zwolnienie lekarskie',
    UNPAID: 'Urlop bezpłatny',
    SPECIAL: 'Urlop okolicznościowy',
    PARENTAL: 'Urlop rodzicielski',
    CARE: 'Opieka nad dzieckiem',
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
    ANNUAL: '#10B981',
    SICK: '#EF4444',
    UNPAID: '#64748B',
    SPECIAL: '#8B5CF6',
    PARENTAL: '#F59E0B',
    CARE: '#3B82F6',
};

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDay = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

const fmtRange = (start: string, end: string) => {
    if (start === end) {
        return new Date(start + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return `${fmtDay(start)} – ${fmtDay(end)} ${end.slice(0, 4)}`;
};

const daysLabel = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);

const emptyForm = (): AddLeavePayload => ({
    leaveType: 'ANNUAL',
    startDate: todayISO(),
    endDate: todayISO(),
    note: null,
});

// ─── Styled: kafle statystyk ─────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const StatTile = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StatLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const StatValue = styled.span`
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
    line-height: 1.2;
`;

const StatHint = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const TodayPill = styled.span<{ $onLeave: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    align-self: flex-start;
    margin-top: 3px;
    padding: 5px 12px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 700;
    ${({ $onLeave }) => ($onLeave
        ? `background: ${st.accentRedDim}; color: #DC2626;`
        : `background: ${st.accentGreenDim}; color: #059669;`)}

    &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
    }
`;

// ─── Styled: karta historii ──────────────────────────────────────────────────

const HistoryCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    overflow: hidden;
`;

const HistoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${st.border};
`;

const HistoryTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const AddBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.28);
    transition: background ${st.transition}, box-shadow ${st.transition};

    &:hover {
        background: #2563EB;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.38);
    }

    svg { width: 13px; height: 13px; }
`;

// ─── Styled: kompozytor nowego urlopu ────────────────────────────────────────

const Composer = styled.div`
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ComposerGrid = styled.div`
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 12px;

    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    &:focus { border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const Select = styled.select`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    &:focus { border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const ComposerFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const RangeSummary = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const ComposerActions = styled.div`
    display: flex;
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

const SaveBtn = styled.button`
    padding: 8px 18px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #2563EB; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentRed};
`;

// ─── Styled: lista urlopów ───────────────────────────────────────────────────

const YearHeader = styled.div`
    padding: 12px 20px 6px;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const LeaveRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 20px;
    border-bottom: 1px solid ${st.bgCardAlt};
    transition: background ${st.transition};

    &:last-child { border-bottom: none; }
    &:hover { background: #FAFBFD; }
`;

const TypeDot = styled.span<{ $color: string }>`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${({ $color }) => `${$color}1A`};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg { width: 16px; height: 16px; }
`;

const LeaveInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const LeaveRange = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const LeaveMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const DaysChip = styled.span`
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textSecondary};
    white-space: nowrap;
    flex-shrink: 0;
`;

const DeleteIconBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: ${st.radiusSm};
    background: none;
    color: ${st.textMuted};
    cursor: pointer;
    opacity: 0;
    flex-shrink: 0;
    transition: all ${st.transition};

    ${LeaveRow}:hover & { opacity: 1; }

    &:hover {
        background: ${st.accentRedDim};
        color: ${st.accentRed};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }

    svg { width: 14px; height: 14px; }

    @media (hover: none) {
        opacity: 1;
    }
`;

// ─── Styled: stany puste / ładowanie ─────────────────────────────────────────

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

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 40px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Ikony ───────────────────────────────────────────────────────────────────

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const SunIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const PalmIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16l2 2 4-4" />
    </svg>
);

// ─── Komponent ───────────────────────────────────────────────────────────────

interface Props { employeeId: string; }

export const LeavesTab = ({ employeeId }: Props) => {
    const { showSuccess } = useToast();
    const { leaves, isLoading } = useLeaves(employeeId);
    const addMutation = useAddLeave(employeeId);
    const deleteMutation = useDeleteLeave(employeeId);

    const [showComposer, setShowComposer] = useState(false);
    const [form, setForm] = useState<AddLeavePayload>(emptyForm);
    const [formError, setFormError] = useState('');
    const [pendingDelete, setPendingDelete] = useState<EmployeeLeave | null>(null);

    const currentYear = new Date().getFullYear();
    const today = todayISO();

    const stats = useMemo(() => {
        const daysThisYear = leaves
            .filter(l => l.startDate.slice(0, 4) === String(currentYear))
            .reduce((sum, l) => sum + l.daysCount, 0);
        const onLeaveToday = leaves.some(l => l.startDate <= today && today <= l.endDate);
        return { daysThisYear, total: leaves.length, onLeaveToday };
    }, [leaves, currentYear, today]);

    // Grupowanie po roku rozpoczęcia (lista przychodzi posortowana malejąco po startDate)
    const groups = useMemo(() => {
        const byYear = new Map<string, EmployeeLeave[]>();
        for (const l of leaves) {
            const year = l.startDate.slice(0, 4);
            if (!byYear.has(year)) byYear.set(year, []);
            byYear.get(year)!.push(l);
        }
        return [...byYear.entries()];
    }, [leaves]);

    const formDays = useMemo(() => {
        if (!form.startDate || !form.endDate || form.endDate < form.startDate) return null;
        const ms = new Date(form.endDate + 'T00:00:00').getTime() - new Date(form.startDate + 'T00:00:00').getTime();
        return Math.round(ms / 86_400_000) + 1;
    }, [form.startDate, form.endDate]);

    const closeComposer = () => {
        setShowComposer(false);
        setFormError('');
        setForm(emptyForm());
    };

    const handleAdd = async () => {
        if (!form.startDate || !form.endDate) {
            setFormError('Daty od i do są wymagane.');
            return;
        }
        if (form.endDate < form.startDate) {
            setFormError('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.');
            return;
        }
        setFormError('');
        try {
            await addMutation.mutateAsync(form);
            showSuccess('Urlop dodany');
            closeComposer();
        } catch {
            setFormError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            showSuccess('Urlop usunięty');
        } finally {
            setPendingDelete(null);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <Wrap>
            <StatsRow>
                <StatTile>
                    <StatLabel>Dni urlopu · {currentYear}</StatLabel>
                    <StatValue>{stats.daysThisYear}</StatValue>
                    <StatHint>łącznie dni kalendarzowych</StatHint>
                </StatTile>
                <StatTile>
                    <StatLabel>Wpisy urlopowe</StatLabel>
                    <StatValue>{stats.total}</StatValue>
                    <StatHint>wszystkie lata</StatHint>
                </StatTile>
                <StatTile>
                    <StatLabel>Dziś</StatLabel>
                    <TodayPill $onLeave={stats.onLeaveToday}>
                        {stats.onLeaveToday ? 'Na urlopie' : 'W pracy'}
                    </TodayPill>
                </StatTile>
            </StatsRow>

            <HistoryCard>
                <HistoryHeader>
                    <HistoryTitle>Historia urlopów</HistoryTitle>
                    {!showComposer && (
                        <AddBtn onClick={() => setShowComposer(true)}>
                            <PlusIcon /> Dodaj urlop
                        </AddBtn>
                    )}
                </HistoryHeader>

                {showComposer && (
                    <Composer>
                        <ComposerGrid>
                            <Field>
                                <Label>Typ urlopu</Label>
                                <Select
                                    value={form.leaveType}
                                    onChange={e => setForm(p => ({ ...p, leaveType: e.target.value as LeaveType }))}
                                >
                                    {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
                                        <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Field>
                                <Label>Od *</Label>
                                <Input
                                    type="date"
                                    value={form.startDate}
                                    max={form.endDate || undefined}
                                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                />
                            </Field>
                            <Field>
                                <Label>Do *</Label>
                                <Input
                                    type="date"
                                    value={form.endDate}
                                    min={form.startDate || undefined}
                                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                                />
                            </Field>
                        </ComposerGrid>
                        <Field>
                            <Label>Notatka (opcjonalnie)</Label>
                            <Input
                                type="text"
                                placeholder="np. urlop zaplanowany w grafiku letnim"
                                value={form.note ?? ''}
                                onChange={e => setForm(p => ({ ...p, note: e.target.value || null }))}
                                maxLength={500}
                            />
                        </Field>
                        {formError && <ErrorMsg>{formError}</ErrorMsg>}
                        <ComposerFooter>
                            <RangeSummary>
                                {formDays !== null ? `Łącznie: ${daysLabel(formDays)}` : ''}
                            </RangeSummary>
                            <ComposerActions>
                                <GhostBtn onClick={closeComposer}>Anuluj</GhostBtn>
                                <SaveBtn onClick={handleAdd} disabled={addMutation.isPending}>
                                    {addMutation.isPending ? 'Zapisywanie…' : 'Zapisz urlop'}
                                </SaveBtn>
                            </ComposerActions>
                        </ComposerFooter>
                    </Composer>
                )}

                {leaves.length === 0 ? (
                    <EmptyState>
                        <EmptyIconCircle><SunIcon /></EmptyIconCircle>
                        <EmptyTitle>Brak zarejestrowanych urlopów</EmptyTitle>
                        <EmptyDesc>
                            Dodaj pierwszy urlop, a pojawi się on automatycznie na kalendarzu zespołu.
                        </EmptyDesc>
                    </EmptyState>
                ) : (
                    groups.map(([year, yearLeaves]) => (
                        <div key={year}>
                            {groups.length > 1 && <YearHeader>{year}</YearHeader>}
                            {yearLeaves.map(l => (
                                <LeaveRow key={l.id}>
                                    <TypeDot $color={LEAVE_TYPE_COLORS[l.leaveType]}>
                                        <PalmIcon />
                                    </TypeDot>
                                    <LeaveInfo>
                                        <LeaveRange>{fmtRange(l.startDate, l.endDate)}</LeaveRange>
                                        <LeaveMeta>
                                            {LEAVE_TYPE_LABELS[l.leaveType]}
                                            {l.note ? ` · ${l.note}` : ''}
                                        </LeaveMeta>
                                    </LeaveInfo>
                                    <DaysChip>{daysLabel(l.daysCount)}</DaysChip>
                                    <DeleteIconBtn
                                        onClick={() => setPendingDelete(l)}
                                        disabled={deleteMutation.isPending}
                                        aria-label="Usuń urlop"
                                    >
                                        <TrashIcon />
                                    </DeleteIconBtn>
                                </LeaveRow>
                            ))}
                        </div>
                    ))
                )}
            </HistoryCard>

            <ConfirmationModal
                isOpen={!!pendingDelete}
                title="Usunąć urlop?"
                message={pendingDelete
                    ? `Urlop ${fmtRange(pendingDelete.startDate, pendingDelete.endDate)} zostanie trwale usunięty i zniknie z kalendarza zespołu.`
                    : ''}
                variant="danger"
                confirmText="Usuń"
                onConfirm={handleDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </Wrap>
    );
};
