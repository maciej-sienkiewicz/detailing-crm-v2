// src/modules/worktime/views/WorkTimeView.tsx
//
// Karta czasu pracy pracownika (/worktime). Miesiąc jest w adresie (`?period=YYYY-MM`):
// tak linkują pushe „karta zwrócona / zatwierdzona / przypomnienie", a „wstecz" wraca do
// poprzednio oglądanego miesiąca.
//
// Złożona karta jest tylko do odczytu - czeka na decyzję przełożonego, a backend
// odrzuca wtedy zmiany (409). Dni bierzemy z `days[]` serwera: święta i urlop/L4 są
// podpisane, a brakujący dzień roboczy jest bursztynowy - pracownik widzi braki, zanim
// złoży kartę, zamiast dowiadywać się o nich ze zwrotu.

import { useState, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import { useVisualViewportSheet } from '@/common/hooks';
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, Notice } from '@/common/components/ui';
import {
    usePeriods,
    usePeriodDetail,
    useFillMonth,
    useStandardToday,
    useSubmitPeriod,
    useUpsertEntry,
    useDeleteEntry,
} from '../hooks/useWorkTime';
import type { CardDay, PeriodStatus, WorkTimeEntry } from '../types';

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

/** Do zdania: „za wrzesień 2026". */
const periodInSentence = (period: string) => periodLabel(period).toLowerCase();

const isPeriod = (value: string | null): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Komunikat serwera (np. 409 „Karta za wrzesień 2026 czeka na decyzję przełożonego…"). */
const messageOf = (error: unknown): string | undefined =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

function missingDaysLabel(count: number): string {
    return count === 1 ? '1 dniu roboczym' : `${count} dniach roboczych`;
}

/** Parse input like "8", "8:30", "3:50", "0:45" → minutes. Returns null if invalid. */
function parseTimeInput(raw: string): number | null {
    const s = raw.trim().replace(',', '.');
    if (!s) return null;

    const colonMatch = s.match(/^(\d{1,2})[:\s](\d{1,2})$/);
    if (colonMatch) {
        const h = parseInt(colonMatch[1], 10);
        const m = parseInt(colonMatch[2], 10);
        if (m >= 60) return null;
        const total = h * 60 + m;
        return total > 1440 ? null : total;
    }

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
    SUBMITTED: 'Złożona, czeka na zatwierdzenie',
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
    const { showSuccess, showError } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // Miesiąc z adresu, o ile jest prawdziwy i nie z przyszłości - inaczej bieżący.
    const requested = searchParams.get('period');
    const period = isPeriod(requested) && requested <= currentPeriod() ? requested : currentPeriod();
    // Każdy miesiąc to osobny wpis w historii: „wstecz" wraca do poprzedniego.
    const setPeriod = (next: string) => setSearchParams({ period: next });

    const [showFillConfirm, setShowFillConfirm] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [editDay, setEditDay] = useState<{ date: string; dateObj: Date } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    // Saved scroll position before the sheet opened; restored on close
    const savedScrollY = useRef(0);

    // Klawiatura na iOS nie skraca layout viewportu - arkusz przyklejony do dołu
    // chowałby się pod nią razem z „Anuluj / Zapisz", więc podjeżdża nad nią.
    const sheetRef = useRef<HTMLDivElement>(null);
    useVisualViewportSheet(editDay !== null, sheetRef, { keyboard: 'lift' });

    // Hooki przed strażnikiem: wcześniej przekierowanie stało nad nimi, więc kolejność
    // hooków zależała od konta (rules-of-hooks), a nawigacja szła w trakcie renderu.
    const tracks = !user || !!user.trackWorkTime;
    const { data: detail, isLoading } = usePeriodDetail(period, { enabled: tracks });
    const { data: periods } = usePeriods({ enabled: tracks });
    const fillMonth = useFillMonth(period);
    const standardToday = useStandardToday(period);
    const submitPeriod = useSubmitPeriod(period);
    const upsertEntry = useUpsertEntry(period);
    const deleteEntry = useDeleteEntry(period);

    if (!tracks) return <Navigate to="/dashboard" replace />;

    const isApproved = detail?.status === 'APPROVED';
    const isSubmitted = detail?.status === 'SUBMITTED';
    // Złożona karta czeka na decyzję - zmiany odrzuciłby backend, więc ich nie proponujemy.
    const readOnly = isApproved || isSubmitted;

    const entryMap = new Map<string, WorkTimeEntry>(
        (detail?.entries ?? []).map(e => [e.date, e])
    );
    const dayInfo = new Map<string, CardDay>((detail?.days ?? []).map(d => [d.date, d]));
    const missingCount = detail?.missingWorkingDays
        ?? (detail?.days ?? []).filter(d => d.missing).length;
    // Zwrócone karty z innych miesięcy - pracownik ma je zobaczyć, gdziekolwiek jest.
    const returnedElsewhere = (periods ?? []).filter(p => p.status === 'RETURNED' && p.period !== period);

    const days = periodToDays(period);
    const today = toDateStr(new Date());

    const openEdit = (d: Date) => {
        if (readOnly) return;
        savedScrollY.current = window.scrollY;
        const dateStr = toDateStr(d);
        const existing = entryMap.get(dateStr);
        setEditDay({ date: dateStr, dateObj: d });
        setEditValue(existing ? minutesToDisplay(existing.minutes) : '');
        setEditError(null);
    };

    const closeEdit = () => {
        setEditDay(null);
        setEditValue('');
        setEditError(null);
        // Restore scroll after keyboard dismisses
        setTimeout(() => {
            window.scrollTo({ top: savedScrollY.current, behavior: 'instant' });
        }, 150);
    };

    const handleSave = () => {
        if (!editDay) return;
        if (!editValue.trim()) {
            deleteEntry.mutate(editDay.date, {
                onSuccess: () => { showSuccess('Wpis usunięty'); closeEdit(); },
                onError: error => showError('Nie udało się usunąć wpisu', messageOf(error)),
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
            onError: error => showError('Nie udało się zapisać', messageOf(error)),
        });
    };

    const handleFillMonth = () => {
        setShowFillConfirm(false);
        fillMonth.mutate(undefined, {
            onSuccess: () => showSuccess('Uzupełniono dni robocze (8h)', 'Święta oraz dni urlopu i L4 zostały pominięte.'),
            onError: error => showError('Nie udało się uzupełnić miesiąca', messageOf(error)),
        });
    };

    const handleStandardToday = () => {
        standardToday.mutate(undefined, {
            onSuccess: () => showSuccess('Dodano 8h na dzisiaj'),
            onError: error => showError('Nie udało się dodać wpisu', messageOf(error)),
        });
    };

    const submit = () => {
        submitPeriod.mutate(undefined, {
            onSuccess: () => showSuccess('Karta złożona do zatwierdzenia'),
            onError: error => showError('Nie udało się złożyć karty', messageOf(error)),
        });
    };

    // Braki nie blokują złożenia (kontrakt), ale pracownik ma o nich wiedzieć, zanim karta
    // trafi do przełożonego - inaczej dowiaduje się o nich dopiero ze zwrotu.
    const handleSubmit = () => {
        if (missingCount > 0) {
            setShowSubmitConfirm(true);
            return;
        }
        submit();
    };

    const canSubmit = !readOnly && (detail?.entryCount ?? 0) > 0;

    return (
        <Page>
            <Container $hasSubmit={canSubmit}>
                {/* Header */}
                <PageHeader>
                    <PageTitle>Czas pracy</PageTitle>
                </PageHeader>

                {/* Month navigation */}
                <MonthNav>
                    <NavBtn
                        onClick={() => setPeriod(addMonth(period, -1))}
                        aria-label="Poprzedni miesiąc"
                    >
                        <ChevronIcon dir="left" />
                    </NavBtn>
                    <MonthLabel>{periodLabel(period)}</MonthLabel>
                    <NavBtn
                        onClick={() => setPeriod(addMonth(period, 1))}
                        aria-label="Następny miesiąc"
                        disabled={period >= currentPeriod()}
                    >
                        <ChevronIcon dir="right" />
                    </NavBtn>
                </MonthNav>

                {returnedElsewhere.length > 0 && (
                    <Banner>
                        {returnedElsewhere.map(p => (
                            <Notice
                                key={p.period}
                                tone="danger"
                                title={`Masz zwróconą kartę za ${periodInSentence(p.period)}`}
                                action={<Button variant="outline" size="sm" onClick={() => setPeriod(p.period)}>Otwórz kartę</Button>}
                            >
                                {p.returnNote ?? undefined}
                            </Notice>
                        ))}
                    </Banner>
                )}

                {isSubmitted && (
                    <Banner>
                        <Notice tone="info" title="Karta złożona, czeka na decyzję przełożonego.">
                            Jeśli trzeba coś poprawić, poproś o zwrot.
                        </Notice>
                    </Banner>
                )}

                {detail?.status === 'RETURNED' && (
                    <Banner>
                        <Notice tone="danger" title="Karta zwrócona do poprawy">
                            {detail.returnNote ?? 'Popraw wpisy i złóż kartę ponownie.'}
                        </Notice>
                    </Banner>
                )}

                {/* Status + summary card */}
                {isLoading ? (
                    <SummaryCard>
                        <SkeletonLine $w="60%" />
                        <SkeletonLine $w="40%" />
                    </SummaryCard>
                ) : detail ? (() => {
                    const overtimeMinutes = detail.entries.reduce(
                        (sum, e) => sum + Math.max(0, e.minutes - 480), 0
                    );
                    return (
                        <SummaryCard $bg={STATUS_BG[detail.status as PeriodStatus]}>
                            <StatusBadge $color={STATUS_COLOR[detail.status as PeriodStatus]}>
                                <StatusDot $color={STATUS_COLOR[detail.status as PeriodStatus]} />
                                {STATUS_LABELS[detail.status as PeriodStatus]}
                            </StatusBadge>
                            <SummaryRow>
                                <SummaryItem>
                                    <SummaryValue>{detail.totalHours}</SummaryValue>
                                    <SummaryLabel>
                                        {detail.expectedMinutes !== undefined
                                            ? `z ${minutesToDisplay(detail.expectedMinutes)} normy`
                                            : 'łącznie'}
                                    </SummaryLabel>
                                </SummaryItem>
                                <SummaryDivider />
                                <SummaryItem>
                                    <SummaryValue>{detail.entryCount}</SummaryValue>
                                    <SummaryLabel>{detail.entryCount === 1 ? 'dzień' : 'dni'}</SummaryLabel>
                                </SummaryItem>
                                <SummaryDivider />
                                <SummaryItem>
                                    <SummaryValue $overtime={overtimeMinutes > 0}>
                                        {minutesToDisplay(overtimeMinutes)}
                                    </SummaryValue>
                                    <SummaryLabel>nadgodziny</SummaryLabel>
                                </SummaryItem>
                            </SummaryRow>
                            {missingCount > 0 && !isApproved && (
                                <MissingNote>
                                    Brak wpisu w {missingDaysLabel(missingCount)} (bez świąt, urlopu i L4).
                                </MissingNote>
                            )}
                        </SummaryCard>
                    );
                })() : null}

                {/* Quick actions */}
                {!readOnly && (
                    <QuickActions>
                        <QuickBtn
                            onClick={handleStandardToday}
                            disabled={standardToday.isPending || period !== currentPeriod()}
                            title={period !== currentPeriod() ? 'Dostępne tylko dla bieżącego miesiąca' : 'Dodaj 8h na dzisiaj'}
                        >
                            <ClockIcon />
                            Standardowa dniówka
                        </QuickBtn>
                        <QuickBtn
                            onClick={() => setShowFillConfirm(true)}
                            disabled={fillMonth.isPending}
                            title="Uzupełnij puste dni robocze po 8h (pomija święta, urlop i L4)"
                        >
                            <CalendarIcon />
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
                            const info = dayInfo.get(dateStr);
                            const isToday = dateStr === today;
                            // Święto to dzień wolny jak weekend - przygaszony, z nazwą.
                            const weekend = info ? !info.isWorkingDay : isWeekend(d);
                            const missing = !readOnly && !!info?.missing;
                            const tags = [info?.holidayName, info?.leave?.label].filter((t): t is string => !!t);
                            return (
                                <DayRow
                                    key={dateStr}
                                    $weekend={weekend}
                                    $today={isToday}
                                    $missing={missing}
                                    $approved={readOnly}
                                    onClick={() => openEdit(d)}
                                    tabIndex={readOnly ? -1 : 0}
                                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openEdit(d)}
                                    aria-label={`${DAYS_FULL[d.getDay()]} ${formatDate(d)}: ${entry ? entry.hours : 'brak wpisu'}${tags.length ? `, ${tags.join(', ')}` : ''}`}
                                >
                                    <DayLeft>
                                        <DayShort $weekend={weekend}>{DAYS_PL[d.getDay()]}</DayShort>
                                        <DayDate $today={isToday}>{formatDate(d)}</DayDate>
                                        {tags.map(tag => <DayTag key={tag} $leave={tag === info?.leave?.label}>{tag}</DayTag>)}
                                        {missing && <DayTag $missing>brak wpisu</DayTag>}
                                    </DayLeft>
                                    <DayRight>
                                        {entry ? (
                                            <HoursChip $filled>{entry.hours}</HoursChip>
                                        ) : (
                                            <HoursChip $filled={false}>-</HoursChip>
                                        )}
                                        {!readOnly && <ChevronIcon dir="right" small />}
                                    </DayRight>
                                </DayRow>
                            );
                        })}
                </DayList>
            </Container>

            {/* Sticky submit bar: always visible at bottom when applicable */}
            {canSubmit && (
                <StickySubmitBar>
                    <SubmitBtn
                        onClick={handleSubmit}
                        disabled={submitPeriod.isPending}
                    >
                        {submitPeriod.isPending ? 'Składanie...' : 'Złóż kartę do zatwierdzenia'}
                    </SubmitBtn>
                </StickySubmitBar>
            )}

            <ConfirmationModal
                isOpen={showFillConfirm}
                title="Uzupełnić miesiąc?"
                message={`Puste dni robocze w miesiącu ${periodInSentence(period)} zostaną uzupełnione po 8 godzin. Święta oraz dni urlopu i L4 zostaną pominięte, a dni z wpisem pozostaną bez zmian.`}
                variant="info"
                confirmText="Uzupełnij"
                onConfirm={handleFillMonth}
                onCancel={() => setShowFillConfirm(false)}
            />

            <ConfirmationModal
                isOpen={showSubmitConfirm}
                title="Złożyć kartę z brakami?"
                message={`W karcie za ${periodInSentence(period)} brakuje wpisu w ${missingDaysLabel(missingCount)} (bez świąt, urlopu i L4). Przełożony zobaczy te braki przy zatwierdzaniu i może zwrócić kartę do poprawy.`}
                variant="warning"
                confirmText="Złóż mimo braków"
                cancelText="Uzupełnię"
                onConfirm={submit}
                onCancel={() => setShowSubmitConfirm(false)}
            />

            {/* Edit bottom sheet: nakładka i arkusz to dwie osobne warstwy (patrz BottomSheet) */}
            {editDay && (
                <>
                    <SheetBackdrop onClick={closeEdit} />
                    <BottomSheet
                        ref={sheetRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="worktime-sheet-title"
                    >
                        <SheetHandle />
                        <SheetTitle id="worktime-sheet-title">
                            {DAYS_FULL[editDay.dateObj.getDay()]}, {formatDate(editDay.dateObj)}
                        </SheetTitle>
                        <SheetBody>
                            <SheetLabel htmlFor="worktime-sheet-input">Czas pracy (np. 8, 8:30, 3:50)</SheetLabel>
                            <TimeInput
                                id="worktime-sheet-input"
                                autoFocus
                                type="text"
                                inputMode="decimal"
                                placeholder="0:00"
                                value={editValue}
                                onChange={e => { setEditValue(e.target.value); setEditError(null); }}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                onFocus={e => e.target.select()}
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
                                {(upsertEntry.isPending || deleteEntry.isPending) ? 'Zapisuję...' : 'Zapisz'}
                            </SheetSaveBtn>
                        </SheetFooter>
                    </BottomSheet>
                </>
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

// ─── SVG icons ────────────────────────────────────────────────────────────────
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

function ClockIcon() {
    return (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

// ─── Styled components ────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100%;
    background: ${p => p.theme.colors.background};
    /* Czas pracy ma tylko jasny wygląd, jak reszta aplikacji - telefon w trybie
       ciemnym malował go wcześniej na ciemno. „only light" nie pozwala też
       przeglądarce przyciemnić widoku ani pól na własną rękę. */
    color-scheme: only light;
`;

const Container = styled.div<{ $hasSubmit: boolean }>`
    max-width: 640px;
    margin: 0 auto;
    padding: 0 0 ${p => p.$hasSubmit ? '100px' : '40px'};

    @media (min-width: 640px) {
        padding: 24px 24px ${p => p.$hasSubmit ? '100px' : '40px'};
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
`;

const MonthLabel = styled.span`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
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

const SummaryValue = styled.span<{ $overtime?: boolean }>`
    font-size: 28px;
    font-weight: 800;
    color: ${p => p.$overtime ? '#d97706' : '#0f172a'};
    letter-spacing: -0.5px;
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

const MissingNote = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
    text-align: center;
`;

const Banner = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 12px 16px 0;

    @media (min-width: 640px) {
        margin: 0 0 12px;
    }
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
`;

const DayRow = styled.div<{ $weekend: boolean; $today: boolean; $missing?: boolean; $approved: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 16px;
    border-bottom: 1px solid #f1f5f9;
    cursor: ${p => p.$approved ? 'default' : 'pointer'};
    background: ${p => p.$missing ? '#fffbeb' : p.$today ? '#f0f9ff' : p.$weekend ? '#fafafa' : 'transparent'};
    ${p => p.$missing && css`box-shadow: inset 3px 0 0 #f59e0b;`}
    transition: background 120ms;

    &:last-child {
        border-bottom: none;
    }

    ${p => !p.$approved && css`
        &:hover {
            background: #f8fafc;
        }
        &:active {
            background: #f1f5f9;
        }
    `}
`;

const DayLeft = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    min-width: 0;
`;

/** Święto, urlop/L4 albo brak - podpis dnia, nie kolejna liczba. */
const DayTag = styled.span<{ $leave?: boolean; $missing?: boolean }>`
    padding: 1px 8px;
    border-radius: 999px;
    border: 1px solid ${p => p.$missing ? '#fcd34d' : p.$leave ? '#bae6fd' : '#e2e8f0'};
    background: ${p => p.$missing ? '#fef3c7' : p.$leave ? '#f0f9ff' : '#f1f5f9'};
    color: ${p => p.$missing ? '#92400e' : p.$leave ? '#075985' : '#475569'};
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
    white-space: nowrap;
`;

const DayShort = styled.span<{ $weekend: boolean }>`
    font-size: 13px;
    font-weight: 700;
    width: 22px;
    color: ${p => p.$weekend ? '#94a3b8' : '#475569'};
    flex-shrink: 0;
`;

const DayDate = styled.span<{ $today: boolean }>`
    font-size: 14px;
    font-weight: ${p => p.$today ? '700' : '400'};
    color: ${p => p.$today ? '#0284c7' : '#334155'};
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
`;

const StickySubmitBar = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px max(env(safe-area-inset-bottom, 0px), 16px);
    background: white;
    border-top: 1px solid #e2e8f0;
    z-index: 50;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        /* Ponad dolnym paskiem nawigacji; safe-area obsługuje już sam pasek. */
        bottom: ${BOTTOM_NAV_SPACE};
        padding-bottom: 12px;
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
    /* Przeciągnięcie palcem po tle nie przewija strony pod spodem. */
    touch-action: none;
`;

/**
 * Arkusz to osobna warstwa `fixed` przy dolnej krawędzi, a nie dziecko nakładki
 * dociśnięte do jej dołu. Na iPhonie pod „Anuluj / Zapisz" prześwitywał pas strony:
 * Safari 26 nie rysuje warstw `fixed` pod swoim pływającym paskiem (ten obszar barwi
 * kolorem warstwy leżącej przy krawędzi - była nią półprzezroczysta nakładka), a po
 * schowaniu klawiatury potrafi zostawić je przesunięte w górę. Przy krawędzi leży
 * teraz biały arkusz, jego biel ciągnie się w dół (::after), a nad klawiaturę
 * podnosi go useVisualViewportSheet.
 */
const BottomSheet = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 101;
    max-width: 640px;
    margin: 0 auto;
    background: white;
    border-radius: 20px 20px 0 0;
    padding: 12px 20px max(env(safe-area-inset-bottom, 0px), 32px);
    animation: ${slideUp} 220ms cubic-bezier(0.32, 0.72, 0, 1);

    /* Biel arkusza ciągnie się w dół poza jego krawędź: cokolwiek odsłoni pas
       pod przyciskami (przesunięta warstwa, odbicie przy przewijaniu), pokaże
       dalszą część arkusza, a nie stronę. */
    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        height: 100vh;
        background: white;
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
    /* Doubled selector keeps the global touch-device 16px floor from shrinking
       this deliberately oversized time field. */
    && { font-size: 28px; }
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
