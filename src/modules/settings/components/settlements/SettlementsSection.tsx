// src/modules/settings/components/settlements/SettlementsSection.tsx
//
// Rozliczenia: wygenerowane listy obecności razem ze stanem. Dotąd lista trafiała do
// folderu Pobrane jednej osoby i system o niej zapominał - przy kilku administratorach
// nie było wiadomo, czy ktoś ją już sprawdził i wysłał. Tu widać to wszystkim.

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { formatDateTime } from '@/common/utils';
import { Container, Card, ColLabel, Badge, Dot, EmptyWrap, EmptyTitle, EmptyDesc, SkeletonBox } from '../rbacShared.styles';
import type { AttendanceSheet } from '../../api/attendanceApi';
import { useAttendanceSheets, useDeleteAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { AttendanceSheetPreviewModal } from './AttendanceSheetPreviewModal';
import { ApproveAttendanceSheetModal } from './ApproveAttendanceSheetModal';
import { employeesLabel, isApproved, periodDays, periodLabel } from './settlementFormat';

interface SettlementsSectionProps {
    /** Świeżo wygenerowane rozliczenie: jego wiersz raz podświetla się na zielono. */
    highlightId?: string | null;
    /** Przejście do listy pracowników - tam powstaje lista obecności. */
    onGoToEmployees?: () => void;
}

const formatInstant = (epochMs: number) => formatDateTime(new Date(epochMs));

export function SettlementsSection({ highlightId, onGoToEmployees }: SettlementsSectionProps = {}) {
    const { showSuccess } = useToast();
    const { sheets, isLoading, isError, refetch } = useAttendanceSheets();
    const deleteSheet = useDeleteAttendanceSheet();

    const [preview, setPreview] = useState<AttendanceSheet | null>(null);
    const [approving, setApproving] = useState<AttendanceSheet | null>(null);
    const [deleting, setDeleting] = useState<AttendanceSheet | null>(null);

    const handleDelete = (sheet: AttendanceSheet) => {
        deleteSheet.mutate(sheet.id, {
            onSuccess: () => showSuccess('Rozliczenie usunięte', periodLabel(sheet.period)),
        });
    };

    return (
        <Container>
            <Intro>
                Listy obecności wygenerowane w zakładce „Pracownicy". Każdy administrator widzi
                tu, które są już sprawdzone i zatwierdzone.
            </Intro>

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
                ) : isError ? (
                    <EmptyWrap>
                        <EmptyTitle>Nie udało się wczytać rozliczeń</EmptyTitle>
                        <TextBtn type="button" onClick={() => refetch()}>Spróbuj ponownie</TextBtn>
                    </EmptyWrap>
                ) : sheets.length === 0 ? (
                    <EmptyWrap>
                        <EmptyIcon />
                        <EmptyTitle>Brak rozliczeń</EmptyTitle>
                        <EmptyDesc>
                            Zaznacz pracowników w zakładce „Pracownicy" i kliknij „Wygeneruj listę
                            obecności" - lista pojawi się tutaj i poczeka na zatwierdzenie.
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
                                        {' · '}
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
                                    {approved ? (
                                        <Badge $variant="green"><Dot $color="#059669" />Zatwierdzona</Badge>
                                    ) : (
                                        <Badge $variant="amber"><Dot $color="#d97706" />Do zatwierdzenia</Badge>
                                    )}
                                    {approved && (
                                        <Secondary>
                                            <Piece>{sheet.approvedByName ?? '-'}</Piece>
                                            {sheet.approvedAt && <>{' · '}<Piece>{formatInstant(sheet.approvedAt)}</Piece></>}
                                            {sheet.signed && <>{' · '}<Piece>podpisana</Piece></>}
                                        </Secondary>
                                    )}
                                </Cell>
                                <Actions>
                                    <ActionBtn type="button" onClick={() => setPreview(sheet)}>
                                        <EyeIcon /> Podgląd
                                    </ActionBtn>
                                    {!approved && (
                                        <ActionBtn type="button" $primary onClick={() => setApproving(sheet)}>
                                            <CheckIcon /> Zatwierdź
                                        </ActionBtn>
                                    )}
                                    <IconBtn
                                        type="button"
                                        onClick={() => setDeleting(sheet)}
                                        aria-label={`Usuń rozliczenie: ${month}`}
                                        title="Usuń"
                                    >
                                        <TrashIcon />
                                    </IconBtn>
                                </Actions>
                            </Row>
                        );
                    })
                )}
            </TableCard>

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

const EyeIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

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
const GRID = 'minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1.1fr) 260px';

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

/** Kawałek podpisu, który nie łamie się w środku - wiersz łamie się na „ · ". */
const Piece = styled.span`
    white-space: nowrap;
`;

const Primary = styled.strong`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const Plain = styled.span`
    font-size: 12.5px;
    color: #334155;
    font-variant-numeric: tabular-nums;
`;

const Secondary = styled.span`
    font-size: 11.5px;
    line-height: 1.4;
    color: #94a3b8;
`;

const MobileLabel = styled.span`
    display: none;
    @container settlements ${NARROW} {
        display: inline;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
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

const ActionBtn = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 11px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    border-radius: 8px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms, border-color 150ms, color 150ms;
    ${p => (p.$primary
        ? css`
            color: #fff;
            background: #0284c7;
            border: 1px solid #0284c7;
            &:hover { background: #0369a1; border-color: #0369a1; }
        `
        : css`
            color: #0f172a;
            background: #fff;
            border: 1px solid #cbd5e1;
            &:hover { background: #f8fafc; }
        `)}
`;

const IconBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    transition: background 150ms, color 150ms, border-color 150ms;

    &:hover { color: #dc2626; background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.25); }
`;

const Intro = styled.p`
    margin: 0;
    font-size: 12.5px;
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
