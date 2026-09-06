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
import styled, { css, keyframes } from 'styled-components';
import {
    AlertTriangle,
    CalendarCheck,
    CalendarPlus,
    Car,
    ExternalLink,
    Loader2,
    Mail,
    Phone,
    PhoneCall,
    RefreshCw,
    Send,
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
    useLeadDictionaries,
    useLeadTimeline,
    useLeadNotes,
    useUpdateLeadServices,
    useAcceptAllSuggestions,
    useSuggestionActions,
    useStagnationThresholds,
    useUpdateLeadTags,
    useUpdateLeadVehicle,
} from '../hooks/useLeads';
import { useLeadStatusChange } from '../hooks/useLeadStatusChange';
import { useContactCard } from '../hooks/useComms';
import { ContactCardPopover } from './ContactCardPopover';
import { leadToBookingPrefill } from '../utils/bookingPrefill';
import { toLeadInputs, toQuoteRows, toServiceLines } from '../utils/leadServiceLines';
import { CLOSED_STATUSES, describeAppointmentMoment, formatVehicle } from '../utils/leadFormat';
import { describeLeadUrgency, type ReplyTone } from '../utils/leadUrgency';
import type { LeadServiceItemInput } from '../types';
import { LeadSourceIcon } from './LeadSourceIcon';
import { TagMultiSelect } from './TagMultiSelect';
import { useTagCatalogActions } from '../hooks/useTagCatalogActions';
import { LeadStatusPicker } from './LeadStatusPicker';
import { LeadTimeline } from './LeadTimeline';
import { SimilarVisitsRefresh, SimilarVisitsSection } from './SimilarVisitsSection';
import { SuggestedServiceRows } from './SuggestedServiceRows';
import { RecordCallbackDialog } from './RecordCallbackDialog';
import { IconButton, PrimaryButton, formatDateTime, formatMoney } from './shared';

/**
 * Dwie kolumny o różnej roli, nie dwie równe połówki. Po lewej to, co się w leadzie
 * robi (pojazd, wycena) - szersza, bo wycena jest tabelą czterech kolumn kwot.
 * Po prawej to, co się o leadzie wie (zapytanie klienta, historia) - węższa i
 * wizualnie cichsza. Wcześniej wszystko szło jedną kolumną w dół, więc zapytanie,
 * od którego cała sprawa się zaczęła, leżało poza pierwszym ekranem.
 */
const BodyGrid = styled.div<{ $pane?: boolean }>`
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;

    /*
     * W panelu obok kolejki kolumny zamieniają się rolami: przebieg sprawy idzie
     * na lewo (to jest treść, po którą się tu wchodzi), a wycena, kartoteka
     * i podobne zlecenia schodzą do wąskiej szyny po prawej. W oknie modalnym
     * - otwieranym z widoku poczty, gdzie korespondencję ma się już przed sobą -
     * pierwsza jest wycena. Zamiana robi się porządkiem CSS, więc obie wersje
     * renderują dokładnie ten sam JSX.
     */
    ${p => p.$pane && `
        grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
        & > *:nth-child(1) { order: 2; }
        & > *:nth-child(2) { order: 1; }
    `}

    /*
     * Na telefonie kolumny przestają być kolumnami - display: contents wpuszcza ich
     * sekcje wprost do siatki, żeby przebieg sprawy dało się wsunąć zaraz pod wycenę.
     * Bez tego kolejność wynikałaby z DOM-u i oś czasu lądowała za kartoteką klienta,
     * podobnymi zleceniami i notatkami - czyli poza zasięgiem kciuka.
     *
     * Kolejność: wycena (ile to warte), przebieg (co klient napisał), reszta.
     * Sterowana atrybutem, a nie numerem dziecka: sekcje renderują się warunkowo,
     * więc nth-child wskazywałby raz na jedno, raz na drugie.
     */
    @media (max-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: minmax(0, 1fr);

        /* Selektor przez element, nie przez gwiazdkę: sama gwiazdka ma tę samą wagę
           co klasa kolumny i przegrywa z jej własnym display: flex. */
        & > div { display: contents; }
        & > div > * { order: 3; }
        & > div > section:first-of-type { order: 1; }
        & > div > [data-block='timeline'] { order: 2; }
    }
`;

/**
 * Powłoka panelu wstawionego obok kolejki - odpowiednik ModalShell bez okna.
 * Własne przewijanie, żeby lista po lewej i szczegóły po prawej scrollowały się
 * niezależnie; wysokość bierze z rodzica, a nie z okna przeglądarki.
 */
const PaneShell = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: ${p => p.theme.colors.surface};
    overflow: hidden;
`;

/** „Czeka 6 dni" w prawym górnym rogu panelu - stan, po który sięga się pierwszy. */
const HeaderUrgency = styled.span<{ $tone: ReplyTone }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: ${p => p.theme.radii.md};
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    white-space: nowrap;

    background: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.errorLight
        : $tone === 'stale' ? theme.colors.warningLight
        : theme.colors.surfaceAlt};
    color: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.textMuted};

    svg { width: 14px; height: 14px; }
`;

/**
 * Rząd faktów pod nagłówkiem: etap, pojazd i usługi, o które pyta klient.
 *
 * Zastąpił czterokomórkowy pasek podsumowania. Pasek powtarzał kwotę, która stoi
 * w szynie po prawej, i wiek oczekiwania, który stoi plakietką w nagłówku - a to,
 * co niósł naprawdę (pojazd i usługi wraz z drogą do ich poprawienia), zajmowało
 * w nim ćwierć szerokości na komórkę. Chip mówi to samo w jednej linii i sam
 * jest przyciskiem.
 */
const FactChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

/** [$soft] - fakt, którego nie potwierdził człowiek: obramowanie przerywane. */
const FactChip = styled.button<{ $soft?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 14px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px ${p => (p.$soft ? 'dashed' : 'solid')} ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
        border-color: ${p => p.theme.colors.textMuted};
        border-style: solid;
    }

    svg { width: 13px; height: 13px; }
`;

/** Sekcja szyny: etykieta wersalikami i treść, bez szarej ramki panelu. */
const RailSection = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};

    &:last-child { border-bottom: none; padding-bottom: 0; }
`;

const RailLabel = styled.h4`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

/** Wycena jako spis „nazwa - brutto", nie tabela netto/VAT/brutto. */
const QuoteList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13.5px;

    .row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
    }
    .row span:first-child { color: ${p => p.theme.colors.textSecondary}; min-width: 0; }
    .row span:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }

    .total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding-top: 10px;
        border-top: 1px solid ${p => p.theme.colors.border};
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
    .total span:last-child {
        font-size: 17px;
        font-weight: ${p => p.theme.fontWeights.bold};
        font-variant-numeric: tabular-nums;
    }
`;

/** Fakty o kliencie: trzy linijki, bez ozdobników. */
const RailFacts = styled.div`
    font-size: 13.5px;
    line-height: 1.65;
    color: ${p => p.theme.colors.textSecondary};

    strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
        font-variant-numeric: tabular-nums;
    }
`;

/** Nagłówek sekcji w kolumnie przebiegu - ta sama waga co etykiety szyny. */
const TimelineLabel = styled.h4`
    margin: 0 0 14px 0;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Polska liczba mnoga: 1 wizyta, 2-4 wizyty, 5+ wizyt - z wyjątkiem nastek
 * (12-14 idą jak 5+). Trzeci wariant jest tu obowiązkowy: „4 zrealizowanych
 * wizyt" to zdanie, którego nikt nie napisałby ręcznie.
 */
function plural(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (count === 1) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

/** „14 marca" - rok tylko wtedy, gdy wizyta jest z innego. */
function formatDayMonth(iso: string): string {
    const date = new Date(iso);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
}

/** Podpowiedź klawiszowa w stopce panelu - w oknie modalnym nie ma czego przeskakiwać. */
const KeyHint = styled.span`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
    text-align: right;
    /*
     * Baza 0 i swoboda rośnięcia: podpowiedź wypełnia to, co zostało, ale przy
     * liczeniu zawijania liczy się jak nic. Z automatycznym marginesem i naturalną
     * szerokością spychała akcję główną do drugiego wiersza stopki.
     */
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: ${p => p.theme.breakpoints.md}) { display: none; }
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

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

/**
 * Poboczna akcja sekcji - ikona w prawym górnym rogu nagłówka, wyjaśniona
 * podpowiedzią pod kursorem.
 *
 * Wcześniej „Sprawdź ponownie" stało pod treścią jako przycisk z etykietą, przez
 * co wyglądało na akcję sekcji. Nią nie jest: wynik jest policzony i zapisany, a
 * przeliczenie to wyjście awaryjne na świat, który się zmienił. Nagłówek trzyma
 * je w zasięgu ręki, nie każąc mu konkurować o uwagę z tym, po co ktoś tu przyszedł.
 * Sama ikona bez podpisu, bo nagłówek jest wersalikowy i 11-punktowy - drugi
 * napis obok niego przestaje być nagłówkiem, a staje się paskiem narzędzi.
 */
const panelAction = css`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: color ${p => p.theme.transitions.fast}, background ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.text};
    }
    &:disabled { cursor: default; }

    svg { width: 14px; height: 14px; }
    .spin { animation: ${spin} 900ms linear infinite; }
`;

const PanelAction = styled.button`${panelAction}`;

/** Ta sama ikona w nagłówku „Podobnych zleceń" - mutację trzyma tamten moduł. */
const SimilarVisitsAction = styled(SimilarVisitsRefresh)`${panelAction}`;

/** Wybierak etapu w nagłówku - trzymany z dala od tytułu, tuż przed przyciskiem zamknięcia. */
/*
 * Kiedyś stał tu wybierak etapu i na telefonie musiał schodzić pod nazwę klienta,
 * na całą szerokość - obok tytułu zostawało mu kilkanaście pikseli i wielokropek
 * zamiast nazwiska. Etap przeniósł się do rzędu chipów, więc zostaje sama ikona
 * koperty (plakietka „czyj ruch" jest tylko w panelu, a panel nie schodzi poniżej
 * xl). Jeden przycisk 40 px nie potrzebuje własnego wiersza: pełna szerokość dla
 * niego kosztowała na telefonie linijkę nagłówka, czyli tyle, ile zajmuje
 * pierwsza wiadomość.
 */
const HeaderStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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

/**
 * Ikona źródła i tożsamość klienta jako JEDEN element liniowy, nie dwa elementy flex.
 *
 * Osobno rozjeżdżały się na telefonie: kontener zawija (bo muszą się zawijać „Zadzwoń"
 * i „Kartoteka klienta"), a flex przenosi do następnej linii CAŁY element, zanim
 * spróbuje go zwęzić - więc przy nagłówku węższym o kilka pikseli nazwisko schodziło
 * niżej i zostawiało samotną kopertę nad sobą. Ikona wpuszczona w tekst zawija się
 * razem z nim, jak każde inne słowo.
 */
const IdentityText = styled.span`
    min-width: 0;
    overflow-wrap: anywhere;

    /* display: inline jest tu obowiązkowe: ikony w tym oknie są blokowe (reguła
       z nagłówka modala), a element blokowy w środku i tak zajmie własną linię -
       czyli dokładnie to, co ta zmiana miała usunąć. */
    svg {
        display: inline;
        vertical-align: -2px;
        margin-right: 6px;
    }
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
    /* Odsunięte od reszty: to jedyna akcja nieodwracalna w tej stopce. */
    margin-right: auto;

    /*
     * Na telefonie stopka się zawija i „Usuń lead" - jako pierwsza w kolejności
     * dokumentu - lądowało w pierwszym rzędzie, nad akcją główną. Najbardziej
     * wyeksponowanym przyciskiem okna była kasacja sprawy. Na wąskim ekranie
     * schodzi więc na koniec i przestaje zabierać całą szerokość.
     */
    @media (max-width: 640px) {
        order: 99;
        margin-right: 0;
        flex: 0 0 auto;
    }
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
    /**
     * Obudowa: okno modalne (widok poczty, gdzie szczegóły przykrywają rozmowę)
     * albo panel wstawiony obok kolejki (widok zapytań). Treść jest ta sama -
     * dwie implementacje tego samego okna rozjechałyby się przy pierwszej zmianie.
     */
    chrome?: 'modal' | 'pane';
    /** Podpowiedź klawiszowa w stopce; sam skok obsługuje właściciel listy. */
    keyHint?: string;
}

export function LeadDetailModal({
    leadId,
    onClose,
    openServicesEditor = false,
    showThreadLink = true,
    onDeleted,
    chrome = 'modal',
    keyHint,
}: LeadDetailModalProps) {
    const navigate = useNavigate();
    const { data: lead } = useLead(leadId);
    const { data: timeline } = useLeadTimeline(leadId);
    const stagnation = useStagnationThresholds();
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
    const updateTags = useUpdateLeadTags();
    const { data: dictionaries } = useLeadDictionaries();
    /*
     * Tagi - „o co pytają" - dały się dotąd zmieniać wyłącznie z chmurki nad
     * tabelą leadów. Odkąd kolejka nie ma edytowalnych komórek, to jedyne
     * miejsce, w którym da się je poprawić; bez tego przeniesienie edycji do
     * okna szczegółów oznaczałoby po prostu utratę funkcji.
     */
    const [editingTags, setEditingTags] = useState<string[] | null>(null);
    const tagActions = useTagCatalogActions((code) =>
        setEditingTags((current) =>
            current === null || current.includes(code) ? current : [...current, code]
        )
    );
    const updateServices = useUpdateLeadServices();
    const acceptAllSuggestions = useAcceptAllSuggestions(leadId);
    const { showSuccess, showError } = useToast();

    /** Sugestie AI czekające na decyzję — wiersze w tabeli wyceny, pod pozycjami przyjętymi. */
    const suggestedServices = (lead?.services ?? []).filter((s) => s.status === 'SUGGESTED');
    // Jedna instancja mutacji na okno: przycisk odświeżania stoi w nagłówku sekcji,
    // a przyciski „Akceptuj"/„Odrzuć" w jej wierszach. Dwie osobne instancje nie
    // wiedziałyby o sobie i dałoby się przyjąć pozycję w trakcie przeliczania,
    // czyli dopisać do wyceny sugestię, którą serwer właśnie podmienia.
    const suggestionActions = useSuggestionActions(leadId);

    /**
     * „Stwórz rezerwację" traktuje nieodrzucone sugestie jak zaakceptowane: przenosi
     * je serwerowo PRZED otwarciem formularza. Gdy któraś czeka na kwotę, serwer
     * odmawia (409) i wtedy wymuszamy uzupełnienie zamiast wpuścić pozycję bez ceny.
     */
    const openBooking = () => {
        if (suggestedServices.length === 0) {
            setBooking(true);
            return;
        }
        acceptAllSuggestions.mutate(undefined, {
            onSuccess: () => setBooking(true),
            onError: (err: unknown) => {
                const names = (err as { response?: { data?: { serviceNames?: string[] } } })
                    ?.response?.data?.serviceNames;
                showError(
                    'Uzupełnij kwoty sugestii',
                    names?.length
                        ? `Podaj kwotę dla: ${names.join(', ')}`
                        : 'Któraś sugestia czeka na kwotę — podaj ją albo odrzuć sugestię.'
                );
            },
        });
    };
    const deleteLead = useDeleteLead();

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

    const saveTags = () => {
        if (!editingTags) return;
        updateTags.mutate(
            { leadId, tags: editingTags },
            {
                onSuccess: () => {
                    setEditingTags(null);
                    showSuccess('Tagi zapisane');
                },
                onError: () => showError('Nie udało się zapisać tagów', 'Spróbuj ponownie'),
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
    // Jedna reguła dla całego modułu, z progami studia. Obejmuje też leady bez
    // wątku - telefon, formularz, wpis ręczny - które wcześniej nie miały tu nic
    // do pokazania, mimo że klient czekał tak samo.
    const urgency = describeLeadUrgency(lead, stagnation);
    const replyTone = urgency.tone;
    // Znacznik tylko wtedy, gdy jest jeszcze o czym mówić: w sprawie zamkniętej
    // nikt na nic nie czeka.
    const reply = urgency.turn === 'SETTLED' ? null : urgency;
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

    // Trzy liczby o kliencie do szyny; null dla kontaktu spoza kartoteki.
    const customerFacts = contactCard?.customer ?? null;

    const quoteRows = toQuoteRows(lead.services);
    const quoteTotal = (pick: (row: typeof quoteRows[number]) => number) =>
        quoteRows.reduce((total, row) => total + pick(row), 0);

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

    const isPane = chrome === 'pane';

    // Treść jest jedna; różni się wyłącznie obudowa. Dynamiczny komponent powłoki
    // nie przechodzi typowania (ModalShell i PaneShell mają rozłączne propsy),
    // więc rozgałęzienie stoi w JSX, a nie w typie.
    const body = (
        <>
            <LeadHeader>
                    <ModalTitleGroup>
                        {/*
                            Nagłówkiem jest AUTO, tak samo jak na karcie w kolejce.
                            Tapnięcie karty „Porsche Cayenne", po którym otwiera się
                            okno zatytułowane nazwiskiem, każe użytkownikowi za każdym
                            razem sprawdzać, czy trafił w tę sprawę, o którą mu szło.
                            Gdy auta nie rozpoznano, nazwisko awansuje - dokładnie ta
                            sama reguła co w LeadQueueCard.
                        */}
                        <ModalTitle>
                            {formatVehicle(lead) ?? lead.customerName ?? lead.contactIdentifier}
                        </ModalTitle>
                        {/* Drogi do innych rekordów stoją przy tożsamości klienta,
                            bo dotyczą klienta, a nie leada - w stopce konkurowałyby
                            wagą z jedyną akcją, która ma tam stać. */}
                        <LeadIdentity>
                            <IdentityText>
                                <LeadSourceIcon source={lead.source} />
                                {formatVehicle(lead) && lead.customerName
                                    ? `${lead.customerName} · ${lead.contactIdentifier}`
                                    : lead.contactIdentifier}
                            </IdentityText>
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
                    {/* W nagłówku zostaje to, co nie jest polem do zmiany: droga do
                        korespondencji i „czyj ruch". Etap zszedł do rzędu faktów pod
                        spodem, między pojazd i usługi - stojąc w nagłówku wyglądał na
                        właściwość okna, a jest jedną z trzech rzeczy, które się tu
                        poprawia. */}
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
                        {/* W panelu „czyj ruch" wraca do nagłówka: obok kolejki to
                            jest pierwsza rzecz, po którą sięga wzrok po kliknięciu
                            karty, a pasek podsumowania jest niżej niż zgięcie. */}
                        {isPane && reply && (
                            <HeaderUrgency $tone={reply.tone} title={reply.title}>
                                {reply.label}
                            </HeaderUrgency>
                        )}
                    </HeaderStatus>
                    {/* Panel nie ma czego zamykać - następna karta go podmienia. */}
                    {!isPane && <CloseBtn onClick={onClose} />}
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

                        {/* Rząd faktów: etap, pojazd i usługi - w tej kolejności, bo tak
                            czyta się sprawę. Każdy chip jest przyciskiem do poprawki, więc
                            droga „zobacz i popraw" nie prowadzi przez żaden panel. */}
                        <FactChips>
                            <LeadStatusPicker
                                status={lead.status}
                                disabled={status.isPending}
                                onChange={(next) => status.requestStatus(lead.id, next)}
                            />

                            {lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null ? (
                                <FactChip as="span" $soft>
                                    <Loader2 className="spin" /> Rozpoznajemy auto…
                                </FactChip>
                            ) : (
                                <FactChip
                                    type="button"
                                    $soft={!formatVehicle(lead)}
                                    title="Kliknij, żeby poprawić pojazd"
                                    onClick={() => setEditingVehicle({
                                        brand: lead.vehicleBrand ?? '',
                                        model: lead.vehicleModel ?? '',
                                    })}
                                >
                                    {lead.vehicleBrand && <CarLogoImage brand={lead.vehicleBrand} size="xs" />}
                                    {formatVehicle(lead) ?? 'Dodaj pojazd'}
                                </FactChip>
                            )}

                            {/* Każdy tag osobnym chipem, nie listą po przecinku: tak wygląda
                                zbiór, w którym da się coś dołożyć i coś wyjąć. */}
                            {lead.tagLabels.map((label) => (
                                <FactChip
                                    key={label}
                                    type="button"
                                    title="Kliknij, żeby zmienić usługi"
                                    onClick={() => setEditingTags(lead.tags)}
                                >
                                    {label}
                                </FactChip>
                            ))}
                            {lead.tagLabels.length === 0 && (
                                <FactChip
                                    type="button"
                                    $soft
                                    title="Kliknij, żeby dodać usługi"
                                    onClick={() => setEditingTags(lead.tags)}
                                >
                                    Dodaj usługi
                                </FactChip>
                            )}
                        </FactChips>

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

                        {editingTags !== null && (
                            <Panel>
                                <h4>Usługi, o które pyta klient</h4>
                                <TagMultiSelect
                                    options={dictionaries?.tags ?? []}
                                    value={editingTags}
                                    onChange={setEditingTags}
                                    onCreate={tagActions.onCreate}
                                    onDelete={tagActions.onDelete}
                                    isCreating={tagActions.isCreating}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <PrimaryButton onClick={saveTags} disabled={updateTags.isPending}>
                                        {updateTags.isPending ? 'Zapisywanie…' : 'Zapisz'}
                                    </PrimaryButton>
                                    <IconButton onClick={() => setEditingTags(null)}>Anuluj</IconButton>
                                </div>
                            </Panel>
                        )}

                        <BodyGrid $pane={isPane}>
                            <Column>
                                <RailSection>
                                    <RailLabel>
                                        Wycena
                                        <PanelAction
                                            type="button"
                                            title="Sprawdź ponownie, co da się wyczytać z treści zapytania"
                                            aria-label="Sprawdź ponownie sugestie usług"
                                            disabled={suggestionActions.refresh.isPending}
                                            onClick={() => suggestionActions.refresh.mutate()}
                                        >
                                            <RefreshCw
                                                className={suggestionActions.refresh.isPending ? 'spin' : undefined}
                                            />
                                        </PanelAction>
                                    </RailLabel>
                                    {editingServices === null && (
                                        <>
                                            {/* Bez zdania „nie przypisano jeszcze usług": pusta
                                                tabela jest widoczna sama przez się, a przy leadzie
                                                z samą sugestią to zdanie przeczyło wierszowi, który
                                                stał tuż pod nim. Gdy nie ma ani wyceny, ani sugestii,
                                                zostaje sam przycisk „Dodaj usługi" - on mówi to samo,
                                                tylko daje się kliknąć. */}
                                            {(quoteRows.length > 0 || suggestedServices.length > 0) && (
                                                <QuoteList>
                                                    {/* Nazwa i kwota brutto - tyle, ile potrzeba,
                                                        żeby wiedzieć, co komu obiecaliśmy. Netto
                                                        i VAT zostały w edytorze: w szynie obok osi
                                                        czasu trzy kolumny liczb czytało się jak
                                                        fakturę, a to jest notatka o rozmowie. */}
                                                    {quoteRows.map((row) => (
                                                        <div className="row" key={row.id}>
                                                            <span>
                                                                {row.name}{row.quantity > 1 ? ` ×${row.quantity}` : ''}
                                                            </span>
                                                            <span>{formatMoney(row.grossCents)}</span>
                                                        </div>
                                                    ))}
                                                    {quoteRows.length > 0 && (
                                                        <div className="total">
                                                            <span>Razem</span>
                                                            <span>{formatMoney(quoteTotal((row) => row.grossCents))}</span>
                                                        </div>
                                                    )}
                                                </QuoteList>
                                            )}

                                            {/* Sugestie pod kreską sumy: „Razem" liczy pozycje
                                                przyjęte, a to są propozycje czekające na decyzję.
                                                Zostają wierszami tabeli, bo niosą własne przyciski
                                                i pole kwoty - w spisie dwukolumnowym nie miałyby
                                                się gdzie zmieścić. */}
                                            {suggestedServices.length > 0 && (
                                                <QuoteTable>
                                                    <tbody>
                                                        <SuggestedServiceRows
                                                            suggestions={suggestedServices}
                                                            actions={suggestionActions}
                                                        />
                                                    </tbody>
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
                                </RailSection>

                                {/* Kartoteka w trzech liczbach: ile razy był, ile zostawił
                                    i kiedy ostatnio. To jest kontekst, w którym czyta się
                                    kwotę wyceny - inaczej wycena wisi w próżni. Sekcja
                                    znika dla kontaktu spoza kartoteki: baner nad panelem
                                    już powiedział, że go tam nie ma. */}
                                {customerFacts && (
                                    <RailSection>
                                        <RailLabel>Klient</RailLabel>
                                        <RailFacts>
                                            <strong>{customerFacts.completedVisitCount}</strong>
                                            {' '}
                                            {plural(
                                                customerFacts.completedVisitCount,
                                                'zrealizowana wizyta',
                                                'zrealizowane wizyty',
                                                'zrealizowanych wizyt'
                                            )}
                                            <br />
                                            <strong>{formatMoney(customerFacts.totalSpentGross)}</strong> obrotu
                                            {customerFacts.lastVisitAt && (
                                                <>
                                                    <br />
                                                    Ostatnia: {formatDayMonth(customerFacts.lastVisitAt)}
                                                </>
                                            )}
                                        </RailFacts>
                                    </RailSection>
                                )}

                                {/* Podobne zlecenia stoją tuż pod wyceną, bo to przy niej
                                    są potrzebne: „ile wzięliśmy za taką robotę" jest
                                    pytaniem, które pada w chwili wpisywania kwoty, a nie
                                    przy czytaniu historii kontaktu. */}
                                <RailSection>
                                    <RailLabel>
                                        Podobne zlecenia
                                        <SimilarVisitsAction leadId={leadId} />
                                    </RailLabel>
                                    <SimilarVisitsSection leadId={leadId} />
                                </RailSection>

                                <RailSection>
                                    <RailLabel>Notatki</RailLabel>
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
                                </RailSection>

                                {/* Usunięcie na samym końcu szyny: w stopce sąsiadowało
                                    z akcją główną, a na telefonie - gdzie rząd się zawija -
                                    bywało pierwszym przyciskiem okna. Tutaj trzeba do niego
                                    doscrollować, co jest właściwym kosztem dla jedynej
                                    operacji nieodwracalnej w tym oknie. */}
                                <DangerButton
                                    type="button"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    disabled={deleteLead.isPending}
                                >
                                    <Trash2 size={14} /> Usuń lead
                                </DangerButton>
                            </Column>

                            <Column>
                                {/*
                                    „O co pytał klient" i „Ostatnia wiadomość" były
                                    tu osobnymi panelami. Oba powtarzały treść, którą
                                    oś czasu ma bezpośrednio pod nimi: pierwszy wpis to
                                    pierwsze pytanie, ostatni - to, na czym stanęło.
                                    Trzy kopie tej samej wiadomości na jednym ekranie
                                    kazały czytelnikowi za każdym razem sprawdzać, czy
                                    aby na pewno czyta to samo.
                                */}
                                {/* Bez szarej ramki panelu: to jest główna treść tej kolumny,
                                    a nie materiał pomocniczy. Ramka wokół całej osi czasu
                                    robiła z przebiegu sprawy przypis. */}
                                <div data-block="timeline">
                                    <TimelineLabel>Przebieg sprawy</TimelineLabel>
                                    <LeadTimeline entries={timeline ?? []} />
                                </div>
                            </Column>
                        </BodyGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>

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

                    {isPane && keyHint && <KeyHint>{keyHint}</KeyHint>}

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
                                    <IconButton type="button" onClick={openBooking}>
                                        <CalendarPlus size={14} /> Stwórz rezerwację
                                    </IconButton>
                                    <PrimaryButton type="button" onClick={openThread}>
                                        <Send size={14} /> Odpisz klientowi
                                    </PrimaryButton>
                                </>
                            );
                        }
                        return (
                            <PrimaryButton type="button" onClick={openBooking}>
                                <CalendarPlus size={14} /> Stwórz rezerwację
                            </PrimaryButton>
                        );
                    })()}

                    {!isPane && <IconButton onClick={onClose}>Zamknij</IconButton>}
                </ModalFooter>
        </>
    );

    return (
        <>
            {isPane ? (
                <PaneShell>{body}</PaneShell>
            ) : (
                <ModalShell isOpen onClose={onClose} maxWidth="1040px">{body}</ModalShell>
            )}

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

/**
 * Ten sam komponent w obudowie panelu - szczegóły wstawione obok kolejki.
 * Alias, a nie kopia: dwie implementacje tego samego okna rozjechałyby się przy
 * pierwszej zmianie, a to okno niesie całą pracę na leadzie.
 */
export function LeadDetailPane(props: Omit<LeadDetailModalProps, 'chrome'>) {
    return <LeadDetailModal {...props} chrome="pane" />;
}
