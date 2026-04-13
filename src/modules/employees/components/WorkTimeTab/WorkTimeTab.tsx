/**
 * WorkTimeTab — monthly timesheet overview for one employee.
 *
 * Renders a table of calendar months (most-recent first) from the
 * employee's hire date to today.  Clicking "Otwórz" on any row expands
 * a MonthDetail panel directly beneath it — only one panel is open at a time.
 *
 * Period summary data (total hours + status) is fetched from the new
 * GET /v1/employees/{id}/worktime/periods endpoint.  If that endpoint is
 * not yet available the table still renders all periods; the hours column
 * shows a skeleton placeholder until data arrives.
 */

import { useState, useMemo } from 'react';
import {
    Section,
    TabHeader,
    SectionTitle,
    PeriodTable,
    PeriodTableHead,
    PeriodTh,
    PeriodRow,
    PeriodName,
    PeriodNameMain,
    PeriodHours,
    PeriodHoursLoading,
    StatusBadge,
    OpenBtn,
    EmptyText,
} from './styles';
import { generatePeriods, periodLabel, currentPeriod } from './utils';
import { MonthDetail } from './MonthDetail';
import { useWorkTimePeriods } from '../../hooks/useWorkTime';
import type { TimesheetStatus, WorkTimePeriodSummary } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: string;
    /** YYYY-MM-DD — used to generate the list of periods back to the hire date. */
    hireDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<TimesheetStatus, string> = {
    DRAFT:     'Szkic',
    SUBMITTED: 'Złożony',
    APPROVED:  'Zatwierdzony',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const WorkTimeTab = ({ employeeId, hireDate }: Props) => {
    const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

    // All calendar periods from hire date → now (most-recent first)
    const periods = useMemo(() => generatePeriods(hireDate), [hireDate]);

    // Server-side aggregated summaries (new endpoint)
    const { periods: summaries, isLoading: summariesLoading } = useWorkTimePeriods(employeeId);

    // Build lookup map: period string → summary
    const summaryMap = useMemo(() => {
        const map = new Map<string, WorkTimePeriodSummary>();
        summaries.forEach(s => map.set(s.period, s));
        return map;
    }, [summaries]);

    const today = currentPeriod();

    const toggle = (period: string) =>
        setExpandedPeriod(prev => (prev === period ? null : period));

    if (periods.length === 0) {
        return <EmptyText>Brak okresów do wyświetlenia.</EmptyText>;
    }

    return (
        <Section>
            <TabHeader>
                <SectionTitle>Ewidencja czasu pracy</SectionTitle>
            </TabHeader>

            <PeriodTable role="table" aria-label="Lista miesięcy ewidencji czasu pracy">
                {/* ── Column headers ── */}
                <PeriodTableHead role="row">
                    <PeriodTh role="columnheader">Okres</PeriodTh>
                    <PeriodTh role="columnheader">Godziny</PeriodTh>
                    <PeriodTh role="columnheader">Status</PeriodTh>
                    <PeriodTh role="columnheader" />
                </PeriodTableHead>

                {/* ── Period rows ── */}
                {periods.map((period, idx) => {
                    const summary = summaryMap.get(period);
                    const isExpanded = expandedPeriod === period;
                    const isCurrentMonth = period === today;

                    // Derive status: use server data when available, else DRAFT
                    const status: TimesheetStatus = summary?.status ?? 'DRAFT';

                    return (
                        <div key={period} role="rowgroup">
                            <PeriodRow
                                $even={idx % 2 === 0}
                                role="row"
                                aria-expanded={isExpanded}
                            >
                                {/* Period name */}
                                <PeriodName role="cell">
                                    <PeriodNameMain>
                                        {periodLabel(period)}
                                        {isCurrentMonth && (
                                            <span
                                                style={{
                                                    marginLeft: 8,
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    color: '#3B82F6',
                                                    background: 'rgba(59,130,246,0.1)',
                                                    padding: '1px 6px',
                                                    borderRadius: 9999,
                                                    verticalAlign: 'middle',
                                                }}
                                            >
                                                bieżący
                                            </span>
                                        )}
                                    </PeriodNameMain>
                                </PeriodName>

                                {/* Total hours */}
                                <div role="cell">
                                    {summariesLoading && !summary ? (
                                        <PeriodHoursLoading aria-hidden />
                                    ) : summary ? (
                                        <PeriodHours>
                                            {summary.totalHours.toFixed(2).replace('.', ',')} h
                                        </PeriodHours>
                                    ) : (
                                        <PeriodHours style={{ color: '#94A3B8' }}>0,00 h</PeriodHours>
                                    )}
                                </div>

                                {/* Status badge */}
                                <div role="cell">
                                    <StatusBadge $status={status}>
                                        {STATUS_DISPLAY[status]}
                                    </StatusBadge>
                                </div>

                                {/* Toggle button */}
                                <div role="cell" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <OpenBtn
                                        $active={isExpanded}
                                        onClick={() => toggle(period)}
                                        aria-label={
                                            isExpanded
                                                ? `Zamknij ${periodLabel(period)}`
                                                : `Otwórz ${periodLabel(period)}`
                                        }
                                    >
                                        {isExpanded ? '↑ Zamknij' : '↗ Otwórz'}
                                    </OpenBtn>
                                </div>
                            </PeriodRow>

                            {/* ── Expanded detail panel ── */}
                            {isExpanded && (
                                <MonthDetail
                                    employeeId={employeeId}
                                    period={period}
                                    status={status}
                                />
                            )}
                        </div>
                    );
                })}
            </PeriodTable>
        </Section>
    );
};
