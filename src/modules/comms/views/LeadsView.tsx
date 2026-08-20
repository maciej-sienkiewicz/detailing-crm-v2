// src/modules/comms/views/LeadsView.tsx
// Pipeline leadów w języku wizualnym reszty aplikacji: wspólny PageHeader,
// karty-powierzchnie, Badge, tokeny motywu. Szczegóły w wysuwanym panelu;
// zamknięcie jako „przegrany" wymusza wybór powodu ze słownika.
import { useMemo, useState, type MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { BarChart3, CalendarPlus, Car, Globe, Loader2, Mail, Phone, Search, Trash2, User } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { Badge } from '@/common/components/Badge';
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
import { EditableServicesTable } from '@/modules/checkin/components/EditableServicesTable';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { useVehicleMetadata } from '@/modules/vehicles/hooks/useVehicleMetadata';
import { useToast } from '@/common/components/Toast';
import {
    useChangeLeadStatus,
    useDeleteLead,
    useLeadsSocket,
    useUpdateLeadVehicle,
    useLead,
    useLeadDictionaries,
    useLeadHistory,
    useLeads,
    useUpdateLeadServices,
} from '../hooks/useLeads';
import { LeadCellEditor, type LeadCellField } from '../components/LeadCellEditor';
import { LeadStatusPicker } from '../components/LeadStatusPicker';
import { BookingFlowModal } from '@/modules/calendar';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { useContactCard } from '../hooks/useComms';
import { toLeadInputs, toServiceLines, totalGrossOf } from '../utils/leadServiceLines';
import {
    LEAD_STATUS_FLOW,
    LEAD_STATUS_LABELS,
    type Lead,
    type LeadServiceItemInput,
    type LeadStatus,
} from '../types';
import {
    EmptyHint,
    FilterChip,
    IconButton,
    PrimaryButton,
    SurfaceCard,
    formatDateTime,
    formatGrosze,
    formatRelativeTime,
} from '../components/shared';

/** „Marka Model" albo null, gdy nie rozpoznano — jedno miejsce na tę składankę. */
const formatVehicle = (lead: { vehicleBrand: string | null; vehicleModel: string | null }): string | null =>
    lead.vehicleBrand
        ? `${lead.vehicleBrand}${lead.vehicleModel ? ` ${lead.vehicleModel}` : ''}`
        : null;

const STATUS_BADGE_VARIANT: Record<LeadStatus, 'success' | 'error' | 'warning' | 'info' | 'primary'> = {
    NEW: 'primary',
    IN_PROGRESS: 'warning',
    CONFIRMED: 'success',
    COMPLETED: 'success',
    LOST: 'error',
    NO_SHOW: 'error',
};

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
    grid-template-columns: 1.7fr 1.1fr 2fr 0.9fr 0.9fr 0.8fr;
    gap: 10px;
    padding: 12px 20px;
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
 * zna odpowiedź (marka i model) albo nie znalazła nic („—"). Pusta komórka bez
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
 * Plakietka tagu — wszystkie i w całości, bez wielokropka. Ucinanie odbierało
 * kolumnie sens: „Powłoka cer…" i „Powłoka cer…" to dwa różne tagi, których nie da
 * się odróżnić. Nazwy bywają długie, więc plakietki zawijają się do drugiej linii
 * wewnątrz komórki, a wiersz rośnie — czytelność wygrywa z równą wysokością wierszy.
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
const Row = styled.div<{ $active?: boolean }>`
    display: grid;
    grid-template-columns: 1.7fr 1.1fr 2fr 0.9fr 0.9fr 0.8fr;
    gap: 10px;
    align-items: center;
    width: 100%;
    min-width: 880px;
    text-align: left;
    padding: 12px 20px;
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
 * Komórka, którą da się poprawić na miejscu. Nie krzyczy — obramowanie pojawia się
 * dopiero pod kursorem, żeby tabela pozostała tabelą, a nie formularzem. Sygnał
 * „to jest klikalne" ma być dostępny, gdy ktoś go szuka, a nie narzucać się reszcie.
 */
const EditableCell = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
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
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

// ── Okno szczegółów ──────────────────────────────────────────────────────────
//
// Modal, nie panel boczny. Szczegóły leada to przede wszystkim wycena, a wycena
// jest tabelą: nazwa usługi, netto, VAT, brutto, rabat, notatka. Wąska szpalta
// przy krawędzi ekranu ucinała nazwy do jednej litery i ściskała liczby tak, że
// nie dało się ich porównać — a wycena, której nie da się przeczytać, nie jest
// wyceną. Szeroki modal daje tabeli szerokość, której potrzebuje, i pozwala
// ustawić drobniejsze fakty (pojazd, status) obok siebie zamiast jeden pod drugim.

/** Fakty, które mieszczą się w dwóch kolumnach: pojazd i status. */
const FactGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: 1fr;
    }
`;

const Panel = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 14px 16px;
    background: ${p => p.theme.colors.surface};
    min-width: 0;

    h4 {
        margin: 0;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const ModalBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Podtytuł okna: skąd przyszedł lead i jak się z nim skontaktować. */
const LeadIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

const VehicleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: ${p => p.theme.colors.text};

    svg { color: ${p => p.theme.colors.textMuted}; flex-shrink: 0; }
    .grow { flex: 1; min-width: 0; }
    .muted { color: ${p => p.theme.colors.textMuted}; }
`;

const VehiclePickers = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    select {
        width: 100%;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        color: ${p => p.theme.colors.text};
        background: #ffffff;
    }
`;

const ServiceLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    .grow { flex: 1; min-width: 0; }
    .qty {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: ${p => p.theme.colors.textMuted};
    }
    .qty button {
        border: 1px solid ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surface};
        border-radius: ${p => p.theme.radii.sm};
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${p => p.theme.colors.textMuted};
        padding: 0;
    }
    button.remove {
        border: none;
        background: none;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 2px;
    }
`;

const TotalLine = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    padding-top: 6px;
    border-top: 1px dashed ${p => p.theme.colors.border};
    font-variant-numeric: tabular-nums;
`;

/** Jedyna akcja nieodwracalna w tym widoku — i jedyna, która wygląda groźnie. */
const DangerButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    align-self: flex-start;
    border: 1px solid rgba(220, 38, 38, 0.28);
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.error};
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 14px;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.errorLight}; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

const HistoryLine = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};

    strong { color: ${p => p.theme.colors.text}; }
`;

/**
 * Treść pierwszego pytania klienta. Zachowuje łamanie wierszy z maila i przewija się
 * w miejscu — dłuższe zapytanie nie ma prawa rozpychać panelu na cały ekran, a jego
 * skrócenie do jednej linijki zabierałoby dokładnie to, po co się tu zagląda.
 */
const MessageQuote = styled(HistoryLine)`
    max-height: 190px;
    overflow-y: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.55;
`;

// ── Dialog powodu przegranej ─────────────────────────────────────────────────

const LostDialog = styled.div`
    position: fixed;
    inset: 0;
    /* Ponad oknem szczegółów (ModalOverlay ma 1000) — pytanie o powód przegranej
       pada właśnie z tamtego okna i musi być nad nim, a nie za nim. */
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.45);
    padding: 16px;
`;

const LostCard = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: ${p => p.theme.shadows.xl};
    padding: 20px;
    width: 380px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;

    h4 { margin: 0; font-size: 15px; color: ${p => p.theme.colors.text}; }
    textarea {
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        min-height: 60px;
        outline: none;
        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }
`;

const ReasonOption = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    background: ${({ $active }) => ($active ? 'rgba(14, 165, 233, 0.06)' : 'transparent')};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 12px;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

function SourceIcon({ source }: { source: Lead['source'] }) {
    if (source === 'PHONE') return <Phone size={13} color="#94a3b8" />;
    if (source === 'EMAIL') return <Mail size={13} color="#94a3b8" />;
    // Formularz ze strony — inne źródło znaczy inną rozmowę, więc i inna ikona.
    if (source === 'FORM') return <Globe size={13} color="#94a3b8" />;
    return <User size={13} color="#94a3b8" />;
}

export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [lostDialogFor, setLostDialogFor] = useState<string | null>(null);
    const [lostReason, setLostReason] = useState<string | null>(null);
    const [lostNote, setLostNote] = useState('');
    // null = podgląd, tablica = otwarty edytor wyceny (ten sam co przy przyjęciu auta).
    const [editingServices, setEditingServices] = useState<ServiceLineItem[] | null>(null);
    // null = podgląd, obiekt = edycja pojazdu. Marka i model wybierane z katalogu,
    // bo wpisane ręcznie „bèemka" psułaby wyszukiwanie tak samo jak surowy tekst z LLM-a.
    const [editingVehicle, setEditingVehicle] = useState<{ brand: string; model: string } | null>(null);
    const [deleteDialogFor, setDeleteDialogFor] = useState<string | null>(null);
    // Otwarty kreator rezerwacji (kalendarz → formularz) dla leada o tym id.
    const [bookingFor, setBookingFor] = useState<string | null>(null);
    // Edycja komórki: który lead, które pole i pod czym zaczepić chmurkę.
    const [cellEditor, setCellEditor] = useState<
        { lead: Lead; field: LeadCellField; anchor: HTMLElement } | null
    >(null);

    const selectedLeadId = searchParams.get('lead');
    const selectLead = (leadId: string | null) => {
        setEditingServices(null);
        setEditingVehicle(null);
        setBookingFor(null);
        setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
    };

    const { data: leadPage } = useLeads({ status: statusFilter, query: query || undefined, page });
    const { data: lead } = useLead(selectedLeadId);
    const { data: history } = useLeadHistory(selectedLeadId);
    const { data: dictionaries } = useLeadDictionaries();
    // Kartoteka kontaktu — stąd bierzemy telefon i auta klienta do rezerwacji.
    // Pobierana dopiero, gdy panel jest otwarty: lista leadów jej nie potrzebuje.
    const { data: contactCard } = useContactCard(lead?.contactIdentifier ?? null, {
        enabled: Boolean(lead?.contactIdentifier),
    });
    // Ten sam katalog, którym backend kanonizuje odczyt z korespondencji — ręczna
    // korekta nie ma prawa wprowadzić wartości, których backend potem nie przyjmie.
    const { data: vehicleCatalog } = useVehicleMetadata();
    const vehicleBrands = useMemo(
        () => (vehicleCatalog ?? []).map((entry) => entry.marka),
        [vehicleCatalog]
    );
    const vehicleModels = useMemo(
        () => (vehicleCatalog ?? []).find((entry) => entry.marka === editingVehicle?.brand)?.modele ?? [],
        [vehicleCatalog, editingVehicle?.brand]
    );
    const changeStatus = useChangeLeadStatus();
    const updateVehicle = useUpdateLeadVehicle();
    const updateServices = useUpdateLeadServices();
    const deleteLead = useDeleteLead();
    const { showSuccess, showError } = useToast();
    // Zmiany leadów przychodzą WebSocketem — spinner przy rozpoznawaniu auta
    // zamienia się w wynik bez odświeżania strony.
    useLeadsSocket();

    const editedTotal = useMemo(
        () => totalGrossOf(editingServices ?? []),
        [editingServices]
    );

    const saveVehicle = (leadId: string) => {
        if (!editingVehicle) return;
        updateVehicle.mutate(
            {
                leadId,
                vehicleBrand: editingVehicle.brand || null,
                vehicleModel: editingVehicle.model || null,
            },
            {
                onSuccess: () => {
                    setEditingVehicle(null);
                    showSuccess('Pojazd zapisany');
                },
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się zapisać pojazdu', message ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    const requestStatus = (leadId: string, status: LeadStatus) => {
        if (status === 'LOST') {
            setLostReason(null);
            setLostNote('');
            setLostDialogFor(leadId);
            return;
        }
        changeStatus.mutate(
            { leadId, status },
            {
                onError: (error) => {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message;
                    showError('Nie udało się zmienić statusu', message);
                },
            }
        );
    };

    const confirmLost = () => {
        if (!lostDialogFor || !lostReason) return;
        changeStatus.mutate(
            { leadId: lostDialogFor, status: 'LOST', lostReasonCode: lostReason, lostNote: lostNote || undefined },
            { onSuccess: () => setLostDialogFor(null) }
        );
    };

    const openCellEditor = (
        event: MouseEvent<HTMLButtonElement>,
        item: Lead,
        field: LeadCellField
    ) => {
        // Bez tego kliknięcie doszłoby do wiersza i otworzyło panel pod chmurką.
        event.stopPropagation();
        setCellEditor({ lead: item, field, anchor: event.currentTarget });
    };

    /** Wartość leada to suma wyceny — kliknięcie prowadzi do edytora usług w panelu. */
    const editServicesOf = (item: Lead) => {
        setSearchParams({ lead: item.id }, { replace: true });
        setEditingVehicle(null);
        setEditingServices(toServiceLines(item.services));
    };

    const confirmDelete = () => {
        const leadId = deleteDialogFor;
        if (!leadId) return;
        // Panel zamykamy PRZED wysłaniem żądania. Otwarty odpytuje `GET /leads/{id}`
        // i `…/history`; unieważnienie cache po usunięciu kazałoby mu pobrać leada,
        // którego już nie ma — i obok „Lead usunięty" wyskakiwało „Nie znaleziono
        // leada" z globalnego przechwytywacza błędów. Odmontowany panel nie pyta.
        setDeleteDialogFor(null);
        selectLead(null);
        deleteLead.mutate(leadId, {
            onSuccess: () => showSuccess('Lead usunięty', 'Korespondencja została w skrzynce'),
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się usunąć leada', message ?? 'Spróbuj ponownie');
            },
        });
    };

    const saveServices = () => {
        if (!lead || !editingServices) return;
        const payload: LeadServiceItemInput[] = toLeadInputs(editingServices);
        updateServices.mutate(
            { leadId: lead.id, services: payload },
            {
                onSuccess: () => {
                    setEditingServices(null);
                    showSuccess('Zapisano usługi');
                },
            }
        );
    };

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

            <FiltersRow>
                <FilterChip $active={!statusFilter} onClick={() => { setStatusFilter(undefined); setPage(0); }}>
                    Wszystkie
                </FilterChip>
                {LEAD_STATUS_FLOW.map((status) => (
                    <FilterChip
                        key={status}
                        $active={statusFilter === status}
                        onClick={() => { setStatusFilter(status); setPage(0); }}
                    >
                        {LEAD_STATUS_LABELS[status]}
                    </FilterChip>
                ))}
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
                                <SourceIcon source={item.source} />
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
                                    <span className={formatVehicle(item) ? 'value' : 'value none'}>
                                        {formatVehicle(item) ?? '—'}
                                    </span>
                                </EditableCell>
                            )}

                            <EditableCell
                                type="button"
                                title="Kliknij, żeby zmienić tagi"
                                onClick={(event) => openCellEditor(event, item, 'tags')}
                            >
                                {item.tagLabels.length === 0 && <span className="none">—</span>}
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
                                {/* Wartość to suma wyceny, więc nie da się jej wpisać wprost —
                                    kliknięcie prowadzi tam, gdzie ta liczba naprawdę powstaje. */}
                                <span className="value" style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {item.estimatedValue > 0 ? formatGrosze(item.estimatedValue) : '—'}
                                </span>
                            </EditableCell>

                            <EditableCell
                                type="button"
                                title="Kliknij, żeby zmienić status"
                                onClick={(event) => openCellEditor(event, item, 'status')}
                            >
                                <Badge $variant={STATUS_BADGE_VARIANT[item.status]}>
                                    {LEAD_STATUS_LABELS[item.status]}
                                </Badge>
                            </EditableCell>

                            <span>{formatRelativeTime(item.createdAt)}</span>
                        </Row>
                    ))}
                </TableScroll>
            </SurfaceCard>

            {/* Panel szczegółów znika na czas kreatora rezerwacji. Dwie nałożone
                nakładki nie pokrywają się geometrycznie — formularz rezerwacji jest
                przesunięty o szerokość sidebara, panel leada nie — więc jedna z nich
                przyciemniała i rozmywała kawałek ekranu drugi raz, zostawiając widoczny
                pionowy szew. Kreator i tak zakrywa panel w całości. */}
            {lead && !bookingFor && (
                <ModalShell isOpen onClose={() => selectLead(null)} maxWidth="1040px">
                    <ModalHeader>
                        <ModalTitleGroup>
                            <ModalTitle>{lead.customerName ?? lead.contactIdentifier}</ModalTitle>
                            <LeadIdentity>
                                <SourceIcon source={lead.source} />
                                {lead.contactIdentifier}
                                {lead.threadId && (
                                    <Link to={`/communication?thread=${lead.threadId}`}>
                                        <Badge $variant="info" style={{ cursor: 'pointer' }}>
                                            Zobacz korespondencję
                                        </Badge>
                                    </Link>
                                )}
                            </LeadIdentity>
                        </ModalTitleGroup>
                        <CloseBtn onClick={() => selectLead(null)} />
                    </ModalHeader>

                    <ModalContent>
                        <ModalBody>
                            <FactGrid>
                                <Panel>
                                    <h4>Pojazd</h4>
                                    {lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null ? (
                                        <VehicleRow className="muted">
                                            <Loader2 size={14} style={{ animation: 'none' }} />
                                            Rozpoznajemy auto z korespondencji…
                                        </VehicleRow>
                                    ) : editingVehicle === null ? (
                                        <VehicleRow>
                                            <Car size={15} />
                                            <span className="grow">
                                                {formatVehicle(lead) ?? <span className="muted">Nie rozpoznano auta</span>}
                                            </span>
                                            <IconButton
                                                onClick={() => setEditingVehicle({
                                                    brand: lead.vehicleBrand ?? '',
                                                    model: lead.vehicleModel ?? '',
                                                })}
                                            >
                                                {lead.vehicleBrand ? 'Zmień' : 'Uzupełnij'}
                                            </IconButton>
                                        </VehicleRow>
                                    ) : (
                                        <>
                                            <VehiclePickers>
                                                <select
                                                    value={editingVehicle.brand}
                                                    onChange={(event) => setEditingVehicle({
                                                        brand: event.target.value,
                                                        // Zmiana marki zeruje model: modele są per marka,
                                                        // a zostawiony stary nie przeszedłby walidacji.
                                                        model: '',
                                                    })}
                                                    aria-label="Marka"
                                                >
                                                    <option value="">Marka…</option>
                                                    {vehicleBrands.map((brand) => (
                                                        <option key={brand} value={brand}>{brand}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={editingVehicle.model}
                                                    onChange={(event) => setEditingVehicle({
                                                        brand: editingVehicle.brand,
                                                        model: event.target.value,
                                                    })}
                                                    disabled={!editingVehicle.brand}
                                                    aria-label="Model"
                                                >
                                                    <option value="">Model…</option>
                                                    {vehicleModels.map((model) => (
                                                        <option key={model} value={model}>{model}</option>
                                                    ))}
                                                </select>
                                            </VehiclePickers>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <PrimaryButton
                                                    onClick={() => saveVehicle(lead.id)}
                                                    disabled={updateVehicle.isPending}
                                                >
                                                    {updateVehicle.isPending ? 'Zapisywanie…' : 'Zapisz'}
                                                </PrimaryButton>
                                                <IconButton onClick={() => setEditingVehicle(null)}>Anuluj</IconButton>
                                            </div>
                                        </>
                                    )}
                                </Panel>

                                <Panel>
                                    <h4>Status</h4>
                                    <LeadStatusPicker
                                        status={lead.status}
                                        disabled={changeStatus.isPending}
                                        onChange={(status) => requestStatus(lead.id, status)}
                                    />
                                    {lead.status === 'LOST' && lead.lostReasonLabel && (
                                        <HistoryLine>
                                            Powód przegranej: <strong>{lead.lostReasonLabel}</strong>
                                            {lead.lostReason && <> — {lead.lostReason}</>}
                                        </HistoryLine>
                                    )}
                                </Panel>
                            </FactGrid>

                            <Panel>
                                <h4>Usługi i wycena</h4>
                                {editingServices === null && (
                                    <>
                                        {lead.services.length === 0 && (
                                            <HistoryLine>Nie przypisano jeszcze usług.</HistoryLine>
                                        )}
                                        {lead.services.map((item) => (
                                            <ServiceLine key={item.id}>
                                                <span className="grow">
                                                    {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                                </span>
                                                <span>{formatGrosze(item.totalGross)}</span>
                                            </ServiceLine>
                                        ))}
                                        {lead.estimatedValue > 0 && (
                                            <TotalLine>
                                                <span>Razem</span>
                                                <span>{formatGrosze(lead.estimatedValue)}</span>
                                            </TotalLine>
                                        )}
                                        <IconButton
                                            style={{ alignSelf: 'flex-start' }}
                                            onClick={() => setEditingServices(toServiceLines(lead.services))}
                                        >
                                            Edytuj usługi
                                        </IconButton>
                                    </>
                                )}
                                {editingServices !== null && (
                                    <>
                                        {/* Ten sam edytor co przy przyjęciu pojazdu: rabaty, notatka
                                            do pozycji, korekta ceny i podpowiedzi z cennika. Lead nie
                                            potrzebuje własnej, uboższej listy — wycena to ta sama
                                            czynność, tylko wcześniej. */}
                                        <EditableServicesTable
                                            services={editingServices}
                                            onChange={setEditingServices}
                                        />
                                        <TotalLine>
                                            <span>Razem</span>
                                            <span>{formatGrosze(editedTotal)}</span>
                                        </TotalLine>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <PrimaryButton onClick={saveServices} disabled={updateServices.isPending}>
                                                Zapisz
                                            </PrimaryButton>
                                            <IconButton onClick={() => setEditingServices(null)}>Anuluj</IconButton>
                                        </div>
                                    </>
                                )}
                            </Panel>

                            <FactGrid>
                                <Panel>
                                    <h4>Pierwsza wiadomość</h4>
                                    <MessageQuote>
                                        {lead.initialMessage ?? 'Brak treści pierwszej wiadomości.'}
                                    </MessageQuote>
                                </Panel>

                                <Panel>
                                    <h4>Historia</h4>
                                    {(history ?? []).length === 0 && (
                                        <HistoryLine>Brak zmian statusu.</HistoryLine>
                                    )}
                                    {(history ?? []).map((entry, index) => (
                                        <HistoryLine key={index}>
                                            {formatDateTime(entry.createdAt)} —{' '}
                                            <strong>{LEAD_STATUS_LABELS[entry.toStatus]}</strong>
                                            {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                                            {entry.changedByName && <> · {entry.changedByName}</>}
                                        </HistoryLine>
                                    ))}
                                </Panel>
                            </FactGrid>
                        </ModalBody>
                    </ModalContent>

                    <ModalFooter>
                        {/* Usunięcie stoi po lewej, z dala od „Zamknij" — dwie akcje o wprost
                            przeciwnych skutkach nie mają prawa sąsiadować pod kursorem. */}
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setDeleteDialogFor(lead.id)}
                            disabled={deleteLead.isPending}
                        >
                            <Trash2 size={14} /> Usuń lead
                        </DangerButton>
                        {/* Rezerwacja to naturalne zakończenie leada, więc akcja stoi
                            jako główna. Gdy termin już jest, przycisk prowadzi do niego
                            zamiast pozwalać założyć drugi — backend i tak by odmówił. */}
                        {lead.appointmentId ? (
                            <Link to="/calendar">
                                <IconButton type="button">
                                    <CalendarPlus size={14} /> Zobacz w kalendarzu
                                </IconButton>
                            </Link>
                        ) : (
                            <PrimaryButton type="button" onClick={() => setBookingFor(lead.id)}>
                                <CalendarPlus size={14} /> Stwórz rezerwację
                            </PrimaryButton>
                        )}
                        <IconButton onClick={() => selectLead(null)}>Zamknij</IconButton>
                    </ModalFooter>
                </ModalShell>
            )}

            {cellEditor && (
                <LeadCellEditor
                    // Remount na każdą komórkę zeruje pola bez efektu synchronizującego stan.
                    key={`${cellEditor.lead.id}-${cellEditor.field}`}
                    lead={cellEditor.lead}
                    field={cellEditor.field}
                    anchor={cellEditor.anchor}
                    onClose={() => setCellEditor(null)}
                    onRequestLost={(leadId) => {
                        setLostReason(null);
                        setLostNote('');
                        setLostDialogFor(leadId);
                    }}
                    onChangeStatus={requestStatus}
                />
            )}

            {lead && bookingFor === lead.id && (
                <BookingFlowModal
                    leadId={lead.id}
                    subtitle={lead.customerName ?? lead.contactIdentifier}
                    prefill={leadToBookingPrefill(lead, contactCard)}
                    onClose={() => setBookingFor(null)}
                    onBooked={() => setBookingFor(null)}
                />
            )}

            <ConfirmationModal
                isOpen={deleteDialogFor !== null}
                title="Usunąć ten lead?"
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogFor(null)}
            />

            {lostDialogFor && (
                <LostDialog onClick={() => setLostDialogFor(null)}>
                    <LostCard onClick={(event) => event.stopPropagation()}>
                        <h4>Dlaczego przegraliśmy to zapytanie?</h4>
                        {(dictionaries?.lostReasons ?? []).map((reason) => (
                            <ReasonOption
                                key={reason.code}
                                $active={lostReason === reason.code}
                                onClick={() => setLostReason(reason.code)}
                            >
                                {reason.label}
                            </ReasonOption>
                        ))}
                        <textarea
                            placeholder="Notatka (opcjonalnie)"
                            value={lostNote}
                            onChange={(event) => setLostNote(event.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <IconButton onClick={() => setLostDialogFor(null)}>Anuluj</IconButton>
                            <PrimaryButton disabled={!lostReason || changeStatus.isPending} onClick={confirmLost}>
                                Zamknij jako przegrany
                            </PrimaryButton>
                        </div>
                    </LostCard>
                </LostDialog>
            )}
        </ViewContainer>
    );
}
