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
    ArrowRight,
    CalendarCheck,
    CalendarPlus,
    Car,
    Check,
    ChevronDown,
    ExternalLink,
    History,
    Loader2,
    MessagesSquare,
    PhoneCall,
    Receipt,
    Reply,
    Send,
    StickyNote,
    Tag,
    Trash2,
    UserRound,
    X,
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
    useSimilarVisits,
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
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, type LeadServiceItemInput } from '../types';
import { TagMultiSelect } from './TagMultiSelect';
import { useTagCatalogActions } from '../hooks/useTagCatalogActions';
import { LeadStatusPicker } from './LeadStatusPicker';
import { LeadTimeline } from './LeadTimeline';
import { SimilarVisitsSection } from './SimilarVisitsSection';
import { SuggestedServiceRows } from './SuggestedServiceRows';
import { RecordCallbackDialog } from './RecordCallbackDialog';
import { IconButton, PrimaryButton, formatDateTime, formatMoney } from './shared';
import { useMediaQuery } from '@/common/hooks';
import { breakpoints } from '@/common/theme/breakpoints';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

/**
 * Dwie kolumny o różnej roli, nie dwie równe połówki. Po lewej to, co się w leadzie
 * robi (pojazd, wycena) - szersza, bo wycena jest tabelą czterech kolumn kwot.
 * Po prawej to, co się o leadzie wie (zapytanie klienta, historia) - węższa i
 * wizualnie cichsza. Wcześniej wszystko szło jedną kolumną w dół, więc zapytanie,
 * od którego cała sprawa się zaczęła, leżało poza pierwszym ekranem.
 */
const BodyGrid = styled.div<{ $pane?: boolean; $editing?: boolean }>`
    display: grid;
    /*
     * JEDNA KOLEJNOŚĆ CZYTANIA, w panelu i w oknie: o co pyta klient → co mu
     * proponujemy → co z tym zrobić. Przebieg sprawy idzie na lewo, wycena,
     * kartoteka i podobne zlecenia do węższej szyny po prawej.
     *
     * Okno modalne miało wcześniej odwrotnie, z uzasadnieniem, że otwiera się je
     * z widoku poczty, gdzie korespondencję ma się już przed sobą. Argument nie
     * broni się z dwóch powodów: okno ZASŁANIA tę korespondencję, a poza pocztą
     * otwiera je także wąski widok leadów i archiwum, gdzie żadnej korespondencji
     * przed sobą nie ma. Dwie kolejności czytania dla tej samej treści kosztowały
     * użytkownika sprawdzanie za każdym razem, gdzie tym razem jest wycena.
     *
     * Zamiana robi się porządkiem CSS, więc obie wersje renderują ten sam JSX.
     */
    grid-template-columns: minmax(0, 1fr) minmax(0, 360px);
    gap: 16px;
    align-items: start;

    & > *:nth-child(1) { order: 2; }
    & > *:nth-child(2) { order: 1; }

    /* Panel obok kolejki jest węższy, więc i szyna jest węższa. */
    ${p => p.$pane && `
        grid-template-columns: minmax(0, 1fr) minmax(0, 288px);
    `}

    /*
     * OTWARTY EDYTOR WYCENY ODWRACA PROPORCJE.
     *
     * Tabela usług ma siatkę [1fr 74px 60px 74px 118px] - same kolumny stałe to
     * 326 px. W szynie szerokiej na 288-360 px na nazwę usługi zostawało zero,
     * a układ zwinięty (nazwa + brutto w dwóch wierszach) odpala media query na
     * szerokość OKNA PRZEGLĄDARKI, więc na monitorze nigdy się nie włączał.
     * Efekt: tabela była w tej szynie nieczytelna, a wybór usługi niemożliwy.
     *
     * Edytor dostaje więc całą wolną szerokość, a zapytanie klienta zwęża się do
     * kolumny, w której nadal daje się je czytać. Czytać trzeba: to jest ta chwila,
     * w której sprawdza się, czy klient prosił o powłokę na trzy lata czy na pięć.
     * Drugiej nakładki nad oknem nie stawiamy - w tym module okno leada ZASTĘPUJE
     * się oknem kreatora, a nie przykrywa (patrz BookingFlowModal niżej).
     */
    ${p => p.$editing && css`
        grid-template-columns: minmax(0, ${p.$pane ? '340px' : '380px'}) minmax(0, 1fr);
    `}

    /*
     * Na telefonie kolumny przestają być kolumnami - display: contents wpuszcza ich
     * sekcje wprost do siatki, żeby przebieg sprawy dało się wsunąć zaraz pod wycenę.
     * Bez tego kolejność wynikałaby z DOM-u i oś czasu lądowała za kartoteką klienta,
     * podobnymi zleceniami i notatkami - czyli poza zasięgiem kciuka.
     *
     * Kolejność: wycena (ile to warte), przebieg (co klient napisał), reszta -
     * czyli ODWROTNIE niż na szerokim ekranie, i to jest świadome. Tam „kolejność"
     * znaczy „gdzie pada wzrok", bo obie kolumny widać naraz; tutaj znaczy „ile
     * trzeba przewinąć", bo widać jedną rzecz na raz. Oś czasu bywa długa, więc
     * postawiona przed wyceną kazałaby przewijać ją w całości za każdym razem,
     * żeby dojść do kwoty i do kroku następnego.
     *
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

/**
 * „Czeka 6 dni" w prawym górnym rogu - i zarazem wejście w zmianę etapu.
 *
 * Wcześniej stały tu dwie plakietki: ta i osobny wybierak „Nowy / W kontakcie".
 * Mówiły o TYM SAMYM stanie sprawy dwoma różnymi słowami, a pytanie, które
 * naprawdę pada po otwarciu leada, brzmi „ile klient już czeka". Etap został
 * kropką koloru przy tej liczbie: widać go bez czytania, a pełna lista etapów
 * jest tam, gdzie się jej szuka - pod kliknięciem w stan.
 *
 * W sprawie zamkniętej nikt na nic nie czeka, więc plakietka pokazuje wtedy samą
 * nazwę etapu. Kliknięcie działa zawsze - inaczej przegranego leada nie dałoby
 * się już otworzyć na nowo.
 */
const HeaderStage = styled.button<{ $tone: ReplyTone }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: ${p => p.theme.radii.md};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    white-space: nowrap;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    background: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.errorLight
        : $tone === 'stale' ? theme.colors.warningLight
        : theme.colors.surfaceAlt};
    color: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.textMuted};

    &:hover:not(:disabled) { filter: brightness(0.96); border-color: currentColor; }
    &:disabled { opacity: 0.6; cursor: default; }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: 1px;
    }

    svg { width: 14px; height: 14px; }
    .chevron { width: 13px; height: 13px; opacity: 0.7; }
    /* Kropka etapu: kolor mówi, w jakim stanie jest sprawa, bez ani jednego słowa. */
    .stage-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }
`;


/**
 * Usługi, o które pyta klient - jedyny chip, jaki został w nagłówku.
 *
 * [$soft]     - fakt, którego nie potwierdził człowiek: obramowanie przerywane.
 * [$iconOnly] - chip bez liczby: kwadratowy, żeby pojedyncza ikona nie pływała
 *               w środku szerokiej pastylki.
 */
const FactChip = styled.button<{ $soft?: boolean; $iconOnly?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 36px;
    width: ${p => (p.$iconOnly ? '36px' : 'auto')};
    padding: ${p => (p.$iconOnly ? '0' : '0 14px')};
    border-radius: ${p => p.theme.radii.full};
    border: 1px ${p => (p.$soft ? 'dashed' : 'solid')} ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
        border-color: ${p => p.theme.colors.textMuted};
        border-style: solid;
    }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: 1px;
    }

    svg { width: ${p => (p.$iconOnly ? '15px' : '13px')}; height: ${p => (p.$iconOnly ? '15px' : '13px')}; }
`;

/**
 * Sekcja szyny w dwóch materiałach - i to jest cała hierarchia tej kolumny.
 *
 * Wcześniej każda sekcja była tym samym: włosowa kreska pod spodem, etykieta
 * 11 px wersalikami w szarości i tekst. Pięć razy ta sama rama. Kolumna czytała
 * się jak ekran ustawień, a nie jak sprawa klienta - i żadne dosypanie koloru
 * tego nie ruszyło, bo problem nie był w barwie, tylko w tym, że nic w tej
 * kolumnie nie było OBIEKTEM.
 *
 * Teraz są dwa plany:
 *  - [$raised] to przedmiot na biurku: własna powierzchnia, promień, cień
 *    i brandowy pasek u góry. Dostaje go DOKŁADNIE JEDNA sekcja - wycena, bo
 *    to ona jest tematem tego okna;
 *  - reszta leży płasko na tle strony i rozdziela ją odstęp, nie ramka.
 *
 * To jest reguła z CLAUDE.md §2 piętro wyżej: wypełnienie niesie priorytet
 * wśród akcji, wyniesienie niesie temat wśród treści. Dwa wyniesione panele
 * znaczą dokładnie tyle samo co dwa wypełnione przyciski - czyli nic.
 */
const RailSection = styled.section<{ $raised?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;

    ${({ $raised, theme }) => ($raised ? css`
        position: relative;
        padding: 16px;
        border: 1px solid #e6edf6;
        border-radius: ${theme.radii.xl};
        background: linear-gradient(160deg, #ffffff 0%, #fbfcfe 100%);
        /* Dwa cienie: włosowy styk z tłem i miękki, daleki - sam daleki daje
           mgłę zamiast krawędzi, sam bliski daje naklejkę zamiast przedmiotu. */
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 14px 30px -20px rgba(15, 23, 42, 0.45);

        /* Pasek marki u góry karty - ten sam zabieg, którym karta pojazdu
           i karta dokumentu w kartotece mówią „to jest przedmiot". Tam pojawia
           się pod kursorem, bo kart jest wiele; tu jest stały, bo jest jedna.
           Przycinamy go własnym promieniem, a nie [overflow: hidden] na karcie:
           w środku stoi edytor wyceny z podpowiedziami cennika, a obcięta
           powierzchnia ucięłaby też je. */
        &::before {
            content: '';
            position: absolute;
            top: -1px;
            left: -1px;
            right: -1px;
            height: 3px;
            border-radius: ${theme.radii.xl} ${theme.radii.xl} 0 0;
            background: linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 55%, #ffffff) 100%);
        }
    ` : css`
        padding-bottom: 16px;
        border-bottom: 1px solid ${theme.colors.surfaceAlt};

        &:last-child { border-bottom: none; padding-bottom: 0; }
    `)}
`;

/**
 * Nagłówek sekcji: kafelek z ikoną i nazwa pismem tekstowym.
 *
 * Etykieta 11 px wersalikami w kolorze [textMuted] jest najtańszym sposobem
 * powiedzenia „tu zaczyna się sekcja" i jednocześnie najbardziej biurowym -
 * powtórzona pięć razy w jednej kolumnie robi z podglądu sprawy formularz.
 * Nazwa w normalnej wielkości i w kolorze tekstu czyta się jak tytuł, a nie
 * jak podpis pola; ikona niesie kategorię treści szybciej niż słowo i robi to
 * ODCIENIEM, nie wypełnieniem - te 26 px nie konkuruje o uwagę z akcją.
 */
const RailLabel = styled.h4`
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};
`;

/** Kafelek ikony nagłówka. Odcień = rodzaj treści, zgodnie z językiem okna. */
const RailIcon = styled.span<{ $tone: 'brand' | 'slate' | 'amber' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: ${p => p.theme.radii.md};

    svg { width: 14px; height: 14px; }

    ${({ $tone }) => {
        if ($tone === 'brand') return css`
            background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
            color: var(--brand-primary);
        `;
        if ($tone === 'amber') return css`background: #fef3c7; color: #b45309;`;
        return css`background: #f1f5f9; color: #64748b;`;
    }}
`;

/**
 * Akcja sekcji szyny - słowo, nie ikona i nie przycisk z ramką.
 *
 * Sekcja ma najwyżej jedną taką akcję i zawsze jest nią zmiana tego, co sekcja
 * pokazuje. Słowo mówi to wprost i mieści się w wierszu etykiety, którego wysokość
 * i tak jest zajęta; ikona w tym samym miejscu wymagała podpowiedzi, żeby dało się
 * ją odczytać.
 */
const RailAction = styled.button`
    /* Nagłówek nie rozpycha się już regułą [space-between] - ikona i tytuł stoją
       przy sobie, więc akcję odsuwa margines. */
    margin-left: auto;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    letter-spacing: normal;
    text-transform: none;
    color: ${p => p.theme.colors.primary};
    cursor: pointer;

    &:hover { text-decoration: underline; }
    &:disabled { opacity: 0.5; cursor: default; text-decoration: none; }
`;

/**
 * Wycena: kwota jest NAGŁÓWKIEM, pozycje są dowodem.
 *
 * Wcześniej suma stała na końcu listy - 18 px w szarej belce, do której trzeba
 * było przeczytać wszystkie pozycje. A to po nią się do tej sekcji wraca:
 * w warsztacie pierwsze pytanie brzmi „na ile to wyszło", a rozpisanie na
 * pozycje jest odpowiedzią na drugie, „z czego". Kolejność była odwrócona
 * względem sposobu czytania, więc ją odwracamy: 30 px na górze karty, spis
 * mniejszym pismem pod kreską.
 *
 * Kwota nie jest niczym przeliczana - [quoteTotal] sumuje brutto pozycji tak,
 * jak je zapisano (CLAUDE.md §1). Zmienił się stopień pisma, nie arytmetyka.
 */
const QuoteList = styled.div`
    display: flex;
    flex-direction: column;
    font-size: 13px;

    .hero {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-bottom: 12px;
        margin-bottom: 4px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
    }
    .hero .amount {
        font-size: 30px;
        line-height: 1.08;
        font-weight: ${p => p.theme.fontWeights.bold};
        letter-spacing: -0.025em;
        font-variant-numeric: tabular-nums;
        color: ${p => p.theme.colors.text};
    }
    .hero .caption {
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${p => p.theme.colors.textMuted};
    }

    .row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
    }
    .row + .row { border-top: 1px solid ${p => p.theme.colors.surfaceHover}; }
    .row span:first-child { color: ${p => p.theme.colors.textSecondary}; min-width: 0; }
    .row span:last-child {
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${p => p.theme.colors.text};
    }
`;

/**
 * Zwijana sekcja szyny - nagłówek jest przyciskiem, treść wchodzi na żądanie.
 *
 * Nie wszystko w tej kolumnie waży tyle samo. „Podobne zlecenia" to materiał
 * pomocniczy: przydaje się przy wycenie nietypowej roboty, a przy większości
 * spraw jest tłem, przez które trzeba przewinąć, żeby dojść do notatek. Zwinięta
 * zostawia po sobie jedną linijkę z liczbą, więc nie znika z pola widzenia -
 * widać, że coś tam jest, i widać ile, zanim się kliknie.
 *
 * Liczba w nagłówku jest tu warunkiem, a nie ozdobą: sekcja zwinięta BEZ niej
 * kazałaby otwierać ją za każdym razem tylko po to, żeby sprawdzić, czy jest pusta.
 */
const RailDisclosure = styled.button<{ $open: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};
    cursor: pointer;
    text-align: left;

    &:hover .chevron { color: ${p => p.theme.colors.textSecondary}; }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: 2px;
        border-radius: ${p => p.theme.radii.sm};
    }

    .count {
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: ${p => p.theme.radii.full};
        background: ${p => p.theme.colors.surfaceAlt};
        border: 1px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textSecondary};
        font-size: 10px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        line-height: 16px;
        text-align: center;
        letter-spacing: 0;
        font-variant-numeric: tabular-nums;
    }

    /* Strzałka dosunięta do prawej krawędzi: to ona mówi „da się to otworzyć". */
    .chevron {
        margin-left: auto;
        color: ${p => p.theme.colors.textMuted};
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        transition: transform ${p => p.theme.transitions.fast};
        transform: rotate(${p => (p.$open ? '0deg' : '-90deg')});
    }
`;

/** Fakty o kliencie: trzy linijki, bez ozdobników. */
/**
 * Kartoteka w kafelkach, nie w zdaniu.
 *
 * „2 zrealizowane wizyty, 4 300 zł obrotu, ostatnia: 14 marca" napisane ciągiem
 * jest akapitem - żeby wyjąć z niego liczbę, trzeba przeczytać słowa. A cała
 * sekcja istnieje po to, żeby te trzy liczby dało się porównać z kwotą wyceny
 * stojącą nad nią. Liczba idzie więc na wierzch, słowo pod spód i mniejszym
 * pismem, a trzy kafelki czytają się jednym ruchem oka zamiast trzema.
 */
const RailFacts = styled.div`
    display: grid;
    /* Dwa albo trzy kafelki - ostatnia wizyta bywa nieznana. [auto-fit] dzieli
       szynę na tyle części, ile faktów jest, zamiast zostawiać pustą kolumnę. */
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 6px;

    .cell {
        min-width: 0;
        padding: 8px 10px;
        border-radius: ${p => p.theme.radii.md};
        background: ${p => p.theme.colors.surfaceAlt};
    }
    .value {
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.bold};
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        color: ${p => p.theme.colors.text};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .label {
        margin-top: 1px;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.medium};
        color: ${p => p.theme.colors.textMuted};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

/** Nagłówek kolumny przebiegu - ten sam materiał co nagłówki szyny. */
const TimelineLabel = styled.h4`
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 14px 0;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};
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
/**
 * Pasek nagłówka: tożsamość sprawy i rząd faktów, na wspólnym tle.
 *
 * Chipy stały wcześniej w treści, na bieli, i czytały się jak pierwsza sekcja
 * panelu - a są dopowiedzeniem tytułu („czyj to samochód, o co pyta, na jakim
 * etapie"). Wspólne tło wiąże je z nazwą sprawy i oddziela całość od przebiegu.
 */
const LeadHeader = styled(ModalHeader)`
    position: relative;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    background: ${p => p.theme.colors.surfaceAlt};
`;

/** Wiersz tożsamości: pojazd i nazwa sprawy z lewej, stan i zamknięcie z prawej. */
const HeaderTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    /* Na wąskim ekranie prawa grupa schodzi pod tytuł zamiast go ściskać. */
    flex-wrap: wrap;
`;

/** Lewa strona nagłówka: logo marki i dwuwierszowa nazwa sprawy jako jedna całość. */
const HeaderIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1 1 320px;
    min-width: 0;
`;

/**
 * Logo marki w nagłówku - na wysokość całego wiersza z nazwą sprawy i kontaktem.
 *
 * Marka była dotąd chipem w rzędzie faktów: tekstem wielkości wszystkich innych
 * chipów, w kolejce takich samych pastylek. A pojazd jest tym, po czym sprawę
 * rozpoznaje się z drugiego końca warsztatu - i jedyną rzeczą w tym oknie, która
 * ma gotowy, rozpoznawalny znak graficzny. Kafelek jest też drogą do poprawienia
 * pojazdu, bo to jedyne miejsce, w którym pojazd w tym oknie stoi.
 */
const VehicleBadge = styled.button<{ $empty?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    height: 52px;
    min-width: 56px;
    padding: 0 8px;
    border-radius: 14px;
    border: 1px ${p => (p.$empty ? 'dashed' : 'solid')} ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        border-color: ${p => p.theme.colors.textMuted};
        background: ${p => p.theme.colors.surfaceHover};
    }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: 1px;
    }

    svg { width: 24px; height: 24px; }
    .spin { animation: ${spin} 900ms linear infinite; }

    @media (max-width: 640px) {
        height: 46px;
        min-width: 48px;
        border-radius: 12px;
    }
`;

/** Prawa strona nagłówka: stan sprawy, usługi i zamknięcie okna. */
const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
`;

/**
 * Zamknięcie w samym rogu okna - na telefonie.
 *
 * Krzyżyk stał w rzędzie razem z etapem sprawy i usługami, a ten rząd na wąskim
 * ekranie zawija się pod tytuł. Zamknięcie lądowało wtedy w środku nagłówka,
 * czyli tam, gdzie nikt go nie szuka, i zmieniało miejsce w zależności od tego,
 * ile chipów akurat było. Wyjście z okna jest zawsze w tym samym punkcie -
 * prawym górnym rogu - więc wyjmujemy je z rzędu i przypinamy do narożnika.
 *
 * Na szerokim ekranie rząd się nie zawija i krzyżyk wraca do niego, bo tam
 * kończy linię z chipami i nie ma powodu, żeby nachodzić na treść.
 */
const HeaderClose = styled.div`
    @media (max-width: ${p => p.theme.breakpoints.md}) {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1;
    }
`;

/**
 * Przyciski stopki: 48 px wysokości i promień 12 px.
 *
 * Pastylki 32 px, które stały tu wcześniej, były wzorem z pasków narzędzi obsługiwanych
 * myszą. To jest ostatni rząd okna i jedyne miejsce, w którym coś się w leadzie
 * ROBI - a specyfikacja tego widoku ma jedną twardą liczbę: cel dotykowy nie mniejszy
 * niż 48 px, bo ekran obsługuje się w rękawicy.
 */
const footerControl = css`
    height: 48px;
    padding: 0 18px;
    border-radius: ${p => p.theme.radii.lg};
    font-size: 14.5px;

    svg { width: 17px; height: 17px; }
`;

const FooterButton = styled(IconButton)`${footerControl}`;

/**
 * Usunięcie leada: sam kosz, w lewym narożniku stopki.
 *
 * Wcześniej był opisanym przyciskiem na końcu szyny - do jedynej nieodwracalnej
 * operacji w tym oknie trzeba było doscrollować przez wycenę, notatki i podobne
 * zlecenia, a mimo to stał w środku treści, między informacjami. Stopka jest
 * miejscem, w którym w tym oknie się DZIAŁA, więc kasacja należy do niej - tylko
 * po przeciwnej stronie niż akcja główna i bez napisu, bo napis czynił z niej
 * ofertę równorzędną z „Stwórz rezerwację".
 *
 * Domyślnie szary, czerwony pod kursorem: ma dać się znaleźć, a nie zapraszać.
 */
const FooterDanger = styled.button`
    ${footerControl}
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    padding: 0;
    /* Jak najdalej od akcji głównej, która stoi przy prawej krawędzi. */
    margin-right: auto;
    /* Stopka na telefonie rozciąga przyciski regułą "> button { flex: 1 1 auto }";
       kosz ma zostać kwadratem, a nie zająć pół rzędu. */
    flex: 0 0 auto;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textMuted};
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) {
        border-color: ${p => p.theme.colors.error};
        background: ${p => p.theme.colors.errorLight};
        color: ${p => p.theme.colors.error};
    }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.error};
        outline-offset: 1px;
    }
    &:disabled { opacity: 0.5; cursor: default; }
`;
/**
 * Akcja główna stopki - jedyne miejsce w tym oknie, w którym sprawa RUSZA DALEJ.
 *
 * Do tej pory była to [PrimaryButton]: ta sama pastylka, którą w tym samym pliku
 * podpisano „Zapisz" przy tagach, pojeździe i notatce. „Stwórz rezerwację"
 * znaczy „zamień zapytanie w pieniądze" i nie ma prawa wyglądać jak zatwierdzenie
 * formularza - a wyglądała identycznie, bo była tym samym komponentem.
 *
 * Co ją teraz odróżnia, po kolei i z powodem:
 *  - DWIE LINIE. Tytuł mówi, co się stanie, podpis - dokąd to prowadzi. Jedna
 *    linijka zmuszała do domyślania się, czy „Zobacz rezerwację" otwiera okno,
 *    czy przenosi w inne miejsce aplikacji;
 *  - KAFELEK IKONY na własnym tle zamiast ikony wklejonej przed tekstem: robi
 *    z przycisku przedmiot o strukturze, a nie napis z ozdobnikiem;
 *  - STRZAŁKA przy prawej krawędzi, która na najechaniu przesuwa się o 3 px.
 *    To jedyna ruchoma rzecz w stopce i mówi „stąd się wychodzi";
 *  - GRADIENT I CIEŃ W KOLORZE MARKI. Płaskie wypełnienie z szarym cieniem to
 *    przycisk; barwny cień to przedmiot leżący nad powierzchnią okna.
 *
 * To NIE jest złamanie zasady „jedno wypełnienie na okno" (CLAUDE.md §2) -
 * to jest jej wyostrzenie. Wypełniony zostaje dokładnie jeden element i jest
 * nim krok następny; reszta okna (przyjęcie sugestii, „Kontakt poza pocztą",
 * kosz) nosi swój odcień jako tło i obwódkę. Zasada mówi, że remis o pierwsze
 * miejsce jest zakazany - nie mówi, że zwycięzca ma być ledwo widoczny.
 */
const FooterPrimary = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 11px;
    height: 54px;
    padding: 0 16px 0 14px;
    border: none;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 76%, #0f172a) 100%);
    color: #ffffff;
    font-family: inherit;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
    box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.16),
        0 12px 24px -12px color-mix(in srgb, var(--brand-primary) 75%, transparent);
    transition: transform ${p => p.theme.transitions.fast}, box-shadow ${p => p.theme.transitions.fast};

    .glyph {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        border-radius: ${p => p.theme.radii.lg};
        background: rgba(255, 255, 255, 0.18);

        svg { width: 17px; height: 17px; }
    }

    .labels {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }
    .title {
        font-size: 14.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: -0.01em;
        line-height: 1.2;
    }
    .sub {
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.medium};
        line-height: 1.2;
        color: rgba(255, 255, 255, 0.76);
    }

    .arrow {
        margin-left: auto;
        flex-shrink: 0;
        width: 17px;
        height: 17px;
        opacity: 0.8;
        transition: transform ${p => p.theme.transitions.normal};
    }

    &:hover {
        transform: translateY(-1px);
        box-shadow:
            0 2px 4px rgba(15, 23, 42, 0.18),
            0 18px 32px -14px color-mix(in srgb, var(--brand-primary) 80%, transparent);
    }
    &:hover .arrow { transform: translateX(3px); }
    &:active { transform: translateY(0); }
    &:focus-visible {
        outline: 2px solid var(--brand-primary);
        outline-offset: 3px;
    }
    &:disabled { opacity: 0.55; cursor: default; box-shadow: none; }

    /* Stopka na telefonie rozciąga przyciski - wtedy z przycisku robi się pas
       akcji przez całą szerokość, a strzałka siada przy prawej krawędzi. */
    @media (max-width: 640px) {
        height: 56px;
        white-space: normal;
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

    /* Ten sam nagłówek co w szynie - wersaliki 11 px zniknęły z całego okna,
       a otwarty edytor jest jego częścią, nie osobnym ekranem. */
    h4 {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        font-size: 13.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: -0.01em;
        color: ${p => p.theme.colors.text};
    }

    h4 svg { width: 15px; height: 15px; color: ${p => p.theme.colors.textMuted}; }
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

const ModalBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Podtytuł okna: skąd przyszedł lead i jak się z nim skontaktować. */
/**
 * Tożsamość jako ZDANIE, nie rząd elementów flex.
 *
 * Flex robił z niej pasek: każdy człon był osobnym pudełkiem, więc łamała się
 * w całych członach i zostawiała dziury na końcu wiersza. Zwykły blok tekstu łamie
 * się tam, gdzie kończy się miejsce.
 */
const LeadIdentity = styled.div`
    margin-top: 4px;
    font-size: 14px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};
`;

/**
 * „Ludzik" przed nazwiskiem: zielony, gdy klient jest w kartotece, szary
 * z przerywaną ramką, gdy go tam nie ma.
 *
 * Ta sama ikona, ten sam kolor i to samo kliknięcie co w nagłówku rozmowy
 * w skrzynce - a stoi przy nazwisku, bo mówi właśnie o TEJ osobie, nie o sprawie.
 * Element liniowy (`inline-flex` + `vertical-align`), żeby nie rozbić zdania
 * tożsamości, które ma się łamać jak zdanie.
 */
const IdentityPerson = styled.button<{ $known?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: -7px;
    margin-right: 7px;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border: 1px ${p => (p.$known ? 'solid' : 'dashed')}
        ${p => (p.$known ? '#a7f3d0' : p.theme.colors.border)};
    background: ${p => (p.$known ? '#f0fdf4' : p.theme.colors.surface)};
    color: ${p => (p.$known ? '#15803d' : p.theme.colors.textMuted)};
    border-radius: ${p => p.theme.radii.full};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { filter: brightness(0.97); border-style: solid; }
    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: 1px;
    }

    svg { width: 14px; height: 14px; }
`;

/**
 * Człon tożsamości (nazwisko, telefon, adres) - element liniowy, nie flexowy.
 *
 * Elementy flex zawijają się w całości: przy nagłówku węższym o kilka pikseli cały
 * człon zjeżdżał do następnej linii i zostawiał nad sobą pustkę. Człony liniowe
 * łamią się jak zdanie, bo zdaniem są.
 */
const IdentityPart = styled.span`
    overflow-wrap: anywhere;
`;

/**
 * Kropka rozdzielająca, przyklejona do członu, który KOŃCZY.
 *
 * Spacja nierozdzielająca przed kropką (`white-space: nowrap` na całości) sprawia,
 * że „601 448 210 ·" łamie się jako jedno; miejsce na złamanie zostaje dopiero za
 * kropką. Bez tego wąski nagłówek zaczynał wiersz od „· m.kowalczyk@wp.pl", co
 * czyta się jak urwane zdanie.
 */
const Separator = styled.span`
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
`;

/**
 * Numer telefonu jako odnośnik `tel:`, ale bez wyglądu odnośnika.
 *
 * Na telefonie ma być tapnięty, na biurku przeczytany - a podkreślony, niebieski
 * numer w wierszu tożsamości wyglądał na akcję ważniejszą niż ta w stopce.
 */
const IdentityLink = styled.a`
    color: inherit;
    text-decoration: none;
    /* Wariant [as="button"] - reset, żeby przycisk czytał się jak reszta zdania. */
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    cursor: pointer;

    &:hover {
        color: ${p => p.theme.colors.primary};
        text-decoration: underline;
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


/** Jedyna akcja nieodwracalna w tym oknie - i jedyna, która wygląda groźnie. */

// ─── Notatki ──────────────────────────────────────────────────────────────────

/**
 * Notatki mają kolor papieru, nie formularza.
 *
 * Pusty biały textarea z szarą ramką czytał się jak pole do wypełnienia w
 * urzędowym wniosku - i cała sekcja wyglądała na martwą, dopóki ktoś czegoś nie
 * napisał. Ciepły odcień robi z niej kartkę, na której się notuje.
 *
 * Bursztyn, a nie dowolna barwa: w całym systemie notatka o kliencie jest
 * bursztynowa (ikona notatek w nagłówku rozmowy, plakietka „są notatki").
 * Ten sam odcień w trzecim miejscu to nie ozdoba, tylko ta sama informacja.
 */
const NoteComposer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    textarea {
        font-family: inherit;
        font-size: 12.5px;
        line-height: 1.5;
        color: ${p => p.theme.colors.text};
        background: #fffdf5;
        border: 1px solid #fde68a;
        border-radius: ${p => p.theme.radii.md};
        padding: 9px 11px;
        resize: vertical;
        min-height: 60px;
        transition: all ${p => p.theme.transitions.fast};

        &::placeholder { color: #b0956a; }

        &:hover { border-color: #fcd34d; }
        &:focus-visible {
            outline: none;
            border-color: ${p => p.theme.colors.warning};
            background: #fffbeb;
        }
    }
`;

const NoteItemRow = styled.div`
    position: relative;
    padding: 9px 11px 9px 12px;
    border-radius: ${p => p.theme.radii.md};
    background: #fffdf5;
    border: 1px solid #fef3c7;
    /* Pasek z lewej w tym samym języku co niebieski przy sugestiach: kolor
       krawędzi mówi, czyja to treść. Bursztyn = zapisał to człowiek. */
    border-left: 3px solid #fbbf24;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.text};
    /* Notatka to często jedno zdanie z entera w środku - zachowujemy łamania. */
    white-space: pre-wrap;
    word-break: break-word;

    .meta {
        margin-top: 5px;
        font-size: 11px;
        color: #a1824a;
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
        &:hover { color: ${p => p.theme.colors.error}; background: #fef3c7; }
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
    /*
     * „Podobne zlecenia" startują zwinięte: to materiał pomocniczy, przydatny przy
     * wycenie nietypowej roboty, a przy większości spraw tło, przez które trzeba
     * przewinąć do notatek. Liczba przy nagłówku pilnuje, żeby zwinięcie nie
     * ukryło FAKTU istnienia podpowiedzi - inaczej trzeba by otwierać sekcję za
     * każdym razem tylko po to, żeby sprawdzić, czy jest pusta.
     *
     * To samo zapytanie, którego używa sama sekcja - react-query oddaje je z tego
     * samego cache'u, więc licznik nie kosztuje drugiego strzału do serwera.
     */
    const [similarOpen, setSimilarOpen] = useState(false);
    const { data: similarVisits } = useSimilarVisits(leadId);
    const similarCount = similarVisits?.items?.length ?? 0;
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
    /* Powyżej sm nagłówek mieści nazwę sprawy i plakietkę „czyj ruch" w jednym
       wierszu; poniżej plakietka schodzi do rzędu chipów. */
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

    /*
     * Na telefonie adres schodzi z nagłówka (patrz `showEmail` niżej). Hook stoi
     * NAD wyjściem dla pustego leada, bo kolejność wywołań hooków musi być ta
     * sama w każdym renderze.
     */
    const isNarrow = useMediaQuery(`(max-width: ${breakpoints.md})`);

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
    /*
     * Adres do wiersza tożsamości. `contactIdentifier` jest adresem tylko wtedy, gdy
     * lead NIE przyszedł telefonem - przy leadzie telefonicznym niesie numer, który
     * stoi już w `phone` i nie ma się powtarzać jako „adres". Kartoteka klienta nie
     * przechowuje adresu, więc dla takiego leada po prostu go nie ma.
     */
    const email = lead.source === 'PHONE' ? null : lead.contactIdentifier;
    const showEmail = !isNarrow || (!lead.customerName && !phone);
    /*
     * Wiersz tożsamości ma się czytać jednym spojrzeniem, a adres jest w nim
     * najdłuższym członem i jedynym, który łamie się na dwie linijki - zabiera
     * wysokość nad treścią, choć na małym ekranie nikt go stamtąd nie przepisuje
     * ani nie klika (od pisania jest stopka). Nazwisko i numer zostają: numer
     * na dotyku jest odnośnikiem, który faktycznie się naciska.
     *
     * Wyjątek: gdy adres jest JEDYNĄ rzeczą, jaką wiemy o kontakcie, zostaje -
     * inaczej wiersz stałby pusty, z samym „ludzikiem".
     */
    /** Tożsamość jako zdanie: „Marek Kowalczyk · 601 448 210 · m.kowalczyk@wp.pl". */
    const identityParts = [lead.customerName, phone, showEmail ? email : null].filter(
        (part): part is string => Boolean(part)
    );
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
                    <HeaderTop>
                        <HeaderIdentity>
                            {/*
                                POJAZD JAKO ZNAK, nie jako chip.

                                Marka stała dotąd tekstem w rzędzie jednakowych pastylek.
                                A pojazd jest tym, po czym sprawę rozpoznaje się z drugiego
                                końca warsztatu, i jedyną rzeczą w tym oknie z gotowym,
                                rozpoznawalnym znakiem graficznym. Kafelek jest zarazem drogą
                                do poprawienia pojazdu - to jedyne miejsce, w którym pojazd
                                w tym oknie stoi.
                            */}
                            <VehicleBadge
                                type="button"
                                $empty={!lead.vehicleBrand}
                                aria-label={formatVehicle(lead) ?? 'Dodaj pojazd'}
                                title={
                                    lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null
                                        ? 'Rozpoznajemy auto z treści zapytania…'
                                        : formatVehicle(lead)
                                          ? `${formatVehicle(lead)} — kliknij, żeby poprawić`
                                          : 'Kliknij, żeby dodać pojazd'
                                }
                                onClick={() => setEditingVehicle({
                                    brand: lead.vehicleBrand ?? '',
                                    model: lead.vehicleModel ?? '',
                                })}
                            >
                                {lead.vehicleDetectionStatus === 'PENDING' && editingVehicle === null ? (
                                    <Loader2 className="spin" />
                                ) : lead.vehicleBrand ? (
                                    <CarLogoImage brand={lead.vehicleBrand} size="md" />
                                ) : (
                                    <Car />
                                )}
                            </VehicleBadge>

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
                                {/*
                                    Tożsamość jednym zdaniem: „Marek Kowalczyk · 601 448 210 ·
                                    m.kowalczyk@wp.pl", a przed nim „ludzik" mówiący kolorem,
                                    czy ta osoba jest w kartotece. Numer jest faktem, którego
                                    szuka się wzrokiem, i sam w sobie jest odnośnikiem: na
                                    telefonie da się go tapnąć, na biurku przepisać.
                                */}
                                <LeadIdentity>
                                    <IdentityPerson
                                        type="button"
                                        $known={Boolean(customerFacts)}
                                        aria-label={
                                            unknownContact
                                                ? 'Tego kontaktu nie ma w bazie klientów — połącz albo załóż profil'
                                                : 'Profil klienta'
                                        }
                                        title={
                                            unknownContact
                                                ? 'Tego kontaktu nie ma jeszcze w bazie klientów — kliknij, żeby połączyć albo założyć profil'
                                                : customerFacts
                                                  ? `${lead.customerName ?? lead.contactIdentifier} jest w kartotece — zobacz profil`
                                                  : 'Zobacz, kto to jest'
                                        }
                                        onClick={(event) => setContactAnchor(event.currentTarget)}
                                    >
                                        <UserRound />
                                    </IdentityPerson>
                                    {identityParts.map((part, index) => (
                                        <IdentityPart key={part}>
                                            {part === phone && (
                                                <IdentityLink
                                                    href={`tel:${part.replace(/\s/g, '')}`}
                                                    title="Zadzwoń"
                                                >
                                                    {part}
                                                </IdentityLink>
                                            )}
                                            {/* Adres prowadzi do wątku: to droga do wiadomości
                                                OD TEGO KONTAKTU, więc stoi przy adresie, a nie
                                                jako osobna ikona koperty w rogu nagłówka. */}
                                            {part === email && canWrite && (
                                                <IdentityLink
                                                    as="button"
                                                    type="button"
                                                    onClick={openThread}
                                                    title="Przejdź do korespondencji"
                                                >
                                                    {part}
                                                </IdentityLink>
                                            )}
                                            {part !== phone && !(part === email && canWrite) && part}
                                            {/* Kropka NA KOŃCU członu, nie na początku
                                                następnego: inaczej wąski nagłówek zaczyna
                                                wiersz od „· ", co wygląda na urwane zdanie. */}
                                            {index < identityParts.length - 1 && (
                                                <>
                                                    <Separator>{' ·'}</Separator>{' '}
                                                </>
                                            )}
                                        </IdentityPart>
                                    ))}
                                </LeadIdentity>
                            </ModalTitleGroup>
                        </HeaderIdentity>

                        <HeaderRight>
                            {/* Stan sprawy i etap w jednym: „Czeka 6 dni" z kropką etapu,
                                a pod kliknięciem pełna lista etapów. Dwie osobne plakietki
                                mówiły o tym samym dwoma słowami i zabierały pół wiersza. */}
                            <LeadStatusPicker
                                status={lead.status}
                                disabled={status.isPending}
                                onChange={(next) => status.requestStatus(lead.id, next)}
                                renderTrigger={({ open, toggle, disabled }) => (
                                    <HeaderStage
                                        type="button"
                                        $tone={reply ? reply.tone : 'neutral'}
                                        disabled={disabled}
                                        aria-haspopup="listbox"
                                        aria-expanded={open}
                                        title={
                                            reply
                                                ? `${reply.title} · Etap: ${LEAD_STATUS_LABELS[lead.status]} — kliknij, żeby zmienić`
                                                : `Etap: ${LEAD_STATUS_LABELS[lead.status]} — kliknij, żeby zmienić`
                                        }
                                        onClick={toggle}
                                    >
                                        <span
                                            className="stage-dot"
                                            style={{ background: LEAD_STATUS_COLORS[lead.status].fg }}
                                        />
                                        {reply ? (
                                            <>
                                                <Reply /> {reply.label}
                                            </>
                                        ) : (
                                            LEAD_STATUS_LABELS[lead.status]
                                        )}
                                        <ChevronDown className="chevron" />
                                    </HeaderStage>
                                )}
                            />

                            {/*
                                USŁUGI, O KTÓRE PYTA KLIENT - za jedną ikoną taga.

                                Każdy tag własnym chipem rozpychał rząd na pół okna: przy
                                czterech usługach nagłówek zamieniał się w ścianę pastylek.
                                Ikona z liczbą zajmuje tyle samo miejsca przy jednym tagu
                                i przy dziesięciu, pełną listę niesie tooltip, a kliknięcie
                                otwiera ten sam edytor co wcześniej.
                            */}
                            <FactChip
                                type="button"
                                $soft={lead.tagLabels.length === 0}
                                $iconOnly={lead.tagLabels.length === 0}
                                aria-label={
                                    lead.tagLabels.length > 0
                                        ? `Usługi, o które pyta klient (${lead.tagLabels.length})`
                                        : 'Dodaj usługi, o które pyta klient'
                                }
                                title={
                                    lead.tagLabels.length > 0
                                        ? `Usługi, o które pyta klient: ${lead.tagLabels.join(', ')} — kliknij, żeby zmienić`
                                        : 'Kliknij, żeby dodać usługi, o które pyta klient'
                                }
                                onClick={() => setEditingTags(lead.tags)}
                            >
                                <Tag />
                                {lead.tagLabels.length > 0 && lead.tagLabels.length}
                            </FactChip>

                            {/* Panel nie ma czego zamykać - następna karta go podmienia. */}
                            {!isPane && (
                                <HeaderClose>
                                    <CloseBtn onClick={onClose} />
                                </HeaderClose>
                            )}
                        </HeaderRight>
                    </HeaderTop>
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

                        {/* Brak kartoteki nie dostaje już paska - mówi o tym szary
                            „ludzik" w rzędzie chipów, a kliknięcie prowadzi do tej samej
                            wizytówki. Pasek zostaje dla OSTRZEŻENIA, czyli treści, której
                            przeoczyć nie wolno; „czegoś nie ma" nie jest ostrzeżeniem. */}
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

                        <BodyGrid $pane={isPane} $editing={editingServices !== null}>
                            <Column>
                                {/* Jedyna wyniesiona sekcja szyny. Wycena jest tematem tego
                                    okna - po nią się tu wraca i o niej się rozmawia z klientem -
                                    więc jako jedyna leży na własnej powierzchni. Druga taka
                                    karta odebrałaby tej znaczenie. */}
                                <RailSection $raised>
                                    {/*
                                        „Edytuj" w wierszu etykiety, a nie przyciskiem pod
                                        sumą: to jest akcja SEKCJI, więc stoi przy jej
                                        nazwie. Pod kwotą łamała czytanie w najgorszym
                                        możliwym miejscu - wzrok schodził po pozycjach do
                                        sumy i zamiast na niej się zatrzymać, trafiał
                                        w przycisk.
                                    */}
                                    <RailLabel>
                                        <RailIcon $tone="brand"><Receipt /></RailIcon>
                                        Wycena
                                        {editingServices === null && (
                                            <RailAction
                                                type="button"
                                                onClick={() => setEditingServices(toServiceLines(lead.services))}
                                            >
                                                {quoteRows.length === 0 ? 'Dodaj' : 'Edytuj'}
                                            </RailAction>
                                        )}
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
                                                    {/* Kwota pierwsza, pozycje pod nią. Suma na końcu
                                                        listy odpowiadała na pytanie, które pada jako
                                                        pierwsze, dopiero po przeczytaniu odpowiedzi na
                                                        drugie. Liczba jest ta sama co wcześniej -
                                                        brutto pozycji zsumowane bez przeliczania. */}
                                                    {quoteRows.length > 0 && (
                                                        <div className="hero">
                                                            <div className="amount">
                                                                {formatMoney(quoteTotal((row) => row.grossCents))}
                                                            </div>
                                                            <div className="caption">
                                                                {quoteRows.length}
                                                                {' '}
                                                                {plural(quoteRows.length, 'pozycja', 'pozycje', 'pozycji')}
                                                                {' · kwota brutto'}
                                                            </div>
                                                        </div>
                                                    )}
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
                                                </QuoteList>
                                            )}

                                            {/* Sugestie pod kreską sumy: „Razem" liczy pozycje
                                                przyjęte, a to są propozycje czekające na decyzję.
                                                Czytają się w tym samym rytmie co pozycje wyceny -
                                                nazwa i kwota brutto - a przyciski i pole kwoty
                                                schodzą pod spód, żeby zmieściły się w szynie. */}
                                            {suggestedServices.length > 0 && (
                                                <SuggestedServiceRows
                                                    suggestions={suggestedServices}
                                                    actions={suggestionActions}
                                                />
                                            )}
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
                                                /* Cennik jako panel obok tabeli. Pole z podpowiedziami
                                                   wymaga, żeby wiedzieć, czego się szuka - a przy wycenie
                                                   zapytania częściej się PRZEGLĄDA, co warsztat robi,
                                                   niż szuka konkretnej pozycji z nazwy. */
                                                layout="split"
                                            />
                                            {/* Sumy netto / VAT / łącznie liczy sam edytor -
                                                druga suma pod nim byłaby tą samą liczbą
                                                napisaną drugi raz, tylko innym stylem.
                                                „Zapisz" i „Anuluj" stoją w stopce okna: edytor
                                                przejął okno, więc jego zapis JEST teraz krokiem
                                                następnym, a stopka jest rzędem, w którym się
                                                w tym oknie działa (CLAUDE.md §2). */}
                                        </>
                                    )}
                                </RailSection>

                                {/* Reszta szyny znika na czas edycji wyceny. Edytor przejął
                                    okno i zajmuje kolumnę, w której te sekcje stoją - a materiał
                                    pomocniczy (kartoteka, podobne zlecenia, notatki) zepchnięty
                                    pod tabelę i tak nie byłby czytany, bo wzrok pracuje wtedy
                                    na pozycjach i kwotach. */}
                                {editingServices === null && (<>

                                {/* Kartoteka w trzech liczbach: ile razy był, ile zostawił
                                    i kiedy ostatnio. To jest kontekst, w którym czyta się
                                    kwotę wyceny - inaczej wycena wisi w próżni. Sekcja
                                    znika dla kontaktu spoza kartoteki: szary „ludzik"
                                    w rzędzie chipów już powiedział, że go tam nie ma. */}
                                {customerFacts && (
                                    <RailSection>
                                        <RailLabel>
                                            <RailIcon $tone="slate"><UserRound /></RailIcon>
                                            Klient
                                        </RailLabel>
                                        {/* Liczba na wierzchu, słowo pod spodem. Te trzy fakty
                                            czyta się po to, żeby zestawić je z kwotą wyceny nad
                                            nimi - a z akapitu trzeba je najpierw wyłuskać. */}
                                        <RailFacts>
                                            <div className="cell">
                                                <div className="value">{customerFacts.completedVisitCount}</div>
                                                <div className="label">
                                                    {plural(
                                                        customerFacts.completedVisitCount,
                                                        'wizyta',
                                                        'wizyty',
                                                        'wizyt'
                                                    )}
                                                </div>
                                            </div>
                                            <div className="cell">
                                                <div className="value">{formatMoney(customerFacts.totalSpentGross)}</div>
                                                <div className="label">obrotu</div>
                                            </div>
                                            {customerFacts.lastVisitAt && (
                                                <div className="cell">
                                                    <div className="value">{formatDayMonth(customerFacts.lastVisitAt)}</div>
                                                    <div className="label">ostatnia</div>
                                                </div>
                                            )}
                                        </RailFacts>
                                    </RailSection>
                                )}

                                {/* Podobne zlecenia stoją tuż pod wyceną, bo to przy niej
                                    są potrzebne: „ile wzięliśmy za taką robotę" jest
                                    pytaniem, które pada w chwili wpisywania kwoty, a nie
                                    przy czytaniu historii kontaktu. */}
                                {/* Bez przycisku odświeżania przy nazwie sekcji. Podobne
                                    zlecenia indeksuje zadanie cykliczne co pięć minut,
                                    więc ręczne przeładowanie niczego nie przyspieszało -
                                    a ikona strzałek przy każdej etykiecie szyny robiła
                                    z niej pasek narzędzi i konkurowała z jedyną akcją,
                                    która ma tu być widoczna: „Edytuj" przy wycenie. */}
                                <RailSection>
                                    <RailDisclosure
                                        type="button"
                                        $open={similarOpen}
                                        aria-expanded={similarOpen}
                                        onClick={() => setSimilarOpen((open) => !open)}
                                    >
                                        <RailIcon $tone="slate"><History /></RailIcon>
                                        Podobne zlecenia
                                        {similarCount > 0 && <span className="count">{similarCount}</span>}
                                        <ChevronDown className="chevron" />
                                    </RailDisclosure>
                                    {similarOpen && <SimilarVisitsSection leadId={leadId} />}
                                </RailSection>

                                <RailSection>
                                    <RailLabel>
                                        <RailIcon $tone="amber"><StickyNote /></RailIcon>
                                        Notatki
                                    </RailLabel>
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

                                </>)}
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
                                    <TimelineLabel>
                                        <RailIcon $tone="slate"><MessagesSquare /></RailIcon>
                                        Przebieg sprawy
                                    </TimelineLabel>
                                    <LeadTimeline entries={timeline ?? []} />
                                </div>
                            </Column>
                        </BodyGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>
                    {/*
                        OTWARTY EDYTOR PRZEJMUJE STOPKĘ.
                        
                        Zapis wyceny jest na ten moment krokiem następnym, a krok następny
                        w tym oknie stoi w stopce - więc „Zapisz" idzie tutaj, zamiast
                        zostawać przyciskiem pod tabelą. Gdyby został, okno miałoby DWA
                        wypełnione przyciski naraz: zapis edytora i „Stwórz rezerwację"
                        obok niego. Dokładnie ten remis zakazuje CLAUDE.md §2 i dokładnie
                        z jego powodu użytkownik pyta, na co ma najpierw patrzeć.
                        
                        Kosz i „Kontakt poza pocztą" też znikają: to akcje na SPRAWIE,
                        a otwarty edytor jest stanem, z którego najpierw się wychodzi.
                    */}
                    {editingServices !== null ? (
                        <>
                            <FooterButton
                                type="button"
                                onClick={() => setEditingServices(null)}
                                disabled={updateServices.isPending}
                            >
                                Anuluj
                            </FooterButton>
                            {/* Bez strzałki, bo zapis nie prowadzi nigdzie dalej - zostaje
                                w tym samym oknie. Strzałka jest zarezerwowana dla przejść. */}
                            <FooterPrimary
                                type="button"
                                onClick={saveServices}
                                disabled={updateServices.isPending}
                            >
                                <span className="glyph"><Check /></span>
                                <span className="labels">
                                    <span className="title">
                                        {updateServices.isPending ? 'Zapisuję…' : 'Zapisz wycenę'}
                                    </span>
                                    <span className="sub">
                                        {editingServices.length}
                                        {' '}
                                        {plural(editingServices.length, 'pozycja', 'pozycje', 'pozycji')}
                                    </span>
                                </span>
                            </FooterPrimary>
                        </>
                    ) : (
                    <>
                    {/* Kasacja sprawy w lewym narożniku stopki - sam kosz, bez napisu,
                        po przeciwnej stronie niż akcja główna. Stoi PIERWSZA w kolejności
                        dokumentu, żeby czytnik ekranu podał ją jako akcję pomocniczą przed
                        głównymi, a `margin-right: auto` odsuwa ją wizualnie na drugi koniec
                        rzędu. */}
                    <FooterDanger
                        type="button"
                        aria-label="Usuń lead"
                        title="Usuń lead"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleteLead.isPending}
                    >
                        <Trash2 />
                    </FooterDanger>

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
                        główną — „Stwórz rezerwację". Zwykłe przejście do korespondencji nie
                        ma tu własnego przycisku ani ikony w nagłówku: prowadzi do niego
                        adres w wierszu tożsamości, bo to droga do WIADOMOŚCI OD TEGO
                        KONTAKTU, a nie osobna czynność.
                    */}
                    {/* Odnotowanie kontaktu poza pocztą stoi PRZED akcją główną i jest
                        przyciskiem drugorzędnym: to zapis tego, co już się wydarzyło,
                        a nie następny krok w sprawie. Bez warunku na numer telefonu —
                        klient podaje go w treści zapytania równie często, jak ma go
                        w kartotece, a bywa i tak, że kontakt był SMS-em albo osobisty. */}
                    <FooterButton type="button" onClick={() => setCallbackDialogOpen(true)}>
                        <PhoneCall size={17} /> Kontakt poza pocztą
                    </FooterButton>

                    {isPane && keyHint && <KeyHint>{keyHint}</KeyHint>}

                    {(() => {
                        if (lead.appointmentId) {
                            return (
                                <FooterPrimary type="button" onClick={openAppointment}>
                                    <span className="glyph"><CalendarCheck /></span>
                                    <span className="labels">
                                        <span className="title">Zobacz rezerwację</span>
                                        <span className="sub">Termin jest już umówiony</span>
                                    </span>
                                    <ArrowRight className="arrow" />
                                </FooterPrimary>
                            );
                        }
                        if (closed) {
                            return canWrite ? (
                                <FooterPrimary type="button" onClick={openThread}>
                                    <span className="glyph"><Send /></span>
                                    <span className="labels">
                                        <span className="title">Napisz wiadomość</span>
                                        <span className="sub">Sprawa zamknięta, kontakt nadal możliwy</span>
                                    </span>
                                    <ArrowRight className="arrow" />
                                </FooterPrimary>
                            ) : null;
                        }
                        if (replyTone === 'due' && canWrite) {
                            return (
                                <>
                                    <FooterButton type="button" onClick={openBooking}>
                                        <CalendarPlus size={17} /> Stwórz rezerwację
                                    </FooterButton>
                                    <FooterPrimary type="button" onClick={openThread}>
                                        <span className="glyph"><Reply /></span>
                                        <span className="labels">
                                            <span className="title">Odpisz klientowi</span>
                                            <span className="sub">Ruch jest po naszej stronie</span>
                                        </span>
                                        <ArrowRight className="arrow" />
                                    </FooterPrimary>
                                </>
                            );
                        }
                        return (
                            <FooterPrimary type="button" onClick={openBooking}>
                                <span className="glyph"><CalendarPlus /></span>
                                <span className="labels">
                                    <span className="title">Stwórz rezerwację</span>
                                    <span className="sub">Termin, usługi, zaliczka</span>
                                </span>
                                <ArrowRight className="arrow" />
                            </FooterPrimary>
                        );
                    })()}

                    {/* Bez „Zamknij" w stopce: okno zamyka krzyżyk w nagłówku, a drugi
                        przycisk o tym samym znaczeniu stawał na telefonie tuż obok akcji
                        głównej i był od niej równie widoczny. */}
                    </>
                    )}
                </ModalFooter>
        </>
    );

    return (
        <>
            {isPane ? (
                <PaneShell>{body}</PaneShell>
            ) : (
                /* Okno rośnie na czas edycji wyceny. Tabela usług potrzebuje
                   ~560 px, cennik obok niej kolejnych 314, a zapytanie klienta
                   zostaje w kolumnie po lewej - przy 1040 px któreś z tych trzech
                   musiałoby zniknąć. Poza edycją szersze okno byłoby tylko pustym
                   miejscem, bo treści jest wtedy mniej. */
                <ModalShell
                    isOpen
                    onClose={onClose}
                    maxWidth={editingServices !== null ? 'min(1400px, 100%)' : '1040px'}
                >
                    {body}
                </ModalShell>
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
