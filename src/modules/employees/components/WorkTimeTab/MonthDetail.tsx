/**
 * MonthDetail — expanded panel shown beneath a period row.
 *
 * Contains:
 *  1. Panel header (title, total summary, "Add benefit row" button)
 *  2. DayGrid — scrollable per-day grid: regular hours + one row per active benefit type
 *  3. Benefits section — list of non-REGULAR entries with status/notes and delete capability
 */

import { useState, useMemo } from 'react';
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
import type { BenefitType, TimesheetStatus, WorkTimeEntry } from '../../types';

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

    // Extra benefit types explicitly added by the user via the modal
    // (types from existing entries are always shown automatically)
    const [extraBenefitTypes, setExtraBenefitTypes] = useState<BenefitType[]>([]);

    const { from, to } = periodDateRange(period);
    const { entries, isLoading, isError } = useWorkTime(employeeId, from, to);
    const deleteMutation = useDeleteWorkTimeEntry(employeeId);

    const readOnly = status === 'APPROVED';

    const regularEntries = entries.filter(e => e.entryType === 'REGULAR');
    const benefitEntries = entries.filter(e => BENEFIT_ENTRY_TYPES.has(e.entryType));

    // Benefit types that have at least one entry from the server
    const benefitTypesFromEntries = useMemo(() => {
        const types = new Set<BenefitType>();
        benefitEntries.forEach(e => types.add(e.entryType as BenefitType));
        return [...types];
    }, [benefitEntries]);

    // All active benefit types = union of server types + user-added types
    const activeBenefitTypes = useMemo(() => {
        const all = new Set([...benefitTypesFromEntries, ...extraBenefitTypes]);
        return [...all];
    }, [benefitTypesFromEntries, extraBenefitTypes]);

    const totalRegular = totalHours(regularEntries);
    const totalBenefit = totalHours(benefitEntries);
    const grandTotal   = totalRegular + totalBenefit;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAddBenefitRow = (type: BenefitType) => {
        setExtraBenefitTypes(prev =>
            prev.includes(type) ? prev : [...prev, type],
        );
    };

    const handleRemoveBenefitRow = (type: BenefitType) => {
        // Only allow removing types that have no server entries
        const hasEntries = benefitEntries.some(e => e.entryType === type);
        if (!hasEntries) {
            setExtraBenefitTypes(prev => prev.filter(t => t !== type));
        }
    };

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
                    regularEntries={regularEntries}
                    benefitEntries={benefitEntries}
                    activeBenefitTypes={activeBenefitTypes}
                    readOnly={readOnly}
                    onRemoveBenefitRow={handleRemoveBenefitRow}
                />
            )}

            {/* ── Benefits section — individual entry cards with status/notes ── */}
            <BenefitsSection>
                <BenefitsSectionTitle>
                    Świadczenia{benefitEntries.length > 0 ? ` (${benefitEntries.length})` : ''}
                </BenefitsSectionTitle>

                {deleteError && <ErrorText>{deleteError}</ErrorText>}

                {!isLoading && benefitEntries.length === 0 && (
                    <EmptyText>
                        Brak świadczeń w tym okresie.
                        {!readOnly && ' Kliknij „Dodaj nowe świadczenie" aby dodać wiersz do tabeli.'}
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
                    period={period}
                    existingTypes={activeBenefitTypes}
                    onAdd={handleAddBenefitRow}
                    onClose={() => setShowBenefitModal(false)}
                />
            )}
        </ExpandedPanel>
    );
};
