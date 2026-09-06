// src/modules/comms/views/LeadsView.tsx
// Skrzynka zapytań: kolejka spraw do zrobienia zamiast tabeli wszystkiego.
//
// Poprzednia wersja była siatką o sześciu kolumnach ze sztywną szerokością
// 880 px w kontenerze z przewijaniem poziomym. Na telefonie - a tam ten ekran
// jest naprawdę używany, w hali, jedną ręką - kolumna „Status" zaczynała się
// dopiero na sześćsetnym pikselu. Do tego lista przychodziła posortowana
// „najnowsze na górze", więc sprawa czekająca najdłużej leżała najgłębiej:
// stos, nie kolejka.
//
// Cztery decyzje, które ten widok realizuje:
//
//  1. KOLEJNOŚĆ TO WIEK OCZEKIWANIA. Nie data wpływu i nie kwota - wiek rośnie
//     sam i nigdy nie przeskakuje, więc lista oglądana trzydzieści razy dziennie
//     zostaje przewidywalna.
//  2. STATUSU NIE MA NA LIŚCIE. Awans dzieje się jako skutek pracy (pierwsza
//     odpowiedź stempluje NOWY → W KONTAKCIE po stronie backendu), a ręczna
//     zmiana mieszka w panelu szczegółów.
//  3. SEGMENTY ZAMIAST FILTRÓW. „Twój ruch" i „U klienta" to jedna oś - czyj
//     jest ruch - prostopadła do statusu. „Zamknięte" to osobny tryb pracy.
//  4. SZCZEGÓŁY OBOK, NIE ZAMIAST. Na szerokim ekranie panel stoi przy kolejce,
//     więc przeskakiwanie między sprawami nie zamyka i nie otwiera okna. Na
//     telefonie miejsca na to nie ma i szczegóły wracają jako okno pełnoekranowe.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, BarChart3, Inbox, Search } from 'lucide-react';
import { useBreakpoint } from '@/common/hooks';
import {
    CLOSED_LEAD_STATUSES,
    OPEN_LEAD_STATUSES,
    useLeadsByStatuses,
    useLeadsSocket,
    useStagnationThresholds,
} from '../hooks/useLeads';
import { useMailboxSyncState } from '../hooks/useComms';
import { MailboxSyncPanel } from '../components/MailboxSyncPanel';
import { LeadArchive } from '../components/LeadArchive';
import { LeadDetailModal, LeadDetailPane } from '../components/LeadDetailModal';
import { LeadQueueCard } from '../components/LeadQueueCard';
import { LeadSegments, type LeadSegment } from '../components/LeadSegments';
import { describeLeadUrgency } from '../utils/leadUrgency';
import type { LeadPrimaryAction } from '../utils/leadPrimaryAction';
import type { Lead, LeadStatus } from '../types';
import { EmptyHint, SurfaceCard, formatMoney } from '../components/shared';

/**
 * Widok wypełnia okno i dzieli się na dwie niezależnie przewijane kolumny.
 *
 * Świadomie bez wspólnego PageHeadera aplikacji: ciemny baner z akcjami zawijał
 * się na telefonie do 161 px i pierwsza sprawa zaczynała się na 322. pikselu -
 * 38% ekranu zajęte, zanim widać cokolwiek do zrobienia. Tu nagłówek jest
 * częścią kolumny kolejki i mieści się w jednym wierszu.
 */
const ViewShell = styled.main`
    display: flex;
    width: 100%;
    min-height: 0;
    height: 100dvh;
    background: ${p => p.theme.colors.surface};

    /*
     * Próg podziału to xl, nie lg. Przy 1024 px sidebar aplikacji zabiera 248,
     * więc na kolejkę i panel zostaje 776 - po 440 i 336 px. Panel w 336 px nie
     * mieści dwóch kolumn treści, a kolejka przestaje mieć miejsce na kwotę
     * obok wieku. Poniżej xl wraca jedna kolumna i okno pełnoekranowe.
     */
    @media (max-width: ${p => p.theme.breakpoints.xl}) {
        flex-direction: column;
        height: auto;
        min-height: 100dvh;
        background: transparent;
    }
`;

const QueueColumn = styled.div<{ $split: boolean }>`
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: ${p => (p.$split ? '0 0 440px' : '1 1 auto')};
    width: ${p => (p.$split ? '440px' : '100%')};
    border-right: ${p => (p.$split ? `1px solid ${p.theme.colors.border}` : 'none')};
    background: ${p => p.theme.colors.surface};

    @media (max-width: ${p => p.theme.breakpoints.xl}) {
        width: 100%;
        flex: 1 1 auto;
        border-right: none;
        background: transparent;
    }
`;

const DetailColumn = styled.div`
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    background: ${p => p.theme.colors.surface};
`;

/** Nagłówek kolumny kolejki: tytuł, licznik i jedno wyjście do analityki. */
const QueueHeader = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 16px 12px 16px;
    flex-shrink: 0;

    h1 {
        margin: 0;
        font-size: 26px;
        font-weight: ${p => p.theme.fontWeights.bold};
        letter-spacing: -0.02em;
        line-height: 1.1;
        color: ${p => p.theme.colors.text};
    }
    p {
        margin: 3px 0 0 0;
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const GhostAction = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 44px;
    padding: 0 16px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    cursor: pointer;
    font-family: inherit;

    svg { width: 16px; height: 16px; }
`;

/** Wariant kwadratowy - cel dotykowy 48x48 tam, gdzie nie ma miejsca na etykietę. */
const IconAction = styled(GhostAction)`
    width: 48px;
    height: 48px;
    padding: 0;
    border-radius: ${p => p.theme.radii.lg};

    svg { width: 20px; height: 20px; }
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
    flex-shrink: 0;
`;

/**
 * Pasek zaległości nad kolejką. Liczony z tego SAMEGO zbioru co segment „Twój
 * ruch", więc kwota i licznik nie mają jak się rozjechać - wcześniej pasek brał
 * dane z analityki, która liczyła zaległość inną regułą niż lista pod nim.
 *
 * Pojawia się wyłącznie wtedy, gdy jest zaległość. Cisza nie zajmuje miejsca.
 */
const OwedStrip = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 20px 4px 20px;
    flex-shrink: 0;

    .amount {
        font-size: 20px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
    }
    .text {
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

/** Lista przewija się sama, żeby nagłówek i segmenty zostały na miejscu. */
const QueueScroll = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    margin-top: 10px;
    border-top: 1px solid ${p => p.theme.colors.border};

    @media (max-width: ${p => p.theme.breakpoints.xl}) {
        overflow-y: visible;
        margin: 10px 12px 16px 12px;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.xl};
        background: ${p => p.theme.colors.surface};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.04);
        overflow: hidden;
    }
`;

const ArchivePane = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    overflow-y: auto;
    min-height: 0;
`;

const Truncated = styled.div`
    padding: 12px 20px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.warning};
    background: ${p => p.theme.colors.warningLight};
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const BackToQueue = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 44px;
    padding: 0 16px;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.primary};
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;

    svg { width: 16px; height: 16px; }
`;

/** Panel bez wybranej sprawy - zaproszenie, nie pustka. */
const PaneEmpty = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: ${p => p.theme.colors.textMuted};
    font-size: 14px;

    svg { width: 34px; height: 34px; opacity: 0.5; }
`;

/** Statusy zamknięte - do rozpoznania deep-linku z analityki. */
const CLOSED_SET = new Set<LeadStatus>(CLOSED_LEAD_STATUSES);

export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    /*
     * Podział na dwie kolumny od 1280 px w górę - to pierwsza szerokość, przy
     * której po odjęciu sidebara (248 px) zostaje dość miejsca na kolejkę i panel
     * naraz. Niżej szczegóły wracają jako okno pełnoekranowe: ten sam komponent,
     * inna obudowa. Próg musi się zgadzać z zapytaniem medialnym w ViewShell,
     * inaczej JavaScript rysuje panel, którego CSS nie ma gdzie postawić.
     */
    const isSplit = useBreakpoint('xl');
    const isWide = useBreakpoint('md');

    /*
     * Stan startowy z adresu, czytany raz. Analityka prowadzi tu z konkretnym
     * pytaniem („pokaż zaległe", „pokaż przegrane"), więc kwota na poprzednim
     * ekranie ma być dowodem, a nie twierdzeniem.
     */
    const [segment, setSegment] = useState<LeadSegment>(() => {
        const status = searchParams.get('status') as LeadStatus | null;
        return status && CLOSED_SET.has(status) ? 'ARCHIVE' : 'OURS';
    });
    const [archiveStatus, setArchiveStatus] = useState<LeadStatus | undefined>(() => {
        const status = searchParams.get('status') as LeadStatus | null;
        return status && CLOSED_SET.has(status) ? status : undefined;
    });
    const [archiveQuery, setArchiveQuery] = useState('');

    const selectedLeadId = searchParams.get('lead');
    const selectLead = useCallback(
        (leadId: string | null) => {
            setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
        },
        [setSearchParams]
    );

    const thresholds = useStagnationThresholds();
    const open = useLeadsByStatuses(OPEN_LEAD_STATUSES);
    // Archiwum pobiera się dopiero, gdy ktoś w nie wejdzie: pusta lista statusów
    // to zero zapytań, więc kolejka nie płaci za dane, których nie pokazuje.
    const archive = useLeadsByStatuses(
        segment === 'ARCHIVE' ? (archiveStatus ? [archiveStatus] : CLOSED_LEAD_STATUSES) : [],
        { query: archiveQuery, sortDirection: 'DESC' }
    );

    // Zmiany leadów przychodzą WebSocketem - karta aktualizuje się bez odświeżania.
    useLeadsSocket();
    const mailboxSync = useMailboxSyncState();

    /**
     * Kolejka: podział po tym, czyj jest ruch, i kolejność po wieku oczekiwania.
     *
     * Sortowanie jest tutaj, a nie na serwerze, bo „wszystkie otwarte" to trzy
     * osobne odpowiedzi (filtr statusu jest jednowartościowy) - żadne sortowanie
     * serwerowe nie ułoży trzech list w jedną. Zbiór jest ograniczony i widok
     * ostrzega, gdy przestaje być kompletny.
     */
    const queue = useMemo(() => {
        const entries = open.items.map((lead) => ({
            lead,
            urgency: describeLeadUrgency(lead, thresholds),
        }));
        const byAge = (a: typeof entries[number], b: typeof entries[number]) =>
            b.urgency.waitingMs - a.urgency.waitingMs;
        return {
            ours: entries.filter((entry) => entry.urgency.turn === 'OURS').sort(byAge),
            client: entries.filter((entry) => entry.urgency.turn === 'CLIENT').sort(byAge),
        };
    }, [open.items, thresholds]);

    const owedValue = queue.ours.reduce((sum, entry) => sum + entry.lead.estimatedValue, 0);
    const visible = segment === 'CLIENT' ? queue.client : queue.ours;
    const inArchive = segment === 'ARCHIVE';

    /**
     * `j` / `k` - następna i poprzednia sprawa bez odrywania ręki od klawiatury.
     *
     * Ma sens wyłącznie przy panelu obok kolejki: skok, który za każdym razem
     * zamyka i otwiera okno modalne, jest wolniejszy od kliknięcia. Skróty milczą,
     * gdy fokus stoi w polu tekstowym - inaczej „j" w wyszukiwarce przewijałoby
     * listę zamiast się wpisać.
     */
    useEffect(() => {
        if (!isSplit || inArchive) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'j' && event.key !== 'k') return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
            if (target?.isContentEditable) return;
            if (visible.length === 0) return;

            event.preventDefault();
            const current = visible.findIndex((entry) => entry.lead.id === selectedLeadId);
            if (current === -1) {
                selectLead(visible[0].lead.id);
                return;
            }
            const next = event.key === 'j'
                ? Math.min(current + 1, visible.length - 1)
                : Math.max(current - 1, 0);
            selectLead(visible[next].lead.id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isSplit, inArchive, visible, selectedLeadId, selectLead]);

    const runAction = (lead: Lead, action: LeadPrimaryAction) => {
        // Jedyny skrót omijający szczegóły: odpowiedź na maila. Reszta akcji
        // potrzebuje kontekstu (wyceny, terminu), więc prowadzi do panelu, gdzie
        // ten kontekst stoi razem z przyciskiem.
        if (action.kind === 'REPLY' && lead.threadId) {
            navigate(`/communication?thread=${lead.threadId}`);
            return;
        }
        selectLead(lead.id);
    };

    /**
     * Zmiana segmentu ZDEJMUJE zaznaczenie.
     *
     * Bez tego wejście w „Zamknięte" przy otwartym panelu podmieniało go na okno
     * modalne z tą samą sprawą: panel stoi pod warunkiem `isSplit && !inArchive`,
     * okno pod `(!isSplit || inArchive) && selectedLeadId`, więc archiwum gasiło
     * pierwszy warunek i zapalało drugi. Wyglądało to na przypadkowe otwarcie
     * cudzego leada, bo nim było.
     *
     * Reguła jest szersza niż sama naprawa i celowo: zaznaczenie należy do LISTY,
     * na którą się patrzy. Sprawa z „Twój ruch" wyświetlana obok kolejki „U klienta"
     * to szczegóły rekordu, którego nie ma w widocznym spisie.
     */
    const changeSegment = useCallback(
        (next: LeadSegment) => {
            setSegment(next);
            if (next !== 'ARCHIVE') setArchiveStatus(undefined);
            selectLead(null);
        },
        [selectLead]
    );

    const openArchive = () => changeSegment('ARCHIVE');

    // Pierwsza synchronizacja skrzynki w toku: leady dopiero powstają z nadciągającej
    // poczty, więc lista rosnąca z sekundy na sekundę wyglądałaby jak zepsuta.
    if (mailboxSync.syncing) {
        return (
            <ViewShell>
                <QueueColumn $split={false}>
                    <QueueHeader>
                        <div>
                            <h1>Zapytania</h1>
                            <p>Zapytania od potencjalnych klientów</p>
                        </div>
                    </QueueHeader>
                    <SurfaceCard style={{ margin: 16 }}>
                        <MailboxSyncPanel />
                    </SurfaceCard>
                </QueueColumn>
            </ViewShell>
        );
    }

    return (
        <ViewShell>
            <QueueColumn $split={isSplit && !inArchive}>
                <QueueHeader>
                    <div>
                        <h1>Zapytania</h1>
                        <p>
                            {open.isLoading
                                ? 'Zapytania od potencjalnych klientów'
                                : `${open.total} ${open.total === 1 ? 'otwarta sprawa' : 'otwartych spraw'}`}
                        </p>
                    </div>
                    {isWide ? (
                        <Link to="/leads/analytics">
                            <GhostAction><BarChart3 /> Analityka</GhostAction>
                        </Link>
                    ) : (
                        <Link to="/leads/analytics" aria-label="Analityka">
                            <IconAction title="Analityka"><BarChart3 /></IconAction>
                        </Link>
                    )}
                </QueueHeader>

                {/* Na wąskim ekranie archiwum jest trybem, nie zakładką - więc i wyjście
                    z niego jest jawne, a nie ukryte w przełączniku, którego tam nie ma. */}
                {!isWide && inArchive ? (
                    <Toolbar>
                        <BackToQueue type="button" onClick={() => changeSegment('OURS')}>
                            <ArrowLeft /> Wróć do kolejki
                        </BackToQueue>
                    </Toolbar>
                ) : (
                    <Toolbar>
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <LeadSegments
                                value={segment}
                                ours={queue.ours.length}
                                client={queue.client.length}
                                showArchive={isWide}
                                onChange={changeSegment}
                            />
                        </div>
                        {!isWide && (
                            <IconAction
                                as="button"
                                type="button"
                                onClick={openArchive}
                                title="Szukaj w zamkniętych sprawach"
                                aria-label="Szukaj w zamkniętych sprawach"
                            >
                                <Search />
                            </IconAction>
                        )}
                    </Toolbar>
                )}

                {segment === 'OURS' && queue.ours.length > 0 && (
                    <OwedStrip>
                        {/* Bez groszy: to jest kwota-hasło, nie pozycja na fakturze. */}
                        <span className="amount">{formatMoney(owedValue)}</span>
                        <span className="text">
                            czeka na Twoją odpowiedź w {queue.ours.length}{' '}
                            {queue.ours.length === 1 ? 'sprawie' : 'sprawach'}
                        </span>
                    </OwedStrip>
                )}

                {inArchive ? (
                    <ArchivePane>
                        <LeadArchive
                            bundle={archive}
                            query={archiveQuery}
                            onQueryChange={setArchiveQuery}
                            status={archiveStatus}
                            onStatusChange={setArchiveStatus}
                            onOpen={selectLead}
                        />
                    </ArchivePane>
                ) : (
                    <QueueScroll>
                        {!open.isLoading && visible.length === 0 && (
                            <EmptyHint>
                                {segment === 'OURS'
                                    ? 'Nikt nie czeka na Twoją odpowiedź.'
                                    : 'Nie czekamy teraz na żadnego klienta.'}
                            </EmptyHint>
                        )}

                        {visible.map(({ lead, urgency }) => (
                            <LeadQueueCard
                                key={lead.id}
                                lead={lead}
                                urgency={urgency}
                                active={lead.id === selectedLeadId}
                                onOpen={() => selectLead(lead.id)}
                                onAction={(action) => runAction(lead, action)}
                            />
                        ))}

                        {open.truncated && (
                            <Truncated>
                                Otwartych spraw jest więcej, niż mieści jedna strona. Zamknij
                                część zapytań albo skorzystaj z analityki, żeby zobaczyć całość.
                            </Truncated>
                        )}
                    </QueueScroll>
                )}
            </QueueColumn>

            {/* Szczegóły obok kolejki: przeskakiwanie między sprawami nie zamyka
                i nie otwiera okna, więc obsłużenie pięciu zapytań pod rząd to pięć
                kliknięć, a nie piętnaście. */}
            {isSplit && !inArchive && (
                <DetailColumn>
                    {selectedLeadId ? (
                        <LeadDetailPane
                            key={selectedLeadId}
                            leadId={selectedLeadId}
                            keyHint="j / k — następny lead"
                            onClose={() => selectLead(null)}
                            onDeleted={() => selectLead(null)}
                        />
                    ) : (
                        <PaneEmpty>
                            <Inbox />
                            Wybierz sprawę z kolejki
                        </PaneEmpty>
                    )}
                </DetailColumn>
            )}

            {/* Wąski ekran (albo archiwum): szczegóły jako okno pełnoekranowe. */}
            {(!isSplit || inArchive) && selectedLeadId && (
                <LeadDetailModal
                    // Remount na każdą sprawę: stan edycji (wycena, pojazd, tagi)
                    // należy do jednego otwarcia i nie ma prawa przejść na następną.
                    key={selectedLeadId}
                    leadId={selectedLeadId}
                    onClose={() => selectLead(null)}
                    onDeleted={() => selectLead(null)}
                />
            )}
        </ViewShell>
    );
}
