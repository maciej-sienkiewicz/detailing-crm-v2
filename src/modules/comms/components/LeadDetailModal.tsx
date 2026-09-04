// src/modules/comms/components/LeadDetailModal.tsx
// Okno szczegółów leada - jedno na całą aplikację.
//
// Wcześniej mieszkało w widoku leadów i dało się je otworzyć wyłącznie stamtąd,
// więc plakietka „Lead" w podglądzie rozmowy musiała przerzucać na inny adres.
// Kliknięcie stanu wyrzucało z korespondencji, którą się właśnie czytało - żeby
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
// widoku, a treść zapytania - dotąd zepchnięta na sam dół pod wycenę - siedzi
// w prawej kolumnie, widoczna od pierwszej klatki.
//
// Kolor niesie znaczenie i nic poza tym: etap leada, pilność odpowiedzi, akcja
// główna. Kwota jest dominantą przez rozmiar, nie przez barwę - liczba pieniędzy
// pomalowana na kolor wygląda jak ostrzeżenie, a nie jak fakt.
//
// Akcja główna jest jedna i wynika ze stanu leada, a nie z tego, gdzie akurat
// stoi przycisk. Lead z zaległą odpowiedzią woła „odpisz", lead wyceniony bez
// terminu - „umów", lead z rezerwacją - „zobacz termin". Stały przycisk w rogu
// zostawiałby rozpoznanie właściwego ruchu użytkownikowi, a to jest dokładnie
// ta praca, którą ma wykonać za niego okno. Reszta dróg (kartoteka, telefon,
// wizyta) stoi przy swoim obiekcie, nie w stopce: stopka z pięcioma równymi
// przyciskami nie podpowiada niczego.
//
// Na telefonie kolejność jest inna niż na monitorze, bo inne jest pytanie.
// Przy szerokim oknie widać wszystko naraz i pierwsza jest kwota. Na ekranie,
// po którym się przewija, pierwsze musi być to, co decyduje o działaniu: czyj
// jest ruch. Kwota wyceny znika - kilka centymetrów niżej stoi tabela usług
// z tą samą sumą, a ta sama liczba dwa razy na jednym ekranie to nie jest
// podkreślenie, tylko szum.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    AlertTriangle,
    CalendarCheck,
    CalendarPlus,
    Car,
    ExternalLink,
    Loader2,
    Mail,
    MessageSquare,
    History,
    Phone,
    PhoneCall,
    Send,
    StickyNote,
    Trash2,
    X,
    UserPlus,
    UserRound,
} from 'lucide-react';
import { ChoiceModal, ConfirmationModal } from '@/common/components/ConfirmationModal';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
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
    useAddLeadNote,
    useDeleteLead,
    useDeleteLeadNote,
    useLead,
    useLeadAppointment,
    useLeadTimeline,
    useLeadNotes,
    useUpdateLeadServices,
    useUpdateLeadVehicle,
} from '../hooks/useLeads';
import { useLeadStatusChange } from '../hooks/useLeadStatusChange';
import { useContactCard } from '../hooks/useComms';
import { ContactCardPopover } from './ContactCardPopover';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { toLeadInputs, toQuoteRows, toServiceLines } from '../utils/leadServiceLines';
import { CLOSED_STATUSES, describeAppointmentMoment, formatVehicle } from '../utils/leadFormat';
import { describeReplyState, leadReplyTone, type ReplyTone } from '../utils/leadReply';
import type { LeadServiceItemInput } from '../types';
import { LeadSourceIcon } from './LeadSourceIcon';
import { LeadStatusPicker } from './LeadStatusPicker';
import { LeadTimeline } from './LeadTimeline';
import { SimilarVisitsSection } from './SimilarVisitsSection';
import { RecordCallbackDialog } from './RecordCallbackDialog';
import { IconButton, PrimaryButton, formatDateTime, formatGrosze, formatRelativeTime } from './shared';

/**
 * Dwie kolumny o różnej roli, nie dwie równe połówki. Po lewej to, co się w leadzie
 * robi (pojazd, wycena) - szersza, bo wycena jest tabelą czterech kolumn kwot.
 * Po prawej to, co się o leadzie wie (zapytanie klienta, historia) - węższa i
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

/**
 * Na telefonie nagłówek ma prawo się złamać: nazwa klienta i krzyżyk w pierwszej
 * linii, wybierak etapu z kopertą pod nimi. Wciśnięte w jedną linijkę zostawiały
 * nazwisku kilkanaście pikseli i wielokropek zamiast nazwiska.
 */
const LeadHeader = styled(ModalHeader)`
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
 * Pasek podsumowania - jedyny element, który ma się rzucić w oczy pierwszy.
 *
 * Cztery fakty, po które ludzie tu przychodzą, w kolejności ważności od lewej:
 * ile to jest warte, czego dotyczy, czy piłka jest po naszej stronie i jak stare
 * jest zapytanie. Kolorowy pasek przy krawędzi to ten sam język, którym pilność
 * oznaczona jest w tabeli leadów - kto nauczył się go tam, rozumie go tutaj.
 */
const Summary = styled.section<{ $tone: ReplyTone }>`
    position: relative;
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-direction: column;
        padding: 10px 14px 10px 17px;
    }
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

    /*
     * Na telefonie pasek staje się kolumną, więc kreska pionowa nie ma czego
     * rozdzielać. Świadomie bez kreski poziomej w zamian: kolejność komórek jest
     * tu przestawiona przez order, a :first-of-type liczy elementy w kolejności
     * dokumentu, nie widoku - kreska wylądowałaby nad środkiem paska. Odstęp
     * i wersalikowa etykieta rozdzielają wystarczająco.
     */
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
 * Kwota wyceny - największy element okna. To jedyna liczba, dla której ktoś
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

/** Odnośnik „Zmień" w komórce podsumowania - tekst, nie przycisk z ramką. */
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

/** Wybierak etapu w nagłówku - trzymany z dala od tytułu, tuż przed przyciskiem zamknięcia. */
const HeaderStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    /* Na telefonie schodzi pod nazwę klienta, na całą szerokość: obok tytułu
       zostawiał mu kilkanaście pikseli i wielokropek zamiast nazwiska. */
    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        order: 3;
        width: 100%;
        justify-content: flex-start;
    }
`;

/** Wyjaśnienie stanu „przegrany" - jedna linia nad treścią, nie pole formularza. */
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
 * Potwierdzenie terminu - bliźniak [LostNote], tylko po drugiej stronie wyniku.
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
 * Droga do innego rekordu - kartoteka klienta, wizyta, kalendarz. Odnośnik
 * tekstowy, nie przycisk: nawigacja nie jest akcją na leadzie i nie ma prawa
 * konkurować wagą z „umów" ani „odpisz". Wcześniej stała tu plakietka udająca
 * przycisk, co psuło jedno i drugie - plakietka przestaje znaczyć „stan",
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

/**
 * Pasek klienta - pokazywany tylko wtedy, gdy jest o czym mówić.
 *
 * Dwa powody, wzajemnie się wykluczające: kontakt nie ma kartoteki (jest co
 * zrobić) albo ma za sobą odwołane rezerwacje i porzucone zapytania (jest o czym
 * wiedzieć przed obiecaniem terminu). Klient znany i bez historii porzuceń nie
 * dostaje paska w ogóle - brak sygnału też jest informacją i nie zajmuje miejsca.
 *
 * Ton [$warn] jest ostrzeżeniem, nie wyrokiem: liczby są podane wprost, żeby dało
 * się je zważyć samemu, a nie zaufać etykiecie „podwyższone ryzyko".
 */
const ClientNote = styled.div<{ $warn?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${({ $warn, theme }) => ($warn ? theme.colors.warning : theme.colors.textSecondary)};
    background: ${({ $warn, theme }) => ($warn ? theme.colors.warningLight : theme.colors.surfaceAlt)};
    border: 1px solid ${({ $warn, theme }) => ($warn ? `${theme.colors.warning}33` : theme.colors.border)};
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 12px;

    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
    svg { width: 15px; height: 15px; flex-shrink: 0; }
    .spacer { flex: 1; }
`;

/**
 * Kontrolka ikonowa w nagłówku - droga do korespondencji.
 *
 * Etykieta tekstowa robiła z tego najszerszy element nagłówka, choć to nie jest
 * akcja główna; na telefonie zabierała całą linijkę. Ikona koperty jest tu
 * jednoznaczna (kontakt przyszedł mailem), a nazwa siedzi w podpowiedzi
 * i w [aria-label], więc czytnik ekranu nic nie traci.
 */
const IconAction = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    svg { width: 16px; height: 16px; }
    &:hover {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
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
 * w brutto (klient prywatny) - przeliczanie w głowie przy każdym otwarciu panelu
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
    /* Brutto to liczba, o której rozmawia się z klientem - w wierszu sumy
       ma być wyraźnie cięższa od netto i VAT-u stojących obok. */
    tfoot td:last-child { font-size: 15px; }

    .note {
        display: block;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
    }
`;

/** Jedyna akcja nieodwracalna w tym oknie - i jedyna, która wygląda groźnie. */
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

// ─── Notatki ──────────────────────────────────────────────────────────────────

const NoteComposer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    textarea {
        font-family: inherit;
        font-size: 12.5px;
        line-height: 1.5;
        color: ${p => p.theme.colors.text};
        background: ${p => p.theme.colors.surface};
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        resize: vertical;
        min-height: 54px;

        &:focus-visible {
            outline: none;
            border-color: ${p => p.theme.colors.primary};
        }
    }
`;

const NoteItemRow = styled.div`
    position: relative;
    padding: 8px 10px;
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    font-size: 12.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.text};
    /* Notatka to często jedno zdanie z entera w środku - zachowujemy łamania. */
    white-space: pre-wrap;
    word-break: break-word;

    .meta {
        margin-top: 4px;
        font-size: 11px;
        color: ${p => p.theme.colors.textMuted};
    }

    .remove {
        position: absolute;
        top: 6px;
        right: 6px;
        display: none;
        border: none;
        background: none;
        padding: 2px;
        cursor: pointer;
        color: ${p => p.theme.colors.textMuted};
        border-radius: ${p => p.theme.radii.sm};

        svg { width: 13px; height: 13px; display: block; }
        &:hover { color: ${p => p.theme.colors.error}; background: ${p => p.theme.colors.surfaceAlt}; }
    }

    &:hover .remove { display: block; }
`;

const NoteList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

/** Kto i kiedy - podpis nad treścią ostatniej wiadomości. */
const LastMessageMeta = styled.div`
    font-size: 11.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

/**
 * Treść pierwszego pytania klienta. Zachowuje łamanie wierszy z maila i przewija się
 * w miejscu - dłuższe zapytanie nie ma prawa rozpychać okna na cały ekran, a jego
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
    /* Kreska cytatu: krótka, w kolorze marki - znak, że to cudze słowa, nie nasz opis. */
    border-left: 2px solid ${p => p.theme.colors.primary};
    padding-left: 12px;
`;

/** „1 odwołana rezerwacja", „2 odwołane rezerwacje", „5 odwołanych rezerwacji". */
const bookingWord = (count: number): string => {
    if (count === 1) return 'odwołana rezerwacja';
    const rest = count % 10;
    const teens = count % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14)
        ? 'odwołane rezerwacje'
        : 'odwołanych rezerwacji';
};

/** „1 porzucone zapytanie", „2 porzucone zapytania", „5 porzuconych zapytań". */
const leadWord = (count: number): string => {
    if (count === 1) return 'porzucone zapytanie';
    const rest = count % 10;
    const teens = count % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14)
        ? 'porzucone zapytania'
        : 'porzuconych zapytań';
};

export interface LeadDetailModalProps {
    leadId: string;
    onClose: () => void;
    /** Otworzyć od razu edytor wyceny - wejście „kliknięto wartość w tabeli". */
    openServicesEditor?: boolean;
    /**
     * Droga do korespondencji („Odpisz klientowi" / „Napisz wiadomość"). Wyłączana
     * tam, gdzie okno otwarto właśnie z tej korespondencji: przycisk prowadzący
     * w miejsce, w którym się stoi, to nie skrót, tylko zagadka.
     */
    showThreadLink?: boolean;
    /** Wywoływane po usunięciu leada - okno jest wtedy już zamknięte. */
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
    const { data: timeline } = useLeadTimeline(leadId);
    /*
     * Ostatnia wiadomość w wątku - z osi czasu, nie z osobnego zapytania. Oś już
     * niesie całą korespondencję, więc drugie żądanie po tę samą treść byłoby
     * ceną za nic. Pokazujemy ją tylko wtedy, gdy NIE jest pierwszym pytaniem
     * klienta: przy leadzie z jedną wiadomością panel powtarzałby to, co stoi
     * linijkę wyżej w „O co pytał klient".
     */
    const messages = (timeline ?? []).filter(
        (entry) => entry.kind === 'INBOUND_MESSAGE' || entry.kind === 'OUTBOUND_MESSAGE'
    );
    const lastMessage = messages.length > 1 ? messages[messages.length - 1] : null;
    // Termin rezerwacji dobierany osobno - lead niesie samo `appointmentId`.
    const { data: appointment } = useLeadAppointment(lead?.appointmentId ?? null);
    // null = podgląd, tablica = otwarty edytor wyceny (ten sam co przy przyjęciu auta).
    const [editingServices, setEditingServices] = useState<ServiceLineItem[] | null>(null);
    // null = podgląd, obiekt = edycja pojazdu. Marka i model wybierane z katalogu,
    // bo wpisane ręcznie „bèemka" psułaby wyszukiwanie tak samo jak surowy tekst z LLM-a.
    const [editingVehicle, setEditingVehicle] = useState<{ brand: string; model: string } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    // „Kontakt poza pocztą": rozmowa czy SMS to kontakt, nie notatka — pyta o niego
    // osobne okno, bo notatka przy nim jest opcjonalna.
    const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
    // Drugie pytanie przy leadzie z rezerwacją: czy termin w kalendarzu idzie razem z nim.
    const [deleteAppointmentDialogOpen, setDeleteAppointmentDialogOpen] = useState(false);
    const [booking, setBooking] = useState(false);
    // Wizytówka kontaktu - ta sama co w skrzynce, razem z „połącz" i „załóż".
    const [contactAnchor, setContactAnchor] = useState<HTMLElement | null>(null);
    // Edytor wyceny otwarty od pierwszej klatki, gdy wejściem było kliknięcie wartości.
    // Wystarczy stan początkowy: okno montuje się na jedno otwarcie jednego leada,
    // więc nie ma czego dosynchronizowywać efektem.
    const [servicesPrimed, setServicesPrimed] = useState(false);
    if (openServicesEditor && !servicesPrimed && lead) {
        setServicesPrimed(true);
        setEditingServices(toServiceLines(lead.services));
    }

    // Kartoteka kontaktu - stąd bierzemy telefon i auta klienta do rezerwacji.
    // Pobierana dopiero, gdy okno jest otwarte: lista leadów jej nie potrzebuje.
    const { data: contactCard } = useContactCard(lead?.contactIdentifier ?? null, {
        enabled: Boolean(lead?.contactIdentifier),
    });
    const status = useLeadStatusChange();
    const updateVehicle = useUpdateLeadVehicle();
    const updateServices = useUpdateLeadServices();
    const deleteLead = useDeleteLead();
    const { showSuccess, showError } = useToast();

    // Notatki: „oddzwoniłem, prosił o kontakt po 15". Ślad pracy, którego nie
    // niesie korespondencja (telefon nie zostawia maila) ani historia statusów.
    const { data: notes } = useLeadNotes(leadId);
    const addNote = useAddLeadNote();
    const deleteNote = useDeleteLeadNote();
    const [noteDraft, setNoteDraft] = useState('');

    const submitNote = () => {
        const content = noteDraft.trim();
        if (!content) return;
        addNote.mutate(
            { leadId, content },
            {
                onSuccess: () => setNoteDraft(''),
                onError: () => showError('Nie udało się zapisać notatki', 'Spróbuj ponownie'),
            }
        );
    };

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
        setDeleteDialogOpen(false);
        // Lead z rezerwacją: rezerwacja to osobna rzecz w kalendarzu i jej los jest
        // osobną decyzją - pada w drugim pytaniu, a nie w domyślnej regule, której
        // nikt nie widzi.
        if (lead?.appointmentId) {
            setDeleteAppointmentDialogOpen(true);
            return;
        }
        performDelete(false);
    };

    const performDelete = (deleteAppointment: boolean) => {
        // Okno zamykamy PRZED wysłaniem żądania. Otwarte odpytuje `GET /leads/{id}`
        // i `…/history`; unieważnienie cache po usunięciu kazałoby mu pobrać leada,
        // którego już nie ma - i obok „Lead usunięty" wyskakiwało „Nie znaleziono
        // leada" z globalnego przechwytywacza błędów. Odmontowane okno nie pyta.
        //
        // Toasty (sukces i błąd) mieszkają w useDeleteLead: callbacki podane do
        // `mutate` nie odpalają się po odmontowaniu komponentu - tak właśnie ginął
        // po cichu komunikat błędu przy leadzie z rezerwacją.
        setDeleteAppointmentDialogOpen(false);
        onClose();
        onDeleted?.();
        deleteLead.mutate({ leadId, deleteAppointment });
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

    // Kontakt bez kartoteki: nie znamy historii, nie podepniemy wizyty ani pojazdu.
    const unknownContact = Boolean(contactCard) && contactCard?.customer === null;
    const risk = contactCard?.risk;
    const abandoned = (risk?.abandonedBookings ?? 0) + (risk?.abandonedLeads ?? 0);

    const quoteRows = toQuoteRows(lead.services);
    const quoteTotal = (pick: (row: typeof quoteRows[number]) => number) =>
        quoteRows.reduce((total, row) => total + pick(row), 0);
    const netTotal = quoteTotal((row) => row.netCents);

    // Kreator rezerwacji zastępuje okno szczegółów, a nie kładzie się na nim. Dwie
    // nałożone nakładki nie pokrywają się geometrycznie - kreator jest przesunięty
    // o szerokość sidebara, okno leada nie - więc jedna z nich przyciemniała kawałek
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
                <LeadHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{lead.customerName ?? lead.contactIdentifier}</ModalTitle>
                        {/* Drogi do innych rekordów stoją przy tożsamości klienta,
                            bo dotyczą klienta, a nie leada - w stopce konkurowałyby
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
                        właściwość i najczęściej zmieniane pole - a jako osobny panel
                        zajmował pół szerokości okna na jeden przycisk. Nagłówek jest
                        też jedynym miejscem widocznym niezależnie od przewinięcia.
                        „Czyj ruch" zeszło stąd do paska podsumowania: to nie jest
                        pole do zmiany, tylko fakt, i stojąc tuż obok wybieraka
                        wyglądało na drugi taki sam przełącznik. */}
                    <HeaderStatus>
                        {canWrite && (
                            <IconAction
                                type="button"
                                onClick={openThread}
                                title="Przejdź do korespondencji"
                                aria-label="Przejdź do korespondencji"
                            >
                                <Mail />
                            </IconAction>
                        )}
                        <LeadStatusPicker
                            status={lead.status}
                            disabled={status.isPending}
                            onChange={(next) => status.requestStatus(lead.id, next)}
                        />
                    </HeaderStatus>
                    <CloseBtn onClick={onClose} />
                </LeadHeader>

                <ModalContent>
                    <ModalBody>
                        {/* Powód przegranej to wyjaśnienie stanu, nie pole formularza -
                            pokazujemy go raz, u góry, i tylko gdy jest czego wyjaśniać. */}
                        {lead.status === 'LOST' && lead.lostReasonLabel && (
                            <LostNote>
                                <span>Przegrany:</span>
                                <span>
                                    <strong>{lead.lostReasonLabel}</strong>
                                    {lead.lostReason && <> - {lead.lostReason}</>}
                                </span>
                            </LostNote>
                        )}

                        {/* Pasek klienta pojawia się tylko wtedy, gdy niesie decyzję
                            albo ostrzeżenie. Znany klient bez porzuceń nie dostaje
                            nic - cisza też jest informacją i nie zajmuje miejsca. */}
                        {unknownContact && (
                            <ClientNote>
                                <UserPlus />
                                <span>Tego kontaktu nie ma jeszcze w kartotece klientów.</span>
                                <span className="spacer" />
                                <QuietLink
                                    type="button"
                                    onClick={(event) => setContactAnchor(event.currentTarget)}
                                >
                                    Połącz albo załóż kartotekę
                                </QuietLink>
                            </ClientNote>
                        )}

                        {abandoned > 0 && (
                            <ClientNote $warn>
                                <AlertTriangle />
                                <span>
                                    {/* Liczby wprost, bez etykiety „podwyższone ryzyko":
                                        jedno odwołanie sprzed roku i trzy z ostatniego
                                        miesiąca to nie jest ta sama sprawa, a ocenić to
                                        potrafi tylko człowiek, który zna klienta. */}
                                    {[
                                        risk?.abandonedBookings
                                            ? `${risk.abandonedBookings} ${bookingWord(risk.abandonedBookings)}`
                                            : null,
                                        risk?.abandonedLeads
                                            ? `${risk.abandonedLeads} ${leadWord(risk.abandonedLeads)}`
                                            : null,
                                    ].filter(Boolean).join(', ')}
                                    {' w historii tego kontaktu.'}
                                </span>
                            </ClientNote>
                        )}

                        {/* Rezerwacja to wynik, po który cały lead istniał - gdy jest,
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
                            {/* Kwota znika na telefonie: tabela usług kilka centymetrów
                                niżej podaje tę samą sumę, a ta sama liczba dwa razy na
                                jednym ekranie to szum, nie podkreślenie. */}
                            <SummaryCell $hideOnPhone>
                                <CellLabel>Wartość wyceny</CellLabel>
                                {quoteRows.length > 0 ? (
                                    <>
                                        <CellMoney>{formatGrosze(lead.estimatedValue)}</CellMoney>
                                        <CellNote>netto {formatGrosze(netTotal)}</CellNote>
                                    </>
                                ) : (
                                    <>
                                        <CellMoney $empty>-</CellMoney>
                                        <CellNote>brak wyceny</CellNote>
                                    </>
                                )}
                            </SummaryCell>

                            <SummaryCell $order={2}>
                                <CellLabel>Pojazd</CellLabel>
                                {lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null ? (
                                    <CellValue $empty>
                                        <Loader2 />
                                        <span>Rozpoznajemy…</span>
                                    </CellValue>
                                ) : (
                                    <CellValue $empty={!formatVehicle(lead)}>
                                        {/* Awatar marki zamiast rodzajowej ikonki auta - ten sam
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

                            {/* Na telefonie pierwsze: to jedyna komórka, która mówi,
                                czy trzeba coś zrobić teraz. */}
                            <SummaryCell $order={1}>
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

                            <SummaryCell $order={3}>
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
                                                    Nie przypisano jeszcze usług - wycena leada jest pusta.
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
                                                potrzebuje własnej, uboższej listy - wycena to ta sama
                                                czynność, tylko wcześniej. */}
                                            <EditableServicesTable
                                                services={editingServices}
                                                onChange={setEditingServices}
                                            />
                                            {/* Sumy netto / VAT / łącznie liczy sam edytor -
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

                                {/* Podobne zlecenia stoją tuż pod wyceną, bo to przy niej
                                    są potrzebne: „ile wzięliśmy za taką robotę" jest
                                    pytaniem, które pada w chwili wpisywania kwoty, a nie
                                    przy czytaniu historii kontaktu. */}
                                <Panel $quiet>
                                    <h4><History /> Podobne zlecenia</h4>
                                    <SimilarVisitsSection leadId={leadId} />
                                </Panel>

                                <Panel $quiet>
                                    <h4><StickyNote /> Notatki</h4>
                                    <NoteComposer>
                                        <textarea
                                            placeholder="Np. oddzwoniłem, klient prosił o kontakt po 15…"
                                            value={noteDraft}
                                            onChange={(event) => setNoteDraft(event.target.value)}
                                            /* Ctrl/Cmd+Enter zapisuje - sam Enter łamie
                                               linię, jak w każdym polu wielolinijkowym. */
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                                    event.preventDefault();
                                                    submitNote();
                                                }
                                            }}
                                        />
                                        {noteDraft.trim() && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <PrimaryButton
                                                    type="button"
                                                    onClick={submitNote}
                                                    disabled={addNote.isPending}
                                                >
                                                    {addNote.isPending ? 'Zapisywanie…' : 'Dodaj notatkę'}
                                                </PrimaryButton>
                                                <IconButton type="button" onClick={() => setNoteDraft('')}>
                                                    Anuluj
                                                </IconButton>
                                            </div>
                                        )}
                                    </NoteComposer>
                                    {(notes ?? []).length > 0 && (
                                        <NoteList>
                                            {(notes ?? []).map((note) => (
                                                <NoteItemRow key={note.id}>
                                                    {note.content}
                                                    <div className="meta">
                                                        {formatDateTime(note.createdAt)}, {note.createdByName}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="remove"
                                                        title="Usuń notatkę"
                                                        onClick={() => deleteNote.mutate({ leadId, noteId: note.id })}
                                                    >
                                                        <X />
                                                    </button>
                                                </NoteItemRow>
                                            ))}
                                        </NoteList>
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

                                {/* Pierwsze pytanie mówi, po co klient przyszedł; ostatnia
                                    wiadomość mówi, na czym stanęło - i to ona decyduje, co
                                    zrobić teraz. Żeby ją zobaczyć, trzeba było dotąd wyjść
                                    do skrzynki albo rozwinąć właściwe zdarzenie na osi czasu.
                                    Panel znika przy leadzie z jedną wiadomością: powtarzanie
                                    tej samej treści dwa razy pod sobą niczego nie dodaje. */}
                                {lastMessage && (
                                    <Panel $quiet>
                                        <h4><MessageSquare /> Ostatnia wiadomość</h4>
                                        <LastMessageMeta>
                                            {lastMessage.kind === 'INBOUND_MESSAGE' ? 'Od klienta' : 'Od nas'}
                                            {' · '}
                                            {formatDateTime(lastMessage.at)}
                                            {lastMessage.actorName && <>, {lastMessage.actorName}</>}
                                        </LastMessageMeta>
                                        <MessageQuote>{lastMessage.body}</MessageQuote>
                                    </Panel>
                                )}

                                <Panel $quiet>
                                    <h4>Historia</h4>
                                    <LeadTimeline entries={timeline ?? []} />
                                </Panel>
                            </Column>
                        </BodyGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>
                    {/* Usunięcie stoi po lewej, z dala od akcji głównej - dwie akcje
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
                        Akcja główna wynika ze stanu leada - w tej kolejności:

                        1. zalegamy z odpowiedzią → „Odpisz klientowi". Zaległość jest
                           pilniejsza od wszystkiego innego: klient czeka teraz, a termin
                           poczeka do jutra.
                        2. jest już termin → „Zobacz rezerwację". Drugiej się nie założy
                           (backend odmówi), więc oferowanie jej byłoby ślepą uliczką.
                        3. lead zamknięty → „Napisz wiadomość". Zrealizowanego ani
                           przegranego nie umawia się ponownie jednym kliknięciem, ale
                           odezwać się do klienta zawsze wolno.
                        4. w pozostałych → „Stwórz rezerwację", czyli po co ten moduł jest.

                        Obok akcji głównej stopka niesie najwyżej dwa przyciski drugorzędne:
                        stały „Kontakt poza pocztą" i — gdy umówienie terminu nie jest akcją
                        główną — „Stwórz rezerwację". Zwykłe przejście do korespondencji zeszło
                        do ikony koperty w nagłówku: jako pełny przycisk konkurowało wagą
                        z akcją, która ma tu stać, a na telefonie zabierało całą linijkę.
                    */}
                    {/* Odnotowanie kontaktu poza pocztą stoi PRZED akcją główną i jest
                        przyciskiem drugorzędnym: to zapis tego, co już się wydarzyło,
                        a nie następny krok w sprawie. Bez warunku na numer telefonu —
                        klient podaje go w treści zapytania równie często, jak ma go
                        w kartotece, a bywa i tak, że kontakt był SMS-em albo osobisty. */}
                    <IconButton type="button" onClick={() => setCallbackDialogOpen(true)}>
                        <PhoneCall size={14} /> Kontakt poza pocztą
                    </IconButton>

                    {(() => {
                        if (lead.appointmentId) {
                            return (
                                <PrimaryButton type="button" onClick={openAppointment}>
                                    <CalendarCheck size={14} /> Zobacz rezerwację
                                </PrimaryButton>
                            );
                        }
                        if (closed) {
                            return canWrite ? (
                                <PrimaryButton type="button" onClick={openThread}>
                                    <Send size={14} /> Napisz wiadomość
                                </PrimaryButton>
                            ) : null;
                        }
                        if (replyTone === 'due' && canWrite) {
                            return (
                                <>
                                    <IconButton type="button" onClick={() => setBooking(true)}>
                                        <CalendarPlus size={14} /> Stwórz rezerwację
                                    </IconButton>
                                    <PrimaryButton type="button" onClick={openThread}>
                                        <Send size={14} /> Odpisz klientowi
                                    </PrimaryButton>
                                </>
                            );
                        }
                        return (
                            <PrimaryButton type="button" onClick={() => setBooking(true)}>
                                <CalendarPlus size={14} /> Stwórz rezerwację
                            </PrimaryButton>
                        );
                    })()}

                    <IconButton onClick={onClose}>Zamknij</IconButton>
                </ModalFooter>
            </ModalShell>

            {callbackDialogOpen && (
                <RecordCallbackDialog
                    leadId={leadId}
                    onClose={() => setCallbackDialogOpen(false)}
                />
            )}

            {/* Wizytówka to ten sam komponent co w skrzynce - z wyszukiwarką klientów
                i zakładaniem kartoteki. Druga, uboższa kopia tego formularza w oknie
                leada rozjechałaby się z pierwszą przy najbliższej zmianie. */}
            {contactAnchor && (
                <ContactCardPopover
                    email={lead.contactIdentifier}
                    participantName={lead.customerName}
                    anchor={contactAnchor}
                    zIndex={SUBMODAL_Z_INDEX}
                    onClose={() => setContactAnchor(null)}
                />
            )}

            <ConfirmationModal
                isOpen={deleteDialogOpen}
                title="Usunąć ten lead?"
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
            />

            {/* Drugie pytanie, tylko dla leada z rezerwacją. „Nie" jest pełnoprawną
                decyzją (lead znika, termin zostaje w kalendarzu), a zamknięcie okna -
                rezygnacją z całego usuwania, po której nie dzieje się nic. */}
            <ChoiceModal
                isOpen={deleteAppointmentDialogOpen}
                title="Czy usunąć również rezerwację?"
                message="Ten lead ma rezerwację w kalendarzu. Możesz usunąć ją razem z leadem albo zostawić jako samodzielny termin."
                variant="danger"
                primaryText="Tak, usuń rezerwację"
                onPrimary={() => performDelete(true)}
                secondaryText="Nie, zostaw termin"
                onSecondary={() => performDelete(false)}
                onDismiss={() => setDeleteAppointmentDialogOpen(false)}
            />

            {status.lostDialog}
        </>
    );
}
