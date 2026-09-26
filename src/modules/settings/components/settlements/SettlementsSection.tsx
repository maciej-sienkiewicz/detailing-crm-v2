// src/modules/settings/components/settlements/SettlementsSection.tsx
//
// Rozliczenia: wygenerowane listy obecności razem ze stanem. Dotąd lista trafiała do
// folderu Pobrane jednej osoby i system o niej zapominał - przy kilku administratorach
// nie było wiadomo, czy ktoś ją już sprawdził i wysłał. Tu widać to wszystkim.

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Check, Eye, PenLine, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { formatDateTime } from '@/common/utils';
import { Button, Card, IconButton, Notice, StatusPill } from '@/common/components/ui';
import { Container, ColLabel, EmptyWrap, EmptyTitle, EmptyDesc, SkeletonBox } from '../rbacShared.styles';
import { SettingsHeaderActions } from '../shared/SettingsHeaderActions';
import { reportMutationError } from '../team/mutationError';
import type { AttendanceSheet } from '../../api/attendanceApi';
import { useAttendanceSheets, useDeleteAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { AttendanceSheetPreviewModal } from './AttendanceSheetPreviewModal';
import { ApproveAttendanceSheetModal } from './ApproveAttendanceSheetModal';
import { employeesLabel, isApproved, periodDays, periodLabel } from './settlementFormat';

interface SettlementsSectionProps {
    /** Świeżo wygenerowane rozliczenie: jego wiersz raz podświetla się na zielono. */
    highlightId?: string | null;
    /** Przejście do listy pracowników - tam widać, komu liczy się czas pracy. */
    onGoToEmployees?: () => void;
    /** Otwiera okno „Lista obecności"; bez niego sekcja nie ma akcji w nagłówku. */
    onCreateSheet?: () => void;
}

const formatInstant = (epochMs: number) => formatDateTime(new Date(epochMs));

export function SettlementsSection({ highlightId, onGoToEmployees, onCreateSheet }: SettlementsSectionProps = {}) {
    const { showSuccess, showError } = useToast();
    const { sheets, isLoading, isError, refetch } = useAttendanceSheets();
    const deleteSheet = useDeleteAttendanceSheet();

    const [preview, setPreview] = useState<AttendanceSheet | null>(null);
    const [approving, setApproving] = useState<AttendanceSheet | null>(null);
    const [deleting, setDeleting] = useState<AttendanceSheet | null>(null);

    const handleDelete = (sheet: AttendanceSheet) => {
        deleteSheet.mutate(sheet.id, {
            onSuccess: () => showSuccess('Rozliczenie usunięte', `Lista obecności za ${periodLabel(sheet.period).toLowerCase()} zniknęła z Rozliczeń.`),
            // Bez tego błąd sieci albo serwera wyglądał jak sukces bez dymka - wiersz
            // po prostu zostawał, a nikt nie wiedział dlaczego.
            onError: error => reportMutationError(showError, 'Nie udało się usunąć rozliczenia', error),
        });
    };

    return (
        <Container>
            {onCreateSheet && (
                <SettingsHeaderActions>
                    <Button variant="primary" size="lg" onClick={onCreateSheet}>
                        <Plus aria-hidden="true" />
                        Dodaj listę obecności
                    </Button>
                </SettingsHeaderActions>
            )}

            <Intro>
                Wygenerowane listy obecności. Każdy administrator widzi tu, które są już
                sprawdzone i zatwierdzone.
            </Intro>

            {isError ? (
                // Błąd wczytania to nie brak rozliczeń - pusta tabela kazałaby generować
                // listy, które już czekają na zatwierdzenie.
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać rozliczeń"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                />
            ) : (
                <TableCard>
                    <ListHeader>
                        <ColLabel>Okres</ColLabel>
                        <ColLabel>Wygenerowano</ColLabel>
                        <ColLabel>Status</ColLabel>
                        <ColLabel><VisuallyHidden>Akcje</VisuallyHidden></ColLabel>
                    </ListHeader>

                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Row key={i} aria-hidden>
                                <SkeletonBox $w="60%" />
                                <SkeletonBox $w="70%" />
                                <SkeletonBox $w="90px" />
                                <SkeletonBox $w="120px" />
                            </Row>
                        ))
                    ) : sheets.length === 0 ? (
                        <EmptyWrap>
                            <EmptyIcon />
                            <EmptyTitle>Brak rozliczeń</EmptyTitle>
                            <EmptyDesc>
                                Lista obecności pojawi się tutaj po kliknięciu „Lista obecności" przy
                                pracownikach i poczeka na zatwierdzenie. Trafiają na nią osoby, których
                                rola ma liczony czas pracy.
                            </EmptyDesc>
                            {onGoToEmployees && (
                                <TextBtn type="button" onClick={onGoToEmployees}>Przejdź do pracowników</TextBtn>
                            )}
                        </EmptyWrap>
                    ) : (
                        sheets.map(sheet => {
                            const approved = isApproved(sheet);
                            const month = periodLabel(sheet.period);
                            return (
                                <Row key={sheet.id} $highlight={sheet.id === highlightId} data-testid="settlement-row">
                                    <Cell data-area="period">
                                        <Primary>{month}</Primary>
                                        <Secondary>
                                            <Piece>{periodDays(sheet.period)}</Piece>
                                            {', '}
                                            <Piece>{employeesLabel(sheet.employeeCount)}</Piece>
                                        </Secondary>
                                    </Cell>
                                    <Cell data-area="generated">
                                        <Plain>
                                            <MobileLabel>Wygenerowano </MobileLabel>
                                            {formatInstant(sheet.createdAt)}
                                        </Plain>
                                        <Secondary>{sheet.createdByName ?? '-'}</Secondary>
                                    </Cell>
                                    <Cell data-area="status">
                                        <StatusLine>
                                            {approved
                                                ? <StatusPill $tone="ok">Zatwierdzona</StatusPill>
                                                : <StatusPill $tone="warn">Do zatwierdzenia</StatusPill>}
                                            {/* Podpis to osobny fakt, nie dopisek do nazwiska -
                                                dostaje własny element z ikoną zamiast dopisku po kropce. */}
                                            {approved && sheet.signed && (
                                                <SignedMark><PenLine aria-hidden="true" /><span>podpisana</span></SignedMark>
                                            )}
                                        </StatusLine>
                                        {approved && (
                                            // Kto i kiedy: jedno zdanie z przecinkiem zamiast faktów sklejonych kropką.
                                            <Secondary>
                                                <Piece>{sheet.approvedByName ?? '-'}</Piece>
                                                {sheet.approvedAt && <>{', '}<Piece>{formatInstant(sheet.approvedAt)}</Piece></>}
                                            </Secondary>
                                        )}
                                    </Cell>
                                    <Actions>
                                        <Button variant="ghost" size="sm" onClick={() => setPreview(sheet)}>
                                            <Eye aria-hidden="true" /> Podgląd
                                        </Button>
                                        {/* Odcień, nie wypełnienie: przy trzech listach do zatwierdzenia
                                            byłyby trzy wypełnione przyciski w jednym oknie (CLAUDE.md §2).
                                            Jedyne wypełnienie jest w oknie zatwierdzania - jego „Podpisz". */}
                                        {!approved && (
                                            <Button variant="tintedSuccess" size="sm" onClick={() => setApproving(sheet)}>
                                                <Check aria-hidden="true" /> Zatwierdź
                                            </Button>
                                        )}
                                        <IconButton
                                            variant="danger"
                                            size="sm"
                                            label={`Usuń rozliczenie: ${month}`}
                                            onClick={() => setDeleting(sheet)}
                                        >
                                            <Trash2 />
                                        </IconButton>
                                    </Actions>
                                </Row>
                            );
                        })
                    )}
                </TableCard>
            )}

            {preview && (
                <AttendanceSheetPreviewModal
                    sheet={preview}
                    onClose={() => setPreview(null)}
                    onApprove={() => { setApproving(preview); setPreview(null); }}
                />
            )}

            {approving && (
                <ApproveAttendanceSheetModal sheet={approving} onClose={() => setApproving(null)} />
            )}

            <ConfirmationModal
                isOpen={deleting !== null}
                title="Usunąć rozliczenie?"
                message={deleting && isApproved(deleting)
                    ? `Lista obecności za ${periodLabel(deleting.period).toLowerCase()} jest już zatwierdzona. Usunięcie skasuje ją razem z plikiem${deleting.signed ? ' i podpisem' : ''} - tego nie da się cofnąć.`
                    : `Lista obecności za ${deleting ? periodLabel(deleting.period).toLowerCase() : ''} zniknie z Rozliczeń razem z plikiem. Możesz ją wygenerować ponownie.`}
                variant="danger"
                confirmText="Usuń"
                onConfirm={() => { if (deleting) handleDelete(deleting); }}
                onCancel={() => setDeleting(null)}
            />
        </Container>
    );
}

// ─── Ikony ───────────────────────────────────────────────────────────────────

const EmptyIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
    </svg>
);

// ─── Styled ──────────────────────────────────────────────────────────────────

/**
 * Układ zależy od szerokości tabeli, a nie ekranu: obok stoją menu aplikacji i lista
 * sekcji ustawień, więc ten sam ekran daje tabeli raz 1300, a raz 700 pikseli.
 */
const TableCard = styled(Card)`
    container-type: inline-size;
    container-name: settlements;
`;

/**
 * Kolumna akcji ma stałą szerokość: każdy wiersz jest osobną siatką, więc przy `auto`
 * zatwierdzony wiersz (bez przycisku „Zatwierdź") przesuwał wszystkie kolumny obok.
 */
const GRID = 'minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1.1fr) 250px';

/** Poniżej tej szerokości tabeli wiersz staje się kafelkiem. */
const NARROW = '(max-width: 720px)';

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 14px;
    padding: 10px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafbfc;

    @container settlements ${NARROW} { display: none; }
`;

const highlightFade = keyframes`
    from { background: rgba(16, 185, 129, 0.16); }
    to   { background: transparent; }
`;

const Row = styled.div<{ $highlight?: boolean }>`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 14px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }

    ${p => p.$highlight && css`animation: ${highlightFade} 3s ease-out 1;`}

    /* Wąska tabela: wiersz czyta się jak kafelek, w jednej kolumnie - okres, stan,
       kto i kiedy wygenerował, na dole przyciski. Obok siebie nic się nie mieści. */
    @container settlements ${NARROW} {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
        padding: 14px 16px;

        > [data-area="period"] { order: 1; }
        > [data-area="status"] { order: 2; }
        > [data-area="generated"] { order: 3; }
        > :last-child { order: 4; justify-content: flex-start; margin-top: 2px; }
    }
`;

const Cell = styled.div`
    display: grid;
    gap: 3px;
    min-width: 0;
    justify-items: start;

    /* W kafelku stan idzie jednym wierszem: plakietka, a obok kto i kiedy zatwierdził. */
    @container settlements ${NARROW} {
        &[data-area="status"] {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px 8px;
        }
    }
`;

/** Kawałek podpisu, który nie łamie się w środku - wiersz łamie się na przecinku. */
const Piece = styled.span`
    white-space: nowrap;
`;

const Primary = styled.strong`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const Plain = styled.span`
    font-size: 13px;
    color: #334155;
    font-variant-numeric: tabular-nums;
`;

const Secondary = styled.span`
    font-size: 12.5px;
    line-height: 1.45;
    color: #64748b;
`;

const StatusLine = styled.span`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
`;

const SignedMark = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12.5px;
    color: #15803d;

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

/* W kafelku etykieta zdaniem, jak reszta tekstu - były tu 11px wersaliki (CLAUDE.md §2). */
const MobileLabel = styled.span`
    display: none;
    @container settlements ${NARROW} {
        display: inline;
        color: #64748b;
    }
`;

const VisuallyHidden = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: wrap;
`;

const Intro = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: #64748b;
`;

const TextBtn = styled.button`
    margin-top: 4px;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #0284c7;
    cursor: pointer;
    &:hover { text-decoration: underline; }
`;
