// src/modules/comms/views/LeadsView.tsx
// Pipeline leadów w języku wizualnym reszty aplikacji: wspólny PageHeader,
// karty-powierzchnie, Badge, tokeny motywu. Szczegóły w wysuwanym panelu;
// zamknięcie jako „przegrany" wymusza wybór powodu ze słownika.
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { BarChart3, Car, Check, Loader2, Mail, Minus, Phone, Plus, Search, User, X } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { Badge } from '@/common/components/Badge';
import { useServices } from '@/modules/services';
import { useVehicleMetadata } from '@/modules/vehicles/hooks/useVehicleMetadata';
import { useToast } from '@/common/components/Toast';
import {
    useChangeLeadStatus,
    useLeadsSocket,
    useUpdateLeadVehicle,
    useLead,
    useLeadDictionaries,
    useLeadHistory,
    useLeads,
    useUpdateLeadServices,
} from '../hooks/useLeads';
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
    grid-template-columns: 1.9fr 1.2fr 1.4fr 1fr 1fr 0.9fr;
    gap: 10px;
    padding: 12px 20px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    min-width: 780px;
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

/** Tagi w wierszu: dwa pierwsze plus licznik reszty — kolumna ma pozostać wąska. */
const TagCell = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
    overflow: hidden;

    .none { color: ${p => p.theme.colors.textMuted}; }
`;

const TagPill = styled.span`
    display: inline-block;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 8px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    font-size: 11.5px;
    color: ${p => p.theme.colors.textSecondary};
`;

const Row = styled.button<{ $active?: boolean }>`
    display: grid;
    grid-template-columns: 1.9fr 1.2fr 1.4fr 1fr 1fr 0.9fr;
    gap: 10px;
    align-items: center;
    width: 100%;
    min-width: 780px;
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

// ── Panel szczegółów ─────────────────────────────────────────────────────────

const DrawerOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    z-index: 70;
`;

const Drawer = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 440px;
    max-width: 100vw;
    background: ${p => p.theme.colors.surface};
    z-index: 71;
    box-shadow: ${p => p.theme.shadows.xl};
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`;

const DrawerHeader = styled.div`
    padding: 18px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    background: ${p => p.theme.colors.surfaceAlt};

    h3 {
        margin: 0 0 2px;
        font-size: 16px;
        color: ${p => p.theme.colors.text};
        overflow-wrap: anywhere;
    }
    .sub {
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }
    button.close {
        border: none;
        background: none;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 4px;
        &:hover { color: ${p => p.theme.colors.textSecondary}; }
    }
`;

const DrawerSection = styled.section`
    padding: 14px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    display: flex;
    flex-direction: column;
    gap: 8px;

    h4 {
        margin: 0;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }
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

const StatusGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const StatusOption = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.border)};
    background: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.surface)};
    color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.full};
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.medium};
    padding: 5px 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        ${({ $active, theme }) => !$active && `background: ${theme.colors.surfaceHover};`}
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

const HistoryLine = styled.div`
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};

    strong { color: ${p => p.theme.colors.text}; }
`;

// ── Dialog powodu przegranej ─────────────────────────────────────────────────

const LostDialog = styled.div`
    position: fixed;
    inset: 0;
    z-index: 80;
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
    return <User size={13} color="#94a3b8" />;
}

interface EditableServiceItem {
    serviceId: string | null;
    name: string;
    priceGross: number;
    quantity: number;
}

export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<LeadStatus | undefined>();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [lostDialogFor, setLostDialogFor] = useState<string | null>(null);
    const [lostReason, setLostReason] = useState<string | null>(null);
    const [lostNote, setLostNote] = useState('');
    const [editingServices, setEditingServices] = useState<EditableServiceItem[] | null>(null);
    const [serviceSearch, setServiceSearch] = useState('');
    // null = podgląd, obiekt = edycja pojazdu. Marka i model wybierane z katalogu,
    // bo wpisane ręcznie „bèemka" psułaby wyszukiwanie tak samo jak surowy tekst z LLM-a.
    const [editingVehicle, setEditingVehicle] = useState<{ brand: string; model: string } | null>(null);

    const selectedLeadId = searchParams.get('lead');
    const selectLead = (leadId: string | null) => {
        setEditingServices(null);
        setEditingVehicle(null);
        setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
    };

    const { data: leadPage } = useLeads({ status: statusFilter, query: query || undefined, page });
    const { data: lead } = useLead(selectedLeadId);
    const { data: history } = useLeadHistory(selectedLeadId);
    const { data: dictionaries } = useLeadDictionaries();
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
    const { services: catalog } = useServices({
        search: serviceSearch,
        page: 1,
        limit: 20,
        showInactive: false,
    });
    const changeStatus = useChangeLeadStatus();
    const updateVehicle = useUpdateLeadVehicle();
    const updateServices = useUpdateLeadServices();
    const { showSuccess, showError } = useToast();
    // Zmiany leadów przychodzą WebSocketem — spinner przy rozpoznawaniu auta
    // zamienia się w wynik bez odświeżania strony.
    useLeadsSocket();

    const editedTotal = useMemo(
        () => (editingServices ?? []).reduce((sum, item) => sum + item.priceGross * item.quantity, 0),
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

    const saveServices = () => {
        if (!lead || !editingServices) return;
        const payload: LeadServiceItemInput[] = editingServices.map((item) => ({
            serviceId: item.serviceId,
            name: item.serviceId ? undefined : item.name,
            priceGross: item.serviceId ? undefined : item.priceGross,
            quantity: item.quantity,
        }));
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
                        <Row key={item.id} $active={item.id === selectedLeadId} onClick={() => selectLead(item.id)}>
                            <span className="who">
                                <SourceIcon source={item.source} />
                                <span>
                                    <span className="name">{item.customerName ?? item.contactIdentifier}</span>
                                    {item.customerName && <div className="sub">{item.contactIdentifier}</div>}
                                </span>
                            </span>
                            <span className="vehicle">
                                {item.vehicleDetectionStatus === 'PENDING' ? (
                                    <VehicleSpinner title="Rozpoznajemy auto z korespondencji">
                                        <Loader2 /> Rozpoznaję…
                                    </VehicleSpinner>
                                ) : (
                                    formatVehicle(item) ?? '—'
                                )}
                            </span>
                            <TagCell>
                                {item.tagLabels.length === 0 && <span className="none">—</span>}
                                {item.tagLabels.slice(0, 2).map((label) => (
                                    <TagPill key={label}>{label}</TagPill>
                                ))}
                                {item.tagLabels.length > 2 && (
                                    <TagPill
                                        as="span"
                                        title={item.tagLabels.slice(2).join(', ')}
                                    >
                                        +{item.tagLabels.length - 2}
                                    </TagPill>
                                )}
                            </TagCell>
                            <span className="value">
                                {item.estimatedValue > 0 ? formatGrosze(item.estimatedValue) : '—'}
                            </span>
                            <span>
                                <Badge $variant={STATUS_BADGE_VARIANT[item.status]}>
                                    {LEAD_STATUS_LABELS[item.status]}
                                </Badge>
                            </span>
                            <span>{formatRelativeTime(item.createdAt)}</span>
                        </Row>
                    ))}
                </TableScroll>
            </SurfaceCard>

            {lead && (
                <>
                    <DrawerOverlay onClick={() => selectLead(null)} />
                    <Drawer>
                        <DrawerHeader>
                            <div>
                                <h3>{lead.customerName ?? lead.contactIdentifier}</h3>
                                <div className="sub">
                                    <SourceIcon source={lead.source} />
                                    {lead.contactIdentifier}
                                    {lead.threadId && (
                                        <Link to={`/communication?thread=${lead.threadId}`}>
                                            <Badge $variant="info" style={{ cursor: 'pointer' }}>
                                                Zobacz korespondencję
                                            </Badge>
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <button className="close" onClick={() => selectLead(null)} aria-label="Zamknij">
                                <X size={18} />
                            </button>
                        </DrawerHeader>

                        <DrawerSection>
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
                        </DrawerSection>

                        <DrawerSection>
                            <h4>Status</h4>
                            <StatusGrid>
                                {LEAD_STATUS_FLOW.map((status) => {
                                    const active = lead.status === status;
                                    return (
                                        <StatusOption
                                            key={status}
                                            $active={active}
                                            onClick={() => !active && requestStatus(lead.id, status)}
                                        >
                                            {active && <Check size={11} />}
                                            {LEAD_STATUS_LABELS[status]}
                                        </StatusOption>
                                    );
                                })}
                            </StatusGrid>
                            {lead.status === 'LOST' && lead.lostReasonLabel && (
                                <HistoryLine>
                                    Powód przegranej: <strong>{lead.lostReasonLabel}</strong>
                                    {lead.lostReason && <> — {lead.lostReason}</>}
                                </HistoryLine>
                            )}
                        </DrawerSection>

                        <DrawerSection>
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
                                        onClick={() =>
                                            setEditingServices(
                                                lead.services.map((item) => ({
                                                    serviceId: item.serviceId,
                                                    name: item.name,
                                                    priceGross: item.priceGross,
                                                    quantity: item.quantity,
                                                }))
                                            )
                                        }
                                    >
                                        Edytuj usługi
                                    </IconButton>
                                </>
                            )}
                            {editingServices !== null && (
                                <>
                                    {editingServices.map((item, index) => (
                                        <ServiceLine key={`${item.serviceId}-${index}`}>
                                            <span className="grow">{item.name}</span>
                                            <span className="qty">
                                                <button
                                                    aria-label="Mniej"
                                                    onClick={() =>
                                                        setEditingServices(editingServices.map((current, i) =>
                                                            i === index
                                                                ? { ...current, quantity: Math.max(1, current.quantity - 1) }
                                                                : current
                                                        ))
                                                    }
                                                >
                                                    <Minus size={11} />
                                                </button>
                                                {item.quantity}
                                                <button
                                                    aria-label="Więcej"
                                                    onClick={() =>
                                                        setEditingServices(editingServices.map((current, i) =>
                                                            i === index
                                                                ? { ...current, quantity: current.quantity + 1 }
                                                                : current
                                                        ))
                                                    }
                                                >
                                                    <Plus size={11} />
                                                </button>
                                            </span>
                                            <span>{formatGrosze(item.priceGross * item.quantity)}</span>
                                            <button
                                                className="remove"
                                                aria-label="Usuń pozycję"
                                                onClick={() =>
                                                    setEditingServices(editingServices.filter((_, i) => i !== index))
                                                }
                                            >
                                                <X size={13} />
                                            </button>
                                        </ServiceLine>
                                    ))}
                                    <SearchBox style={{ maxWidth: '100%' }}>
                                        <Search size={13} />
                                        <input
                                            placeholder="Dodaj usługę z cennika…"
                                            value={serviceSearch}
                                            onChange={(event) => setServiceSearch(event.target.value)}
                                        />
                                    </SearchBox>
                                    {serviceSearch && (
                                        <div>
                                            {catalog.slice(0, 5).map((service) => (
                                                <ServiceLine key={service.id}>
                                                    <button
                                                        className="grow"
                                                        style={{
                                                            border: 'none', background: 'none', textAlign: 'left',
                                                            cursor: 'pointer', color: '#0ea5e9', fontSize: 13,
                                                            padding: '2px 0', fontFamily: 'inherit',
                                                        }}
                                                        onClick={() => {
                                                            setEditingServices([
                                                                ...editingServices,
                                                                {
                                                                    serviceId: service.id,
                                                                    name: service.name,
                                                                    priceGross: service.basePriceGross,
                                                                    quantity: 1,
                                                                },
                                                            ]);
                                                            setServiceSearch('');
                                                        }}
                                                    >
                                                        + {service.name} ({formatGrosze(service.basePriceGross)})
                                                    </button>
                                                </ServiceLine>
                                            ))}
                                        </div>
                                    )}
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
                        </DrawerSection>

                        {lead.initialMessage && (
                            <DrawerSection>
                                <h4>Pierwsza wiadomość</h4>
                                <HistoryLine>{lead.initialMessage}</HistoryLine>
                            </DrawerSection>
                        )}

                        <DrawerSection>
                            <h4>Historia</h4>
                            {(history ?? []).map((entry, index) => (
                                <HistoryLine key={index}>
                                    {formatDateTime(entry.createdAt)} —{' '}
                                    <strong>{LEAD_STATUS_LABELS[entry.toStatus]}</strong>
                                    {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                                    {entry.changedByName && <> · {entry.changedByName}</>}
                                </HistoryLine>
                            ))}
                        </DrawerSection>
                    </Drawer>
                </>
            )}

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
