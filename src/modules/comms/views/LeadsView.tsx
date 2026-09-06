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
// Trzy decyzje, które ten widok realizuje:
//
//  1. KOLEJNOŚĆ TO WIEK OCZEKIWANIA. Nie data wpływu i nie kwota - wiek rośnie
//     sam i nigdy nie przeskakuje, więc lista oglądana trzydzieści razy dziennie
//     zostaje przewidywalna.
//  2. STATUSU NIE MA NA LIŚCIE. Awans dzieje się jako skutek pracy (pierwsza
//     odpowiedź stempluje NOWY → W KONTAKCIE po stronie backendu), a ręczna
//     zmiana mieszka w oknie szczegółów.
//  3. SEGMENTY ZAMIAST FILTRÓW. „Twój ruch" i „U klienta" to jedna oś - czyj
//     jest ruch - prostopadła do statusu. „Zamknięte" to osobny tryb pracy.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight, BarChart3, Search } from 'lucide-react';
import { useBreakpoint } from '@/common/hooks';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
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
import { LeadDetailModal } from '../components/LeadDetailModal';
import { LeadQueueCard } from '../components/LeadQueueCard';
import { LeadSegments, type LeadSegment } from '../components/LeadSegments';
import { describeLeadUrgency } from '../utils/leadUrgency';
import type { LeadPrimaryAction } from '../utils/leadPrimaryAction';
import type { Lead, LeadStatus } from '../types';
import { EmptyHint, SurfaceCard, formatMoney } from '../components/shared';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: ${p => p.theme.spacing.md};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
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
    padding: 0 4px;

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

/**
 * Segmenty plus akcje w jednym rzędzie - układ telefonu.
 *
 * Na wąskim ekranie akcje w [PageHeader] zawijają się do własnego wiersza, przez
 * co ciemny nagłówek urósł do 161 px i pierwsza sprawa zaczynała się dopiero na
 * 322. pikselu - 38% ekranu zajęte, zanim widać cokolwiek do zrobienia. Ikony
 * przeniesione do rzędu segmentów odzyskują ten wiersz bez dokładania własnego.
 */
const SegmentRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RowAction = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: ${p => p.theme.radii.lg};
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 20px; height: 20px; }
`;

const ArchivePane = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
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
    height: 40px;
    padding: 0 4px;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.primary};
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
`;

/** Statusy zamknięte - do rozpoznania deep-linku z analityki. */
const CLOSED_SET = new Set<LeadStatus>(CLOSED_LEAD_STATUSES);

export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    /*
     * Na telefonie archiwum nie ma własnej zakładki: trzy segmenty w 390 px
     * odbierają szerokość dwóm, które niosą pracę. Wejściem jest lupa w nagłówku,
     * bo archiwum na małym ekranie odwiedza się z konkretnym pytaniem.
     */
    const isWide = useBreakpoint('md');

    /*
     * Stan startowy z adresu, czytany raz. Analityka prowadzi tu z konkretnym
     * pytaniem („pokaż zaległe", „pokaż przegrane"), więc kwota na poprzednim
     * ekranie ma być dowodem, a nie twierdzeniem.
     */
    const [segment, setSegment] = useState<LeadSegment>(() => {
        const status = searchParams.get('status') as LeadStatus | null;
        if (status && CLOSED_SET.has(status)) return 'ARCHIVE';
        return 'OURS';
    });
    const [archiveStatus, setArchiveStatus] = useState<LeadStatus | undefined>(() => {
        const status = searchParams.get('status') as LeadStatus | null;
        return status && CLOSED_SET.has(status) ? status : undefined;
    });
    const [archiveQuery, setArchiveQuery] = useState('');

    const selectedLeadId = searchParams.get('lead');
    const selectLead = (leadId: string | null) => {
        setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
    };

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

    const runAction = (lead: Lead, action: LeadPrimaryAction) => {
        // Jedyny skrót omijający okno szczegółów: odpowiedź na maila. Reszta
        // akcji potrzebuje kontekstu (wyceny, terminu), więc prowadzi do okna,
        // gdzie ten kontekst stoi razem z przyciskiem.
        if (action.kind === 'REPLY' && lead.threadId) {
            navigate(`/communication?thread=${lead.threadId}`);
            return;
        }
        selectLead(lead.id);
    };

    const openArchive = () => {
        setSegment('ARCHIVE');
        setArchiveStatus(undefined);
    };

    // Pierwsza synchronizacja skrzynki w toku: leady dopiero powstają z nadciągającej
    // poczty, więc lista rosnąca z sekundy na sekundę wyglądałaby jak zepsuta.
    if (mailboxSync.syncing) {
        return (
            <ViewContainer>
                <PageHeader title="Zapytania" subtitle="Zapytania od potencjalnych klientów" />
                <SurfaceCard>
                    <MailboxSyncPanel />
                </SurfaceCard>
            </ViewContainer>
        );
    }

    return (
        <ViewContainer>
            <PageHeader
                title="Zapytania"
                subtitle={
                    open.isLoading
                        ? 'Zapytania od potencjalnych klientów'
                        : `${open.total} ${open.total === 1 ? 'otwarta sprawa' : 'otwartych spraw'}`
                }
                actions={
                    isWide ? (
                        <Link to="/leads/analytics">
                            <PageHeaderGhostButton as="span">
                                <BarChart3 /> Analityka
                            </PageHeaderGhostButton>
                        </Link>
                    ) : undefined
                }
            />

            {/* Na wąskim ekranie archiwum jest trybem, nie zakładką - więc i wyjście
                z niego jest jawne, a nie ukryte w przełączniku, którego tam nie ma. */}
            {!isWide && segment === 'ARCHIVE' ? (
                <BackToQueue type="button" onClick={() => setSegment('OURS')}>
                    <ArrowRight style={{ width: 16, height: 16, transform: 'rotate(180deg)' }} />
                    Wróć do kolejki
                </BackToQueue>
            ) : (
                <SegmentRow>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <LeadSegments
                            value={segment}
                            ours={queue.ours.length}
                            client={queue.client.length}
                            showArchive={isWide}
                            onChange={setSegment}
                        />
                    </div>
                    {!isWide && (
                        <>
                            <RowAction
                                type="button"
                                onClick={openArchive}
                                title="Szukaj w zamkniętych sprawach"
                                aria-label="Szukaj w zamkniętych sprawach"
                            >
                                <Search />
                            </RowAction>
                            <Link to="/leads/analytics" aria-label="Analityka">
                                <RowAction as="span" title="Analityka"><BarChart3 /></RowAction>
                            </Link>
                        </>
                    )}
                </SegmentRow>
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

            <SurfaceCard>
                {segment === 'ARCHIVE' ? (
                    <ArchivePane style={{ padding: 16 }}>
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
                    <>
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
                    </>
                )}
            </SurfaceCard>

            {selectedLeadId && (
                <LeadDetailModal
                    // Remount na każdego leada: stan edycji (wycena, pojazd, tagi)
                    // należy do jednego otwarcia i nie ma prawa przejść na następnego.
                    key={selectedLeadId}
                    leadId={selectedLeadId}
                    onClose={() => selectLead(null)}
                />
            )}
        </ViewContainer>
    );
}
