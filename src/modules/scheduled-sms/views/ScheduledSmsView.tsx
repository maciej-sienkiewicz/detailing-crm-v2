// src/modules/scheduled-sms/views/ScheduledSmsView.tsx
//
// „Zaplanowane SMS-y" (/scheduled-sms): komu, co i kiedy wyślemy. W jednej liście
// wszystko, co studio ma jeszcze wysłać - przypomnienia o rezerwacjach, potwierdzenia
// czekające na godziny wysyłki, podziękowania, SMS-y automatów i kampanie.
//
// Układ i mechanika są te same co na liście „Wizyty i rezerwacje": PageHeader
// (MobilePageHeader na telefonie), karta z paskiem szukania i chipami, tabela
// z menu „⋮", zmiana i anulowanie w oknach ModalShell, wynik w toaście.
//
// Kampania to JEDEN wiersz („124 SMS-y czekają"), nie 124 wiersze klientów - tu się
// jej nie zmienia, wiersz prowadzi do widoku kampanii. Anulowany SMS nie znika:
// przechodzi do chipa „Anulowane", skąd można go wznowić.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { MessageSquareText } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader, MobilePageHeader, MobilePageHeaderCountValue } from '@/common/components/PageHeader';
import { useBreakpoint } from '@/common/hooks';
import { pluralPl } from '@/common/utils/plural';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    useCancelScheduledSms,
    useResumeScheduledSms,
    useScheduledSms,
    useUpdateScheduledSms,
} from '../hooks/useScheduledSms';
import { ScheduledSmsFilterBar } from '../components/ScheduledSmsFilterBar';
import { ScheduledSmsTable } from '../components/ScheduledSmsTable';
import { EditScheduledSmsModal } from '../components/EditScheduledSmsModal';
import { CancelScheduledSmsModal } from '../components/CancelScheduledSmsModal';
import type { ScheduledSmsItem, ScheduledSmsState } from '../types';
import { apiErrorMessage, kindOf, matchesSearch, recipientLabel, type KindFilter } from '../utils/scheduledSmsFormat';

// ─── Styled components ────────────────────────────────────────────────────────

const ViewContainer = styled.div`
    min-height: 100vh;
    background: ${p => p.theme.colors.background};
`;

const PageBody = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const TotalChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1px;
`;

const ContentCard = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const ErrorBox = styled.div`
    padding: 40px 24px;
    text-align: center;
    font-size: 14px;
    color: #dc2626;
`;

const RetryButton = styled.button`
    margin-top: 12px;
    padding: 8px 18px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlue};
        color: #fff;
    }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const pendingLabel = (n: number) => `${n} ${pluralPl(n, 'SMS czeka', 'SMS-y czekają', 'SMS-ów czeka')} na wysyłkę`;

export const ScheduledSmsView = () => {
    const { showSuccess, showError } = useToast();
    const isDesktop = useBreakpoint('md');
    const { data, isLoading, isError, refetch } = useScheduledSms();
    const update = useUpdateScheduledSms();
    const cancel = useCancelScheduledSms();
    const resume = useResumeScheduledSms();

    const [search, setSearch] = useState('');
    const [state, setState] = useState<ScheduledSmsState>('PENDING');
    const [kind, setKind] = useState<KindFilter | null>(null);
    const [editing, setEditing] = useState<ScheduledSmsItem | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<ScheduledSmsItem | null>(null);

    const items = useMemo(() => data?.items ?? [], [data]);
    const counts = useMemo(() => ({
        PENDING: items.filter(i => i.state === 'PENDING').length,
        CANCELLED: items.filter(i => i.state === 'CANCELLED').length,
    }), [items]);
    const visible = useMemo(
        () => items.filter(i => i.state === state && (!kind || kindOf(i) === kind) && matchesSearch(i, search)),
        [items, state, kind, search],
    );
    const sendWindow = data ? { opensAt: data.sendWindowOpensAt, closesAt: data.sendWindowClosesAt } : null;
    const filtered = !!kind || !!search.trim();

    const openEdit = (item: ScheduledSmsItem) => {
        setEditError(null);
        setEditing(item);
    };

    const confirmEdit = (payload: { messageContent: string; scheduledFor: string }) => {
        if (!editing) return;
        setEditError(null);
        update.mutate({ item: editing, payload }, {
            onSuccess: () => {
                setEditing(null);
                showSuccess('Zapisano zmiany w SMS-ie');
            },
            // Błąd zostaje w oknie, przy formularzu - użytkownik ma go poprawić, a nie złapać w toaście.
            onError: err => setEditError(apiErrorMessage(err, 'Nie udało się zapisać zmian. Spróbuj ponownie za chwilę.')),
        });
    };

    const confirmCancel = () => {
        if (!cancelling) return;
        const item = cancelling;
        cancel.mutate(item, {
            onSuccess: () => {
                setCancelling(null);
                showSuccess('Anulowano wysyłkę SMS-a', `SMS do: ${recipientLabel(item)} jest teraz w zakładce „Anulowane".`);
            },
            onError: err => showError('Nie udało się anulować wysyłki', apiErrorMessage(err, 'Spróbuj ponownie za chwilę.')),
        });
    };

    const handleResume = (item: ScheduledSmsItem) => {
        resume.mutate(item, {
            onSuccess: () => showSuccess('Wznowiono wysyłkę SMS-a', `SMS do: ${recipientLabel(item)} znów czeka na wysyłkę.`),
            onError: err => showError('Nie udało się wznowić wysyłki', apiErrorMessage(err, 'Spróbuj ponownie za chwilę.')),
        });
    };

    const emptyTitle = filtered ? 'Brak wyników' : state === 'PENDING' ? 'Nic nie czeka na wysyłkę' : 'Brak anulowanych SMS-ów';
    const emptyDescription = filtered
        ? 'Nic nie pasuje. Zmień wyszukiwanie lub filtry.'
        : state === 'PENDING'
            ? 'Przypomnienia, potwierdzenia i kampanie pojawią się tutaj, gdy będą zaplanowane.'
            : 'Anulowany SMS zostaje tu przez tydzień od swojego terminu i można go wznowić.';

    return (
        <ViewContainer>
            <PageBody>
                {isDesktop ? (
                    <PageHeader
                        title="Zaplanowane SMS-y"
                        subtitle={
                            <>
                                {sendWindow
                                    ? `Do klientów wysyłamy między ${sendWindow.opensAt} a ${sendWindow.closesAt}`
                                    : 'Komu, co i kiedy wyślemy'}
                                {data && <TotalChip>{pendingLabel(counts.PENDING)}</TotalChip>}
                            </>
                        }
                    />
                ) : (
                    <MobilePageHeader
                        icon={<MessageSquareText />}
                        title="Zaplanowane SMS-y"
                        subtitle={data
                            ? <><MobilePageHeaderCountValue>{counts.PENDING}</MobilePageHeaderCountValue> {pluralPl(counts.PENDING, 'czeka', 'czekają', 'czeka')} na wysyłkę</>
                            : 'Wczytywanie…'}
                    />
                )}

                <ContentCard>
                    <ScheduledSmsFilterBar
                        search={search}
                        onSearchChange={setSearch}
                        state={state}
                        onStateChange={setState}
                        counts={counts}
                        kind={kind}
                        onKindChange={setKind}
                    />

                    {isError ? (
                        <ErrorBox role="alert">
                            <div>Nie udało się wczytać zaplanowanych SMS-ów.</div>
                            <RetryButton type="button" onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
                        </ErrorBox>
                    ) : (
                        <ScheduledSmsTable
                            items={visible}
                            isLoading={isLoading}
                            emptyTitle={emptyTitle}
                            emptyDescription={emptyDescription}
                            onEdit={openEdit}
                            onCancel={setCancelling}
                            onResume={handleResume}
                        />
                    )}
                </ContentCard>

                {sendWindow && (
                    <EditScheduledSmsModal
                        item={editing}
                        sendWindow={sendWindow}
                        isSaving={update.isPending}
                        error={editError}
                        onConfirm={confirmEdit}
                        onClose={() => setEditing(null)}
                    />
                )}

                <CancelScheduledSmsModal
                    item={cancelling}
                    isCancelling={cancel.isPending}
                    onConfirm={confirmCancel}
                    onClose={() => setCancelling(null)}
                />
            </PageBody>
        </ViewContainer>
    );
};
