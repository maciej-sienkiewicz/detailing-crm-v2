// src/modules/campaigns/components/CampaignDetailModal.tsx
// Okno kampanii - jedno na całą aplikację, otwierane z listy kampanii.
//
// Wcześniej był to osobny adres i osobna strona. Kliknięcie wiersza wyrzucało
// z listy, powrót kosztował drugie wczytanie tabeli, a filtr, który ktoś sobie
// ustawił, przepadał. Kampanię przegląda się tak samo jak leada - rzut oka,
// decyzja, zamknięcie - więc i okno jest to samo co przy leadzie: szeroki modal,
// nie wysuwany panel, bo lista odbiorców jest tabelą i w wąskiej szufladzie
// ucina adresy do jednej litery.
//
// Hierarchia okna wynika z trzech pytań, które ktoś zadaje sobie, otwierając
// kampanię: do ilu ludzi to poszło (albo pójdzie), ile to kosztuje i czy coś tu
// do mnie należy. Dlatego u góry stoi pasek podsumowania z liczbą odbiorców jako
// największym elementem widoku, a treść wiadomości - to, co klient naprawdę
// zobaczy - zajmuje szerszą, roboczą kolumnę pod nim.
//
// Kolor niesie znaczenie i nic poza tym: etap kampanii, pilność, akcja główna.
// Liczba odbiorców jest dominantą przez rozmiar, nie przez barwę - liczba
// pomalowana na kolor wygląda jak ostrzeżenie, a nie jak fakt.
//
// Akcja główna jest jedna i wynika ze stanu kampanii, a nie z tego, gdzie akurat
// stoi przycisk. Szkic woła „dokończ", zaplanowana - „wyślij teraz", działająca
// - „wstrzymaj", zakończona z błędami - „ponów nieudane". Poprzedni nagłówek
// niósł do pięciu równych przycisków naraz; pięć równoważnych podpowiedzi to
// zero podpowiedzi (prawo Hicka), a przy tym „Usuń" sąsiadowało pod kursorem
// z „Dokończ".
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    AlertTriangle, CalendarClock, CheckCircle2, Coins, Copy, Mail, MessageSquare,
    Pause, Pencil, Play, RefreshCw, Send, SkipForward, Square, Trash2, Users,
} from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    CloseBtn,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalShell,
    ModalTitle,
    ModalTitleGroup,
} from '@/common/components/ModalKit';
import {
    useActivateCampaign, useArchiveCampaign, useAudienceEstimate, useCampaign,
    useCampaignRecipients, useCampaignStats, useCancelCampaign, useDeleteCampaign,
    useDuplicateCampaign, usePauseCampaign, useRetryAllFailed, useRetryRecipient,
    useScheduleCampaign, useStopCampaign,
} from '../hooks/useCampaigns';
import { emptyAudience } from '../types';
import type { AudienceCriteria, Campaign, RecipientChannel } from '../types';
import { CHANNEL_LABELS, RECIPIENT_STATUS_LABELS, STATUS_COLORS } from '../constants';
import { audienceChips, useServiceCatalog } from './AudienceBuilder';
import { ContentPreview } from './ContentPreview';
import {
    CLOSED_STATUSES, describeCampaign, describeMoment, messageWord, recipientsFigure,
    type CampaignTone,
} from '../utils/campaignState';
import {
    CampaignKindMark, CampaignStatusLine, Chip, ChipRow, DangerButton, IconButton,
    MutedText, Note, Panel, PrimaryButton, QuietLink, TextField, Timeline, TimelineItem,
} from './shared';
// Daty w tym samym formacie, co w oknie leada - jedna implementacja na aplikację.
import { formatDateTime } from '@/modules/comms/components/shared';

/**
 * Dwie kolumny o różnej roli, nie dwie równe połówki. Po lewej to, czym kampania
 * jest (treść wiadomości, lista odbiorców) - szersza, bo to tabele i podglądy.
 * Po prawej to, co się o niej wie (kryteria, warunek, przebieg) - węższa
 * i wizualnie cichsza.
 */
const BodyGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

const CampaignHeader = styled(ModalHeader)`
    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-wrap: wrap;
    }
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const ModalBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Podtytuł okna: czym ta kampania jest i kiedy powstała. */
const CampaignIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

/** Etap w nagłówku - jedyne miejsce widoczne niezależnie od przewinięcia. */
const HeaderStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        order: 3;
        width: 100%;
        justify-content: flex-start;
    }
`;

/**
 * Pasek podsumowania - jedyny element, który ma się rzucić w oczy pierwszy.
 *
 * Cztery fakty, po które ludzie tu przychodzą, w kolejności ważności od lewej:
 * do ilu ludzi to idzie, ile kosztuje, czy coś się z tym dzieje i którym kanałem.
 * Kolorowy pasek przy krawędzi to ten sam język, którym pilność oznaczona jest
 * w tabeli kampanii i w tabeli leadów.
 */
const Summary = styled.section<{ $tone: CampaignTone }>`
    position: relative;
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};
    padding: 16px 18px 16px 21px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-direction: column;
        padding: 10px 14px 10px 17px;
    }

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: ${({ $tone, theme }) =>
            $tone === 'due' ? theme.colors.error
            : $tone === 'stale' ? theme.colors.warning
            : theme.colors.primary};
    }
`;

const SummaryCell = styled.div<{ $order?: number; $hideOnPhone?: boolean }>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    padding: 2px 20px;
    border-left: 1px solid ${p => p.theme.colors.border};

    &:first-child {
        padding-left: 0;
        border-left: none;
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        display: ${p => (p.$hideOnPhone ? 'none' : 'flex')};
        order: ${p => p.$order ?? 0};
        padding: 5px 0;
        border-left: none;
    }
`;

const CellLabel = styled.span`
    font-size: 10.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
`;

/**
 * Liczba odbiorców - największy element okna. To jedyna liczba, dla której ktoś
 * otwiera kampanię w biegu, więc ma być czytelna z odległości, z której reszta
 * jest jeszcze nieczytelna. Cyfry o stałej szerokości, żeby kolejne kampanie
 * dawały się porównać wzrokiem bez czytania.
 */
const CellBig = styled.span<{ $empty?: boolean }>`
    font-size: 27px;
    line-height: 1.1;
    font-weight: ${p => p.theme.fontWeights.bold};
    letter-spacing: -0.02em;
    color: ${({ $empty, theme }) => ($empty ? theme.colors.textMuted : theme.colors.text)};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const CellValue = styled.span<{ $empty?: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${({ $empty, theme }) => ($empty ? theme.colors.textMuted : theme.colors.text)};
    min-width: 0;

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
    span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const CellNote = styled.span`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

/** „Co dalej" w pasku podsumowania: kropka i zdanie, kolor tylko przy kłopocie. */
const ToneValue = styled(CellValue)<{ $tone: CampaignTone }>`
    color: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.text};
    font-weight: ${({ $tone, theme }) =>
        $tone === 'neutral' ? theme.fontWeights.medium : theme.fontWeights.semibold};
`;

const Dot = styled.span<{ $tone: CampaignTone }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.textMuted};
`;

/**
 * Tabela odbiorców. Ten sam krój co tabela wyceny w oknie leada: nagłówki
 * wersalikami, cyfry o stałej szerokości, kreski tylko między wierszami.
 */
const RecipientsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
        text-align: left;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
        padding: 0 8px 6px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
    }

    td {
        padding: 8px;
        border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.textSecondary};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }

    td.address {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
        overflow-wrap: anywhere;
    }
    td.channel { width: 24px; color: ${p => p.theme.colors.textMuted}; }
    td.channel svg { width: 14px; height: 14px; display: block; }
    td.when { white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.retry { width: 32px; text-align: right; }
`;

/** Lista odbiorców bywa długa - przewija się w miejscu, nie rozpycha okna. */
const TableScroll = styled.div`
    max-height: 320px;
    overflow-y: auto;
    margin: 0 -4px;
    padding: 0 4px;
`;

const RetryButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: ${p => p.theme.radii.sm};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    padding: 0;
    transition: all ${p => p.theme.transitions.fast};

    svg { width: 13px; height: 13px; }
    &:hover {
        border-color: ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.text};
        background: ${p => p.theme.colors.surface};
    }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ConditionText = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: ${p => p.theme.colors.textSecondary};

    strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
`;

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

const NON_RETRYABLE = new Set(['SENT', 'PENDING', 'EXCLUDED_MANUALLY', 'SKIPPED_OPTED_OUT']);
const BULK_RETRYABLE = new Set(['FAILED', 'STOPPED', 'SKIPPED_NO_CREDITS', 'SKIPPED_FREQUENCY_CAP']);

const ELIGIBILITY_LABELS: Record<string, string> = {
    ELIGIBLE: 'Otrzyma',
    NO_CONSENT: 'Brak zgody marketingowej',
    NO_ADDRESS: 'Brak numeru / adresu',
    OPTED_OUT: 'Wypisany (STOP)',
    FREQUENCY_CAP: 'Niedawno kontaktowany',
};

type PendingAction = 'stop' | 'cancel' | 'delete' | 'send' | null;

export interface CampaignDetailModalProps {
    campaignId: string;
    onClose: () => void;
    /** Wywoływane po usunięciu kampanii - okno jest wtedy już zamknięte. */
    onDeleted?: () => void;
}

export function CampaignDetailModal({ campaignId, onClose, onDeleted }: CampaignDetailModalProps) {
    const navigate = useNavigate();
    const { campaign } = useCampaign(campaignId);
    const { recipients } = useCampaignRecipients(campaignId);
    const { stats } = useCampaignStats();
    const { serviceNames } = useServiceCatalog();

    const cancel = useCancelCampaign();
    const stop = useStopCampaign();
    const pause = usePauseCampaign();
    const activate = useActivateCampaign();
    const archive = useArchiveCampaign();
    const duplicate = useDuplicateCampaign();
    const remove = useDeleteCampaign();
    const schedule = useScheduleCampaign();
    const retryRecipient = useRetryRecipient(campaignId);
    const retryAllFailed = useRetryAllFailed(campaignId);

    const [search, setSearch] = useState('');
    const [pending, setPending] = useState<PendingAction>(null);

    /*
     * Prognoza odbiorców tylko dla kampanii, która jeszcze nie ruszyła. Hook
     * wołany jest bezwarunkowo (reguły hooków), więc przed przyjściem kampanii
     * dostaje puste kryteria - zapytanie i tak nikomu wtedy nie służy.
     */
    const projectionAudience: AudienceCriteria = campaign?.audience ?? emptyAudience();
    const projectionChannel: RecipientChannel = campaign?.channel === 'EMAIL' ? 'EMAIL' : 'SMS';
    const { estimate } = useAudienceEstimate({
        audience: projectionAudience,
        channel: projectionChannel,
        smsTemplate: campaign?.smsTemplate ?? undefined,
        // Kampania automatyczna: pierwszym sitem jest warunek, nie kryteria odbiorców.
        trigger: campaign?.kind === 'AUTOMATIC' && campaign.trigger
            ? {
                serviceIds: campaign.trigger.serviceIds,
                afterDays: campaign.trigger.afterDays,
                onlyIfNoVisitSince: campaign.trigger.onlyIfNoVisitSince,
                horizonDays: 30,
            }
            : null,
    });

    const filteredRecipients = useMemo(() => {
        if (!search.trim()) return recipients;
        const query = search.toLowerCase();
        return recipients.filter((item) => item.address.toLowerCase().includes(query));
    }, [recipients, search]);

    const chips = useMemo(
        () => (campaign ? audienceChips(campaign.audience, serviceNames) : []),
        [campaign, serviceNames],
    );

    if (!campaign) return null;
    const c: Campaign = campaign;

    const isProjection = c.status === 'DRAFT' || c.status === 'SCHEDULED';
    const closed = CLOSED_STATUSES.has(c.status);
    const failed = c.recipientsFailed;
    const hasRetryable = recipients.some((r) => BULK_RETRYABLE.has(r.status));

    // Kredytów nie starczy na to, co ta kampania ma jeszcze wysłać.
    const plannedCredits = isProjection ? estimate?.estimatedCredits ?? null : null;
    const creditsShort =
        plannedCredits != null && stats != null && plannedCredits > stats.smsCreditsAvailable;

    const marker = describeCampaign(c, creditsShort);
    const figure = recipientsFigure(c);
    const projectedRecipients = isProjection && estimate ? String(estimate.eligible) : null;

    const openEditor = () => navigate(`/campaigns/${c.id}/edit`);

    const runDuplicate = async () => {
        const copy = await duplicate.mutateAsync(c.id);
        navigate(`/campaigns/${(copy as Campaign).id}/edit`);
    };

    const confirmPending = async () => {
        if (pending === 'stop') await stop.mutateAsync(c.id);
        if (pending === 'cancel') await cancel.mutateAsync(c.id);
        if (pending === 'send') {
            if (c.kind === 'AUTOMATIC') await activate.mutateAsync(c.id);
            else await schedule.mutateAsync({ id: c.id, scheduledAt: null });
        }
        if (pending === 'delete') {
            await remove.mutateAsync(c.id);
            setPending(null);
            onClose();
            onDeleted?.();
            return;
        }
        setPending(null);
    };

    return (
        <>
            <ModalShell isOpen onClose={onClose} maxWidth="1040px">
                <CampaignHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{c.name}</ModalTitle>
                        {/* Drogi poboczne stoją przy tożsamości kampanii, nie w stopce:
                            w stopce konkurowałyby wagą z jedyną akcją, która ma tam stać. */}
                        <CampaignIdentity>
                            <CampaignKindMark kind={c.kind} />
                            {CHANNEL_LABELS[c.channel]}
                            <span>utworzona {formatDateTime(c.createdAt)}</span>
                            <QuietLink type="button" onClick={runDuplicate} disabled={duplicate.isPending}>
                                <Copy /> Duplikuj
                            </QuietLink>
                        </CampaignIdentity>
                    </ModalTitleGroup>
                    <HeaderStatus>
                        <CampaignStatusLine status={c.status} />
                    </HeaderStatus>
                    <CloseBtn onClick={onClose} />
                </CampaignHeader>

                <ModalContent>
                    <ModalBody>
                        {/* Notki nad treścią pojawiają się wyłącznie wtedy, gdy jest
                            czego wyjaśniać. Cisza też jest informacją i nie zajmuje
                            miejsca - kampania, która idzie zgodnie z planem, nie
                            dostaje nad sobą ani jednego paska. */}
                        {failed > 0 && (
                            <Note $tone="error">
                                <AlertTriangle />
                                <span>
                                    <strong>{failed}</strong> {messageWord(failed)} nie dotarło do odbiorców.
                                </span>
                                <span className="spacer" />
                                {hasRetryable && (
                                    <QuietLink
                                        type="button"
                                        onClick={() => retryAllFailed.mutate()}
                                        disabled={retryAllFailed.isPending}
                                    >
                                        <RefreshCw /> Ponów nieudane
                                    </QuietLink>
                                )}
                            </Note>
                        )}

                        {creditsShort && (
                            <Note $tone="warn">
                                <Coins />
                                <span>
                                    Ta wysyłka zużyje <strong>{plannedCredits}</strong> kredytów, a na koncie
                                    jest ich <strong>{stats?.smsCreditsAvailable}</strong>.
                                </span>
                                <span className="spacer" />
                                <QuietLink type="button" onClick={() => navigate('/settings?tab=credits')}>
                                    Doładuj
                                </QuietLink>
                            </Note>
                        )}

                        {c.status === 'COMPLETED' && failed === 0 && (
                            <Note $tone="ok">
                                <CheckCircle2 />
                                <span>
                                    Wysłano <strong>{c.recipientsSent}</strong> {messageWord(c.recipientsSent)}
                                    {c.completedAt && <>, zakończono {formatDateTime(c.completedAt)}</>}.
                                </span>
                            </Note>
                        )}

                        {/* Pasek podsumowania: cztery odpowiedzi, po które ktoś tu wchodzi,
                            zanim zacznie cokolwiek czytać. */}
                        <Summary $tone={marker.tone}>
                            {/*
                             * Liczba odbiorców znika na telefonie: kilka centymetrów niżej
                             * stoi panel odbiorców z tą samą liczbą w nagłówku, a ta sama
                             * liczba dwa razy na jednym ekranie to szum, nie podkreślenie.
                             */}
                            <SummaryCell $hideOnPhone>
                                <CellLabel>{isProjection ? 'Prognoza odbiorców' : 'Odbiorcy'}</CellLabel>
                                <CellBig $empty={(projectedRecipients ?? figure.value) === '-'}>
                                    {projectedRecipients ?? figure.value}
                                </CellBig>
                                <CellNote>
                                    {projectedRecipients ? 'dostanie wiadomość' : figure.note}
                                </CellNote>
                            </SummaryCell>

                            <SummaryCell $order={2}>
                                <CellLabel>Koszt</CellLabel>
                                <CellValue $empty={plannedCredits == null && c.creditsSpent === 0}>
                                    <Coins />
                                    <span>
                                        {isProjection
                                            ? plannedCredits != null ? `${plannedCredits} kredytów` : 'liczymy…'
                                            : c.creditsSpent > 0 ? `${c.creditsSpent} kredytów` : 'bez kosztu'}
                                    </span>
                                </CellValue>
                                {isProjection && <CellNote>szacunek na dziś</CellNote>}
                            </SummaryCell>

                            {/* Na telefonie pierwsze: to jedyna komórka, która mówi,
                                czy trzeba coś zrobić teraz. */}
                            <SummaryCell $order={1}>
                                <CellLabel>Co dalej</CellLabel>
                                <ToneValue $tone={marker.tone} title={marker.title}>
                                    <Dot $tone={marker.tone} />
                                    <span>{marker.label}</span>
                                </ToneValue>
                                {c.status === 'SCHEDULED' && c.scheduledAt && (
                                    <CellNote>{formatDateTime(c.scheduledAt)}</CellNote>
                                )}
                            </SummaryCell>

                            <SummaryCell $order={3} $hideOnPhone>
                                <CellLabel>Kanał</CellLabel>
                                <CellValue>
                                    {c.channel === 'EMAIL' ? <Mail /> : <MessageSquare />}
                                    <span>{CHANNEL_LABELS[c.channel]}</span>
                                </CellValue>
                            </SummaryCell>
                        </Summary>

                        <BodyGrid>
                            <Column>
                                {/* Powierzchnia robocza: to, co klient naprawdę zobaczy. */}
                                <Panel>
                                    <ContentPreview
                                        smsTemplate={c.smsTemplate}
                                        emailSubject={c.emailSubject}
                                        emailBody={c.emailBody}
                                    />
                                </Panel>

                                <Panel>
                                    <h4>
                                        <Users />
                                        {isProjection ? 'Prognozowani odbiorcy' : 'Odbiorcy'}
                                        <span className="spacer" />
                                        {recipients.length > 0 && (
                                            <MutedText style={{ textTransform: 'none', letterSpacing: 0 }}>
                                                {recipients.length}
                                            </MutedText>
                                        )}
                                    </h4>

                                    {isProjection && (
                                        <MutedText>
                                            Stan na dziś - ostateczną listę wyliczymy w dniu wysyłki.
                                            Ręczne wykluczenia zostaną zachowane.
                                        </MutedText>
                                    )}

                                    {recipients.length > 0 ? (
                                        <>
                                            <SearchRow>
                                                <TextField
                                                    style={{ flex: '1 1 240px', maxWidth: 320 }}
                                                    placeholder="Szukaj po numerze lub adresie…"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                                {hasRetryable && (
                                                    <QuietLink
                                                        type="button"
                                                        onClick={() => retryAllFailed.mutate()}
                                                        disabled={retryAllFailed.isPending}
                                                    >
                                                        <RefreshCw /> Ponów nieudane
                                                    </QuietLink>
                                                )}
                                            </SearchRow>
                                            <TableScroll>
                                                <RecipientsTable>
                                                    <thead>
                                                        <tr>
                                                            <th />
                                                            <th>Adres</th>
                                                            <th>Status</th>
                                                            <th>Wysłano</th>
                                                            <th />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredRecipients.map((r) => (
                                                            <tr key={r.id}>
                                                                <td className="channel">
                                                                    {r.channel === 'SMS' ? <MessageSquare /> : <Mail />}
                                                                </td>
                                                                <td className="address">{r.address}</td>
                                                                <td>
                                                                    {RECIPIENT_STATUS_LABELS[r.status]}
                                                                    {r.errorMessage && <> - {r.errorMessage}</>}
                                                                </td>
                                                                <td className="when">
                                                                    {r.sentAt ? formatDateTime(r.sentAt) : '-'}
                                                                </td>
                                                                <td className="retry">
                                                                    {!NON_RETRYABLE.has(r.status) && (
                                                                        <RetryButton
                                                                            type="button"
                                                                            title="Ponów wysyłkę"
                                                                            aria-label="Ponów wysyłkę"
                                                                            disabled={retryRecipient.isPending}
                                                                            onClick={() => retryRecipient.mutate(r.id)}
                                                                        >
                                                                            <RefreshCw />
                                                                        </RetryButton>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </RecipientsTable>
                                            </TableScroll>
                                        </>
                                    ) : estimate && estimate.sample.length > 0 ? (
                                        <TableScroll>
                                            <RecipientsTable>
                                                <thead>
                                                    <tr>
                                                        <th>Klient</th>
                                                        <th>{projectionChannel === 'SMS' ? 'Telefon' : 'E-mail'}</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {estimate.sample.map((s) => (
                                                        <tr key={s.customerId}>
                                                            <td className="address">
                                                                {[s.firstName, s.lastName].filter(Boolean).join(' ') || 'Klient'}
                                                            </td>
                                                            <td>
                                                                {(projectionChannel === 'SMS' ? s.phone : s.email) ?? '-'}
                                                            </td>
                                                            <td>{ELIGIBILITY_LABELS[s.eligibility] ?? s.eligibility}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </RecipientsTable>
                                        </TableScroll>
                                    ) : (
                                        <MutedText>Lista odbiorców powstanie w momencie wysyłki.</MutedText>
                                    )}
                                </Panel>
                            </Column>

                            {/* Materiał pomocniczy: cofnięty o plan, bez ramki, na tle strony. */}
                            <Column>
                                {c.kind === 'AUTOMATIC' && c.trigger && (
                                    <Panel $quiet>
                                        <h4><CalendarClock /> Warunek</h4>
                                        <ConditionText>
                                            <strong>{c.trigger.afterDays} dni</strong> po usłudze{' '}
                                            <strong>
                                                {c.trigger.serviceIds
                                                    .map((sid) => serviceNames.get(sid) ?? 'usługa')
                                                    .join(', ') || '-'}
                                            </strong>
                                            , o {c.trigger.sendTime}
                                            {c.trigger.onlyIfNoVisitSince &&
                                                ', z pominięciem klientów, którzy byli w międzyczasie'}
                                            .
                                        </ConditionText>
                                    </Panel>
                                )}

                                <Panel $quiet>
                                    <h4><Users /> Kryteria odbiorców</h4>
                                    {chips.length > 0 ? (
                                        <ChipRow>{chips.map((ch) => <Chip key={ch}>{ch}</Chip>)}</ChipRow>
                                    ) : (
                                        <MutedText>Bez zawężeń - wszyscy klienci ze zgodą.</MutedText>
                                    )}
                                </Panel>

                                {(c.recipientsSkipped > 0 || failed > 0) && (
                                    <Panel $quiet>
                                        <h4><SkipForward /> Kogo ominęło</h4>
                                        <ConditionText>
                                            {c.recipientsSkipped > 0 && (
                                                <>Pominiętych: <strong>{c.recipientsSkipped}</strong>. </>
                                            )}
                                            {failed > 0 && <>Nieudanych: <strong>{failed}</strong>.</>}
                                        </ConditionText>
                                    </Panel>
                                )}

                                {/* Przebieg jako ciąg zdarzeń, nie lista zdań z datą. */}
                                <Panel $quiet>
                                    <h4><CalendarClock /> Przebieg</h4>
                                    <Timeline>
                                        <TimelineItem $color={STATUS_COLORS.DRAFT}>
                                            <strong>Utworzono</strong>
                                            {formatDateTime(c.createdAt)}
                                        </TimelineItem>
                                        {c.status === 'SCHEDULED' && (
                                            <TimelineItem $color={STATUS_COLORS.SCHEDULED}>
                                                <strong>Wyjdzie {describeMoment(c.scheduledAt)}</strong>
                                                {c.scheduledAt ? formatDateTime(c.scheduledAt) : 'najbliższym przebiegiem'}
                                            </TimelineItem>
                                        )}
                                        {c.startedAt && (
                                            <TimelineItem $color={STATUS_COLORS.SENDING}>
                                                <strong>Ruszyła wysyłka</strong>
                                                {formatDateTime(c.startedAt)}
                                            </TimelineItem>
                                        )}
                                        {c.completedAt && (
                                            <TimelineItem $color={STATUS_COLORS[c.status]}>
                                                <strong>Zakończono</strong>
                                                {formatDateTime(c.completedAt)}
                                            </TimelineItem>
                                        )}
                                    </Timeline>
                                </Panel>
                            </Column>
                        </BodyGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>
                    {/*
                        Po lewej, z dala od akcji głównej, stoi ruch nieodwracalny albo
                        odwrotny do niej - dwie akcje o przeciwnych skutkach nie mają
                        prawa sąsiadować pod kursorem.
                    */}
                    {c.status === 'DRAFT' && (
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setPending('delete')}
                            disabled={remove.isPending}
                        >
                            <Trash2 /> Usuń szkic
                        </DangerButton>
                    )}
                    {c.status === 'SCHEDULED' && (
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setPending('cancel')}
                        >
                            <Square /> Anuluj wysyłkę
                        </DangerButton>
                    )}
                    {c.status === 'SENDING' && (
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setPending('stop')}
                        >
                            <Square /> Zatrzymaj wysyłkę
                        </DangerButton>
                    )}
                    {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                        <IconButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => archive.mutate(c.id)}
                            disabled={archive.isPending}
                        >
                            Archiwizuj
                        </IconButton>
                    )}

                    {/*
                        Akcja główna wynika ze stanu kampanii - w tej kolejności:

                        1. są nieudane wiadomości → „Ponów nieudane". Ktoś nie dostał
                           tego, co miał dostać; to bije wszystko inne, także etap.
                        2. szkic → „Dokończ kampanię". Szkic nie wyśle się sam.
                        3. zaplanowana → „Wyślij teraz". Edycja stoi obok, jako druga.
                        4. działa → „Wstrzymaj"; wstrzymana → „Wznów".
                        5. w trakcie wysyłki → nic. Właściwym ruchem jest poczekać,
                           a przycisk, który to udaje, tylko zaprasza do klikania.
                        6. zamknięta → „Duplikuj i wyślij ponownie", czyli jedyne, co
                           da się jeszcze z tą kampanią zrobić.

                        Poza akcją główną stopka niesie najwyżej jeden przycisk.
                    */}
                    {failed > 0 && hasRetryable ? (
                        <PrimaryButton
                            type="button"
                            onClick={() => retryAllFailed.mutate()}
                            disabled={retryAllFailed.isPending}
                        >
                            <RefreshCw /> Ponów nieudane
                        </PrimaryButton>
                    ) : c.status === 'DRAFT' ? (
                        <PrimaryButton type="button" onClick={openEditor}>
                            <Pencil /> Dokończ kampanię
                        </PrimaryButton>
                    ) : c.status === 'SCHEDULED' ? (
                        <>
                            <IconButton type="button" onClick={openEditor}>
                                <Pencil /> Edytuj
                            </IconButton>
                            <PrimaryButton type="button" onClick={() => setPending('send')}>
                                <Send /> Wyślij teraz
                            </PrimaryButton>
                        </>
                    ) : c.status === 'ACTIVE' ? (
                        <>
                            <IconButton type="button" onClick={openEditor}>
                                <Pencil /> Edytuj
                            </IconButton>
                            <PrimaryButton
                                type="button"
                                onClick={() => pause.mutate(c.id)}
                                disabled={pause.isPending}
                            >
                                <Pause /> Wstrzymaj
                            </PrimaryButton>
                        </>
                    ) : c.status === 'PAUSED' ? (
                        <>
                            <IconButton type="button" onClick={openEditor}>
                                <Pencil /> Edytuj
                            </IconButton>
                            <PrimaryButton
                                type="button"
                                onClick={() => activate.mutate(c.id)}
                                disabled={activate.isPending}
                            >
                                <Play /> Wznów
                            </PrimaryButton>
                        </>
                    ) : closed ? (
                        <PrimaryButton type="button" onClick={runDuplicate} disabled={duplicate.isPending}>
                            <Copy /> Wyślij ponownie
                        </PrimaryButton>
                    ) : null}

                    <IconButton type="button" onClick={onClose}>Zamknij</IconButton>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={pending !== null}
                variant={pending === 'send' ? 'warning' : 'danger'}
                title={
                    pending === 'stop' ? 'Zatrzymać wysyłkę?'
                    : pending === 'cancel' ? 'Anulować kampanię?'
                    : pending === 'delete' ? 'Usunąć ten szkic?'
                    : c.kind === 'AUTOMATIC' ? 'Aktywować kampanię?'
                    : c.scheduledAt ? 'Wysłać teraz, z pominięciem terminu?'
                    : 'Wysłać kampanię teraz?'
                }
                message={
                    pending === 'stop'
                        ? 'Wiadomości, które jeszcze nie wyszły, nie zostaną wysłane. Wysłanych nie da się cofnąć.'
                    : pending === 'cancel'
                        ? 'Kampania nie zostanie wysłana. Możesz ją później zduplikować.'
                    : pending === 'delete'
                        ? `Szkic „${c.name}" zostanie trwale usunięty. Tej operacji nie da się cofnąć.`
                    : c.kind === 'AUTOMATIC'
                        ? `Kampania „${c.name}" zacznie działać i sama wyśle wiadomość każdemu klientowi, który spełni warunek.`
                        : `Wyślemy „${c.name}" natychmiast. Listę odbiorców wyliczymy teraz, ta operacja pobierze kredyty.`
                }
                confirmText={
                    pending === 'stop' ? 'Zatrzymaj'
                    : pending === 'cancel' ? 'Anuluj kampanię'
                    : pending === 'delete' ? 'Usuń'
                    : c.kind === 'AUTOMATIC' ? 'Aktywuj'
                    : 'Wyślij teraz'
                }
                cancelText="Wróć"
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
        </>
    );
}
