// src/modules/scheduled-communication/views/ScheduledCommunicationView.tsx
//
// „Zaplanowana komunikacja" (/scheduled-communication): komu, co i kiedy wyślemy -
// osobno SMS-y i e-maile. Dawny widok „Zaplanowane SMS-y" (/scheduled-sms) to jego
// zakładka „SMS-y"; stary adres przekierowuje tutaj.
//
// Dwa poziomy wyboru, bo to dwa różne pytania:
//   - TabBar pod nagłówkiem wybiera KANAŁ. SMS-y i e-maile mają inne źródła (e-maile nie
//     mają automatów ani przypomnień), inną edycję (temat, załączniki) i inne liczniki.
//     Kanał jest w adresie (?channel=email), żeby link z innego miejsca otwierał właściwą listę.
//   - Segmented w karcie wybiera STAN listy: „Zaplanowane", „Anulowane", „Wysłane".
//     Zostaje przy zmianie kanału - kto oglądał wysłane SMS-y, chce zobaczyć wysłane e-maile.
//
// Kampania to JEDEN wiersz („124 SMS-y czekają"), nie 124 wiersze klientów - tu się
// jej nie zmienia, wiersz prowadzi do widoku kampanii. Anulowana wiadomość nie znika:
// przechodzi do „Anulowanych", skąd można ją wznowić.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { CalendarClock } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader, MobilePageHeader, MobilePageHeaderCountValue, PageHeaderCount } from '@/common/components/PageHeader';
import { TabBar, type TabDefinition } from '@/common/components/TabBar/TabBar';
import { Segmented } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { pluralPl } from '@/common/utils/plural';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    useCancelScheduledSms,
    useResumeScheduledSms,
    useScheduledSms,
    useSentSms,
    useUpdateScheduledSms,
} from '../hooks/useScheduledSms';
import {
    useCancelScheduledEmail,
    useResumeScheduledEmail,
    useScheduledEmail,
    useSentEmail,
    useUpdateScheduledEmail,
} from '../hooks/useScheduledEmail';
import { ScheduledSearchBar } from '../components/ScheduledSearchBar';
import { ScheduledQueueTable } from '../components/ScheduledQueueTable';
import { SentMessagesTable } from '../components/SentMessagesTable';
import { EditScheduledSmsModal } from '../components/EditScheduledSmsModal';
import { EditScheduledEmailModal } from '../components/EditScheduledEmailModal';
import { CancelScheduledModal } from '../components/CancelScheduledModal';
import type { MessageChannel, ScheduledEmailItem, ScheduledItem, ScheduledSmsItem, SentItem } from '../types';
import { matchesSearch, recipientLabel } from '../utils/scheduledFormat';
import { problemDetail } from '@/core/problem';

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

/** Na telefonie przełącznik stanu zajmuje cały wiersz paska; na komputerze stoi obok szukania. */
const StateSwitch = styled.div<{ $block: boolean }>`
    flex: ${p => (p.$block ? '1 1 100%' : 'none')};
    min-width: 0;
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

// ─── Słownik kanałów ──────────────────────────────────────────────────────────

type ListState = 'PENDING' | 'CANCELLED' | 'SENT';

interface ChannelCopy {
    /** „SMS-a" / „e-maila" - w toastach. */
    gen: string;
    searchPlaceholder: string;
    pending: (n: number) => string;
    empty: Record<ListState, [string, string]>;
    loadError: Record<'queue' | 'sent', string>;
}

const COPY: Record<MessageChannel, ChannelCopy> = {
    SMS: {
        gen: 'SMS-a',
        searchPlaceholder: 'Szukaj klienta, numeru, treści lub kampanii…',
        pending: n => `${n} ${pluralPl(n, 'SMS czeka', 'SMS-y czekają', 'SMS-ów czeka')} na wysyłkę`,
        empty: {
            PENDING: ['Nic nie czeka na wysyłkę', 'Przypomnienia, potwierdzenia i kampanie pojawią się tutaj, gdy będą zaplanowane.'],
            CANCELLED: ['Brak anulowanych SMS-ów', 'Anulowany SMS zostaje tu przez tydzień od swojego terminu i można go wznowić.'],
            SENT: ['Nie wysłano jeszcze żadnego SMS-a', 'Wysłane SMS-y pojawią się tutaj razem z wynikiem wysyłki.'],
        },
        loadError: { queue: 'Nie udało się wczytać zaplanowanych SMS-ów.', sent: 'Nie udało się wczytać wysłanych SMS-ów.' },
    },
    EMAIL: {
        gen: 'e-maila',
        searchPlaceholder: 'Szukaj klienta, adresu, tematu lub kampanii…',
        pending: n => `${n} ${pluralPl(n, 'e-mail czeka', 'e-maile czekają', 'e-maili czeka')} na wysyłkę`,
        empty: {
            PENDING: [
                'Nic nie czeka na wysyłkę',
                'E-mail wysłany poza godzinami wysyłki i kampanie e-mail pojawią się tutaj, zanim wyjdą.',
            ],
            CANCELLED: ['Brak anulowanych e-maili', 'Anulowany e-mail zostaje tu przez tydzień od swojego terminu i można go wznowić.'],
            SENT: ['Nie wysłano jeszcze żadnego e-maila', 'Wysłane e-maile pojawią się tutaj razem z wynikiem wysyłki.'],
        },
        loadError: { queue: 'Nie udało się wczytać zaplanowanych e-maili.', sent: 'Nie udało się wczytać wysłanych e-maili.' },
    },
};

const channelFrom = (param: string | null): MessageChannel => (param === 'email' ? 'EMAIL' : 'SMS');

const countByState = (items: { state: string }[] | undefined) => ({
    PENDING: items?.filter(i => i.state === 'PENDING').length ?? 0,
    CANCELLED: items?.filter(i => i.state === 'CANCELLED').length ?? 0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export const ScheduledCommunicationView = () => {
    const { showSuccess, showError } = useToast();
    const isDesktop = useBreakpoint('md');
    const [params, setParams] = useSearchParams();
    const channel = channelFrom(params.get('channel'));
    const copy = COPY[channel];

    const [search, setSearch] = useState('');
    const [state, setState] = useState<ListState>('PENDING');

    // Obie listy naraz: liczniki w zakładkach kanałów mają mówić prawdę bez przełączania.
    // Co minutę odświeża się tylko otwarty kanał - drugi bierze z listy sam licznik.
    const sms = useScheduledSms({ poll: channel === 'SMS' });
    const email = useScheduledEmail({ poll: channel === 'EMAIL' });
    const sentSms = useSentSms(channel === 'SMS' && state === 'SENT');
    const sentEmail = useSentEmail(channel === 'EMAIL' && state === 'SENT');
    const updateSms = useUpdateScheduledSms();
    const updateEmail = useUpdateScheduledEmail();
    const cancelSms = useCancelScheduledSms();
    const cancelEmail = useCancelScheduledEmail();
    const resumeSms = useResumeScheduledSms();
    const resumeEmail = useResumeScheduledEmail();

    const [editing, setEditing] = useState<ScheduledItem | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<ScheduledItem | null>(null);

    const queue = channel === 'SMS' ? sms : email;
    const sent = channel === 'SMS' ? sentSms : sentEmail;
    const smsCounts = useMemo(() => countByState(sms.data?.items), [sms.data]);
    const emailCounts = useMemo(() => countByState(email.data?.items), [email.data]);
    const counts = channel === 'SMS' ? smsCounts : emailCounts;

    const items = useMemo<ScheduledItem[]>(() => queue.data?.items ?? [], [queue.data]);
    const visible = useMemo(
        () => items.filter(i => i.state === state && matchesSearch(i, search)),
        [items, state, search],
    );
    const sentItems = useMemo(
        () => (sent.data?.pages ?? []).flatMap<SentItem>(p => p.items).filter(i => matchesSearch(i, search)),
        [sent.data, search],
    );
    const sendWindow = queue.data ? { opensAt: queue.data.sendWindowOpensAt, closesAt: queue.data.sendWindowClosesAt } : null;
    const searching = !!search.trim();

    const channelTabs: TabDefinition<MessageChannel>[] = [
        { key: 'SMS', label: 'SMS-y', count: sms.data ? smsCounts.PENDING : undefined },
        { key: 'EMAIL', label: 'E-maile', count: email.data ? emailCounts.PENDING : undefined },
    ];

    const changeChannel = (next: MessageChannel) => {
        setEditing(null);
        setCancelling(null);
        setParams(prev => {
            const p = new URLSearchParams(prev);
            if (next === 'EMAIL') p.set('channel', 'email');
            else p.delete('channel');
            return p;
        }, { replace: true });
    };

    const openEdit = (item: ScheduledItem) => {
        setEditError(null);
        setEditing(item);
    };

    const onEditSaved = () => {
        setEditing(null);
        showSuccess(`Zapisano zmiany w ${channel === 'SMS' ? 'SMS-ie' : 'e-mailu'}`);
    };
    // Błąd zostaje w oknie, przy formularzu - użytkownik ma go poprawić, a nie złapać w toaście.
    const onEditFailed = (err: unknown) =>
        setEditError(problemDetail(err, 'Nie udało się zapisać zmian. Spróbuj ponownie za chwilę.'));

    const confirmSmsEdit = (payload: { messageContent: string; scheduledFor: string }) => {
        if (!editing) return;
        setEditError(null);
        updateSms.mutate({ item: editing as ScheduledSmsItem, payload }, { onSuccess: onEditSaved, onError: onEditFailed });
    };

    const confirmEmailEdit = (payload: { subject: string; messageContent: string; scheduledFor: string }) => {
        if (!editing) return;
        setEditError(null);
        updateEmail.mutate({ item: editing as ScheduledEmailItem, payload }, { onSuccess: onEditSaved, onError: onEditFailed });
    };

    const confirmCancel = () => {
        if (!cancelling) return;
        const item = cancelling;
        const handlers = {
            onSuccess: () => {
                setCancelling(null);
                showSuccess(`Anulowano wysyłkę ${copy.gen}`, `Wiadomość do: ${recipientLabel(item)} jest teraz w „Anulowanych".`);
            },
            onError: (err: unknown) => showError('Nie udało się anulować wysyłki', problemDetail(err, 'Spróbuj ponownie za chwilę.')),
        };
        if (channel === 'SMS') cancelSms.mutate(item as ScheduledSmsItem, handlers);
        else cancelEmail.mutate(item as ScheduledEmailItem, handlers);
    };

    const handleResume = (item: ScheduledItem) => {
        const handlers = {
            onSuccess: () => showSuccess(`Wznowiono wysyłkę ${copy.gen}`, `Wiadomość do: ${recipientLabel(item)} znów czeka na wysyłkę.`),
            onError: (err: unknown) => showError('Nie udało się wznowić wysyłki', problemDetail(err, 'Spróbuj ponownie za chwilę.')),
        };
        if (channel === 'SMS') resumeSms.mutate(item as ScheduledSmsItem, handlers);
        else resumeEmail.mutate(item as ScheduledEmailItem, handlers);
    };

    const [emptyTitle, emptyDescription] = searching ? ['Brak wyników', 'Nic nie pasuje do wyszukiwania.'] : copy.empty[state];
    // Szukanie w „Wysłanych" obejmuje wczytane strony; kolejne dochodzą przyciskiem „Pokaż starsze".
    const listError = state === 'SENT' ? sent.isError : queue.isError;
    const isSaving = channel === 'SMS' ? updateSms.isPending : updateEmail.isPending;

    const stateSwitch = (
        <StateSwitch $block={!isDesktop}>
            <Segmented<ListState>
                label="Stan wiadomości"
                size="sm"
                // Na telefonie trzy opcje w naturalnej szerokości nie mieszczą się w 320 px:
                // przełącznik bierze cały wiersz, opcje dzielą go po równo, szukanie schodzi niżej.
                block={!isDesktop}
                value={state}
                onChange={setState}
                options={[
                    { value: 'PENDING', label: 'Zaplanowane', count: queue.data ? counts.PENDING : undefined },
                    { value: 'CANCELLED', label: 'Anulowane', count: queue.data ? counts.CANCELLED : undefined },
                    { value: 'SENT', label: 'Wysłane' },
                ]}
            />
        </StateSwitch>
    );

    return (
        <ViewContainer>
            <PageBody>
                {isDesktop ? (
                    <PageHeader
                        title="Zaplanowana komunikacja"
                        subtitle={
                            <>
                                {sendWindow
                                    ? `Do klientów wysyłamy między ${sendWindow.opensAt} a ${sendWindow.closesAt}`
                                    : 'Komu, co i kiedy wyślemy'}
                                {queue.data && <PageHeaderCount>{copy.pending(counts.PENDING)}</PageHeaderCount>}
                            </>
                        }
                    />
                ) : (
                    <MobilePageHeader
                        icon={<CalendarClock />}
                        title="Zaplanowana komunikacja"
                        subtitle={queue.data
                            ? <><MobilePageHeaderCountValue>{counts.PENDING}</MobilePageHeaderCountValue> {pluralPl(counts.PENDING, 'czeka', 'czekają', 'czeka')} na wysyłkę</>
                            : 'Wczytywanie…'}
                    />
                )}

                <TabBar tabs={channelTabs} activeKey={channel} onChange={changeChannel} ariaLabel="Kanał" />

                <ContentCard>
                    <ScheduledSearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder={copy.searchPlaceholder}
                        leading={stateSwitch}
                    />

                    {listError ? (
                        <ErrorBox role="alert">
                            <div>{state === 'SENT' ? copy.loadError.sent : copy.loadError.queue}</div>
                            <RetryButton type="button" onClick={() => (state === 'SENT' ? sent.refetch() : queue.refetch())}>
                                Spróbuj ponownie
                            </RetryButton>
                        </ErrorBox>
                    ) : state === 'SENT' ? (
                        <SentMessagesTable
                            channel={channel}
                            items={sentItems}
                            isLoading={sent.isLoading}
                            emptyTitle={emptyTitle}
                            emptyDescription={emptyDescription}
                            hasMore={!!sent.hasNextPage}
                            isLoadingMore={sent.isFetchingNextPage}
                            onLoadMore={() => sent.fetchNextPage()}
                        />
                    ) : (
                        <ScheduledQueueTable
                            channel={channel}
                            items={visible}
                            isLoading={queue.isLoading}
                            emptyTitle={emptyTitle}
                            emptyDescription={emptyDescription}
                            onEdit={openEdit}
                            onCancel={setCancelling}
                            onResume={handleResume}
                        />
                    )}
                </ContentCard>

                {sendWindow && channel === 'SMS' && (
                    <EditScheduledSmsModal
                        item={editing as ScheduledSmsItem | null}
                        sendWindow={sendWindow}
                        isSaving={isSaving}
                        error={editError}
                        onConfirm={confirmSmsEdit}
                        onClose={() => setEditing(null)}
                    />
                )}
                {sendWindow && channel === 'EMAIL' && (
                    <EditScheduledEmailModal
                        item={editing as ScheduledEmailItem | null}
                        sendWindow={sendWindow}
                        isSaving={isSaving}
                        error={editError}
                        onConfirm={confirmEmailEdit}
                        onClose={() => setEditing(null)}
                    />
                )}

                <CancelScheduledModal
                    channel={channel}
                    item={cancelling}
                    isCancelling={channel === 'SMS' ? cancelSms.isPending : cancelEmail.isPending}
                    onConfirm={confirmCancel}
                    onClose={() => setCancelling(null)}
                />
            </PageBody>
        </ViewContainer>
    );
};
