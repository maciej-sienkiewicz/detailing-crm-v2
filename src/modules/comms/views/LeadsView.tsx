// src/modules/comms/views/LeadsView.tsx
// Pipeline leadów w języku wizualnym reszty aplikacji: wspólny PageHeader,
// karty-powierzchnie, Badge, tokeny motywu. Szczegóły w oknie LeadDetailModal -
// tym samym, które otwiera plakietka „Lead" w podglądzie rozmowy.
import { useState, type MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ArrowRight, BarChart3, Loader2, Search } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { formatMoney } from '../components/analytics/tokens';
import { buildPeriod } from '../components/analytics/period';
import { useLeadAnalytics, useLeads, useLeadsSocket } from '../hooks/useLeads';
import { useMailboxSyncState } from '../hooks/useComms';
import { MailboxSyncPanel } from '../components/MailboxSyncPanel';
import { useLeadStatusChange } from '../hooks/useLeadStatusChange';
import { LeadCellEditor, type LeadCellField } from '../components/LeadCellEditor';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { LeadReplyBadge } from '../components/LeadReplyBadge';
import { LeadSourceIcon } from '../components/LeadSourceIcon';
import { CLOSED_STATUSES, formatVehicle } from '../utils/leadFormat';
import { leadReplyTone, type ReplyTone } from '../utils/leadReply';
import {
    LEAD_STATUS_COLORS,
    LEAD_STATUS_FLOW,
    LEAD_STATUS_LABELS,
    type Lead,
    type LeadStatus,
} from '../types';
import {
    EmptyHint,
    FilterChip,
    SurfaceCard,
    formatGrosze,
    formatRelativeTime,
} from '../components/shared';


/**
 * Pasek zaległości nad listą - to samo zdanie, co bohater analityki.
 *
 * Właściciel wchodzi codziennie tutaj, a nie do analityki. Kwota czekająca na
 * odpowiedź musi stać tam, gdzie on faktycznie bywa; ekran analityki jest lekturą
 * tygodniową. Bez tej duplikacji zbudowalibyśmy ładny widok, na który nikt nie
 * ma powodu wchodzić.
 *
 * Pasek pojawia się wyłącznie wtedy, gdy jest zaległość. Cisza nie zajmuje miejsca.
 */
const OwedStrip = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid ${p => p.theme.colors.border};
    border-left: 3px solid ${p => p.theme.colors.error};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};
    padding: 12px 16px;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    .amount {
        font-size: 20px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .text {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
    }
    .text strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
    svg { width: 16px; height: 16px; flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-wrap: wrap;
        .text { flex-basis: 100%; }
    }
`;

// ── Layout strony (jak ViewContainer w statystykach) ─────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: ${p => p.theme.spacing.md};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

/** Cienka kreska rozdzielająca dwie osie filtrowania: etap i „czyj ruch". */
const FilterSeparator = styled.span`
    width: 1px;
    align-self: stretch;
    margin: 2px 2px;
    background: ${p => p.theme.colors.border};
`;

const FiltersRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 14px;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surface};
    flex: 1 1 220px;
    max-width: 340px;
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus-within { border-color: ${p => p.theme.colors.primary}; }

    input {
        border: none;
        outline: none;
        flex: 1;
        font-size: 13px;
        min-width: 0;
        background: transparent;
        color: ${p => p.theme.colors.text};
        font-family: inherit;
    }
`;

// ── Tabela / lista ───────────────────────────────────────────────────────────

const TableScroll = styled.div`
    overflow-x: auto;
`;

const HeadRow = styled.div`
    display: grid;
    grid-template-columns: 1.7fr 1.1fr 1.6fr 0.8fr 1.3fr 0.8fr;
    gap: 10px;
    padding: 12px 20px 12px 23px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    min-width: 880px;
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

/**
 * Rozpoznawanie auta chodzi w tle, więc komórka ma trzy stany: pracuje (spinner),
 * zna odpowiedź (marka i model) albo nie znalazła nic („-"). Pusta komórka bez
 * spinnera i pusta komórka w trakcie pracy wyglądałyby tak samo, a to dwie różne
 * informacje dla kogoś, kto właśnie oznaczył leada.
 */
const VehicleSpinner = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};

    svg {
        width: 13px;
        height: 13px;
        animation: ${spin} 900ms linear infinite;
    }
`;

/**
 * Plakietka tagu - wszystkie i w całości, bez wielokropka. Ucinanie odbierało
 * kolumnie sens: „Powłoka cer…" i „Powłoka cer…" to dwa różne tagi, których nie da
 * się odróżnić. Nazwy bywają długie, więc plakietki zawijają się do drugiej linii
 * wewnątrz komórki, a wiersz rośnie - czytelność wygrywa z równą wysokością wierszy.
 */
const TagPill = styled.span`
    display: inline-block;
    white-space: nowrap;
    padding: 2px 8px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    font-size: 11.5px;
    color: ${p => p.theme.colors.textSecondary};
`;

/**
 * Wiersz jest kontenerem, nie przyciskiem: komórki, które da się edytować, muszą
 * być w środku własnymi przyciskami, a przycisk w przycisku to nieprawidłowy HTML
 * (i przeglądarka rozstrzyga go po swojemu). Klik na wiersz otwiera panel, klik na
 * edytowalną komórkę zatrzymuje się na niej.
 */
const Row = styled.div<{ $active?: boolean; $tone: ReplyTone }>`
    position: relative;
    display: grid;
    grid-template-columns: 1.7fr 1.1fr 1.6fr 0.8fr 1.3fr 0.8fr;
    gap: 10px;
    align-items: center;
    width: 100%;
    min-width: 880px;
    text-align: left;
    padding: 12px 20px 12px 23px;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : theme.colors.surface)};
    cursor: pointer;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
    &:last-child { border-bottom: none; }

    /*
     * Pasek pilności przy lewej krawędzi. Zaległość jest cechą całego leada,
     * a nie zawartością którejś komórki, więc mieszka na wierszu - i, co
     * ważniejsze, nie zabiera ani piksela szerokości tabeli. Skanuje się go
     * jednym spojrzeniem w dół listy, czego żadna plakietka w środku wiersza
     * nie potrafi. Sam kolor niczego nie niesie: to samo mówi znacznik
     * tekstowy w kolumnie „Status".
     */
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
            : 'transparent'};
    }

    .who {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }
    .who > span { min-width: 0; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub {
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
        font-weight: ${p => p.theme.fontWeights.normal};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .vehicle {
        color: ${p => p.theme.colors.textSecondary};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .value {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }
`;

/**
 * Komórka, którą da się poprawić na miejscu. Nie krzyczy - obramowanie pojawia się
 * dopiero pod kursorem, żeby tabela pozostała tabelą, a nie formularzem. Sygnał
 * „to jest klikalne" ma być dostępny, gdy ktoś go szuka, a nie narzucać się reszcie.
 */
const EditableCell = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    /* Zawijanie jest dla tagów, które bywają liczne. */
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
    text-align: left;
    border: 1px dashed transparent;
    border-radius: ${p => p.theme.radii.sm};
    background: transparent;
    padding: 3px 5px;
    margin: -3px -5px;
    font: inherit;
    color: inherit;
    cursor: pointer;

    &:hover, &:focus-visible {
        border-color: ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surface};
        outline: none;
    }

    .none { color: ${p => p.theme.colors.textMuted}; }
    .value {
        /* Bazowy rozmiar 0, więc przy logo marki obok tekst kurczy się w tej
           samej linii zamiast spaść pod nie - zawijanie zostaje dla tagów. */
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/** Etap i „czyj ruch" w jednej komórce tabeli, jedno pod drugim. */
const StatusStack = styled.span`
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
`;

/**
 * Etap leada: kropka i etykieta zdaniem, dokładnie tak jak w LeadStatusPicker,
 * który tę samą wartość pokazuje w oknie szczegółów.
 *
 * Wypełniona plakietka w każdym wierszu nie wyróżnia niczego - jeśli świeci
 * cała kolumna, nie świeci nic - a wersalikami i odstępem między literami
 * zjada szerokość, przez którą treść wchodziła na sąsiednią kolumnę. Kropka
 * niesie ten sam kolor na kilkunastu pikselach, a nazwa pisana normalnie
 * czyta się szybciej niż KAPITALIKAMI.
 */
const StatusLine = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};
    white-space: nowrap;
`;

const StatusDot = styled.span<{ $color: string }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$color};
`;
export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    /*
     * Filtry startowe czytane z adresu, jeden raz, przy pierwszym renderze.
     *
     * Analityka prowadzi tu z konkretnym pytaniem: „pokaż mi te zaległe rozmowy",
     * „pokaż przegrane". Bez tego kliknięcie kwoty wysyłałoby na nieprzefiltrowaną
     * listę i użytkownik musiałby odtworzyć filtr ręcznie - czyli kwota na
     * poprzednim ekranie byłaby twierdzeniem, a nie dowodem.
     *
     * Tylko wartość początkowa: dalej filtrami rządzą przyciski, więc kliknięcie
     * „Wszystkie" nie ma prawa zostać cofnięte przez parametr, który wciąż wisi
     * w adresie.
     */
    const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>(() => {
        const requested = searchParams.get('status');
        return LEAD_STATUS_FLOW.includes(requested as LeadStatus) ? (requested as LeadStatus) : undefined;
    });
    // „Do odpisania" to nie kolejny status, tylko zawężenie listy do leadów,
    // w których ostatnie słowo należy do klienta - czyli do naszej kolejki zaległości.
    const [awaitingReply, setAwaitingReply] = useState(() => searchParams.get('awaiting') === '1');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    // Okno szczegółów ma otworzyć się od razu na edytorze wyceny, gdy weszliśmy
    // do niego przez kliknięcie wartości leada w tabeli.
    const [openServicesEditor, setOpenServicesEditor] = useState(false);
    // Edycja komórki: który lead, które pole i pod czym zaczepić chmurkę.
    const [cellEditor, setCellEditor] = useState<
        { lead: Lead; field: LeadCellField; anchor: HTMLElement } | null
    >(null);

    const selectedLeadId = searchParams.get('lead');
    const selectLead = (leadId: string | null) => {
        setOpenServicesEditor(false);
        // Parametry filtrów zostały już przeczytane do stanu; w adresie zostaje
        // wyłącznie otwarty lead, żeby odświeżenie strony nie przywracało filtru,
        // który użytkownik w międzyczasie zdjął.
        setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
    };

    const { data: leadPage } = useLeads({
        status: statusFilter,
        query: query || undefined,
        awaitingReply: awaitingReply || undefined,
        page,
    });
    // Zmiana statusu prosto z tabeli - razem z pytaniem o powód przegranej.
    const status = useLeadStatusChange();
    // Zmiany leadów przychodzą WebSocketem - spinner przy rozpoznawaniu auta
    // zamienia się w wynik bez odświeżania strony.
    useLeadsSocket();
    const mailboxSync = useMailboxSyncState();
    /*
     * Zaległości do paska nad listą. Okres bieżącego miesiąca, ten sam co domyślny
     * w analityce - dzięki temu przejście między widokami trafia w tę samą pamięć
     * podręczną i nie kosztuje drugiego zapytania. Same zaległości i tak liczą się
     * poza oknem, więc wybór okresu na nie nie wpływa.
     */
    const [statsPeriod] = useState(() => buildPeriod('current', new Date()));
    const { data: analytics } = useLeadAnalytics(statsPeriod.from, statsPeriod.to);
    const owed = analytics?.awaiting;

    const openCellEditor = (
        event: MouseEvent<HTMLButtonElement>,
        item: Lead,
        field: LeadCellField
    ) => {
        // Bez tego kliknięcie doszłoby do wiersza i otworzyło panel pod chmurką.
        event.stopPropagation();
        setCellEditor({ lead: item, field, anchor: event.currentTarget });
    };

    /** Wartość leada to suma wyceny - kliknięcie prowadzi do edytora usług w oknie. */
    const editServicesOf = (item: Lead) => {
        setOpenServicesEditor(true);
        setSearchParams({ lead: item.id }, { replace: true });
    };

    // Pierwsza synchronizacja skrzynki w toku: leady dopiero powstają z nadciągającej
    // poczty, więc tabela rosnąca z sekundy na sekundę wyglądałaby jak zepsuta,
    // nie jak niepełna. Jeden spokojny ekran z postępem zamiast tego.
    if (mailboxSync.syncing) {
        return (
            <ViewContainer>
                <PageHeader title="Leady" subtitle="Zapytania od potencjalnych klientów" />
                <SurfaceCard>
                    <MailboxSyncPanel />
                </SurfaceCard>
            </ViewContainer>
        );
    }

    return (
        <ViewContainer>
            <PageHeader
                title="Leady"
                subtitle={
                    leadPage
                        ? `${leadPage.total} ${leadPage.total === 1 ? 'zapytanie' : 'zapytań'} w tym widoku`
                        : 'Zapytania od potencjalnych klientów'
                }
                actions={
                    <Link to="/leads/analytics">
                        <PageHeaderGhostButton as="span">
                            <BarChart3 /> Analityka
                        </PageHeaderGhostButton>
                    </Link>
                }
            />

            {owed && owed.count > 0 && !awaitingReply && (
                <OwedStrip
                    type="button"
                    title="Pokaż rozmowy, w których czekamy z odpowiedzią"
                    onClick={() => { setAwaitingReply(true); setPage(0); }}
                >
                    {/* Bez groszy: to jest kwota-hasło, nie pozycja na fakturze. */}
                    <span className="amount">{formatMoney(owed.value)}</span>
                    <span className="text">
                        czeka na Twoją odpowiedź w{' '}
                        <strong>{owed.count} {owed.count === 1 ? 'rozmowie' : 'rozmowach'}</strong>
                        {owed.oldest && (
                            <>
                                {' - najdłużej '}
                                <strong>{owed.oldest.name}</strong>
                                {owed.oldest.vehicle && <>, {owed.oldest.vehicle}</>}
                                {owed.oldest.waitingDays > 0 && <>, {owed.oldest.waitingDays} dni</>}
                            </>
                        )}
                    </span>
                    <ArrowRight />
                </OwedStrip>
            )}

            <FiltersRow>
                <FilterChip $active={!statusFilter} onClick={() => { setStatusFilter(undefined); setPage(0); }}>
                    Wszystkie
                </FilterChip>
                {LEAD_STATUS_FLOW.map((option) => (
                    <FilterChip
                        key={option}
                        $active={statusFilter === option}
                        onClick={() => { setStatusFilter(option); setPage(0); }}
                    >
                        {LEAD_STATUS_LABELS[option]}
                    </FilterChip>
                ))}
                {/* Stoi za statusami i wizualnie osobno, bo to inna oś: statusy dzielą
                    leady po etapie, ten filtr - po tym, kto ma teraz ruch. Można je
                    złożyć („W kontakcie" + „Do odpisania"), i o to chodzi. */}
                <FilterSeparator />
                <FilterChip
                    $active={awaitingReply}
                    title="Leady, w których ostatnie słowo należy do klienta"
                    onClick={() => { setAwaitingReply((current) => !current); setPage(0); }}
                >
                    Do odpisania
                </FilterChip>
                <SearchBox>
                    <Search size={14} />
                    <input
                        placeholder="Szukaj po adresie, telefonie, nazwisku…"
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                    />
                </SearchBox>
            </FiltersRow>

            <SurfaceCard>
                <TableScroll>
                    <HeadRow>
                        <span>Kontakt</span>
                        <span>Pojazd</span>
                        <span>Tagi</span>
                        <span>Wartość</span>
                        <span>Status</span>
                        <span>Utworzony</span>
                    </HeadRow>
                    {leadPage && leadPage.items.length === 0 && (
                        <EmptyHint>Brak leadów w tym widoku</EmptyHint>
                    )}
                    {(leadPage?.items ?? []).map((item) => (
                        <Row
                            key={item.id}
                            $active={item.id === selectedLeadId}
                            $tone={leadReplyTone(
                                item.replyState,
                                item.waitingSince,
                                CLOSED_STATUSES.has(item.status)
                            )}
                            role="button"
                            tabIndex={0}
                            onClick={() => selectLead(item.id)}
                            onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                selectLead(item.id);
                            }}
                        >
                            <span className="who">
                                <LeadSourceIcon source={item.source} />
                                <span>
                                    <span className="name">{item.customerName ?? item.contactIdentifier}</span>
                                    {item.customerName && <div className="sub">{item.contactIdentifier}</div>}
                                </span>
                            </span>

                            {item.vehicleDetectionStatus === 'PENDING' ? (
                                <span className="vehicle">
                                    <VehicleSpinner title="Rozpoznajemy auto z korespondencji">
                                        <Loader2 /> Rozpoznaję…
                                    </VehicleSpinner>
                                </span>
                            ) : (
                                <EditableCell
                                    type="button"
                                    title="Kliknij, żeby poprawić pojazd"
                                    onClick={(event) => openCellEditor(event, item, 'vehicle')}
                                >
                                    {/* Awatar marki, ten sam co w module pojazdów: w kolumnie
                                        pełnej podobnych do siebie napisów logo jest znakiem,
                                        który wpada w oko przed przeczytaniem nazwy. Bez marki
                                        nie ma czego pokazać - zostaje samo „-". */}
                                    {item.vehicleBrand && <CarLogoImage brand={item.vehicleBrand} size="xs" />}
                                    <span className={formatVehicle(item) ? 'value' : 'value none'}>
                                        {formatVehicle(item) ?? '-'}
                                    </span>
                                </EditableCell>
                            )}

                            <EditableCell
                                type="button"
                                title="Kliknij, żeby zmienić tagi"
                                onClick={(event) => openCellEditor(event, item, 'tags')}
                            >
                                {item.tagLabels.length === 0 && <span className="none">-</span>}
                                {item.tagLabels.map((label) => (
                                    <TagPill key={label}>{label}</TagPill>
                                ))}
                            </EditableCell>

                            <EditableCell
                                type="button"
                                title="Kliknij, żeby otworzyć wycenę"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    editServicesOf(item);
                                }}
                            >
                                {/* Wartość to suma wyceny, więc nie da się jej wpisać wprost -
                                    kliknięcie prowadzi tam, gdzie ta liczba naprawdę powstaje. */}
                                <span className="value" style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {item.estimatedValue > 0 ? formatGrosze(item.estimatedValue) : '-'}
                                </span>
                            </EditableCell>

                            <EditableCell
                                type="button"
                                title="Kliknij, żeby zmienić status"
                                onClick={(event) => openCellEditor(event, item, 'status')}
                            >
                                {/* Etap i „czyj ruch" jedno pod drugim: to dwie odpowiedzi
                                    na dwa różne pytania o ten sam lead, a rozdzielone
                                    na dwie kolumny kazałyby wodzić wzrokiem w bok. */}
                                <StatusStack>
                                    <StatusLine>
                                        <StatusDot $color={LEAD_STATUS_COLORS[item.status].fg} />
                                        {LEAD_STATUS_LABELS[item.status]}
                                    </StatusLine>
                                    <LeadReplyBadge
                                        replyState={item.replyState}
                                        waitingSince={item.waitingSince}
                                        muted={CLOSED_STATUSES.has(item.status)}
                                    />
                                </StatusStack>
                            </EditableCell>

                            <span>{formatRelativeTime(item.createdAt)}</span>
                        </Row>
                    ))}
                </TableScroll>
            </SurfaceCard>

            {selectedLeadId && (
                <LeadDetailModal
                    // Remount na każdego leada: stan edycji (wycena, pojazd) należy
                    // do jednego otwarcia i nie ma prawa przejść na następnego.
                    key={selectedLeadId}
                    leadId={selectedLeadId}
                    openServicesEditor={openServicesEditor}
                    onClose={() => selectLead(null)}
                />
            )}

            {cellEditor && (
                <LeadCellEditor
                    // Remount na każdą komórkę zeruje pola bez efektu synchronizującego stan.
                    key={`${cellEditor.lead.id}-${cellEditor.field}`}
                    lead={cellEditor.lead}
                    field={cellEditor.field}
                    anchor={cellEditor.anchor}
                    onClose={() => setCellEditor(null)}
                    onRequestLost={status.requestLost}
                    onChangeStatus={status.requestStatus}
                />
            )}

            {status.lostDialog}
        </ViewContainer>
    );
}
