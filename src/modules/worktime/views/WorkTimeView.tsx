import { useState, useEffect, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import {
    usePeriodDetail,
    useFillMonth,
    useStandardToday,
    useSubmitPeriod,
    useUpsertEntry,
    useDeleteEntry,
} from '../hooks/useWorkTime';
import type { PeriodStatus, WorkTimeEntry } from '../types';

// ─── utils ───────────────────────────────────────────────────────────────────

function currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function addMonth(period: string, delta: number): string {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodToDays(period: string): Date[] {
    const [y, m] = period.split('-').map(Number);
    const days: Date[] = [];
    const d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return days;
}

function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAYS_PL = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
const DAYS_FULL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTHS_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

function formatDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(period: string): string {
    const [y, m] = period.split('-').map(Number);
    return `${MONTHS_PL[m - 1]} ${y}`;
}

/** Parse input like "8", "8:30", "3:50", "0:45" → minutes. Returns null if invalid. */
function parseTimeInput(raw: string): number | null {
    const s = raw.trim().replace(',', '.');
    if (!s) return null;

    // "8:30" or "8h30"
    const colonMatch = s.match(/^(\d{1,2})[:\s](\d{1,2})$/);
    if (colonMatch) {
        const h = parseInt(colonMatch[1], 10);
        const m = parseInt(colonMatch[2], 10);
        if (m >= 60) return null;
        const total = h * 60 + m;
        return total > 1440 ? null : total;
    }

    // plain number "8" or "8.5"
    const numMatch = s.match(/^(\d+)([.,](\d+))?$/);
    if (numMatch) {
        const whole = parseInt(numMatch[1], 10);
        const frac = numMatch[3] ? parseFloat('0.' + numMatch[3]) : 0;
        const total = Math.round((whole + frac) * 60);
        return total > 1440 ? null : total;
    }
    return null;
}

function minutesToDisplay(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, '0')}`;
}

function isWeekend(d: Date): boolean {
    const dow = d.getDay();
    return dow === 0 || dow === 6;
}

const STATUS_LABELS: Record<PeriodStatus, string> = {
    DRAFT: 'Szkic',
    SUBMITTED: 'Złożona — czeka na zatwierdzenie',
    APPROVED: 'Zaakceptowana',
    RETURNED: 'Zwrócona do poprawy',
};

const STATUS_COLOR: Record<PeriodStatus, string> = {
    DRAFT: '#64748b',
    SUBMITTED: '#d97706',
    APPROVED: '#16a34a',
    RETURNED: '#dc2626',
};

const STATUS_BG: Record<PeriodStatus, string> = {
    DRAFT: '#f1f5f9',
    SUBMITTED: '#fffbeb',
    APPROVED: '#f0fdf4',
    RETURNED: '#fef2f2',
};

// ─── WorkTimeView ─────────────────────────────────────────────────────────────

export function WorkTimeView() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [period, setPeriod] = useState(currentPeriod);
    const [editDay, setEditDay] = useState<{ date: string; dateObj: Date } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Guard: redirect if user doesn't have time tracking
    useEffect(() => {
        if (user && !user.trackWorkTime) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    const { data: detail, isLoading } = usePeriodDetail(period);
    const fillMonth = useFillMonth(period);
    const standardToday = useStandardToday(period);
    const submitPeriod = useSubmitPeriod(period);
    const upsertEntry = useUpsertEntry(period);
    const deleteEntry = useDeleteEntry(period);

    const isApproved = detail?.status === 'APPROVED';
    const isSubmitted = detail?.status === 'SUBMITTED';

    const entryMap = new Map<string, WorkTimeEntry>(
        (detail?.entries ?? []).map(e => [e.date, e])
    );

    const days = periodToDays(period);
    const today = toDateStr(new Date());

    const openEdit = (d: Date) => {
        if (isApproved) return;
        const dateStr = toDateStr(d);
        const existing = entryMap.get(dateStr);
        setEditDay({ date: dateStr, dateObj: d });
        setEditValue(existing ? minutesToDisplay(existing.minutes) : '');
        setEditError(null);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    const closeEdit = () => {
        setEditDay(null);
        setEditValue('');
        setEditError(null);
    };

    const handleSave = () => {
        if (!editDay) return;
        if (!editValue.trim()) {
            // empty = delete
            deleteEntry.mutate(editDay.date, {
                onSuccess: () => { showSuccess('Wpis usunięty'); closeEdit(); },
                onError: () => showError('Nie udało się usunąć wpisu'),
            });
            return;
        }
        const minutes = parseTimeInput(editValue);
        if (minutes === null || minutes < 0) {
            setEditError('Nieprawidłowy format (np. 8, 8:30, 3:50)');
            return;
        }
        upsertEntry.mutate({ date: editDay.date, payload: { minutes } }, {
            onSuccess: () => { showSuccess('Zapisano'); closeEdit(); },
            onError: () => showError('Nie udało się zapisać'),
        });
    };

    const handleFillMonth = () => {
        fillMonth.mutate(undefined, {
            onSuccess: () => showSuccess('Uzupełniono dni robocze (8h)'),
            onError: () => showError('Nie udało się uzupełnić miesiąca'),
        });
    };

    const handleStandardToday = () => {
        standardToday.mutate(undefined, {
            onSuccess: () => showSuccess('Dodano 8h na dzisiaj'),
            onError: () => showError('Nie udało się dodać wpisu'),
        });
    };

    const handleSubmit = () => {
        submitPeriod.mutate(undefined, {
            onSuccess: () => showSuccess('Karta złożona do zatwierdzenia'),
            onError: () => showError('Nie udało się złożyć karty'),
        });
    };

    const canSubmit = !isApproved && !isSubmitted && (detail?.entryCount ?? 0) > 0;

    return (
        <Page>
            <Container>
                {/* Header */}
                <PageHeader>
                    <PageTitle>Czas pracy</PageTitle>
                </PageHeader>

                {/* Month navigation */}
                <MonthNav>
                    <NavBtn
                        onClick={() => setPeriod(p => addMonth(p, -1))}
                        aria-label="Poprzedni miesiąc"
                    >
                        <ChevronIcon dir="left" />
                    </NavBtn>
                    <MonthLabel>{periodLabel(period)}</MonthLabel>
                    <NavBtn
                        onClick={() => setPeriod(p => addMonth(p, 1))}
                        aria-label="Następny miesiąc"
                        disabled={period >= currentPeriod()}
                    >
                        <ChevronIcon dir="right" />
                    </NavBtn>
                </MonthNav>

                {/* Status + summary card */}
                {isLoading ? (
                    <SummaryCard>
                        <SkeletonLine $w="60%" />
                        <SkeletonLine $w="40%" />
                    </SummaryCard>
                ) : detail ? (
                    <SummaryCard $bg={STATUS_BG[detail.status as PeriodStatus]}>
                        <StatusBadge $color={STATUS_COLOR[detail.status as PeriodStatus]}>
                            <StatusDot $color={STATUS_COLOR[detail.status as PeriodStatus]} />
                            {STATUS_LABELS[detail.status as PeriodStatus]}
                        </StatusBadge>
                        <SummaryRow>
                            <SummaryItem>
                                <SummaryValue>{detail.totalHours}</SummaryValue>
                                <SummaryLabel>łącznie</SummaryLabel>
                            </SummaryItem>
                            <SummaryDivider />
                            <SummaryItem>
                                <SummaryValue>{detail.entryCount}</SummaryValue>
                                <SummaryLabel>{detail.entryCount === 1 ? 'dzień' : 'dni'}</SummaryLabel>
                            </SummaryItem>
                        </SummaryRow>
                        {detail.returnNote && (
                            <ReturnNote>
                                <strong>Uwaga przełożonego:</strong> {detail.returnNote}
                            </ReturnNote>
                        )}
                    </SummaryCard>
                ) : null}

                {/* Quick actions */}
                {!isApproved && !isSubmitted && (
                    <QuickActions>
                        <QuickBtn
                            onClick={handleStandardToday}
                            disabled={standardToday.isPending}
                            title="Dodaj 8h na dzisiaj"
                        >
                            <BtnIcon>⚡</BtnIcon>
                            Standardowa dniówka
                        </QuickBtn>
                        <QuickBtn
                            onClick={handleFillMonth}
                            disabled={fillMonth.isPending}
                            title="Uzupełnij każdy pn–pt w miesiącu po 8h (tylko puste dni)"
                        >
                            <BtnIcon>📅</BtnIcon>
                            Uzupełnij miesiąc
                        </QuickBtn>
                    </QuickActions>
                )}

                {/* Day list */}
                <DayList>
                    {isLoading
                        ? Array.from({ length: 7 }).map((_, i) => <DayRowSkeleton key={i} />)
                        : days.map(d => {
                            const dateStr = toDateStr(d);
                            const entry = entryMap.get(dateStr);
                            const isToday = dateStr === today;
                            const weekend = isWeekend(d);
                            return (
                                <DayRow
                                    key={dateStr}
                                    $weekend={weekend}
                                    $today={isToday}
                                    $approved={isApproved}
                                    onClick={() => !weekend && openEdit(d)}
                                    tabIndex={weekend || isApproved ? -1 : 0}
                                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !weekend && openEdit(d)}
                                    aria-label={`${DAYS_FULL[d.getDay()]} ${formatDate(d)}: ${entry ? entry.hours : 'brak wpisu'}`}
                                >
                                    <DayLeft>
                                        <DayShort $weekend={weekend}>{DAYS_PL[d.getDay()]}</DayShort>
                                        <DayDate $today={isToday}>{formatDate(d)}</DayDate>
                                    </DayLeft>
                                    <DayRight>
                                        {weekend ? (
                                            <WeekendLabel>—</WeekendLabel>
                                        ) : entry ? (
                                            <HoursChip $filled>{entry.hours}</HoursChip>
                                        ) : (
                                            <HoursChip $filled={false}>—</HoursChip>
                                        )}
                                        {!weekend && !isApproved && <ChevronIcon dir="right" small />}
                                    </DayRight>
                                </DayRow>
                            );
                        })}
                </DayList>

                {/* Submit button */}
                {canSubmit && (
                    <SubmitArea>
                        <SubmitBtn
                            onClick={handleSubmit}
                            disabled={submitPeriod.isPending}
                        >
                            {submitPeriod.isPending ? 'Składanie…' : 'Złóż kartę do zatwierdzenia'}
                        </SubmitBtn>
                    </SubmitArea>
                )}
            </Container>

            {/* Edit bottom sheet */}
            {editDay && (
                <SheetBackdrop onClick={closeEdit}>
                    <BottomSheet onClick={e => e.stopPropagation()}>
                        <SheetHandle />
                        <SheetTitle>
                            {DAYS_FULL[editDay.dateObj.getDay()]}, {formatDate(editDay.dateObj)}
                        </SheetTitle>
                        <SheetBody>
                            <SheetLabel>Czas pracy (np. 8, 8:30, 3:50)</SheetLabel>
                            <TimeInput
                                ref={inputRef}
                                type="text"
                                inputMode="decimal"
                                placeholder="0:00"
                                value={editValue}
                                onChange={e => { setEditValue(e.target.value); setEditError(null); }}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                $error={!!editError}
                                autoComplete="off"
                            />
                            {editError && <InputError>{editError}</InputError>}
                            <SheetHint>
                                Zostaw puste i zapisz, aby usunąć wpis
                            </SheetHint>
                        </SheetBody>
                        <SheetFooter>
                            <SheetCancelBtn onClick={closeEdit}>Anuluj</SheetCancelBtn>
                            <SheetSaveBtn
                                onClick={handleSave}
                                disabled={upsertEntry.isPending || deleteEntry.isPending}
                            >
                                {(upsertEntry.isPending || deleteEntry.isPending) ? 'Zapisuję…' : 'Zapisz'}
                            </SheetSaveBtn>
                        </SheetFooter>
                    </BottomSheet>
                </SheetBackdrop>
            )}
        </Page>
    );
}

// ─── Skeleton day row ─────────────────────────────────────────────────────────
function DayRowSkeleton() {
    return (
        <DayRow $weekend={false} $today={false} $approved={false} style={{ pointerEvents: 'none' }}>
            <DayLeft>
                <SkeletonLine $w="24px" />
                <SkeletonLine $w="36px" />
            </DayLeft>
            <SkeletonLine $w="40px" />
        </DayRow>
    );
}

// ─── SVG chevron ─────────────────────────────────────────────────────────────
function ChevronIcon({ dir, small }: { dir: 'left' | 'right'; small?: boolean }) {
    const size = small ? 14 : 20;
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {dir === 'left'
                ? <polyline points="15 18 9 12 15 6" />
                : <polyline points="9 18 15 12 9 6" />}
        </svg>
    );
}

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100%;
    background: #f8fafc;

    @media (prefers-color-scheme: dark) {
        background: #0f172a;
    }
`;

const Container = styled.div`
    max-width: 640px;
    margin: 0 auto;
    padding: 0 0 100px;

    @media (min-width: 640px) {
        padding: 24px 24px 100px;
    }
`;

const PageHeader = styled.div`
    padding: 20px 16px 8px;

    @media (min-width: 640px) {
        padding: 0 0 8px;
    }
`;

const PageTitle = styled.h1`
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;

    @media (prefers-color-scheme: dark) {
        color: #f1f5f9;
    }
`;

const MonthNav = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 10;

    @media (min-width: 640px) {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        margin-bottom: 12px;
    }

    @media (prefers-color-scheme: dark) {
        background: #1e293b;
        border-color: #334155;
    }
`;

const MonthLabel = styled.span`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;

    @media (prefers-color-scheme: dark) {
        color: #f1f5f9;
    }
`;

const NavBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #475569;
    cursor: pointer;
    transition: background 150ms;

    &:disabled {
        opacity: 0.3;
        cursor: default;
    }

    &:not(:disabled):hover {
        background: #f1f5f9;
    }

    @media (prefers-color-scheme: dark) {
        color: #94a3b8;
        &:not(:disabled):hover { background: #334155; }
    }
`;

const SummaryCard = styled.div<{ $bg?: string }>`
    margin: 12px 16px;
    padding: 16px;
    background: ${p => p.$bg ?? '#f1f5f9'};
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (min-width: 640px) {
        margin: 0 0 12px;
    }
`;

const StatusBadge = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$color};
`;

const StatusDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const SummaryRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
`;

const SummaryItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
`;

const SummaryValue = styled.span`
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.5px;

    @media (prefers-color-scheme: dark) {
        color: #f1f5f9;
    }
`;

const SummaryLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const SummaryDivider = styled.div`
    width: 1px;
    height: 40px;
    background: #e2e8f0;
`;

const ReturnNote = styled.div`
    font-size: 13px;
    color: #991b1b;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 10px 12px;
    line-height: 1.5;
`;

const QuickActions = styled.div`
    display: flex;
    gap: 10px;
    padding: 0 16px 12px;

    @media (min-width: 640px) {
        padding: 0 0 12px;
    }
`;

const QuickBtn = styled.button`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 14px;
    background: white;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    cursor: pointer;
    transition: all 150ms;

    &:not(:disabled):hover {
        border-color: #0284c7;
        color: #0284c7;
        background: #f0f9ff;
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }

    @media (prefers-color-scheme: dark) {
        background: #1e293b;
        border-color: #334155;
        color: #94a3b8;
    }
`;

const BtnIcon = styled.span`
    font-size: 15px;
    line-height: 1;
`;

const DayList = styled.div`
    display: flex;
    flex-direction: column;
    margin: 0 16px;
    background: white;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #e2e8f0;

    @media (min-width: 640px) {
        margin: 0;
    }

    @media (prefers-color-scheme: dark) {
        background: #1e293b;
        border-color: #334155;
    }
`;

const DayRow = styled.div<{ $weekend: boolean; $today: boolean; $approved: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 16px;
    border-bottom: 1px solid #f1f5f9;
    cursor: ${p => (p.$weekend || p.$approved) ? 'default' : 'pointer'};
    background: ${p => p.$today ? '#f0f9ff' : p.$weekend ? '#fafafa' : 'transparent'};
    transition: background 120ms;

    &:last-child {
        border-bottom: none;
    }

    ${p => !p.$weekend && !p.$approved && css`
        &:hover {
            background: #f8fafc;
        }
        &:active {
            background: #f1f5f9;
        }
    `}

    @media (prefers-color-scheme: dark) {
        border-color: #334155;
        background: ${p => p.$today ? '#0c4a6e' : p.$weekend ? '#0f172a' : 'transparent'};
        &:hover { background: #1e293b; }
    }
`;

const DayLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const DayShort = styled.span<{ $weekend: boolean }>`
    font-size: 13px;
    font-weight: 700;
    width: 22px;
    color: ${p => p.$weekend ? '#94a3b8' : '#475569'};
    flex-shrink: 0;

    @media (prefers-color-scheme: dark) {
        color: ${p => p.$weekend ? '#475569' : '#94a3b8'};
    }
`;

const DayDate = styled.span<{ $today: boolean }>`
    font-size: 14px;
    font-weight: ${p => p.$today ? '700' : '400'};
    color: ${p => p.$today ? '#0284c7' : '#334155'};

    @media (prefers-color-scheme: dark) {
        color: ${p => p.$today ? '#38bdf8' : '#94a3b8'};
    }
`;

const DayRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
`;

const HoursChip = styled.span<{ $filled: boolean }>`
    font-size: 14px;
    font-weight: ${p => p.$filled ? '700' : '400'};
    color: ${p => p.$filled ? '#0f172a' : '#cbd5e1'};
    min-width: 40px;
    text-align: right;

    @media (prefers-color-scheme: dark) {
        color: ${p => p.$filled ? '#f1f5f9' : '#475569'};
    }
`;

const WeekendLabel = styled.span`
    font-size: 13px;
    color: #cbd5e1;
`;

const SubmitArea = styled.div`
    padding: 20px 16px 0;

    @media (min-width: 640px) {
        padding: 20px 0 0;
    }
`;

const SubmitBtn = styled.button`
    width: 100%;
    padding: 16px;
    background: #0284c7;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background 150ms;

    &:not(:disabled):hover { background: #0369a1; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

// ─── Bottom sheet ─────────────────────────────────────────────────────────────

const slideUp = keyframes`
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
`;

const SheetBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 100;
    display: flex;
    align-items: flex-end;
`;

const BottomSheet = styled.div`
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    background: white;
    border-radius: 20px 20px 0 0;
    padding: 12px 20px 32px;
    animation: ${slideUp} 220ms cubic-bezier(0.32, 0.72, 0, 1);

    @media (prefers-color-scheme: dark) {
        background: #1e293b;
    }
`;

const SheetHandle = styled.div`
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #e2e8f0;
    margin: 0 auto 16px;
`;

const SheetTitle = styled.h3`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 20px;

    @media (prefers-color-scheme: dark) {
        color: #f1f5f9;
    }
`;

const SheetBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 24px;
`;

const SheetLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #475569;
`;

const TimeInput = styled.input<{ $error: boolean }>`
    width: 100%;
    padding: 16px;
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    border: 2px solid ${p => p.$error ? '#ef4444' : '#e2e8f0'};
    border-radius: 12px;
    color: #0f172a;
    background: white;
    letter-spacing: 1px;
    box-sizing: border-box;
    transition: border-color 150ms;

    &:focus {
        outline: none;
        border-color: ${p => p.$error ? '#ef4444' : '#0284c7'};
    }

    @media (prefers-color-scheme: dark) {
        background: #0f172a;
        color: #f1f5f9;
        border-color: ${p => p.$error ? '#ef4444' : '#334155'};
    }
`;

const InputError = styled.span`
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
`;

const SheetHint = styled.p`
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
`;

const SheetFooter = styled.div`
    display: flex;
    gap: 12px;
`;

const SheetCancelBtn = styled.button`
    flex: 1;
    padding: 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    background: white;
    color: #475569;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms;

    &:hover { background: #f1f5f9; }

    @media (prefers-color-scheme: dark) {
        background: #1e293b;
        border-color: #334155;
        color: #94a3b8;
    }
`;

const SheetSaveBtn = styled.button`
    flex: 2;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: #0284c7;
    color: white;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background 150ms;

    &:not(:disabled):hover { background: #0369a1; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

const shimmer = keyframes`
    0%   { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
`;

const SkeletonLine = styled.div<{ $w?: string }>`
    height: 14px;
    width: ${p => p.$w ?? '100%'};
    border-radius: 6px;
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200px 100%;
    animation: ${shimmer} 1.4s infinite linear;
`;
