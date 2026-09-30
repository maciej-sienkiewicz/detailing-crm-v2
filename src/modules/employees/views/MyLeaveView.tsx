// src/modules/employees/views/MyLeaveView.tsx
//
// „Urlop" pracownika (/me/leave). Samoobsługa bez uprawnień: każdy, czyje konto ma
// rekord pracownika. Projektowane najpierw na telefon, bo z telefonu składa się wniosek.
//
// Nagłówkiem jest LICZBA („9 dni wykorzystanych w 2026"), a lista wniosków jest pod nią
// dowodem. Jedynym wypełnionym elementem jest „Złóż wniosek o urlop" (CLAUDE.md §2);
// akcje na wierszach („Wycofaj", „Pobierz PDF") mają odcień albo obwódkę.

import { useState } from 'react';
import styled from 'styled-components';
import { CalendarOff, CalendarPlus, Download } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { EmptyState } from '@/common/components/EmptyState';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, StatusPill, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import { leaveApiError, myLeaveRequestsApi } from '../api/leaveRequestsApi';
import { useMyLeaveRequests, useWithdrawLeaveRequest } from '../hooks/useLeaveRequests';
import { LeaveRequestWizard } from '../components/leave/LeaveRequestWizard';
import { PrimaryAction } from '../components/leave/PrimaryAction';
import type { LeaveRequestSummary } from '../types';
import {
    LEAVE_REQUEST_STATUS, formatLeaveRange, leaveRequestFileName, leaveRequestTypeLabel, pendingRequestsSentence,
    workingDaysLabel,
} from '../utils/leaveRequestFormat';

export function MyLeaveView() {
    const { showSuccess, showError } = useToast();
    const { data, isLoading, isError, error, refetch } = useMyLeaveRequests();
    const withdraw = useWithdrawLeaveRequest();

    const [wizardOpen, setWizardOpen] = useState(false);
    const [withdrawing, setWithdrawing] = useState<LeaveRequestSummary | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const notLinked = isError && leaveApiError(error).status === 404;

    const handleWithdraw = (request: LeaveRequestSummary) => {
        withdraw.mutate(request.id, {
            onSuccess: () => showSuccess('Wniosek wycofany', `Wniosek ${request.number} nie trafi już do decyzji.`),
            onError: err => showError('Nie udało się wycofać wniosku', leaveApiError(err).message ?? 'Spróbuj ponownie za chwilę.'),
        });
    };

    const handleDownload = async (request: LeaveRequestSummary) => {
        setDownloadingId(request.id);
        try {
            const blob = await myLeaveRequestsApi.file(request.id);
            saveBlobAsFile(blob, leaveRequestFileName(request.number));
        } catch (err) {
            showError('Nie udało się pobrać wniosku', (await readBlobErrorMessage(err)) ?? 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (notLinked) {
        return (
            <Page>
                <Title>Urlop</Title>
                <EmptyState
                    icon={<CalendarOff />}
                    title="Twoje konto nie jest powiązane z pracownikiem"
                    description="Twoje konto nie jest powiązane z pracownikiem. Poproś właściciela o połączenie."
                />
            </Page>
        );
    }

    const summary = data?.summary;
    const requests = data?.requests ?? [];

    return (
        <Page>
            <Title>Urlop</Title>

            {isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać wniosków"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                >
                    Lista jest chwilowo niedostępna.
                </Notice>
            ) : (
                <Hero aria-busy={isLoading || undefined}>
                    <HeroNumber>{isLoading ? '–' : summary?.usedWorkingDays ?? 0}</HeroNumber>
                    <HeroCaption>
                        {pluralPl(summary?.usedWorkingDays ?? 0, 'dzień wykorzystany', 'dni wykorzystane', 'dni wykorzystanych')}
                        {' w '}{summary?.year ?? new Date().getFullYear()}
                    </HeroCaption>
                    {!!summary?.pendingCount && <HeroPending>{pendingRequestsSentence(summary.pendingCount)}</HeroPending>}
                </Hero>
            )}

            <PrimaryAction
                block
                icon={<CalendarPlus />}
                title="Złóż wniosek o urlop"
                sub="trafi do akceptacji"
                onClick={() => setWizardOpen(true)}
            />

            <ListHeading>Twoje wnioski</ListHeading>

            {isLoading ? (
                <Hint>Wczytuję…</Hint>
            ) : !isError && requests.length === 0 ? (
                <EmptyState
                    icon={<CalendarOff />}
                    title="Nie masz jeszcze wniosków"
                    description="Złożony wniosek pojawi się tutaj razem ze statusem i decyzją."
                />
            ) : (
                <List>
                    {requests.map(r => {
                        const status = LEAVE_REQUEST_STATUS[r.status];
                        return (
                            <Row key={r.id} data-testid="my-leave-row">
                                <RowHead>
                                    <RowText>
                                        <strong>{formatLeaveRange(r.startDate, r.endDate)}</strong>
                                        <span>
                                            {leaveRequestTypeLabel(r.leaveType, r.onDemand)}, {workingDaysLabel(r.workingDays)}
                                        </span>
                                    </RowText>
                                    <StatusPill $tone={status.tone}>{status.label}</StatusPill>
                                </RowHead>
                                {r.status === 'REJECTED' && r.decisionNote && (
                                    <RowNote>Uzasadnienie odmowy: {r.decisionNote}</RowNote>
                                )}
                                {r.status === 'CANCELLED' && r.cancelReason && (
                                    <RowNote>Powód odwołania: {r.cancelReason}</RowNote>
                                )}
                                {r.status === 'EXPIRED' && (
                                    <RowNote>Termin minął bez decyzji. Złóż nowy wniosek.</RowNote>
                                )}
                                <RowActions>
                                    {r.status === 'PENDING' && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={withdraw.isPending}
                                            onClick={() => setWithdrawing(r)}
                                        >
                                            Wycofaj
                                        </Button>
                                    )}
                                    {r.status !== 'DRAFT' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={downloadingId === r.id}
                                            onClick={() => { void handleDownload(r); }}
                                        >
                                            <Download aria-hidden="true" />
                                            {downloadingId === r.id ? 'Pobieram…' : 'Pobierz PDF'}
                                        </Button>
                                    )}
                                </RowActions>
                            </Row>
                        );
                    })}
                </List>
            )}

            {wizardOpen && <LeaveRequestWizard onClose={() => setWizardOpen(false)} />}

            <ConfirmationModal
                isOpen={!!withdrawing}
                title="Wycofać wniosek?"
                message={withdrawing
                    ? `Wniosek ${withdrawing.number} (${formatLeaveRange(withdrawing.startDate, withdrawing.endDate)}) nie trafi do decyzji. Dokument zostanie w historii z adnotacją „wycofany".`
                    : ''}
                variant="warning"
                confirmText="Wycofaj wniosek"
                cancelText="Zostaw"
                onConfirm={() => { if (withdrawing) handleWithdraw(withdrawing); }}
                onCancel={() => setWithdrawing(null)}
            />
        </Page>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Page = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 680px;
    padding-block: 24px 140px;

    @media (max-width: 767px) { padding-block: 16px 160px; }
`;

const Title = styled.h1`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

/* Jedyne wyniesienie w kolumnie: liczba, po którą się tu wraca. */
const Hero = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 20px 22px;
    box-shadow: ${ui.shadowCard};
    border-top: 3px solid ${ui.brand};
`;

const HeroNumber = styled.span`
    font-size: 44px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const HeroCaption = styled.span`
    font-size: 15px;
    font-weight: 500;
    color: ${ui.textSecondary};
`;

const HeroPending = styled.span`
    margin-top: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.warnInk};
`;

const ListHeading = styled.h2`
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 700;
    color: ${ui.ink};
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.li`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surface};
`;

const RowHead = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
`;

const RowText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong { font-size: 15px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 13px; color: ${ui.textSecondary}; }
`;

const RowNote = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.inkSoft};
`;

const RowActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    &:empty { display: none; }
`;
