// src/modules/scheduled-sms/views/ScheduledSmsView.tsx
//
// „Zaplanowane SMS-y" (/scheduled-sms): komu, co i kiedy wyjdzie. W jednej liście
// wszystko, co studio ma jeszcze wysłać - przypomnienia o rezerwacjach, potwierdzenia
// czekające na godziny wysyłki, podziękowania, SMS-y automatów i kampanie.
//
// Kampania to JEDEN wiersz („Kampania XXX, 120 SMS-ów czeka"), nie 120 wierszy klientów:
// tutaj się jej nie zmienia, wiersz prowadzi do widoku kampanii.
//
// Anulowany SMS nie znika - dostaje status i przycisk „Wznów". Hierarchia (CLAUDE.md §2):
// w oknie nie ma wypełnionego przycisku, bo lista nie ma jednego kroku następnego;
// akcje wierszy mają obwódkę albo odcień. Jedynym wyniesieniem jest liczba na górze.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { MessageSquareText } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { EmptyState } from '@/common/components/EmptyState';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, Segmented, StatusPill, buttonStyles, ui } from '@/common/components/ui';
import type { ButtonStyleProps } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import {
    useCancelScheduledSms,
    useResumeScheduledSms,
    useScheduledSms,
    useUpdateScheduledSms,
} from '../hooks/useScheduledSms';
import { ScheduledSmsEditDrawer } from '../components/ScheduledSmsEditDrawer';
import type { ScheduledSmsItem, ScheduledSmsState } from '../types';
import {
    apiErrorMessage,
    campaignCountLabel,
    dayLabel,
    formatTime,
    formatWhen,
    groupByDay,
    matchesKind,
    recipientLabel,
    type KindFilter,
} from '../utils/scheduledSmsFormat';

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'reminders', label: 'Przypomnienia' },
    { value: 'transactional', label: 'Pozostałe' },
    { value: 'campaigns', label: 'Kampanie' },
];

const itemKey = (item: ScheduledSmsItem) => `${item.source}:${item.id}`;

export function ScheduledSmsView() {
    const { showSuccess, showError } = useToast();
    const { data, isLoading, isError, refetch } = useScheduledSms();
    const update = useUpdateScheduledSms();
    const cancel = useCancelScheduledSms();
    const resume = useResumeScheduledSms();

    const [state, setState] = useState<ScheduledSmsState>('PENDING');
    const [kind, setKind] = useState<KindFilter>('all');
    const [editing, setEditing] = useState<ScheduledSmsItem | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<ScheduledSmsItem | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const items = useMemo(() => data?.items ?? [], [data]);
    const pending = items.filter(i => i.state === 'PENDING');
    const cancelled = items.filter(i => i.state === 'CANCELLED');
    const visible = (state === 'PENDING' ? pending : cancelled).filter(i => matchesKind(i, kind));
    const groups = groupByDay(visible);
    const next = pending.find(i => i.scheduledFor && !i.campaign) ?? pending[0];
    const sendWindow = data ? { opensAt: data.sendWindowOpensAt, closesAt: data.sendWindowClosesAt } : null;

    const handleSave = (item: ScheduledSmsItem, payload: { messageContent: string; scheduledFor: string }) => {
        setEditError(null);
        update.mutate({ item, payload }, {
            onSuccess: () => {
                setEditing(null);
                showSuccess('SMS zmieniony', 'Wyjdzie w nowym terminie z nową treścią.');
            },
            onError: err => setEditError(apiErrorMessage(err, 'Spróbuj ponownie za chwilę.')),
        });
    };

    const handleCancel = (item: ScheduledSmsItem) => {
        setCancelling(null);
        setBusyKey(itemKey(item));
        cancel.mutate(item, {
            onSuccess: () => showSuccess('Wysyłka anulowana', `SMS do: ${recipientLabel(item)} nie wyjdzie. Znajdziesz go w zakładce „Anulowane".`),
            onError: err => showError('Nie udało się anulować wysyłki', apiErrorMessage(err, 'Spróbuj ponownie za chwilę.')),
            onSettled: () => setBusyKey(null),
        });
    };

    const handleResume = (item: ScheduledSmsItem) => {
        setBusyKey(itemKey(item));
        resume.mutate(item, {
            onSuccess: () => showSuccess('Wysyłka wznowiona', `SMS do: ${recipientLabel(item)} znów czeka na wysyłkę.`),
            onError: err => showError('Nie udało się wznowić wysyłki', apiErrorMessage(err, 'Spróbuj ponownie za chwilę.')),
            onSettled: () => setBusyKey(null),
        });
    };

    return (
        <Page>
            <Header>
                <Title>Zaplanowane SMS-y</Title>
                <Lead>Komu, co i kiedy wyślemy. Tu zmienisz treść albo termin i wstrzymasz wysyłkę.</Lead>
            </Header>

            {isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać zaplanowanych SMS-ów"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                >
                    Lista jest chwilowo niedostępna.
                </Notice>
            ) : (
                <Hero aria-busy={isLoading || undefined}>
                    <HeroNumber>{isLoading ? '–' : pending.length}</HeroNumber>
                    <HeroCaption>
                        {pluralPl(pending.length, 'SMS czeka', 'SMS-y czekają', 'SMS-ów czeka')} na wysyłkę
                    </HeroCaption>
                    {next?.scheduledFor && (
                        <HeroNext>
                            Najbliższy: {dayLabel(next.scheduledFor).toLowerCase()}, {formatTime(next.scheduledFor)},
                            {' '}{recipientLabel(next)}
                        </HeroNext>
                    )}
                    {sendWindow && (
                        <HeroWindow>SMS-y do klientów wychodzą między {sendWindow.opensAt} a {sendWindow.closesAt}.</HeroWindow>
                    )}
                </Hero>
            )}

            <Toolbar>
                <Segmented<ScheduledSmsState>
                    label="Stan wysyłki"
                    value={state}
                    onChange={setState}
                    options={[
                        { value: 'PENDING', label: 'Czekają', count: pending.length },
                        { value: 'CANCELLED', label: 'Anulowane', count: cancelled.length },
                    ]}
                />
                <KindSegmented label="Rodzaj wiadomości" size="sm" value={kind} onChange={setKind} options={KIND_OPTIONS} />
            </Toolbar>

            {isLoading ? (
                <Hint>Wczytywanie…</Hint>
            ) : !isError && visible.length === 0 ? (
                <EmptyState
                    icon={<MessageSquareText />}
                    title={state === 'PENDING' ? 'Nic nie czeka na wysyłkę' : 'Brak anulowanych SMS-ów'}
                    description={state === 'PENDING'
                        ? 'Przypomnienia, potwierdzenia i kampanie pojawią się tutaj, gdy będą zaplanowane.'
                        : 'Anulowany SMS zostaje tu przez tydzień od swojego terminu i można go wznowić.'}
                />
            ) : (
                groups.map(group => (
                    <Day key={group.key} aria-labelledby={`day-${group.key}`}>
                        <DayHeading id={`day-${group.key}`}>{group.label}</DayHeading>
                        <List>
                            {group.items.map(item => (
                                <ScheduledSmsRow
                                    key={itemKey(item)}
                                    item={item}
                                    busy={busyKey === itemKey(item)}
                                    onEdit={() => { setEditError(null); setEditing(item); }}
                                    onCancel={() => setCancelling(item)}
                                    onResume={() => handleResume(item)}
                                />
                            ))}
                        </List>
                    </Day>
                ))
            )}

            {editing && sendWindow && (
                <ScheduledSmsEditDrawer
                    item={editing}
                    sendWindow={sendWindow}
                    saving={update.isPending}
                    error={editError}
                    onSave={payload => handleSave(editing, payload)}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmationModal
                isOpen={!!cancelling}
                title="Anulować wysyłkę?"
                message={cancelling
                    ? `SMS do: ${recipientLabel(cancelling)}${cancelling.scheduledFor ? `, zaplanowany na ${formatWhen(cancelling.scheduledFor)},` : ''} nie wyjdzie. Zostanie na liście jako anulowany i w każdej chwili możesz go wznowić.`
                    : ''}
                variant="warning"
                confirmText="Anuluj wysyłkę"
                cancelText="Zostaw"
                onConfirm={() => { if (cancelling) handleCancel(cancelling); }}
                onCancel={() => setCancelling(null)}
            />
        </Page>
    );
}

// ─── Wiersz ─────────────────────────────────────────────────────────────────────

interface RowProps {
    item: ScheduledSmsItem;
    busy: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onResume: () => void;
}

function ScheduledSmsRow({ item, busy, onEdit, onCancel, onResume }: RowProps) {
    const cancelledRow = item.state === 'CANCELLED';
    return (
        <Row data-testid="scheduled-sms-row" $muted={cancelledRow}>
            <When>
                {item.scheduledFor ? <strong>{formatTime(item.scheduledFor)}</strong> : <small>wkrótce</small>}
            </When>
            <Body>
                <RowHead>
                    <Who>
                        {item.campaign
                            ? `Kampania ${item.campaign.name}`
                            : item.customerId
                                ? <Link to={`/customers/${item.customerId}`}>{recipientLabel(item)}</Link>
                                : recipientLabel(item)}
                    </Who>
                    {cancelledRow && <StatusPill $tone="neutral">Anulowany</StatusPill>}
                </RowHead>
                <Facts>
                    <Kind>{item.kindLabel}</Kind>
                    {item.phoneNumber && item.customerName && <span>{item.phoneNumber}</span>}
                    {item.campaign && <span>{campaignCountLabel(item.campaign.pendingCount)}</span>}
                    {item.appointmentStart && <span>Wizyta {formatWhen(item.appointmentStart)}</span>}
                    {item.visitId
                        ? <Link to={`/visits/${item.visitId}`}>Otwórz wizytę</Link>
                        : item.appointmentId && <Link to={`/calendar/rezerwacja/${item.appointmentId}`}>Otwórz rezerwację</Link>}
                </Facts>
                {item.messageContent && <Message>{item.messageContent}</Message>}
                <Reason>
                    {cancelledRow && item.cancelledAt
                        ? `Anulowano ${formatWhen(item.cancelledAt)}. Nie wyjdzie, dopóki go nie wznowisz.`
                        : item.waitingReason}
                </Reason>
            </Body>
            <Actions>
                {item.editable && <Button variant="outline" size="sm" disabled={busy} onClick={onEdit}>Zmień</Button>}
                {item.cancellable && <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>Anuluj wysyłkę</Button>}
                {item.resumable && (
                    <Button variant="tinted" size="sm" disabled={busy} onClick={onResume}>
                        {busy ? 'Wznawianie…' : 'Wznów wysyłkę'}
                    </Button>
                )}
                {item.campaign && (
                    <LinkButton to={`/campaigns/${item.campaign.id}`} $variant="outline" $size="sm">Otwórz kampanię</LinkButton>
                )}
            </Actions>
        </Row>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Page = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 960px;
    padding-block: 24px 120px;

    @media (max-width: 767px) { padding-block: 16px 140px; }
`;

const Header = styled.header`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

const Lead = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.textSecondary};
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

const HeroNext = styled.span`
    margin-top: 8px;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.brandInk};
`;

const HeroWindow = styled.span`
    font-size: 13px;
    color: ${ui.textMuted};
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;

    & > * { max-width: 100%; overflow-x: auto; }
`;

/* Na telefonie cztery rodzaje na pełną szerokość, bez przewijania w bok. */
const KindSegmented = styled(Segmented<KindFilter>)`
    @media (max-width: 639px) {
        display: flex;
        width: 100%;
        button { flex: 1 1 auto; padding: 0 6px; }
    }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const Day = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DayHeading = styled.h2`
    margin: 8px 0 0;
    font-size: 16px;
    font-weight: 700;
    color: ${ui.ink};

    &::first-letter { text-transform: uppercase; }
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Row = styled.li<{ $muted: boolean }>`
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    padding: 14px 16px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${p => p.$muted ? ui.surfaceSoft : ui.surface};

    @media (max-width: 639px) {
        grid-template-columns: 52px minmax(0, 1fr);
        & > :last-child { grid-column: 1 / -1; }
    }
`;

const When = styled.div`
    small {
        font-size: 13px;
        font-weight: 700;
        color: ${ui.brandInk};
    }

    strong {
        font-size: 17px;
        font-weight: 700;
        color: ${ui.ink};
        font-variant-numeric: tabular-nums;
    }
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const RowHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const Who = styled.span`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
    overflow-wrap: anywhere;

    a { color: inherit; text-decoration: none; }
    a:hover { color: ${ui.brandInk}; text-decoration: underline; }
`;

/* Atrybuty wiersza jako osobne elementy z odstępem, nie sklejone kropką (CLAUDE.md §4). */
const Facts = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: 13px;
    color: ${ui.textSecondary};

    a { color: ${ui.brandInk}; font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }
`;

const Kind = styled.span`
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const Message = styled.p`
    margin: 0;
    padding: 8px 10px;
    border-radius: ${ui.radiusRow};
    background: ${ui.surfaceAlt};
    font-size: 13.5px;
    line-height: 1.45;
    color: ${ui.inkSoft};
    white-space: pre-line;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const Reason = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

/* Kampanią rządzi jej własny widok - wiersz tylko do niego prowadzi. */
const LinkButton = styled(Link)<ButtonStyleProps>`
    ${buttonStyles}
    text-decoration: none;
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;

    @media (max-width: 639px) {
        flex-direction: row;
        flex-wrap: wrap;
    }

    &:empty { display: none; }
`;
