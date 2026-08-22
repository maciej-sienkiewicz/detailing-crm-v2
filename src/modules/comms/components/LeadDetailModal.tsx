// src/modules/comms/components/LeadDetailModal.tsx
// Okno szczegółów leada — jedno na całą aplikację.
//
// Wcześniej mieszkało w widoku leadów i dało się je otworzyć wyłącznie stamtąd,
// więc plakietka „Lead" w podglądzie rozmowy musiała przerzucać na inny adres.
// Kliknięcie stanu wyrzucało z korespondencji, którą się właśnie czytało — żeby
// pokazać dane o tej samej rozmowie. Okno otwiera się teraz na miejscu, w obu
// widokach z tego samego komponentu, więc nie ma dwóch wersji tej samej prawdy.
//
// Szeroki modal, nie wysuwany panel: wycena jest tu tabelą o czterech kolumnach
// kwot, a wąska szuflada ucinała nazwy usług do jednej litery i ściskała liczby
// tak, że nie dało się ich porównać.
//
// Hierarchia okna wynika z trzech pytań, które ktoś zadaje sobie, otwierając leada:
// ile to jest warte, czy coś tu do mnie należy i o co właściwie klient pytał.
// Dlatego u góry stoi pasek podsumowania z kwotą jako największym elementem
// widoku, a treść zapytania — dotąd zepchnięta na sam dół pod wycenę — siedzi
// w prawej kolumnie, widoczna od pierwszej klatki.
//
// Kolor niesie znaczenie i nic poza tym: etap leada, pilność odpowiedzi, akcja
// główna. Kwota jest dominantą przez rozmiar, nie przez barwę — liczba pieniędzy
// pomalowana na kolor wygląda jak ostrzeżenie, a nie jak fakt.
//
// Akcja główna jest jedna i wynika ze stanu leada, a nie z tego, gdzie akurat
// stoi przycisk. Lead z zaległą odpowiedzią woła „odpisz", lead wyceniony bez
// terminu — „umów", lead z rezerwacją — „zobacz termin". Stały przycisk w rogu
// zostawiałby rozpoznanie właściwego ruchu użytkownikowi, a to jest dokładnie
// ta praca, którą ma wykonać za niego okno. Reszta dróg (kartoteka, telefon,
// wizyta) stoi przy swoim obiekcie, nie w stopce: stopka z pięcioma równymi
// przyciskami nie podpowiada niczego.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    CalendarCheck,
    CalendarPlus,
    Car,
    ExternalLink,
    Loader2,
    MessageSquare,
    Phone,
    Send,
    Trash2,
    UserRound,
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
import { EditableServicesTable } from '@/modules/checkin/components/EditableServicesTable';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { BookingFlowModal } from '@/modules/calendar';
import { useToast } from '@/common/components/Toast';
import {
    useDeleteLead,
    useLead,
    useLeadAppointment,
    useLeadHistory,
    useUpdateLeadServices,
    useUpdateLeadVehicle,
} from '../hooks/useLeads';
import { useLeadStatusChange } from '../hooks/useLeadStatusChange';
import { useContactCard } from '../hooks/useComms';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { toLeadInputs, toQuoteRows, toServiceLines } from '../utils/leadServiceLines';
import { CLOSED_STATUSES, describeAppointmentMoment, formatVehicle } from '../utils/leadFormat';
import { describeReplyState, leadReplyTone, type ReplyTone } from '../utils/leadReply';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type LeadServiceItemInput } from '../types';
import { LeadSourceIcon } from './LeadSourceIcon';
import { LeadStatusPicker } from './LeadStatusPicker';
import { IconButton, PrimaryButton, formatDateTime, formatGrosze, formatRelativeTime } from './shared';

/**
 * Dwie kolumny o różnej roli, nie dwie równe połówki. Po lewej to, co się w leadzie
 * robi (pojazd, wycena) — szersza, bo wycena jest tabelą czterech kolumn kwot.
 * Po prawej to, co się o leadzie wie (zapytanie klienta, historia) — węższa i
 * wizualnie cichsza. Wcześniej wszystko szło jedną kolumną w dół, więc zapytanie,
 * od którego cała sprawa się zaczęła, leżało poza pierwszym ekranem.
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

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

/**
 * Panel treści. Wariant [$quiet] to materiał pomocniczy: siada na tle aplikacji
 * bez ramki, przez co cofa się o plan względem powierzchni roboczych. Gdy każdy
 * panel jest białym prostokątem w identycznej ramce, żaden nie jest ważniejszy
 * i trzeba przeczytać wszystkie, żeby dowiedzieć się, co było istotne.
 */
const Panel = styled.section<{ $quiet?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid ${({ $quiet, theme }) => ($quiet ? 'transparent' : theme.colors.border)};
    border-radius: ${p => p.theme.radii.lg};
    padding: 14px 16px;
    background: ${({ $quiet, theme }) => ($quiet ? theme.colors.surfaceAlt : theme.colors.surface)};
    min-width: 0;

    h4 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }

    h4 svg { width: 13px; height: 13px; }
`;

/**
 * Pasek podsumowania — jedyny element, który ma się rzucić w oczy pierwszy.
 *
 * Cztery fakty, po które ludzie tu przychodzą, w kolejności ważności od lewej:
 * ile to jest warte, czego dotyczy, czy piłka jest po naszej stronie i jak stare
 * jest zapytanie. Kolorowy pasek przy krawędzi to ten sam język, którym pilność
 * oznaczona jest w tabeli leadów — kto nauczył się go tam, rozumie go tutaj.
 */
const Summary = styled.section<{ $tone: ReplyTone }>`
    position: relative;
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};
    padding: 16px 18px 16px 21px;

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

/**
 * Kolumna paska podsumowania. Kreska rozdzielająca zamiast odstępu: cztery liczby
 * w rzędzie bez podziału czytają się jak jedno zdanie, a to są cztery odpowiedzi
 * na cztery różne pytania.
 */
const SummaryCell = styled.div`
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
        padding: 8px 0;
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
 * Kwota wyceny — największy element okna. To jedyna liczba, dla której ktoś
 * otwiera leada w biegu, więc ma być czytelna z odległości, z której reszta
 * jest jeszcze nieczytelna. Cyfry o stałej szerokości, żeby kolejne leady
 * dawały się porównać wzrokiem bez czytania.
 */
const CellMoney = styled.span<{ $empty?: boolean }>`
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

/** „Czyj ruch" w pasku podsumowania: kropka i zdanie, kolor tylko przy zaległości. */
const ToneValue = styled(CellValue)<{ $tone: ReplyTone }>`
    color: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.text};
    font-weight: ${({ $tone, theme }) =>
        $tone === 'neutral' ? theme.fontWeights.medium : theme.fontWeights.semibold};
`;

const Dot = styled.span<{ $tone: ReplyTone }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.textMuted};
`;

/** Odnośnik „Zmień" w komórce podsumowania — tekst, nie przycisk z ramką. */
const CellLink = styled.button`
    align-self: flex-start;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 12px;
    color: ${p => p.theme.colors.primary};
    cursor: pointer;

    &:hover { text-decoration: underline; }
`;

/** Wybierak etapu w nagłówku — trzymany z dala od tytułu, tuż przed przyciskiem zamknięcia. */
const HeaderStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

/** Wyjaśnienie stanu „przegrany" — jedna linia nad treścią, nie pole formularza. */
const LostNote = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 12.5px;
    color: ${p => p.theme.colors.error};
    background: ${p => p.theme.colors.errorLight};
    border: 1px solid ${p => p.theme.colors.error}33;
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 12px;

    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
`;

/**
 * Potwierdzenie terminu — bliźniak [LostNote], tylko po drugiej stronie wyniku.
 * Rezerwacja jest tym, po co ten lead w ogóle istniał, więc gdy już jest, musi
 * być widoczna nad wszystkim innym, a nie tylko domyślna z etapu „Rezerwacja".
 */
const BookedNote = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${p => p.theme.colors.success};
    background: ${p => p.theme.colors.successLight};
    border: 1px solid ${p => p.theme.colors.success}33;
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 12px;

    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
    svg { width: 15px; height: 15px; flex-shrink: 0; }
    .spacer { flex: 1; }
`;

/**
 * Droga do innego rekordu — kartoteka klienta, wizyta, kalendarz. Odnośnik
 * tekstowy, nie przycisk: nawigacja nie jest akcją na leadzie i nie ma prawa
 * konkurować wagą z „umów" ani „odpisz". Wcześniej stała tu plakietka udająca
 * przycisk, co psuło jedno i drugie — plakietka przestaje znaczyć „stan",
 * a odnośnik i tak nie wygląda na klikalny.
 */
const QuietLink = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: 12.5px;
    color: ${p => p.theme.colors.primary};
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:hover { text-decoration: underline; }
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

const VehiclePickers = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
    }
`;

/**
 * Wycena w trybie podglądu. Jedna kwota brutto na pozycję nie wystarczała: lead
 * jest podstawą oferty, a rozmowa o cenie toczy się raz w netto (firma), raz
 * w brutto (klient prywatny) — przeliczanie w głowie przy każdym otwarciu panelu
 * to praca, którą tabela wykonuje raz. Kolumny i kolejność jak w edytorze wyceny,
 * żeby przejście w tryb edycji nie było przeskokiem na inny układ.
 */
const QuoteTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
        text-align: right;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
        padding: 0 0 6px;
        white-space: nowrap;
    }
    th:first-child { text-align: left; }

    td {
        padding: 6px 0;
        border-top: 1px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textSecondary};
        text-align: right;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }
    td:first-child {
        text-align: left;
        white-space: normal;
        color: ${p => p.theme.colors.text};
        width: 100%;
    }
    th + th, td + td { padding-left: 14px; }

    tfoot td {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        border-top: 1px solid ${p => p.theme.colors.text};
        padding-top: 8px;
    }
    /* Brutto to liczba, o której rozmawia się z klientem — w wierszu sumy
       ma być wyraźnie cięższa od netto i VAT-u stojących obok. */
    tfoot td:last-child { font-size: 15px; }

    .note {
        display: block;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
    }
`;

/** Jedyna akcja nieodwracalna w tym oknie — i jedyna, która wygląda groźnie. */
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
 * Historia jako oś czasu, nie jako lista linijek.
 *
 * Zmiany statusu są ciągiem: „Nowy, potem W kontakcie, potem Rezerwacja". Płaskie
 * zdania z datą na początku każą ten ciąg złożyć w głowie, bo wszystkie linijki
 * ważą tyle samo. Pionowa nitka z kropkami pokazuje go wprost, a kropka w kolorze
 * etapu jest tym samym znakiem, którym etap oznaczony jest w tabeli i w wybieraku.
 */
const Timeline = styled.ol`
    position: relative;
    list-style: none;
    margin: 0;
    padding: 2px 0 0 16px;

    &::before {
        content: '';
        position: absolute;
        left: 3px;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: ${p => p.theme.colors.border};
    }
`;

const TimelineItem = styled.li<{ $color: string }>`
    position: relative;
    padding-bottom: 10px;
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;

    &:last-child { padding-bottom: 0; }

    &::before {
        content: '';
        position: absolute;
        left: -16px;
        top: 4px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${p => p.$color};
        /* Obwódka w kolorze tła panelu wycina nitkę pod kropką. */
        box-shadow: 0 0 0 2px ${p => p.theme.colors.surfaceAlt};
    }

    strong {
        display: block;
        font-size: 12.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
`;

/**
 * Treść pierwszego pytania klienta. Zachowuje łamanie wierszy z maila i przewija się
 * w miejscu — dłuższe zapytanie nie ma prawa rozpychać okna na cały ekran, a jego
 * skrócenie do jednej linijki zabierałoby dokładnie to, po co się tu zagląda.
 */
const MessageQuote = styled.blockquote`
    margin: 0;
    max-height: 220px;
    overflow-y: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
    font-size: 13px;
    color: ${p => p.theme.colors.text};
    /* Kreska cytatu: krótka, w kolorze marki — znak, że to cudze słowa, nie nasz opis. */
    border-left: 2px solid ${p => p.theme.colors.primary};
    padding-left: 12px;
`;

export interface LeadDetailModalProps {
    leadId: string;
    onClose: () => void;
    /** Otworzyć od razu edytor wyceny — wejście „kliknięto wartość w tabeli". */
    openServicesEditor?: boolean;
    /**
     * Droga do korespondencji („Odpisz klientowi" / „Napisz wiadomość"). Wyłączana
     * tam, gdzie okno otwarto właśnie z tej korespondencji: przycisk prowadzący
     * w miejsce, w którym się stoi, to nie skrót, tylko zagadka.
     */
    showThreadLink?: boolean;
    /** Wywoływane po usunięciu leada — okno jest wtedy już zamknięte. */
    onDeleted?: () => void;
}

export function LeadDetailModal({
    leadId,
    onClose,
    openServicesEditor = false,
    showThreadLink = true,
    onDeleted,
}: LeadDetailModalProps) {
    const navigate = useNavigate();
    const { data: lead } = useLead(leadId);
    const { data: history } = useLeadHistory(leadId);
    // Termin rezerwacji dobierany osobno — lead niesie samo `appointmentId`.
    const { data: appointment } = useLeadAppointment(lead?.appointmentId ?? null);
    // null = podgląd, tablica = otwarty edytor wyceny (ten sam co przy przyjęciu auta).
    const [editingServices, setEditingServices] = useState<ServiceLineItem[] | null>(null);
    // null = podgląd, obiekt = edycja pojazdu. Marka i model wybierane z katalogu,
    // bo wpisane ręcznie „bèemka" psułaby wyszukiwanie tak samo jak surowy tekst z LLM-a.
    const [editingVehicle, setEditingVehicle] = useState<{ brand: string; model: string } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [booking, setBooking] = useState(false);
    // Edytor wyceny otwarty od pierwszej klatki, gdy wejściem było kliknięcie wartości.
    // Wystarczy stan początkowy: okno montuje się na jedno otwarcie jednego leada,
    // więc nie ma czego dosynchronizowywać efektem.
    const [servicesPrimed, setServicesPrimed] = useState(false);
    if (openServicesEditor && !servicesPrimed && lead) {
        setServicesPrimed(true);
        setEditingServices(toServiceLines(lead.services));
    }

    // Kartoteka kontaktu — stąd bierzemy telefon i auta klienta do rezerwacji.
    // Pobierana dopiero, gdy okno jest otwarte: lista leadów jej nie potrzebuje.
    const { data: contactCard } = useContactCard(lead?.contactIdentifier ?? null, {
        enabled: Boolean(lead?.contactIdentifier),
    });
    const status = useLeadStatusChange();
    const updateVehicle = useUpdateLeadVehicle();
    const updateServices = useUpdateLeadServices();
    const deleteLead = useDeleteLead();
    const { showSuccess, showError } = useToast();

    const saveVehicle = () => {
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

    const saveServices = () => {
        if (!editingServices) return;
        const payload: LeadServiceItemInput[] = toLeadInputs(editingServices);
        updateServices.mutate(
            { leadId, services: payload },
            {
                onSuccess: () => {
                    setEditingServices(null);
                    showSuccess('Zapisano usługi');
                },
            }
        );
    };

    const confirmDelete = () => {
        // Okno zamykamy PRZED wysłaniem żądania. Otwarte odpytuje `GET /leads/{id}`
        // i `…/history`; unieważnienie cache po usunięciu kazałoby mu pobrać leada,
        // którego już nie ma — i obok „Lead usunięty" wyskakiwało „Nie znaleziono
        // leada" z globalnego przechwytywacza błędów. Odmontowane okno nie pyta.
        setDeleteDialogOpen(false);
        onClose();
        onDeleted?.();
        deleteLead.mutate(leadId, {
            onSuccess: () => showSuccess('Lead usunięty', 'Korespondencja została w skrzynce'),
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się usunąć leada', message ?? 'Spróbuj ponownie');
            },
        });
    };

    if (!lead) return null;

    const closed = CLOSED_STATUSES.has(lead.status);
    const replyTone = leadReplyTone(lead.replyState, lead.waitingSince, closed);
    // Znacznik „czyj ruch" tylko wtedy, gdy jest jeszcze o czym mówić: w leadzie
    // zamkniętym albo bez rozmowy nikt na nic nie czeka.
    const reply = closed || lead.replyState === 'NO_CONVERSATION' || !lead.waitingSince
        ? null
        : describeReplyState(lead.replyState, lead.waitingSince);
    const appointmentAt = appointment?.schedule?.startDateTime ?? null;
    /** Wątek istnieje i nie stoimy właśnie w nim. */
    const canWrite = showThreadLink && Boolean(lead.threadId);
    const phone = lead.source === 'PHONE' ? lead.contactIdentifier : contactCard?.customer?.phone ?? null;
    const openThread = () => navigate(`/communication?thread=${lead.threadId}`);
    /**
     * Kalendarz nie ma trasy per rezerwacja: skacze się do niego z datą, żeby
     * najpierw trafił w odpowiedni miesiąc, a potem podświetlił wydarzenie.
     * Ten sam kontrakt co w kanale aktywności i na pulpicie.
     */
    const openAppointment = () => navigate('/calendar', {
        state: {
            highlightEventId: lead.appointmentId,
            highlightDate: appointmentAt ?? '',
            openEventPopover: true,
        },
    });

    const quoteRows = toQuoteRows(lead.services);
    const quoteTotal = (pick: (row: typeof quoteRows[number]) => number) =>
        quoteRows.reduce((total, row) => total + pick(row), 0);
    const netTotal = quoteTotal((row) => row.netCents);

    // Kreator rezerwacji zastępuje okno szczegółów, a nie kładzie się na nim. Dwie
    // nałożone nakładki nie pokrywają się geometrycznie — kreator jest przesunięty
    // o szerokość sidebara, okno leada nie — więc jedna z nich przyciemniała kawałek
    // ekranu drugi raz, zostawiając widoczny pionowy szew.
    if (booking) {
        return (
            <BookingFlowModal
                /* Lead z już przypiętą rezerwacją odrzuciłby drugą. */
                leadId={lead.appointmentId ? undefined : lead.id}
                subtitle={lead.customerName ?? lead.contactIdentifier}
                prefill={leadToBookingPrefill(lead, contactCard)}
                onClose={() => setBooking(false)}
                onBooked={() => setBooking(false)}
            />
        );
    }

    return (
        <>
            <ModalShell isOpen onClose={onClose} maxWidth="1040px">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{lead.customerName ?? lead.contactIdentifier}</ModalTitle>
                        {/* Drogi do innych rekordów stoją przy tożsamości klienta,
                            bo dotyczą klienta, a nie leada — w stopce konkurowałyby
                            wagą z jedyną akcją, która ma tam stać. */}
                        <LeadIdentity>
                            <LeadSourceIcon source={lead.source} />
                            {lead.contactIdentifier}
                            {phone && (
                                <QuietLink as="a" href={`tel:${phone.replace(/\s/g, '')}`}>
                                    <Phone /> Zadzwoń
                                </QuietLink>
                            )}
                            {lead.customerId && (
                                <Link to={`/customers/${lead.customerId}`}>
                                    <QuietLink as="span"><UserRound /> Kartoteka klienta</QuietLink>
                                </Link>
                            )}
                        </LeadIdentity>
                    </ModalTitleGroup>
                    {/* Etap stoi w nagłówku, przy nazwie leada, bo to jego główna
                        właściwość i najczęściej zmieniane pole — a jako osobny panel
                        zajmował pół szerokości okna na jeden przycisk. Nagłówek jest
                        też jedynym miejscem widocznym niezależnie od przewinięcia.
                        „Czyj ruch" zeszło stąd do paska podsumowania: to nie jest
                        pole do zmiany, tylko fakt, i stojąc tuż obok wybieraka
                        wyglądało na drugi taki sam przełącznik. */}
                    <HeaderStatus>
                        <LeadStatusPicker
                            status={lead.status}
                            disabled={status.isPending}
                            onChange={(next) => status.requestStatus(lead.id, next)}
                        />
                    </HeaderStatus>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <ModalBody>
                        {/* Powód przegranej to wyjaśnienie stanu, nie pole formularza —
                            pokazujemy go raz, u góry, i tylko gdy jest czego wyjaśniać. */}
                        {lead.status === 'LOST' && lead.lostReasonLabel && (
                            <LostNote>
                                <span>Przegrany:</span>
                                <span>
                                    <strong>{lead.lostReasonLabel}</strong>
                                    {lead.lostReason && <> — {lead.lostReason}</>}
                                </span>
                            </LostNote>
                        )}

                        {/* Rezerwacja to wynik, po który cały lead istniał — gdy jest,
                            mówimy o niej wprost i z terminem. Sam etap „Rezerwacja"
                            w nagłówku nie odpowiada na pytanie „na kiedy". */}
                        {lead.appointmentId && (
                            <BookedNote>
                                <CalendarCheck />
                                <span>
                                    {appointmentAt ? (
                                        <>
                                            {describeAppointmentMoment(appointmentAt).lead}{' '}
                                            <strong>{describeAppointmentMoment(appointmentAt).moment}</strong>
                                        </>
                                    ) : (
                                        'Rezerwacja została utworzona'
                                    )}
                                </span>
                                <span className="spacer" />
                                {lead.visitId && (
                                    <Link to={`/visits/${lead.visitId}`}>
                                        <QuietLink as="span"><ExternalLink /> Zobacz wizytę</QuietLink>
                                    </Link>
                                )}
                            </BookedNote>
                        )}

                        {/* Pasek podsumowania: cztery odpowiedzi, po które ktoś tu wchodzi,
                            zanim zacznie cokolwiek czytać. */}
                        <Summary $tone={replyTone}>
                            <SummaryCell>
                                <CellLabel>Wartość wyceny</CellLabel>
                                {quoteRows.length > 0 ? (
                                    <>
                                        <CellMoney>{formatGrosze(lead.estimatedValue)}</CellMoney>
                                        <CellNote>netto {formatGrosze(netTotal)}</CellNote>
                                    </>
                                ) : (
                                    <>
                                        <CellMoney $empty>—</CellMoney>
                                        <CellNote>brak wyceny</CellNote>
                                    </>
                                )}
                            </SummaryCell>

                            <SummaryCell>
                                <CellLabel>Pojazd</CellLabel>
                                {lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null ? (
                                    <CellValue $empty>
                                        <Loader2 />
                                        <span>Rozpoznajemy…</span>
                                    </CellValue>
                                ) : (
                                    <CellValue $empty={!formatVehicle(lead)}>
                                        {/* Awatar marki zamiast rodzajowej ikonki auta — ten sam
                                            znak, którym auto oznaczone jest w module pojazdów.
                                            Gdy marki nie znamy, nie ma czego pokazać: ikonka auta
                                            obok „Nie rozpoznano" udawałaby, że coś tu jednak jest. */}
                                        {lead.vehicleBrand && <CarLogoImage brand={lead.vehicleBrand} size="sm" />}
                                        <span>{formatVehicle(lead) ?? 'Nie rozpoznano'}</span>
                                    </CellValue>
                                )}
                                <CellLink
                                    type="button"
                                    onClick={() => setEditingVehicle({
                                        brand: lead.vehicleBrand ?? '',
                                        model: lead.vehicleModel ?? '',
                                    })}
                                >
                                    {lead.vehicleBrand ? 'Zmień' : 'Uzupełnij'}
                                </CellLink>
                            </SummaryCell>

                            <SummaryCell>
                                <CellLabel>Czyj ruch</CellLabel>
                                {reply ? (
                                    <ToneValue $tone={reply.tone} title={reply.title}>
                                        <Dot $tone={reply.tone} />
                                        <span>{reply.label}</span>
                                    </ToneValue>
                                ) : (
                                    <CellValue $empty>
                                        <span>{closed ? 'Zamknięty' : 'Brak rozmowy'}</span>
                                    </CellValue>
                                )}
                                {reply && <CellNote>{reply.title}</CellNote>}
                            </SummaryCell>

                            <SummaryCell>
                                <CellLabel>Zapytanie</CellLabel>
                                <CellValue><span>{formatRelativeTime(lead.createdAt)}</span></CellValue>
                                <CellNote>{formatDateTime(lead.createdAt)}</CellNote>
                            </SummaryCell>
                        </Summary>

                        {/* Wybieraki marki i modelu rozwijają się pod paskiem, a nie w nim:
                            dwa pola formularza wciśnięte w komórkę podsumowania rozepchnęłyby
                            pasek i zepchnęły kwotę na drugą linię. */}
                        {editingVehicle !== null && (
                            <Panel>
                                <h4><Car /> Pojazd</h4>
                                {/* Ten sam wybierak co przy przyjęciu pojazdu i w rezerwacji:
                                    wyszukiwarka w rozwijanej liście zamiast natywnego <select>
                                    z kilkuset markami, których nie da się przefiltrować. */}
                                <VehiclePickers>
                                    <BrandSelect
                                        value={editingVehicle.brand}
                                        placeholder="Marka…"
                                        onChange={(brand) => setEditingVehicle({
                                            brand,
                                            // Zmiana marki zeruje model: modele są per marka,
                                            // a zostawiony stary nie przeszedłby walidacji.
                                            model: '',
                                        })}
                                    />
                                    <ModelSelect
                                        brand={editingVehicle.brand}
                                        value={editingVehicle.model}
                                        placeholder="Model…"
                                        onChange={(model) => setEditingVehicle({
                                            brand: editingVehicle.brand,
                                            model,
                                        })}
                                    />
                                </VehiclePickers>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <PrimaryButton onClick={saveVehicle} disabled={updateVehicle.isPending}>
                                        {updateVehicle.isPending ? 'Zapisywanie…' : 'Zapisz'}
                                    </PrimaryButton>
                                    <IconButton onClick={() => setEditingVehicle(null)}>Anuluj</IconButton>
                                </div>
                            </Panel>
                        )}

                        <BodyGrid>
                            <Column>
                                <Panel>
                                    <h4>Usługi i wycena</h4>
                                    {editingServices === null && (
                                        <>
                                            {quoteRows.length === 0 && (
                                                <HistoryLine>
                                                    Nie przypisano jeszcze usług — wycena leada jest pusta.
                                                </HistoryLine>
                                            )}
                                            {quoteRows.length > 0 && (
                                                <QuoteTable>
                                                    <thead>
                                                        <tr>
                                                            <th>Usługa</th>
                                                            <th>Netto</th>
                                                            <th>VAT</th>
                                                            <th>Brutto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {quoteRows.map((row) => (
                                                            <tr key={row.id}>
                                                                <td>
                                                                    {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ''}
                                                                    {row.note && <span className="note">{row.note}</span>}
                                                                </td>
                                                                <td>{formatGrosze(row.netCents)}</td>
                                                                <td>{formatGrosze(row.vatCents)}</td>
                                                                <td>{formatGrosze(row.grossCents)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr>
                                                            <td>Razem</td>
                                                            <td>{formatGrosze(netTotal)}</td>
                                                            <td>{formatGrosze(quoteTotal((row) => row.vatCents))}</td>
                                                            <td>{formatGrosze(quoteTotal((row) => row.grossCents))}</td>
                                                        </tr>
                                                    </tfoot>
                                                </QuoteTable>
                                            )}
                                            <IconButton
                                                style={{ alignSelf: 'flex-start' }}
                                                onClick={() => setEditingServices(toServiceLines(lead.services))}
                                            >
                                                {quoteRows.length === 0 ? 'Dodaj usługi' : 'Edytuj usługi'}
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
                                            {/* Sumy netto / VAT / łącznie liczy sam edytor —
                                                druga suma pod nim byłaby tą samą liczbą
                                                napisaną drugi raz, tylko innym stylem. */}
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <PrimaryButton onClick={saveServices} disabled={updateServices.isPending}>
                                                    Zapisz
                                                </PrimaryButton>
                                                <IconButton onClick={() => setEditingServices(null)}>Anuluj</IconButton>
                                            </div>
                                        </>
                                    )}
                                </Panel>
                            </Column>

                            <Column>
                                <Panel $quiet>
                                    <h4><MessageSquare /> O co pytał klient</h4>
                                    {lead.initialMessage ? (
                                        <MessageQuote>{lead.initialMessage}</MessageQuote>
                                    ) : (
                                        <HistoryLine>Brak treści pierwszej wiadomości.</HistoryLine>
                                    )}
                                </Panel>

                                <Panel $quiet>
                                    <h4>Historia</h4>
                                    {(history ?? []).length === 0 && (
                                        <HistoryLine>Brak zmian statusu.</HistoryLine>
                                    )}
                                    {(history ?? []).length > 0 && (
                                        <Timeline>
                                            {(history ?? []).map((entry, index) => (
                                                <TimelineItem
                                                    key={index}
                                                    $color={LEAD_STATUS_COLORS[entry.toStatus].fg}
                                                >
                                                    <strong>
                                                        {LEAD_STATUS_LABELS[entry.toStatus]}
                                                        {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                                                    </strong>
                                                    {formatDateTime(entry.createdAt)}
                                                    {entry.changedByName && <>, {entry.changedByName}</>}
                                                </TimelineItem>
                                            ))}
                                        </Timeline>
                                    )}
                                </Panel>
                            </Column>
                        </BodyGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>
                    {/* Usunięcie stoi po lewej, z dala od akcji głównej — dwie akcje
                        o wprost przeciwnych skutkach nie mają prawa sąsiadować pod
                        kursorem. */}
                    <DangerButton
                        type="button"
                        style={{ marginRight: 'auto' }}
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleteLead.isPending}
                    >
                        <Trash2 size={14} /> Usuń lead
                    </DangerButton>

                    {/*
                        Akcja główna wynika ze stanu leada — w tej kolejności:

                        1. zalegamy z odpowiedzią → „Odpisz klientowi". Zaległość jest
                           pilniejsza od wszystkiego innego: klient czeka teraz, a termin
                           poczeka do jutra.
                        2. jest już termin → „Zobacz rezerwację". Drugiej się nie założy
                           (backend odmówi), więc oferowanie jej byłoby ślepą uliczką.
                        3. lead zamknięty → „Napisz wiadomość". Zrealizowanego ani
                           przegranego nie umawia się ponownie jednym kliknięciem, ale
                           odezwać się do klienta zawsze wolno.
                        4. w pozostałych → „Stwórz rezerwację", czyli po co ten moduł jest.

                        Akcja drugorzędna to zawsze ta z pary „napisz / umów", która nie
                        została główną. Dwie akcje w stopce, nie pięć: przy pięciu równych
                        przyciskach żaden nie jest podpowiedzią.
                    */}
                    {(() => {
                        const write = canWrite && (
                            <IconButton type="button" onClick={openThread}>
                                <Send size={14} /> Napisz wiadomość
                            </IconButton>
                        );
                        const writePrimary = canWrite && (
                            <PrimaryButton type="button" onClick={openThread}>
                                <Send size={14} /> Odpisz klientowi
                            </PrimaryButton>
                        );
                        const book = (
                            <IconButton type="button" onClick={() => setBooking(true)}>
                                <CalendarPlus size={14} /> Stwórz rezerwację
                            </IconButton>
                        );
                        const bookPrimary = (
                            <PrimaryButton type="button" onClick={() => setBooking(true)}>
                                <CalendarPlus size={14} /> Stwórz rezerwację
                            </PrimaryButton>
                        );

                        if (lead.appointmentId) {
                            return (
                                <>
                                    {write}
                                    <PrimaryButton type="button" onClick={openAppointment}>
                                        <CalendarCheck size={14} /> Zobacz rezerwację
                                    </PrimaryButton>
                                </>
                            );
                        }
                        if (closed) {
                            return canWrite ? (
                                <PrimaryButton type="button" onClick={openThread}>
                                    <Send size={14} /> Napisz wiadomość
                                </PrimaryButton>
                            ) : book;
                        }
                        if (replyTone === 'due' && canWrite) {
                            return (<>{book}{writePrimary}</>);
                        }
                        return (<>{write}{bookPrimary}</>);
                    })()}

                    <IconButton onClick={onClose}>Zamknij</IconButton>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={deleteDialogOpen}
                title="Usunąć ten lead?"
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
            />

            {status.lostDialog}
        </>
    );
}
