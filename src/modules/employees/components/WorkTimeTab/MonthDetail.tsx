/**
 * MonthDetail — expanded panel shown beneath a period row.
 *
 * Contains:
 *  1. DayGrid — scrollable per-day grid: regular hours + one row per active benefit type
 *  2. "Dodaj nowe świadczenie" button (below the grid)
 *  3. Benefits section — list of non-REGULAR entries with status/notes and delete capability
 *     (only rendered when entries exist)
 */

import { useState, useMemo } from 'react';
import {
    ExpandedPanel,
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
    ErrorText,
} from './styles';
import { BENEFIT_TYPE_LABELS, BENEFIT_ENTRY_TYPES } from './utils';
import { DayGrid } from './DayGrid';
import { AddBenefitModal } from '../AddBenefitModal';
import { useWorkTime, useDeleteWorkTimeEntry } from '../../hooks/useWorkTime';
import { periodDateRange } from './utils';
import type { BenefitType, TimesheetStatus, WorkTimeEntry } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: string;
    period: string;          // YYYY-MM
    status: TimesheetStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    const benefitEntries = entries.filter((e): e is WorkTimeEntry =>
        BENEFIT_ENTRY_TYPES.has(e.entryType)
    );

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

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleAddBenefitRow = (type: BenefitType) => {
        setExtraBenefitTypes(prev =>
            prev.includes(type) ? prev : [...prev, type],
        );
    };

    const handleRemoveBenefitRow = (type: BenefitType) => {
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

            {/* ── Add benefit button — below the grid ── */}
            {!readOnly && (
                <div>
                    <AddBenefitBtn onClick={() => setShowBenefitModal(true)}>
                        + Dodaj nowe świadczenie
                    </AddBenefitBtn>
                </div>
            )}

            {/* ── Benefits section — only rendered when entries exist ── */}
            {(benefitEntries.length > 0 || deleteError) && (
                <BenefitsSection>
                    {benefitEntries.length > 0 && (
                        <BenefitsSectionTitle>
                            Świadczenia ({benefitEntries.length})
                        </BenefitsSectionTitle>
                    )}

                    {deleteError && <ErrorText>{deleteError}</ErrorText>}

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
            )}

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
