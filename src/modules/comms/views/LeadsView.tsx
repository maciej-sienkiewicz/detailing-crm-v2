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
//  3. SEKCJE ZAMIAST ZAKŁADEK. „Czeka na nas", „Ucichło" i „U klienta" to jedna
//     oś - czyj jest ruch - prostopadła do statusu, i stoją pod sobą w jednej
//     przewijanej liście. Zakładka ukrywa pracę; sekcja ją porządkuje.
//     „Zamknięte" zostaje osobnym trybem: to inny zbiór, nie trzecia wartość osi.
//  4. SZCZEGÓŁY OBOK, NIE ZAMIAST. Na szerokim ekranie panel stoi przy kolejce,
//     więc przeskakiwanie między sprawami nie zamyka i nie otwiera okna. Na
//     telefonie miejsca na to nie ma i szczegóły wracają jako okno pełnoekranowe.
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import {
    Archive,
    ArrowLeft,
    BarChart3,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { ChoiceModal, ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useBreakpoint } from '@/common/hooks';
import {
    CLOSED_LEAD_STATUSES,
    OPEN_LEAD_STATUSES,
    useBulkDeleteLeads,
    useLeadsByStatuses,
    useLeadsSocket,
    useStagnationThresholds,
} from '../hooks/useLeads';
import { useMailboxSyncState } from '../hooks/useComms';
import { MailboxSyncPanel } from '../components/MailboxSyncPanel';
import { LeadArchive } from '../components/LeadArchive';
import { LeadDetailModal, LeadDetailPane } from '../components/LeadDetailModal';
import { LeadQueueCard } from '../components/LeadQueueCard';
import { WorklistPanel } from '../components/WorklistPanel';
import { buildWorklist } from '../utils/leadWorklist';
import type { LeadStatus } from '../types';
import { EmptyHint, SurfaceCard, formatMoney } from '../components/shared';
import LeadAnalyticsView from './LeadAnalyticsView';

/**
 * Widok wypełnia okno i dzieli się na dwie niezależnie przewijane kolumny.
 *
 * Świadomie bez wspólnego PageHeadera aplikacji: ciemny baner z akcjami zawijał
 * się na telefonie do 161 px i pierwsza sprawa zaczynała się na 322. pikselu -
 * 38% ekranu zajęte, zanim widać cokolwiek do zrobienia. Tu nagłówek jest
 * częścią kolumny kolejki i mieści się w jednym wierszu.
 */
/**
 * Ekran modułu. Na szerokim ekranie zostawia margines wokół treści - dokładnie
 * ten sam co Poczta (MailView.Screen), bo obie skrzynki są tym samym rodzajem
 * widoku i stojąc obok siebie w menu nie mają powodu różnić się obudową.
 *
 * Wcześniej kolejka i panel leżały wprost na krawędziach okna: moduł wyglądał
 * jak strona pełnoekranowa, a Poczta jak aplikacja w karcie.
 */
const ViewShell = styled.main`
    display: flex;
    width: 100%;
    min-height: 0;
    height: 100dvh;
    padding: ${p => p.theme.spacing.lg};

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
        padding: 0;
        background: transparent;
    }
`;

/**
 * Powierzchnia, na której leży moduł - biel, obwódka, zaokrąglenie i cień,
 * te same co w Poczcie.
 *
 * Poniżej progu podziału karta ZNIKA Z UKŁADU (`display: contents`), a nie
 * zwija się do zera: tam moduł jest jedną kolumną przewijaną razem ze stroną,
 * a własną kartę ma już sama lista (patrz QueueScroll). Druga ramka wokół niej
 * dawałaby ramkę w ramce, a zamknięcie kolumny w powierzchni o stałej wysokości
 * przeniosłoby przewijanie do środka i zabrało telefonowi chowający się pasek
 * adresu.
 */
const AppCard = styled(SurfaceCard)`
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;

    @media (max-width: ${p => p.theme.breakpoints.xl}) {
        display: contents;
    }
`;

/**
 * Kolejka zwija się w lewo, gdy otwiera się sprawę.
 *
 * Panel szczegółów jest gęsty: wycena, sugestie, przebieg sprawy i notatki
 * w dwóch kolumnach. Przy 1280 px zostawało mu 592 px, bo 440 zabierała lista,
 * którą w trakcie czytania sprawy i tak się tylko mija. Zwinięcie oddaje te
 * 440 px treści, a lista wraca jednym klawiszem (Esc) albo jednym kliknięciem
 * w strzałkę w nagłówku panelu - więc przeskakiwanie między sprawami nic nie traci.
 *
 * `visibility` zmienia się dopiero PO animacji: kolumna o zerowej szerokości
 * nadal trzyma w sobie przyciski, które łapałyby Tab i czytnik ekranu.
 */
const QueueColumn = styled.div<{ $split: boolean; $collapsed: boolean }>`
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: ${p => (p.$split ? `0 0 ${p.$collapsed ? '0px' : '440px'}` : '1 1 auto')};
    width: ${p => (p.$split ? (p.$collapsed ? '0px' : '440px') : '100%')};
    /* Kreska podziału należy do kolumny, nie do osobnej rączki: gaśnie razem
       z nią (patrz opacity niżej), więc po zwinięciu nie zostaje wisząca linia. */
    border-right: ${p => (p.$split ? `1px solid ${p.theme.colors.border}` : 'none')};
    background: ${p => p.theme.colors.surface};

    ${p => p.$split && css`
        overflow: hidden;
        opacity: ${p.$collapsed ? 0 : 1};
        visibility: ${p.$collapsed ? 'hidden' : 'visible'};
        transition:
            width 260ms cubic-bezier(0.4, 0, 0.2, 1),
            flex-basis 260ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 170ms ease ${p.$collapsed ? '0ms' : '70ms'},
            visibility 0s linear ${p.$collapsed ? '260ms' : '0s'};

        @media (prefers-reduced-motion: reduce) { transition: none; }
    `}

    @media (max-width: ${p => p.theme.breakpoints.xl}) {
        width: 100%;
        flex: 1 1 auto;
        border-right: none;
        background: transparent;
        overflow: visible;
        opacity: 1;
        visibility: visible;
    }
`;

const DetailColumn = styled.div`
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    background: ${p => p.theme.colors.surface};
`;

/** Nagłówek kolumny kolejki: tytuł, licznik i jedno wyjście do analityki. */
/**
 * Nagłówek kolejki - pasek listy, nie okładka rozdziału.
 *
 * Wzorem jest lewa kolumna Poczty (MailView.ListHeader): rząd z wyszukiwarką
 * i jedną akcją, pod nim rząd chipów, a zaraz potem lista. Ten sam rytm w obu
 * skrzynkach znaczy, że przejście między nimi nie wymaga przestawiania wzroku.
 *
 * Nie ma tu tytułu. Stał tu nagłówek 21 px z podtytułem i przyciskiem wysokim
 * na 44 px, czyli układ strony tytułowej - ponad sto pikseli wysokości na
 * powtórzenie nazwy widoku, do którego wchodzi się z bocznego menu.
 */
const QueueHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

/** Pigułka wyszukiwania - ta sama co w lewej kolumnie Poczty. */
const SearchInput = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 12px;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surface};
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus-within { border-color: ${p => p.theme.colors.primary}; }

    input {
        border: none;
        outline: none;
        flex: 1;
        min-width: 0;
        font-size: 13px;
        background: transparent;
        color: ${p => p.theme.colors.text};
        font-family: inherit;
    }
`;

/**
 * Akcja przy wyszukiwarce. Obwódka, nie wypełnienie: analityka i archiwum są
 * drugorzędne wobec samej kolejki, a w oknie wypełniony jest tylko krok
 * następny - w Poczcie jest nim „Napisz", tu odpowiednika nie ma, bo zapytań
 * nie zakłada się ręcznie. Rozmiar 34 px, ten sam co tam.
 */
const GhostAction = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 13px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    cursor: pointer;
    font-family: inherit;
    transition: border-color ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.primary}; color: ${p => p.theme.colors.text}; }

    svg { width: 15px; height: 15px; }
`;

/** Wariant bez etykiety - okrągły, tej samej wysokości co rząd. */
const IconAction = styled(GhostAction)`
    width: 34px;
    height: 34px;
    padding: 0;
    flex-shrink: 0;
`;

/** Rząd przełączników - w nagłówku, tuż pod tytułem (jak chipy folderów w Poczcie). */
const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

/** Lista przewija się sama, żeby nagłówek i segmenty zostały na miejscu. */
const QueueScroll = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    /* Bez własnego odstępu i kreski u góry - nagłówek ma już swoją krawędź,
       a druga linia w odległości dziesięciu pikseli czytała się jak pusty pasek. */

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

/**
 * Nagłówek sekcji w kolejce - i granica między sekcjami.
 *
 * Granicy nie rysuje kolor, tylko MATERIAŁ: wiersze leżą na bieli, nagłówek na
 * szarej podłodze aplikacji (#eef2f7). Dwa różne tła czytają się jako dwie różne
 * powierzchnie, więc przecięcie widać nawet kątem oka i nawet wtedy, gdy nagłówek
 * przykleił się do górnej krawędzi.
 *
 * Wcześniej stał tu kolorowy pasek wpuszczony w krawędź - ten sam zabieg, co na
 * kartach pod spodem. Powtórzony na nagłówku i na każdym wierszu pod nim dawał
 * ciągły pas barwy: nagłówek przestawał być granicą, bo wyglądał jak kolejny
 * wiersz, tylko mniejszy.
 *
 * Nad każdą sekcją poza pierwszą jest 10 px pustki. Odstęp robi więcej dla
 * czytelności podziału niż jakakolwiek kreska - i nie dokłada nic do obrazu.
 */
const SectionHeader = styled.div<{ $first: boolean }>`
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: baseline;
    gap: 7px;
    margin-top: ${p => (p.$first ? '0' : '10px')};
    padding: 8px 12px;
    background: ${p => p.theme.colors.background};
    border-top: 1px solid ${p => p.theme.colors.border};
    border-bottom: 1px solid ${p => p.theme.colors.border};

    /* Wersaliki w 10,5 px z rozstrzeleniem 0,08 em - etykieta ma być rozpoznawana
       jako podpis sekcji, zanim zostanie przeczytana jako słowo. Poniżej 10 px
       wersaliki przestają się składać w kształt i zaczynają w plamę. */
    .title {
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.bold};
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textSecondary};
    }

    /* Licznik należy do etykiety, a nie do osobnej plakietki obok: „Czeka na nas 5"
       to jedno zdanie. Bez czerwonej pigułki - liczba spraw do zrobienia jest
       stanem normalnym, a nie alarmem. */
    .count {
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }

    /* Kwota tylko przy ciszy - tam każda sprawa przeszła już przez wycenę. */
    .value {
        margin-left: auto;
        font-size: 11px;
        color: ${p => p.theme.colors.textSecondary};
        font-variant-numeric: tabular-nums;
    }

    button.fold {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: none;
        background: transparent;
        padding: 2px 4px;
        color: ${p => p.theme.colors.textMuted};
        font-family: inherit;
        font-size: 11px;
        cursor: pointer;

        &:hover { color: ${p => p.theme.colors.text}; }
        &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 1px; }
        svg { width: 13px; height: 13px; }
    }
`;

/**
 * Pasek operacji na zaznaczonych sprawach.
 *
 * Na DOLE kolumny, nie na górze. Trzy powody, w tej kolejności: na telefonie dół
 * jest w zasięgu kciuka, a góra nie; pasek u góry spychałby listę w dół dokładnie
 * w chwili, gdy użytkownik celuje w kolejne wiersze; i wreszcie decyzja „usuń to"
 * zapada PO przejrzeniu zaznaczenia, czyli po dojściu wzrokiem w dół.
 *
 * Przyklejony, więc widoczny także po przewinięciu listy.
 */
const BulkBar = styled.div`
    position: sticky;
    bottom: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    padding: 10px 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.06);

    .count {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }
`;

/**
 * Usuwanie w pasku wygląda groźnie, bo takie jest: to jedyna operacja w tym module,
 * której nie da się cofnąć. Reszta paska zostaje cicha.
 */
const BulkDanger = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid ${p => p.theme.colors.error};
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.errorLight};
    color: ${p => p.theme.colors.error};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) { background: ${p => p.theme.colors.error}; color: #ffffff; }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.error}; outline-offset: 2px; }
    &:disabled { opacity: 0.6; cursor: progress; }

    svg { width: 15px; height: 15px; }
`;

/** Pole wyboru w nagłówku sekcji: zaznacza i odznacza całą sekcję naraz. */
const SectionSelect = styled.label`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    margin-left: -7px;
    cursor: pointer;

    input {
        width: 15px;
        height: 15px;
        margin: 0;
        accent-color: ${p => p.theme.colors.primary};
        cursor: pointer;
    }
`;

/**
 * Treść panelu startowego na wąskim ekranie - pod listą, bo tam kończy się praca.
 *
 * Renderowana wyłącznie poniżej progu podziału (warunek w JS, nie samo `display:none`):
 * ukryta CSS-em nadal montowałaby drugi wykres Recharts przy każdym wejściu
 * w moduł na desktopie. Zapytanie o dane jest wspólne (ten sam klucz), ale render
 * już nie.
 */
const MobilePanel = styled.div`
    margin: 0 12px 24px 12px;
`;

/** Statusy zamknięte - do rozpoznania deep-linku z analityki. */
const CLOSED_SET = new Set<LeadStatus>(CLOSED_LEAD_STATUSES);

/** Zwinięcie sekcji „U klienta" - per przeglądarka, przeżywa odświeżenie. */
const QUIET_FOLDED_KEY = 'leadsQueue.quietFolded';

export default function LeadsView() {
    const [searchParams, setSearchParams] = useSearchParams();
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
     * Archiwum jest TRYBEM, nie trzecią sekcją.
     *
     * Sprawa rozstrzygnięta nie ma czyjego ruchu, więc nie mieści się w żadnej
     * sekcji kolejki - a poza tym to inny zbiór: serwerowo stronicowany, rosnący
     * bez końca i odwiedzany z konkretnym pytaniem, nie przeglądany. Kolejka
     * i archiwum różnią się tak, jak w Poczcie różnią się foldery.
     */
    const [inArchive, setInArchive] = useState(() => {
        const status = searchParams.get('status') as LeadStatus | null;
        return Boolean(status && CLOSED_SET.has(status));
    });
    const [archiveStatus, setArchiveStatus] = useState<LeadStatus | undefined>(() => {
        const status = searchParams.get('status') as LeadStatus | null;
        return status && CLOSED_SET.has(status) ? status : undefined;
    });
    const [archiveQuery, setArchiveQuery] = useState('');
    /**
     * Szukanie w kolejce. Filtruje to, co już jest na ekranie - kolejka to
     * wszystkie sprawy otwarte, a nie strona wyników, więc nie ma po co pytać
     * serwera o coś, co leży w pamięci. Archiwum ma własne, serwerowe (tam
     * zbiór jest nieograniczony i rośnie z każdym miesiącem).
     */
    const [queueQuery, setQueueQuery] = useState('');

    /**
     * Czy panel obok pokazuje podsumowanie miesiąca zamiast ekranu startowego.
     *
     * Analityka przestała być domyślną treścią panelu i jest teraz tym, czym
     * zawsze była: raportem, po który się sięga. Stan jest lokalny, nie w adresie -
     * to nie jest miejsce, do którego się wraca linkiem, tylko spojrzenie w bok
     * w trakcie pracy.
     */
    const [summaryOpen, setSummaryOpen] = useState(false);

    /**
     * Tryb zaznaczania i zbiór zaznaczonych spraw.
     *
     * Tryb jest jawny, a nie wywoływany najechaniem myszą: kwadracik pojawiający się
     * na hover nie istnieje na dotyku, a to na telefonie robi się porządki między
     * jednym autem a drugim. Wejście jest jedno dla obu urządzeń - przycisk w nagłówku.
     *
     * Zbiór trzyma identyfikatory, nie indeksy: lista przychodzi WebSocketem i potrafi
     * się przestawić między zaznaczeniem a kliknięciem „Usuń".
     */
    const [selecting, setSelecting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkAppointmentsOpen, setBulkAppointmentsOpen] = useState(false);
    const bulkDelete = useBulkDeleteLeads();

    /** Zwinięcie najspokojniejszej sekcji - studio z osiemdziesięcioma sprawami zwinie ją raz. */
    const [quietFolded, setQuietFolded] = useState(() => {
        try { return localStorage.getItem(QUIET_FOLDED_KEY) === '1'; } catch { return false; }
    });
    const toggleQuiet = useCallback(() => {
        setQuietFolded((folded) => {
            const next = !folded;
            try { localStorage.setItem(QUIET_FOLDED_KEY, next ? '1' : '0'); } catch { /* prywatne okno */ }
            return next;
        });
    }, []);

    const selectedLeadId = searchParams.get('lead');
    const selectLead = useCallback(
        (leadId: string | null) => {
            setSearchParams(leadId ? { lead: leadId } : {}, { replace: true });
        },
        [setSearchParams]
    );

    /*
     * Kolejka zwija się sama, gdy otwiera się sprawę, i wraca na żądanie.
     *
     * Stan trzyma ID sprawy, przy której użytkownik listę ROZWINĄŁ - a nie zwykłe
     * „otwarta/zamknięta". Dzięki temu otwarcie kolejnej sprawy zwija listę z
     * powrotem bez żadnego efektu synchronizującego: nowe ID po prostu nie zgadza
     * się z zapamiętanym.
     */
    const [queueExpandedFor, setQueueExpandedFor] = useState<string | null>(null);

    const thresholds = useStagnationThresholds();
    const open = useLeadsByStatuses(OPEN_LEAD_STATUSES);
    // Archiwum pobiera się dopiero, gdy ktoś w nie wejdzie: pusta lista statusów
    // to zero zapytań, więc kolejka nie płaci za dane, których nie pokazuje.
    const archive = useLeadsByStatuses(
        inArchive ? (archiveStatus ? [archiveStatus] : CLOSED_LEAD_STATUSES) : [],
        { query: archiveQuery, sortDirection: 'DESC' }
    );

    // Zmiany leadów przychodzą WebSocketem - karta aktualizuje się bez odświeżania.
    useLeadsSocket();
    const mailboxSync = useMailboxSyncState();

    /**
     * Kolejka: trzy sekcje po tym, czyj jest ruch, w każdej kolejność po wieku.
     *
     * Cała reguła mieszka w [buildWorklist], bo tę samą odpowiedź musi dać nagłówek
     * sekcji i zdanie w panelu obok. Policzona dwa razy rozjechałaby się pierwszego
     * dnia, w którym ktoś zmieni jeden z warunków.
     */
    const worklist = useMemo(
        () => buildWorklist(open.items, thresholds),
        [open.items, thresholds]
    );

    /*
     * Po czym szukamy: nazwisko/kontakt, auto, usługi. Te trzy rzeczy stoją na
     * karcie, więc szukanie obiecuje dokładnie to, co widać - a nie trafia
     * w pola, których na liście nie ma i których nikt nie zobaczy w wyniku.
     *
     * Szukanie przecina WSZYSTKIE sekcje i zostawia te, w których coś zostało:
     * człowiek szukający „Kowalskiego" nie wie, w której sekcji ten Kowalski
     * siedzi, i nie powinien musieć wiedzieć.
     */
    const sections = useMemo(() => {
        const needle = queueQuery.trim().toLowerCase();
        if (!needle) return worklist.sections;
        return worklist.sections
            .map((section) => ({
                ...section,
                entries: section.entries.filter(({ lead }) =>
                    [
                        lead.customerName,
                        lead.contactIdentifier,
                        lead.vehicleBrand,
                        lead.vehicleModel,
                        ...lead.tagLabels,
                    ]
                        .filter(Boolean)
                        .some((field) => String(field).toLowerCase().includes(needle))
                ),
            }))
            .filter((section) => section.entries.length > 0);
    }, [worklist.sections, queueQuery]);

    /** Płaska lista widocznych spraw - dla skrótów j/k i dla pustego stanu. */
    const visible = useMemo(
        () =>
            sections.flatMap((section) =>
                section.key === 'CLIENT' && quietFolded ? [] : section.entries
            ),
        [sections, quietFolded]
    );

    const toggleSelected = useCallback((leadId: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(leadId)) next.delete(leadId);
            else next.add(leadId);
            return next;
        });
    }, []);

    /**
     * Zaznaczenie całej sekcji. Zaznacza to, co widać: przy aktywnym wyszukiwaniu
     * bierze przefiltrowane wiersze, a nie wszystko, co sekcja zawiera. Inaczej
     * „zaznacz wszystko" po wpisaniu nazwiska braloby też sprawy spoza wyniku.
     */
    const toggleSection = useCallback((ids: string[], allSelected: boolean) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
            return next;
        });
    }, []);

    const leaveSelection = useCallback(() => {
        setSelecting(false);
        setSelectedIds(new Set());
    }, []);

    /*
     * Zaznaczone sprawy w kolejności kolejki, nie w kolejności klikania. Backend
     * usuwa po kolei, więc przy przerwaniu w połowie znika to, co stało wyżej -
     * czyli to, na co użytkownik patrzył.
     */
    const selectedInOrder = useMemo(
        () =>
            worklist.sections
                .flatMap((section) => section.entries)
                .map((entry) => entry.lead.id)
                .filter((id) => selectedIds.has(id)),
        [worklist.sections, selectedIds]
    );

    /** Czy w zaznaczeniu jest choć jedna sprawa z terminem - wtedy pytamy o rezerwacje. */
    const selectedWithAppointment = useMemo(
        () =>
            worklist.sections
                .flatMap((section) => section.entries)
                .filter((entry) => selectedIds.has(entry.lead.id) && entry.lead.appointmentId).length,
        [worklist.sections, selectedIds]
    );

    const runBulkDelete = useCallback(
        (deleteAppointments: boolean) => {
            setBulkConfirmOpen(false);
            setBulkAppointmentsOpen(false);
            if (selectedInOrder.length === 0) return;
            bulkDelete.mutate(
                { ids: selectedInOrder, deleteAppointments },
                {
                    /*
                     * Zaznaczenie znika także po nieudanej próbie: zostawione wyglądałoby
                     * na gotowe do drugiego kliknięcia „Usuń", a przy części spraw
                     * usuniętych drugie kliknięcie znaczyłoby już co innego niż pierwsze.
                     */
                    onSettled: leaveSelection,
                }
            );
        },
        [bulkDelete, selectedInOrder, leaveSelection]
    );

    const askBulkDelete = useCallback(() => {
        if (selectedWithAppointment > 0) setBulkAppointmentsOpen(true);
        else setBulkConfirmOpen(true);
    }, [selectedWithAppointment]);

    /** Zwijać jest co tylko wtedy, gdy panel stoi obok kolejki i sprawa jest otwarta. */
    const canCollapseQueue = isSplit && !inArchive && Boolean(selectedLeadId);
    const queueCollapsed = canCollapseQueue && queueExpandedFor !== selectedLeadId;
    const toggleQueue = useCallback(() => {
        setQueueExpandedFor((current) => (current === selectedLeadId ? null : selectedLeadId));
    }, [selectedLeadId]);

    /**
     * Esc wysuwa kolejkę z powrotem.
     *
     * Escape w tym widoku nie miał dotąd żadnego znaczenia - panel szczegółów nie
     * jest oknem modalnym i nie ma czego zamykać. Teraz jest: „wyjdź ze sprawy
     * z powrotem do listy" to najczęstszy odruch po przeczytaniu zapytania.
     */
    useEffect(() => {
        if (!queueCollapsed) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (document.querySelector('[role="dialog"], [role="listbox"], [role="menu"]')) return;
            event.preventDefault();
            setQueueExpandedFor(selectedLeadId);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [queueCollapsed, selectedLeadId]);

    /**
     * Esc kończy zaznaczanie. Nasłuch stoi OSOBNO i wcześniej niż ten od kolejki,
     * bo to jest tryb: dopóki trwa, Escape znaczy „wyjdź z niego", a nie „pokaż
     * listę". Okno potwierdzenia obsługuje Escape samo i wtedy klawisz należy do niego.
     */
    useEffect(() => {
        if (!selecting) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (document.querySelector('[role="dialog"], [role="listbox"], [role="menu"]')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            leaveSelection();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [selecting, leaveSelection]);


    /**
     * `j` / `k` - następna i poprzednia sprawa bez odrywania ręki od klawiatury.
     *
     * Skacze przez granice sekcji, bo to jest jedna lista: użytkownik przechodzi
     * przez pracę po kolei, a nie po kategoriach.
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

    /**
     * Wejście i wyjście z archiwum ZDEJMUJE zaznaczenie.
     *
     * Bez tego wejście w archiwum przy otwartym panelu podmieniało go na okno
     * modalne z tą samą sprawą: panel stoi pod warunkiem `isSplit && !inArchive`,
     * okno pod `(!isSplit || inArchive) && selectedLeadId`. Wyglądało to na
     * przypadkowe otwarcie cudzego leada, bo nim było.
     *
     * Reguła jest szersza niż sama naprawa i celowo: zaznaczenie należy do LISTY,
     * na którą się patrzy.
     */
    const changeMode = useCallback(
        (archive: boolean) => {
            setInArchive(archive);
            if (!archive) setArchiveStatus(undefined);
            selectLead(null);
            /*
             * Zaznaczenie też należy do LISTY, na którą się patrzy. Zostawione
             * przeżyłoby przejście do archiwum i „Usuń 3" kasowałoby sprawy, których
             * na ekranie już nie ma. Zdejmujemy je TUTAJ, w miejscu zmiany trybu,
             * a nie efektem po fakcie: efekt zrobiłby to samo o jeden render później
             * i o jeden mechanizm drożej.
             */
            leaveSelection();
        },
        [selectLead, leaveSelection]
    );

    // Pierwsza synchronizacja skrzynki w toku: leady dopiero powstają z nadciągającej
    // poczty, więc lista rosnąca z sekundy na sekundę wyglądałaby jak zepsuta.
    if (mailboxSync.syncing) {
        return (
            <ViewShell>
                <AppCard>
                <QueueColumn $split={false} $collapsed={false}>
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
            </AppCard>
        </ViewShell>
        );
    }

    return (
        <ViewShell>
            <AppCard>
            <QueueColumn
                $split={isSplit && !inArchive}
                $collapsed={queueCollapsed}
            >
                <QueueHeader>
                    <SearchRow>
                        <SearchInput>
                            <Search size={14} />
                            <input
                                placeholder={inArchive ? 'Szukaj w zamkniętych' : 'Szukaj w zapytaniach'}
                                value={inArchive ? archiveQuery : queueQuery}
                                onChange={(event) =>
                                    (inArchive ? setArchiveQuery : setQueueQuery)(event.target.value)
                                }
                                aria-label={inArchive ? 'Szukaj w zamkniętych' : 'Szukaj w zapytaniach'}
                            />
                        </SearchInput>

                        {/* Wejście w tryb zaznaczania. Jedno dla myszy i dla dotyku:
                            kwadracik pojawiający się na hover nie istnieje na telefonie,
                            a porządki w kolejce robi się właśnie z telefonu. */}
                        {!inArchive && !selecting && visible.length > 0 && (
                            <IconAction
                                as="button"
                                type="button"
                                onClick={() => setSelecting(true)}
                                title="Zaznacz sprawy"
                                aria-label="Zaznacz sprawy"
                            >
                                <CheckSquare />
                            </IconAction>
                        )}

                        {/* Archiwum to osobny tryb, więc i wejście do niego jest jedno:
                            tutaj. Nie ma go w rzędzie sekcji, bo sprawa rozstrzygnięta
                            nie jest trzecim rodzajem ruchu. */}
                        {!inArchive && !selecting && (
                            isWide ? (
                                <GhostAction
                                    as="button"
                                    type="button"
                                    onClick={() => changeMode(true)}
                                    title="Szukaj w zamkniętych sprawach"
                                >
                                    <Archive /> Zamknięte
                                </GhostAction>
                            ) : (
                                <IconAction
                                    as="button"
                                    type="button"
                                    onClick={() => changeMode(true)}
                                    title="Szukaj w zamkniętych sprawach"
                                    aria-label="Szukaj w zamkniętych sprawach"
                                >
                                    <Archive />
                                </IconAction>
                            )
                        )}

                        {/* Poniżej progu podziału panelu nie ma, więc podsumowanie
                            miesiąca zostaje osobnym ekranem pod tym przyciskiem. */}
                        {!isSplit && !inArchive && (
                            <Link to="/leads/analytics" aria-label="Podsumowanie miesiąca">
                                <IconAction title="Podsumowanie miesiąca"><BarChart3 /></IconAction>
                            </Link>
                        )}
                    </SearchRow>

                    {inArchive && (
                        <Toolbar>
                            <BackToQueue type="button" onClick={() => changeMode(false)}>
                                <ArrowLeft /> Wróć do kolejki
                            </BackToQueue>
                        </Toolbar>
                    )}
                </QueueHeader>

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
                                {queueQuery.trim()
                                    ? 'Nic nie pasuje do wyszukiwania'
                                    : worklist.total === 0
                                        ? 'Nie ma otwartych zapytań.'
                                        : 'Nikt nie czeka na Twoją odpowiedź.'}
                            </EmptyHint>
                        )}

                        {/* Jedna lista, trzy sekcje. Zakładki ukrywały pracę: licznik
                            przy „U klienta" był celowo niepozorny, a to właśnie tam
                            leżą rozmowy do odzyskania za zero złotych. Sekcja tego nie
                            robi - porządkuje, zamiast chować. */}
                        {sections.map((section, index) => {
                            const folded = section.key === 'CLIENT' && quietFolded;
                            const sectionIds = section.entries.map((entry) => entry.lead.id);
                            const allSelected =
                                sectionIds.length > 0 && sectionIds.every((id) => selectedIds.has(id));
                            return (
                                <Fragment key={section.key}>
                                    <SectionHeader $first={index === 0}>
                                        {selecting && (
                                            <SectionSelect
                                                title={allSelected ? 'Odznacz sekcję' : 'Zaznacz całą sekcję'}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={() => toggleSection(sectionIds, allSelected)}
                                                    aria-label={`${allSelected ? 'Odznacz' : 'Zaznacz'} sekcję ${section.title}`}
                                                />
                                            </SectionSelect>
                                        )}
                                        <span className="title">{section.title}</span>
                                        <span className="count">{section.entries.length}</span>
                                        {section.key === 'SILENT' && section.value > 0 && (
                                            <span className="value">{formatMoney(section.value)}</span>
                                        )}
                                        {section.key === 'CLIENT' && (
                                            <button
                                                type="button"
                                                className="fold"
                                                aria-expanded={!folded}
                                                onClick={toggleQuiet}
                                            >
                                                {folded ? <ChevronDown /> : <ChevronUp />}
                                                {folded ? 'Pokaż' : 'Zwiń'}
                                            </button>
                                        )}
                                    </SectionHeader>

                                    {!folded && section.entries.map(({ lead, urgency }) => (
                                        <LeadQueueCard
                                            key={lead.id}
                                            lead={lead}
                                            urgency={urgency}
                                            active={lead.id === selectedLeadId}
                                            dense={isSplit}
                                            onOpen={() => selectLead(lead.id)}
                                            selectable={selecting}
                                            selected={selectedIds.has(lead.id)}
                                            onToggleSelect={() => toggleSelected(lead.id)}
                                        />
                                    ))}
                                </Fragment>
                            );
                        })}

                        {open.truncated && (
                            <Truncated>
                                Otwartych spraw jest więcej, niż mieści jedna strona. Zamknij
                                część zapytań albo skorzystaj z podsumowania, żeby zobaczyć całość.
                            </Truncated>
                        )}
                    </QueueScroll>
                )}

                {/* Pasek operacji zbiorczych. Stoi POD listą i nad panelem startowym:
                    dotyczy tego, co jest wyżej, i znika razem z trybem zaznaczania. */}
                {selecting && !inArchive && (
                    <BulkBar>
                        <span className="count">
                            {selectedIds.size === 0
                                ? 'Zaznacz sprawy'
                                : `Zaznaczono ${selectedIds.size}`}
                        </span>
                        <BulkDanger
                            type="button"
                            disabled={selectedIds.size === 0 || bulkDelete.isPending}
                            onClick={askBulkDelete}
                        >
                            <Trash2 /> {bulkDelete.isPending ? 'Usuwanie…' : 'Usuń'}
                        </BulkDanger>
                        <IconAction
                            as="button"
                            type="button"
                            onClick={leaveSelection}
                            title="Zakończ zaznaczanie (Esc)"
                            aria-label="Zakończ zaznaczanie"
                        >
                            <X />
                        </IconAction>
                    </BulkBar>
                )}

                {/* Wąski ekran: panelu obok nie ma, więc wykres i pokwitowanie stoją
                    POD listą - za pracą, nie przed nią. Karta pierwszej sprawy tu nie
                    wchodzi: powtarzałaby pierwszy wiersz listy o dwa piksele wyżej. */}
                {!inArchive && !isSplit && (
                    <MobilePanel>
                        <WorklistPanel
                            compact
                            worklist={worklist}
                            onOpenSummary={() => setSummaryOpen(true)}
                        />
                    </MobilePanel>
                )}
            </QueueColumn>

            {/* Szczegóły obok kolejki: przeskakiwanie między sprawami nie zamyka
                i nie otwiera okna, więc obsłużenie pięciu zapytań pod rząd to pięć
                kliknięć, a nie piętnaście. */}
            {isSplit && !inArchive && (
                <DetailColumn>
                    {/*
                      * Trzy stany panelu, w kolejności ważności: wybrana sprawa,
                      * podsumowanie miesiąca na życzenie, a domyślnie - ekran startowy.
                      *
                      * Analityka NIE jest już treścią domyślną. Stała tu, bo było ją
                      * gdzie postawić, a nie dlatego, że odpowiada na pytanie, z którym
                      * wchodzi się do modułu. Pytanie brzmi „co mam teraz zrobić",
                      * a nie „ile zamknąłem w tym miesiącu".
                      */}
                    {selectedLeadId ? (
                        <LeadDetailPane
                            key={selectedLeadId}
                            leadId={selectedLeadId}
                            keyHint={queueCollapsed ? 'Esc — lista zapytań' : undefined}
                            queueCollapsed={queueCollapsed}
                            onToggleQueue={canCollapseQueue ? toggleQueue : undefined}
                            onClose={() => selectLead(null)}
                            onDeleted={() => selectLead(null)}
                        />
                    ) : summaryOpen ? (
                        <LeadAnalyticsView
                            embedded
                            onBack={() => setSummaryOpen(false)}
                            onOpenQueue={() => setSummaryOpen(false)}
                            onOpenArchive={(status) => {
                                setSummaryOpen(false);
                                changeMode(true);
                                if (status) setArchiveStatus(status);
                            }}
                        />
                    ) : (
                        <WorklistPanel
                            worklist={worklist}
                            onOpenSummary={() => setSummaryOpen(true)}
                        />
                    )}
                </DetailColumn>
            )}

            {/*
              * Dwa okna, bo to dwa różne pytania. Bez terminów w zaznaczeniu pytamy
              * o jedną rzecz („na pewno?"), z terminami trzeba najpierw rozstrzygnąć,
              * co z nimi - i jest to pełnoprawny wybór, a nie potwierdzenie.
              */}
            <ConfirmationModal
                isOpen={bulkConfirmOpen}
                title={
                    selectedIds.size === 1
                        ? 'Usunąć zaznaczoną sprawę?'
                        : `Usunąć ${selectedIds.size} zaznaczonych spraw?`
                }
                message="Tej operacji nie da się cofnąć. Wiadomości w skrzynce zostają nietknięte, a sprawy z wizytą zostaną pominięte."
                variant="danger"
                confirmText="Usuń"
                onConfirm={() => runBulkDelete(false)}
                onCancel={() => setBulkConfirmOpen(false)}
            />

            <ChoiceModal
                isOpen={bulkAppointmentsOpen}
                title="Co zrobić z rezerwacjami?"
                message={
                    selectedWithAppointment === 1
                        ? 'Jedna z zaznaczonych spraw ma rezerwację w kalendarzu. Możesz usunąć ją razem ze sprawą albo zostawić jako samodzielny termin.'
                        : `${selectedWithAppointment} zaznaczonych spraw ma rezerwacje w kalendarzu. Możesz usunąć je razem ze sprawami albo zostawić jako samodzielne terminy.`
                }
                variant="danger"
                primaryText="Usuń też rezerwacje"
                onPrimary={() => runBulkDelete(true)}
                secondaryText="Zostaw terminy"
                onSecondary={() => runBulkDelete(false)}
                onDismiss={() => setBulkAppointmentsOpen(false)}
            />

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
            </AppCard>
        </ViewShell>
    );
}
