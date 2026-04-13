/**
 * MonthDetail — expanded panel shown beneath a period row.
 *
 * Contains:
 *  1. Panel header (title, total summary, "Add benefit" button)
 *  2. DayGrid — scrollable per-day regular hours grid
 *  3. Benefits section — list of non-REGULAR entries with delete capability
 */

import { useState } from 'react';
import {
    ExpandedPanel,
    ExpandedPanelHeader,
    ExpandedPanelTitle,
    ExpandedPanelTitleMain,
    ExpandedPanelTitleSub,
    AddBenefitBtn,
    BenefitsSection,
    BenefitsSectionTitle,
    BenefitCard,
    BenefitCardInfo,
    BenefitCardName,
    BenefitCardMeta,
    BenefitCardHours,
    BenefitDeleteBtn,
    BenefitStatusBadge,
    Spinner,
    EmptyText,
    ErrorText,
} from './styles';
import { periodLabel, BENEFIT_TYPE_LABELS, BENEFIT_ENTRY_TYPES } from './utils';
import { DayGrid } from './DayGrid';
import { AddBenefitModal } from '../AddBenefitModal';
import { useWorkTime, useDeleteWorkTimeEntry } from '../../hooks/useWorkTime';
import { periodDateRange } from './utils';
import type { TimesheetStatus, WorkTimeEntry } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: string;
    period: string;          // YYYY-MM
    status: TimesheetStatus; // Determines whether the period is editable
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TimesheetStatus, string> = {
    DRAFT:     'Szkic – edycja możliwa',
    SUBMITTED: 'Złożony – oczekuje na zatwierdzenie',
    APPROVED:  'Zatwierdzony – tylko do odczytu',
};

const WORK_STATUS_LABELS: Record<string, string> = {
    PENDING:  'Oczekujące',
    APPROVED: 'Zatwierdzone',
    REJECTED: 'Odrzucone',
};

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function totalHours(entries: WorkTimeEntry[]): number {
    return entries.reduce((sum, e) => sum + Number(e.effectiveHours), 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MonthDetail = ({ employeeId, period, status }: Props) => {
    const [showBenefitModal, setShowBenefitModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const { from, to } = periodDateRange(period);
    const { entries, isLoading, isError } = useWorkTime(employeeId, from, to);
    const deleteMutation = useDeleteWorkTimeEntry(employeeId);

    const readOnly = status === 'APPROVED';

    const regularEntries = entries.filter(e => e.entryType === 'REGULAR');
    const benefitEntries = entries.filter(e => BENEFIT_ENTRY_TYPES.has(e.entryType));

    const totalRegular = totalHours(regularEntries);
    const totalBenefit = totalHours(benefitEntries);
    const grandTotal   = totalRegular + totalBenefit;

    const handleDelete = async (entryId: string) => {
        setDeletingId(entryId);
        setDeleteError('');
        try {
            await deleteMutation.mutateAsync(entryId);
        } catch {
            setDeleteError('Nie udało się usunąć wpisu. Spróbuj ponownie.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <ExpandedPanel>
            {/* ── Header ── */}
            <ExpandedPanelHeader>
                <ExpandedPanelTitle>
                    <ExpandedPanelTitleMain>{periodLabel(period)}</ExpandedPanelTitleMain>
                    <ExpandedPanelTitleSub>
                        {STATUS_LABELS[status]}
                        {grandTotal > 0 && (
                            <>
                                {' · '}
                                Łącznie: <strong>{grandTotal.toFixed(2).replace('.', ',')} h</strong>
                                {totalBenefit > 0 && (
                                    <> (w tym świadczenia: {totalBenefit.toFixed(2).replace('.', ',')} h)</>
                                )}
                            </>
                        )}
                    </ExpandedPanelTitleSub>
                </ExpandedPanelTitle>

                {!readOnly && (
                    <AddBenefitBtn onClick={() => setShowBenefitModal(true)}>
                        + Dodaj nowe świadczenie
                    </AddBenefitBtn>
                )}
            </ExpandedPanelHeader>

            {/* ── Day grid ── */}
            {isLoading && <Spinner />}
            {isError && (
                <ErrorText>Nie udało się załadować wpisów. Odśwież stronę.</ErrorText>
            )}
            {!isLoading && !isError && (
                <DayGrid
                    employeeId={employeeId}
                    period={period}
                    entries={regularEntries}
                    readOnly={readOnly}
                />
            )}

            {/* ── Benefits section ── */}
            <BenefitsSection>
                <BenefitsSectionTitle>
                    Świadczenia{benefitEntries.length > 0 ? ` (${benefitEntries.length})` : ''}
                </BenefitsSectionTitle>

                {deleteError && <ErrorText>{deleteError}</ErrorText>}

                {!isLoading && benefitEntries.length === 0 && (
                    <EmptyText>
                        Brak świadczeń w tym okresie.
                        {!readOnly && ' Kliknij „Dodaj nowe świadczenie" aby dodać nadgodziny, nocki lub inne.'}
                    </EmptyText>
                )}

                {benefitEntries.map(entry => (
                    <BenefitCard key={entry.id}>
                        <BenefitCardInfo>
                            <BenefitCardName>
                                {BENEFIT_TYPE_LABELS[entry.entryType as keyof typeof BENEFIT_TYPE_LABELS]
                                    ?? entry.entryType}
                            </BenefitCardName>
                            <BenefitCardMeta>
                                {formatDate(entry.date)}
                                {entry.notes && <> · {entry.notes}</>}
                            </BenefitCardMeta>
                        </BenefitCardInfo>

                        <BenefitCardHours>
                            {Number(entry.effectiveHours).toFixed(2).replace('.', ',')} h
                        </BenefitCardHours>

                        <BenefitStatusBadge $status={entry.status}>
                            {WORK_STATUS_LABELS[entry.status] ?? entry.status}
                        </BenefitStatusBadge>

                        {!readOnly && entry.status === 'PENDING' && (
                            <BenefitDeleteBtn
                                onClick={() => handleDelete(entry.id)}
                                disabled={deletingId === entry.id}
                                aria-label="Usuń świadczenie"
                            >
                                {deletingId === entry.id ? '…' : 'Usuń'}
                            </BenefitDeleteBtn>
                        )}
                    </BenefitCard>
                ))}
            </BenefitsSection>

            {/* ── Add benefit modal ── */}
            {showBenefitModal && (
                <AddBenefitModal
                    employeeId={employeeId}
                    period={period}
                    onClose={() => setShowBenefitModal(false)}
                />
            )}
        </ExpandedPanel>
    );
};
