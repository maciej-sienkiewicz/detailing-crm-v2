// src/modules/campaigns/components/CampaignDetailModal.tsx
// Okno kampanii - jedno na całą aplikację, otwierane z listy kampanii.
//
// Wcześniej był to osobny adres i osobna strona. Kliknięcie wiersza wyrzucało
// z listy, powrót kosztował drugie wczytanie tabeli, a filtr, który ktoś sobie
// ustawił, przepadał. Kampanię przegląda się tak samo jak leada - rzut oka,
// decyzja, zamknięcie - więc i okno jest to samo co przy leadzie: szeroki modal,
// nie wysuwany panel, bo lista odbiorców jest tabelą i w wąskiej szufladzie
// ucina adresy do jednej litery.
//
// Hierarchia okna wynika z trzech pytań, które ktoś zadaje sobie, otwierając
// kampanię: do ilu ludzi to poszło (albo pójdzie), ile to kosztuje i czy coś tu
// do mnie należy. Dlatego u góry stoi pasek podsumowania z liczbą odbiorców jako
// największym elementem widoku, a treść wiadomości - to, co klient naprawdę
// zobaczy - zajmuje szerszą, roboczą kolumnę pod nim.
//
// Kolor niesie znaczenie i nic poza tym: etap kampanii, pilność, akcja główna.
// Liczba odbiorców jest dominantą przez rozmiar, nie przez barwę - liczba
// pomalowana na kolor wygląda jak ostrzeżenie, a nie jak fakt.
//
// Akcja główna jest jedna i wynika ze stanu kampanii, a nie z tego, gdzie akurat
// stoi przycisk. Szkic woła „dokończ", zaplanowana - „wyślij teraz", działająca
// - „wstrzymaj", zakończona z błędami - „ponów nieudane". Poprzedni nagłówek
// niósł do pięciu równych przycisków naraz; pięć równoważnych podpowiedzi to
// zero podpowiedzi (prawo Hicka), a przy tym „Usuń" sąsiadowało pod kursorem
// z „Dokończ".
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, Coins, Copy, Mail, MessageSquare,
    Pause, Pencil, Play, RefreshCw, Send, Square, Trash2, Users,
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
import {
    useActivateCampaign, useArchiveCampaign, useAudienceEstimate, useCampaign,
    useCampaignRecipients, useCampaignStats, useCancelCampaign, useDeleteCampaign,
    useDuplicateCampaign, usePauseCampaign, useRetryAllFailed, useRetryRecipient,
    useScheduleCampaign, useStopCampaign,
} from '../hooks/useCampaigns';
import { emptyAudience } from '../types';
import type { AudienceCriteria, AudienceEstimate, Campaign, RecipientChannel } from '../types';
import { CHANNEL_LABELS, RECIPIENT_STATUS_LABELS, STATUS_COLORS, STATUS_LABELS } from '../constants';
import { audienceChips, useServiceCatalog } from './AudienceBuilder';
import { ContentPreview } from './ContentPreview';
import {
    CLOSED_STATUSES, describeMoment, messageWord,
} from '../utils/campaignState';
import {
    CampaignKindMark, Chip, ChipRow, DangerButton, IconButton,
    MutedText, Note, PrimaryButton, QuietLink, TextField, Timeline, TimelineItem,
} from './shared';
// Daty w tym samym formacie, co w oknie leada - jedna implementacja na aplikację.
import { formatDateTime } from '@/modules/comms/components/shared';

/**
 * Dwie kolumny o różnej roli, nie dwie równe połówki. Po lewej to, czym kampania
 * jest (treść wiadomości, lista odbiorców) - szersza, bo to tabele i podglądy.
 * Po prawej to, co się o niej wie (kryteria, warunek, przebieg) - węższa
 * i wizualnie cichsza.
 */
const BodyGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 0 28px;
    align-items: start;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
    }
`;

const CampaignHeader = styled(ModalHeader)`
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
 * Szyna po prawej - oddzielona kreską od kolumny roboczej.
 *
 * Obie kolumny są płaskie (jedyna wyniesiona powierzchnia to treść wiadomości),
 * więc bez kreski „Odbiorcy" z lewej i „Przebieg" z prawej stały obok siebie na
 * tym samym planie i czytały się jako jeden ciąg sekcji. Kreska mówi, że to dwa
 * osobne pasma: po lewej to, czym kampania JEST, po prawej to, co się o niej wie.
 */
const Rail = styled(Column)`
    padding-left: 28px;
    border-left: 1px solid ${p => p.theme.colors.surfaceAlt};

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        padding-left: 0;
        padding-top: 16px;
        border-left: none;
        border-top: 1px solid ${p => p.theme.colors.surfaceAlt};
    }
`;

const ModalBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Podtytuł okna: czym ta kampania jest i kiedy powstała. */
const CampaignIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

/**
 * Etap jako plakietka, nie gołe słowo z kropką.
 *
 * Etap to jedyny stan widoczny niezależnie od przewinięcia i ma się czytać jako
 * PRZEDMIOT, a nie jako dopisek przy krzyżyku zamykającym. Odcień niesie
 * znaczenie (zielony = domknięte, bursztyn = czeka, czerwień = kłopot), ale
 * pigułka zostaje TŁEM I OBWÓDKĄ - wypełnienie jest zarezerwowane dla akcji
 * głównej w stopce (CLAUDE.md §2).
 */
const StatusPill = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 28px;
    padding: 0 12px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid color-mix(in srgb, ${p => p.$color} 38%, transparent);
    background: color-mix(in srgb, ${p => p.$color} 10%, transparent);
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: color-mix(in srgb, ${p => p.$color} 75%, #0f172a);
    white-space: nowrap;

    .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
        background: ${p => p.$color};
    }
`;

/**
 * „Duplikuj" jako przycisk o kształcie, nie link wtopiony w wiersz danych.
 * Dotąd stał w jednej linii z rodzajem kampanii i datą - czyli akcja udawała
 * metadaną i czytała się jak jej część.
 */
const HeaderDuplicate = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 11px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    transition: border-color ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast}, background ${p => p.theme.transitions.fast};

    svg { width: 13px; height: 13px; }

    &:hover:not(:disabled) {
        border-color: ${p => p.theme.colors.textMuted};
        background: ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.text};
    }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

/** Etap w nagłówku - jedyne miejsce widoczne niezależnie od przewinięcia. */
const HeaderStatus = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        order: 3;
        width: 100%;
        justify-content: flex-start;
    }
`;

/* ── Wynik kampanii: jedna liczba, która się ROZLICZA ───────────────────────
 *
 * Wcześniej stał tu pasek czterech komórek: „Odbiorcy 171 / wysłanych
 * wiadomości", „Koszt", „Co dalej", „Kanał". Miał trzy wady i wszystkie trzy
 * sprowadzały się do tego samego - nie dało się z niego wyczytać, ile osób
 * właściwie jest w tej kampanii:
 *
 *  1. Etykieta mówiła „Odbiorcy", liczba była LICZBĄ WYSŁANYCH WIADOMOŚCI,
 *     a podpis pod nią - jeszcze czymś trzecim. Trzy rzeczowniki na jedną cyfrę.
 *  2. W grze jest PIĘĆ populacji (pasujących, kwalifikujących się, wysłanych,
 *     nieudanych, pominiętych), a pasek pokazywał jedną i rozsypywał resztę:
 *     pominięte i nieudane lądowały prozą w szarym pudełku po prawej
 *     („Kogo ominęło: Pominiętych: 9. Nieudanych: 4."), kilkanaście centymetrów
 *     od liczby, której dotyczyły.
 *  3. Nic nigdzie nie mówiło, że 171 + 4 + 9 = 184. Użytkownik musiał dodać to
 *     sam, czytając z trzech miejsc.
 *
 * Teraz jest jeden blok, w którym liczby SIĘ SUMUJĄ i widać to gołym okiem:
 * zdanie u góry, pasek proporcji pod nim, a pod paskiem legenda, której składniki
 * dają dokładnie tę sumę. Pasek nie jest ozdobą - jest dowodem, że nic nie zginęło.
 */
const Outcome = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 20px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 14px 16px;
        gap: 10px;
    }
`;

/**
 * Zdanie, nie etykieta z liczbą. „171 z 184 wiadomości dotarło" odpowiada na
 * pytanie od razu i nie wymaga, żeby czytać podpis pod spodem i sklejać go
 * z nagłówkiem nad spodem.
 */
const OutcomeHead = styled.h3`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.textSecondary};
`;

/* Sama liczba zostaje dominantą okna - przez ROZMIAR, nie przez barwę.
   Cyfry o stałej szerokości, żeby kolejne kampanie dały się porównać wzrokiem. */
/* Koszt przy zdaniu - cichszy od niego, bo to fakt towarzyszący, nie odpowiedź. */
const CreditsNote = styled.span`
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

const OutcomeNumber = styled.strong<{ $empty?: boolean }>`
    font-size: 30px;
    line-height: 1;
    font-weight: ${p => p.theme.fontWeights.bold};
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${({ $empty, theme }) => ($empty ? theme.colors.textMuted : theme.colors.text)};
`;

type PartTone = 'ok' | 'bad' | 'muted' | 'brand';

const partColor = (tone: PartTone) =>
    tone === 'ok' ? '#22c55e'
    : tone === 'bad' ? '#ef4444'
    : tone === 'brand' ? 'var(--brand-primary)'
    : '#cbd5e1';

/* Pasek proporcji: jedna linia, w której każdy kawałek jest tak szeroki, jak
   duża jest jego część. Wysokość 8px - ma być czytelny, ale nie ma udawać
   wykresu; to podpis pod liczbą, nie druga treść. */
const Bar = styled.div`
    display: flex;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: ${p => p.theme.colors.surfaceAlt};
`;

const BarPart = styled.span<{ $tone: PartTone }>`
    background: ${p => partColor(p.$tone)};
    min-width: 3px;
`;

const Legend = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

const LegendItem = styled.span`
    display: inline-flex;
    align-items: baseline;
    gap: 7px;
    white-space: nowrap;

    strong {
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }
`;

const LegendDot = styled.span<{ $tone: PartTone }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    align-self: center;
    background: ${p => partColor(p.$tone)};
`;

/* ── Nagłówek sekcji: język z okna leada ───────────────────────────────────
 *
 * Kafelek z ikoną i nazwa pismem TEKSTOWYM. Wersaliki 11px w [textMuted] jako
 * jedyny sposób oznaczenia sekcji są w tym repozytorium wycofane (CLAUDE.md §2)
 * - powtórzone pięć razy w jednej kolumnie robią z okna formularz, w którym nic
 * nie jest przedmiotem. Tu było ich pięć: TREŚĆ WIADOMOŚCI, ODBIORCY, KRYTERIA
 * ODBIORCÓW, KOGO OMINĘŁO, PRZEBIEG.
 */
/* Podpowiedź przy nagłówku sekcji - na telefonie znika: „podgląd z przykładowymi
   danymi" łamał się tam na dwie linie obok dwuwierszowego już tytułu i wyglądał
   jak druga połowa nagłówka. */
const HeadHint = styled(MutedText)`
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        display: none;
    }
`;

const SectionHead = styled.h4`
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    text-transform: none;
    color: ${p => p.theme.colors.text};

    .spacer { flex: 1; }
`;

/**
 * Nagłówek sekcji, który się rozwija.
 *
 * Kryteria odbiorców to OSIEM chipów - czyli osiem osobnych rzeczy do
 * przeczytania - a odpowiadają na pytanie zadawane raz, przy zakładaniu
 * kampanii. Później liczy się, ILU ludzi to objęło (blok u góry), nie jakim
 * filtrem ich wybrano. Domyślnie schowane, na wyciągnięcie jednego kliknięcia.
 */
const SectionToggle = styled.button<{ $open: boolean }>`
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};
    text-align: left;
    cursor: pointer;

    .count {
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }

    .chev {
        margin-left: auto;
        flex-shrink: 0;
        width: 15px;
        height: 15px;
        color: ${p => p.theme.colors.textMuted};
        transform: ${p => (p.$open ? 'rotate(180deg)' : 'none')};
        transition: transform ${p => p.theme.transitions.normal};
    }

    &:hover .chev { color: ${p => p.theme.colors.text}; }
`;

const SectionIcon = styled.span<{ $tone: 'brand' | 'slate' | 'amber' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: ${p => p.theme.radii.md};

    svg { width: 14px; height: 14px; }

    ${({ $tone }) =>
        $tone === 'brand'
            ? 'background: color-mix(in srgb, var(--brand-primary) 12%, transparent); color: var(--brand-primary);'
            : $tone === 'amber'
                ? 'background: #fef3c7; color: #b45309;'
                : 'background: #f1f5f9; color: #64748b;'}
`;

/**
 * Powierzchnia tematu okna - dokładnie JEDNA na widok (CLAUDE.md §2:
 * wyniesienie niesie temat). Dostaje ją treść wiadomości, bo to jedyna rzecz
 * w tym oknie, którą zobaczy klient; reszta to dane o wysyłce.
 *
 * Wcześniej wyniesione były wszystkie panele naraz (ramka + biel), a trzy panele
 * po prawej miały dodatkowo własne szare pudełka - czyli sześć powierzchni
 * o tej samej wadze i żadnego tematu.
 */
const RaisedPanel = styled.section`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    border: 1px solid #e6edf6;
    border-radius: ${p => p.theme.radii.xl};
    background: linear-gradient(160deg, #ffffff 0%, #fbfcfe 100%);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 14px 30px -20px rgba(15, 23, 42, 0.45);

    &::before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        right: -1px;
        height: 3px;
        border-radius: ${p => p.theme.radii.xl} ${p => p.theme.radii.xl} 0 0;
        background: linear-gradient(90deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 55%, #ffffff) 100%);
    }
`;

/** Sekcja płaska: leży na tle, rozdziela ją kreska - jak szyna w oknie leada. */
const FlatSection = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding-bottom: 16px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};

    &:last-child { border-bottom: none; padding-bottom: 0; }
`;

/**
 * Nazwisko z adresem pod kursorem.
 *
 * W tabeli stoi imię i nazwisko, bo tylko po nich da się rozpoznać klienta -
 * „693 004 221" nie mówi nikomu nic, a przy nieudanej wysyłce właśnie od
 * rozpoznania człowieka zaczyna się reakcja. Numer jest nadal potrzebny (żeby
 * oddzwonić), ale dopiero w drugim kroku, więc czeka w dymku.
 */
const NameCell = styled.span`
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: default;
    /* Nazwisko w jednej linii - „Katarzyna Dąbrowska" łamane na dwie robiło
       z wiersza listy dwuwierszowy blok i rozjeżdżało rytm tabeli. */
    white-space: nowrap;

    .tip {
        position: absolute;
        top: calc(100% + 7px);
        left: 0;
        z-index: 5;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 10px;
        border-radius: ${p => p.theme.radii.md};
        background: #0f172a;
        color: #f8fafc;
        font-size: 12px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        box-shadow: 0 10px 24px -12px rgba(15, 23, 42, 0.6);
        opacity: 0;
        transform: translateY(-3px);
        pointer-events: none;
        transition: opacity ${p => p.theme.transitions.fast}, transform ${p => p.theme.transitions.fast};
    }

    .tip svg { width: 12px; height: 12px; opacity: 0.75; }

    /* Dziobek - ten sam zabieg co w dymkach kartoteki klienta. */
    .tip::after {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 14px;
        border: 5px solid transparent;
        border-bottom-color: #0f172a;
    }

    &:hover .tip, &:focus-visible .tip {
        opacity: 1;
        transform: translateY(0);
    }
`;

/** Bez nazwiska zostaje sam adres - i wtedy to on jest nazwą wiersza. */
const NoName = styled.span`
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

/**
 * Powód niepowodzenia przy wierszu, nie w zbiorczej liczbie.
 *
 * „4 nieudane" mówi, ILE, ale nie mówi DO KOGO ani DLACZEGO - a bez tego nie da
 * się nic z tym zrobić. Komunikat błędu z bramki stoi więc pod nazwiskiem,
 * w czerwieni, i jest widoczny bez najeżdżania na cokolwiek.
 */
const FailReason = styled.span`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    font-size: 12px;
    color: ${p => p.theme.colors.error};

    svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

/**
 * Tabela odbiorców. Ten sam krój co tabela wyceny w oknie leada: nagłówki
 * wersalikami, cyfry o stałej szerokości, kreski tylko między wierszami.
 */
const RecipientsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
        text-align: left;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
        padding: 0 8px 6px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
    }

    td {
        padding: 8px;
        border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.textSecondary};
        vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }

    td.address {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
        overflow-wrap: anywhere;
    }
    td.channel { width: 24px; color: ${p => p.theme.colors.textMuted}; }
    td.channel svg { width: 14px; height: 14px; display: block; }
    td.when { white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.retry { width: 32px; text-align: right; }
`;

/** Lista odbiorców bywa długa - przewija się w miejscu, nie rozpycha okna. */
const TableScroll = styled.div`
    max-height: 320px;
    overflow-y: auto;
    margin: 0 -4px;
    /* Zapas u dołu na dymek z numerem przy OSTATNIM wierszu: przewijanie w pionie
       przycina wszystko poza ramką, a dopełnienie należy do obszaru
       przewijanego, więc dymek ostatniego wiersza ma się gdzie zmieścić. */
    padding: 0 4px 40px;
`;

const RetryButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: ${p => p.theme.radii.sm};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    padding: 0;
    transition: all ${p => p.theme.transitions.fast};

    svg { width: 13px; height: 13px; }
    &:hover {
        border-color: ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.text};
        background: ${p => p.theme.colors.surface};
    }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const SearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

/**
 * Filtr listy odbiorców: „tylko nieudane" / „tylko pominięte".
 *
 * Blok u góry mówi, ILE ich jest - ale żeby coś z nimi zrobić, trzeba dojść do
 * tych kilku wierszy w liście liczącej setki pozycji. Szukanie po nazwisku tu
 * nie pomaga, bo nie wiadomo, czyje nazwisko wpisać; to właśnie jest pytanie.
 *
 * Ten sam chip co filtr okresu w zleceniach zbiorczych: pigułka, tło i obwódka
 * przy włączeniu, nigdy wypełnienie.
 */
const FilterChip = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 13px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid ${p => (p.$active ? p.theme.colors.primary : p.theme.colors.border)};
    background: ${p => (p.$active ? 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' : 'transparent')};
    font-family: inherit;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => (p.$active ? p.theme.colors.primary : p.theme.colors.textSecondary)};
    white-space: nowrap;
    cursor: pointer;
    transition: border-color ${p => p.theme.transitions.fast}, background ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    .n {
        font-variant-numeric: tabular-nums;
        color: ${p => (p.$active ? p.theme.colors.primary : p.theme.colors.textMuted)};
    }

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
    }
`;

const ConditionText = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: ${p => p.theme.colors.textSecondary};

    strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
`;

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

const NON_RETRYABLE = new Set(['SENT', 'PENDING', 'EXCLUDED_MANUALLY', 'SKIPPED_OPTED_OUT']);

/** „Nie wyszło" - próbowaliśmy i się nie udało. */
const FAILED_STATUSES = new Set<string>(['FAILED', 'STOPPED']);
/** „Nie próbowaliśmy" - odfiltrowani przed wysyłką. */
const SKIPPED_STATUSES = new Set<string>([
    'SKIPPED_NO_CONSENT', 'SKIPPED_NO_ADDRESS', 'SKIPPED_FREQUENCY_CAP',
    'SKIPPED_OPTED_OUT', 'SKIPPED_NO_CREDITS', 'EXCLUDED_MANUALLY',
]);
const BULK_RETRYABLE = new Set(['FAILED', 'STOPPED', 'SKIPPED_NO_CREDITS', 'SKIPPED_FREQUENCY_CAP']);

const ELIGIBILITY_LABELS: Record<string, string> = {
    ELIGIBLE: 'Otrzyma',
    NO_CONSENT: 'Brak zgody marketingowej',
    NO_ADDRESS: 'Brak numeru / adresu',
    OPTED_OUT: 'Wypisany (STOP)',
    FREQUENCY_CAP: 'Niedawno kontaktowany',
};

/** Polska odmiana po liczbie: 1 osoba, 2-4 osoby, 5+ osób. */
function peopleWord(n: number) {
    if (n === 1) return 'osoba';
    const lastTwo = n % 100;
    const last = n % 10;
    if (lastTwo >= 12 && lastTwo <= 14) return 'osób';
    return last >= 2 && last <= 4 ? 'osoby' : 'osób';
}

/** Polska odmiana po liczbie: 1 kredyt, 2-4 kredyty, 5+ kredytów. */
function creditWord(n: number) {
    if (n === 1) return 'kredyt';
    const lastTwo = n % 100;
    const last = n % 10;
    if (lastTwo >= 12 && lastTwo <= 14) return 'kredytów';
    return last >= 2 && last <= 4 ? 'kredyty' : 'kredytów';
}

interface OutcomePart {
    key: string;
    count: number;
    label: string;
    tone: PartTone;
}

interface OutcomeSummary {
    /** Zdanie nad paskiem - liczba plus reszta zdania wokół niej. */
    value: string;
    before: string | null;
    after: string;
    parts: OutcomePart[];
    total: number;
}

/**
 * Rozliczenie kampanii na części, które SUMUJĄ SIĘ do całości.
 *
 * To jest sedno tej przebudowy: każda zwracana tu lista musi dać się dodać
 * do `total`, bo pasek i legenda pod spodem są dowodem tej sumy. Dlatego
 * „pominiętych" i „nieudanych" nie liczymy osobno gdzie indziej - są
 * składnikami tej samej całości co „dostarczone".
 */
function summarizeOutcome(c: Campaign, estimate: AudienceEstimate | undefined): OutcomeSummary {
    const projection = c.status === 'DRAFT' || c.status === 'SCHEDULED';

    if (projection) {
        if (!estimate) {
            return { value: '—', before: null, after: 'liczymy odbiorców…', parts: [], total: 0 };
        }
        // Tu odpowiadamy na pytanie, którego stary pasek nie zadawał w ogóle:
        // ilu klientów PASUJE do kryteriów, a mimo to nic nie dostanie i dlaczego.
        // Ta różnica bywa spora (tu: 13 z 197) i dotąd nie było jej w oknie nigdzie.
        const lost: OutcomePart[] = [
            { key: 'optedOut', count: estimate.optedOut, label: 'wypisani', tone: 'muted' },
            { key: 'noConsent', count: estimate.noConsent, label: 'bez zgody', tone: 'muted' },
            { key: 'noAddress', count: estimate.noAddress, label: 'bez numeru', tone: 'muted' },
            { key: 'cap', count: estimate.frequencyCapped, label: 'niedawno pisaliśmy', tone: 'muted' },
            { key: 'excluded', count: estimate.excludedManually, label: 'wykluczeni ręcznie', tone: 'muted' },
        ].filter((part) => part.count > 0);

        return {
            value: String(estimate.eligible),
            before: null,
            after: lost.length > 0
                ? `${peopleWord(estimate.eligible)} z ${estimate.matched} pasujących dostanie wiadomość`
                : `${peopleWord(estimate.eligible)} dostanie wiadomość`,
            parts: [
                { key: 'eligible', count: estimate.eligible, label: 'dostanie', tone: 'brand' },
                ...lost,
            ],
            total: estimate.matched,
        };
    }

    const parts: OutcomePart[] = [
        { key: 'sent', count: c.recipientsSent, label: 'dostarczone', tone: 'ok' },
        { key: 'failed', count: c.recipientsFailed, label: 'nieudane', tone: 'bad' },
        { key: 'skipped', count: c.recipientsSkipped, label: 'pominięte', tone: 'muted' },
    ].filter((part) => part.count > 0);

    // `recipientsTotal` bywa zerowe na starszych kampaniach - wtedy całością jest
    // suma części, żeby pasek nadal się domykał.
    const total = c.recipientsTotal || parts.reduce((sum, part) => sum + part.count, 0);

    if (total === 0) {
        return { value: '—', before: null, after: 'lista odbiorców powstanie przy wysyłce', parts: [], total: 0 };
    }

    if (c.status === 'SENDING') {
        return {
            value: String(c.recipientsSent),
            before: null,
            after: `z ${total} — wysyłka trwa`,
            parts,
            total,
        };
    }

    return {
        value: String(c.recipientsSent),
        before: null,
        after: c.recipientsSent === total
            ? `${messageWord(c.recipientsSent)} dotarło do wszystkich`
            : `z ${total} ${messageWord(total)} dotarło`,
        parts,
        total,
    };
}

type PendingAction = 'stop' | 'cancel' | 'delete' | 'send' | null;

export interface CampaignDetailModalProps {
    campaignId: string;
    onClose: () => void;
    /** Wywoływane po usunięciu kampanii - okno jest wtedy już zamknięte. */
    onDeleted?: () => void;
}

export function CampaignDetailModal({ campaignId, onClose, onDeleted }: CampaignDetailModalProps) {
    const navigate = useNavigate();
    const { campaign } = useCampaign(campaignId);
    const { recipients } = useCampaignRecipients(campaignId);
    const { stats } = useCampaignStats();
    const { serviceNames } = useServiceCatalog();

    const cancel = useCancelCampaign();
    const stop = useStopCampaign();
    const pause = usePauseCampaign();
    const activate = useActivateCampaign();
    const archive = useArchiveCampaign();
    const duplicate = useDuplicateCampaign();
    const remove = useDeleteCampaign();
    const schedule = useScheduleCampaign();
    const retryRecipient = useRetryRecipient(campaignId);
    const retryAllFailed = useRetryAllFailed(campaignId);

    const [search, setSearch] = useState('');
    /** null = bez zawężenia; inaczej pokazujemy wyłącznie nieudane albo pominięte. */
    const [onlyStatus, setOnlyStatus] = useState<'failed' | 'skipped' | null>(null);
    // Schowane domyślnie - patrz komentarz przy [SectionToggle].
    const [showCriteria, setShowCriteria] = useState(false);
    const [pending, setPending] = useState<PendingAction>(null);

    /*
     * Prognoza odbiorców tylko dla kampanii, która jeszcze nie ruszyła. Hook
     * wołany jest bezwarunkowo (reguły hooków), więc przed przyjściem kampanii
     * dostaje puste kryteria - zapytanie i tak nikomu wtedy nie służy.
     */
    const projectionAudience: AudienceCriteria = campaign?.audience ?? emptyAudience();
    const projectionChannel: RecipientChannel = campaign?.channel === 'EMAIL' ? 'EMAIL' : 'SMS';
    const { estimate } = useAudienceEstimate({
        audience: projectionAudience,
        channel: projectionChannel,
        smsTemplate: campaign?.smsTemplate ?? undefined,
        // Kampania automatyczna: pierwszym sitem jest warunek, nie kryteria odbiorców.
        trigger: campaign?.kind === 'AUTOMATIC' && campaign.trigger
            ? {
                serviceIds: campaign.trigger.serviceIds,
                afterDays: campaign.trigger.afterDays,
                onlyIfNoVisitSince: campaign.trigger.onlyIfNoVisitSince,
                horizonDays: 30,
            }
            : null,
    });

    /* Nieudane to FAILED i STOPPED; pominięte to cała rodzina SKIPPED_* oraz
       ręczne wykluczenie. Liczymy z listy, a nie z liczników kampanii, bo to te
       wiersze filtr ma pokazać. */
    const failedCount = useMemo(
        () => recipients.filter((r) => FAILED_STATUSES.has(r.status)).length,
        [recipients],
    );
    const skippedCount = useMemo(
        () => recipients.filter((r) => SKIPPED_STATUSES.has(r.status)).length,
        [recipients],
    );

    const filteredRecipients = useMemo(() => {
        const query = search.trim().toLowerCase();
        return recipients.filter((item) => {
            if (onlyStatus === 'failed' && !FAILED_STATUSES.has(item.status)) return false;
            if (onlyStatus === 'skipped' && !SKIPPED_STATUSES.has(item.status)) return false;
            if (!query) return true;
            return item.address.toLowerCase().includes(query)
                || [item.firstName, item.lastName].filter(Boolean).join(' ').toLowerCase().includes(query);
        });
    }, [recipients, search, onlyStatus]);

    const chips = useMemo(
        () => (campaign ? audienceChips(campaign.audience, serviceNames) : []),
        [campaign, serviceNames],
    );

    if (!campaign) return null;
    const c: Campaign = campaign;

    const isProjection = c.status === 'DRAFT' || c.status === 'SCHEDULED';
    const closed = CLOSED_STATUSES.has(c.status);
    const failed = c.recipientsFailed;
    const hasRetryable = recipients.some((r) => BULK_RETRYABLE.has(r.status));

    // Kredytów nie starczy na to, co ta kampania ma jeszcze wysłać.
    const plannedCredits = isProjection ? estimate?.estimatedCredits ?? null : null;
    const creditsShort =
        plannedCredits != null && stats != null && plannedCredits > stats.smsCreditsAvailable;

    const outcome = summarizeOutcome(c, estimate);
    const creditsNote = isProjection
        ? plannedCredits != null ? `szacunkowo ${plannedCredits} ${creditWord(plannedCredits)}` : null
        : c.creditsSpent > 0 ? `${c.creditsSpent} ${creditWord(c.creditsSpent)}` : null;

    const openEditor = () => navigate(`/campaigns/${c.id}/edit`);

    const runDuplicate = async () => {
        const copy = await duplicate.mutateAsync(c.id);
        navigate(`/campaigns/${(copy as Campaign).id}/edit`);
    };

    const confirmPending = async () => {
        if (pending === 'stop') await stop.mutateAsync(c.id);
        if (pending === 'cancel') await cancel.mutateAsync(c.id);
        if (pending === 'send') {
            if (c.kind === 'AUTOMATIC') await activate.mutateAsync(c.id);
            else await schedule.mutateAsync({ id: c.id, scheduledAt: null });
        }
        if (pending === 'delete') {
            await remove.mutateAsync(c.id);
            setPending(null);
            onClose();
            onDeleted?.();
            return;
        }
        setPending(null);
    };

    return (
        <>
            <ModalShell isOpen onClose={onClose} maxWidth="1040px">
                <CampaignHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{c.name}</ModalTitle>
                        {/* Drogi poboczne stoją przy tożsamości kampanii, nie w stopce:
                            w stopce konkurowałyby wagą z jedyną akcją, która ma tam stać. */}
                        <CampaignIdentity>
                            <CampaignKindMark kind={c.kind} />
                            {CHANNEL_LABELS[c.channel]}
                            {/* Data utworzenia zeszła stąd do „Przebiegu", a „Duplikuj"
                                pod plakietkę etapu: ten wiersz niesie już tylko fakty. */}

                        </CampaignIdentity>
                    </ModalTitleGroup>
                    <HeaderStatus>
                        <StatusPill $color={STATUS_COLORS[c.status]}>
                            <span className="dot" />
                            {STATUS_LABELS[c.status]}
                        </StatusPill>
                        {/* Pod plakietką, nie w wierszu tożsamości: „Duplikuj" jest
                            akcją, a tamten wiersz niesie same fakty o kampanii. */}
                        <HeaderDuplicate type="button" onClick={runDuplicate} disabled={duplicate.isPending}>
                            <Copy /> Duplikuj
                        </HeaderDuplicate>
                    </HeaderStatus>
                    <CloseBtn onClick={onClose} />
                </CampaignHeader>

                <ModalContent>
                    <ModalBody>
                        {/* Notki nad treścią pojawiają się wyłącznie wtedy, gdy jest
                            czego wyjaśniać. Cisza też jest informacją i nie zajmuje
                            miejsca - kampania, która idzie zgodnie z planem, nie
                            dostaje nad sobą ani jednego paska. */}
                        {failed > 0 && (
                            /* Baner mówi, CO się stało; ponowienie stoi w stopce
                               jako akcja główna okna. Dotąd „Ponów nieudane" było
                               w oknie TRZY razy - tu, w nagłówku listy odbiorców
                               i w stopce - a trzy kopie jednej akcji czytają się
                               jak trzy różne akcje. */
                            <Note $tone="error">
                                <AlertTriangle />
                                <span>
                                    <strong>{failed}</strong> {messageWord(failed)} nie dotarło do odbiorców.
                                </span>
                            </Note>
                        )}

                        {creditsShort && (
                            <Note $tone="warn">
                                <Coins />
                                <span>
                                    Ta wysyłka zużyje <strong>{plannedCredits}</strong> kredytów, a na koncie
                                    jest ich <strong>{stats?.smsCreditsAvailable}</strong>.
                                </span>
                                <span className="spacer" />
                                <QuietLink type="button" onClick={() => navigate('/settings?tab=credits')}>
                                    Doładuj
                                </QuietLink>
                            </Note>
                        )}

                        {c.status === 'COMPLETED' && failed === 0 && (
                            <Note $tone="ok">
                                <CheckCircle2 />
                                <span>
                                    Wysłano <strong>{c.recipientsSent}</strong> {messageWord(c.recipientsSent)}
                                    {c.completedAt && <>, zakończono {formatDateTime(c.completedAt)}</>}.
                                </span>
                            </Note>
                        )}

                        {/* Wynik: jedna liczba i jej rozliczenie. Zob. komentarz przy [Outcome]. */}
                        <Outcome>
                            <OutcomeHead>
                                <OutcomeNumber $empty={outcome.value === '—'}>{outcome.value}</OutcomeNumber>
                                <span>
                                    {outcome.after}
                                    {/* Koszt w nawiasie przy zdaniu, nie w osobnej stopce: to ta
                                        sama odpowiedź („ile to było"), tylko w innej walucie.
                                        Kanał i moment zakończenia wypadły stąd zupełnie - kanał
                                        stoi w wierszu tożsamości pod tytułem, a daty w „Przebiegu". */}
                                    {creditsNote && <CreditsNote> ({creditsNote})</CreditsNote>}
                                </span>
                            </OutcomeHead>

                            {outcome.parts.length > 0 && (
                                <>
                                    <Bar>
                                        {outcome.parts.map((part) => (
                                            <BarPart
                                                key={part.key}
                                                $tone={part.tone}
                                                style={{ flexGrow: part.count }}
                                                title={`${part.count} ${part.label}`}
                                            />
                                        ))}
                                    </Bar>
                                    <Legend>
                                        {outcome.parts.map((part) => (
                                            <LegendItem key={part.key}>
                                                <LegendDot $tone={part.tone} />
                                                <strong>{part.count}</strong>
                                                <span>{part.label}</span>
                                            </LegendItem>
                                        ))}
                                    </Legend>
                                </>
                            )}

                        </Outcome>

                        <BodyGrid>
                            <Column>
                                {/* Jedyna wyniesiona sekcja w oknie: to, co zobaczy klient. */}
                                <RaisedPanel>
                                    <SectionHead>
                                        <SectionIcon $tone="brand">
                                            {c.channel === 'EMAIL' ? <Mail /> : <MessageSquare />}
                                        </SectionIcon>
                                        Treść wiadomości
                                        <HeadHint>podgląd z przykładowymi danymi</HeadHint>
                                    </SectionHead>
                                    <ContentPreview
                                        hideHeading
                                        compact
                                        smsTemplate={c.smsTemplate}
                                        emailSubject={c.emailSubject}
                                        emailBody={c.emailBody}
                                    />
                                </RaisedPanel>

                                <FlatSection>
                                    <SectionHead>
                                        <SectionIcon $tone="slate"><Users /></SectionIcon>
                                        {isProjection ? 'Kto pasuje do kryteriów' : 'Odbiorcy'}
                                        <span className="spacer" />
                                        {/* Całość listy, nie długość wczytanej strony. Nagłówek
                                            pokazywał dotąd `recipients.length`, czyli „8" przy
                                            kampanii do 184 osób. */}
                                        {outcome.total > 0 && (
                                            <MutedText style={{ textTransform: 'none', letterSpacing: 0 }}>
                                                {outcome.total}
                                            </MutedText>
                                        )}
                                    </SectionHead>

                                    {isProjection && (
                                        <MutedText>
                                            Stan na dziś - ostateczną listę wyliczymy w dniu wysyłki.
                                            Ręczne wykluczenia zostaną zachowane.
                                        </MutedText>
                                    )}

                                    {recipients.length > 0 ? (
                                        <>
                                            <SearchRow>
                                                <TextField
                                                    style={{ flex: '1 1 240px', maxWidth: 320 }}
                                                    placeholder="Szukaj po nazwisku lub numerze…"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                                {/* Chipy pojawiają się tylko wtedy, gdy jest co
                                                    filtrować - filtr na zero wierszy to obietnica
                                                    bez pokrycia. */}
                                                {failedCount > 0 && (
                                                    <FilterChip
                                                        type="button"
                                                        $active={onlyStatus === 'failed'}
                                                        aria-pressed={onlyStatus === 'failed'}
                                                        onClick={() => setOnlyStatus((v) => (v === 'failed' ? null : 'failed'))}
                                                    >
                                                        Tylko nieudane
                                                        <span className="n">{failedCount}</span>
                                                    </FilterChip>
                                                )}
                                                {skippedCount > 0 && (
                                                    <FilterChip
                                                        type="button"
                                                        $active={onlyStatus === 'skipped'}
                                                        aria-pressed={onlyStatus === 'skipped'}
                                                        onClick={() => setOnlyStatus((v) => (v === 'skipped' ? null : 'skipped'))}
                                                    >
                                                        Tylko pominięte
                                                        <span className="n">{skippedCount}</span>
                                                    </FilterChip>
                                                )}
                                            </SearchRow>
                                            <TableScroll>
                                                <RecipientsTable>
                                                    <thead>
                                                        <tr>
                                                            <th />
                                                            <th>Klient</th>
                                                            <th>Status</th>
                                                            <th>Wysłano</th>
                                                            <th />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredRecipients.map((r) => {
                                                            const name = [r.firstName, r.lastName]
                                                                .filter(Boolean).join(' ').trim();
                                                            return (
                                                            <tr key={r.id}>
                                                                <td className="channel">
                                                                    {r.channel === 'SMS' ? <MessageSquare /> : <Mail />}
                                                                </td>
                                                                <td>
                                                                    {name ? (
                                                                        <NameCell tabIndex={0}>
                                                                            {name}
                                                                            <span className="tip" role="tooltip">
                                                                                {r.channel === 'SMS' ? <MessageSquare /> : <Mail />}
                                                                                {r.address}
                                                                            </span>
                                                                        </NameCell>
                                                                    ) : (
                                                                        /* Kartoteka „na numer" albo usunięta - wtedy
                                                                           adres JEST nazwą wiersza. */
                                                                        <NoName>{r.address}</NoName>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {RECIPIENT_STATUS_LABELS[r.status]}
                                                                    {r.errorMessage && (
                                                                        <FailReason>
                                                                            <AlertTriangle />
                                                                            {r.errorMessage}
                                                                        </FailReason>
                                                                    )}
                                                                </td>
                                                                <td className="when">
                                                                    {r.sentAt ? formatDateTime(r.sentAt) : '-'}
                                                                </td>
                                                                <td className="retry">
                                                                    {!NON_RETRYABLE.has(r.status) && (
                                                                        <RetryButton
                                                                            type="button"
                                                                            title="Ponów wysyłkę"
                                                                            aria-label="Ponów wysyłkę"
                                                                            disabled={retryRecipient.isPending}
                                                                            onClick={() => retryRecipient.mutate(r.id)}
                                                                        >
                                                                            <RefreshCw />
                                                                        </RetryButton>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </RecipientsTable>
                                            </TableScroll>
                                        </>
                                    ) : estimate && estimate.sample.length > 0 ? (
                                        <TableScroll>
                                            <RecipientsTable>
                                                <thead>
                                                    <tr>
                                                        <th>Klient</th>
                                                        <th>{projectionChannel === 'SMS' ? 'Telefon' : 'E-mail'}</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {estimate.sample.map((s) => (
                                                        <tr key={s.customerId}>
                                                            <td className="address">
                                                                {[s.firstName, s.lastName].filter(Boolean).join(' ') || 'Klient'}
                                                            </td>
                                                            <td>
                                                                {(projectionChannel === 'SMS' ? s.phone : s.email) ?? '-'}
                                                            </td>
                                                            <td>{ELIGIBILITY_LABELS[s.eligibility] ?? s.eligibility}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </RecipientsTable>
                                        </TableScroll>
                                    ) : (
                                        <MutedText>Lista odbiorców powstanie w momencie wysyłki.</MutedText>
                                    )}
                                </FlatSection>
                            </Column>

                            {/* Materiał pomocniczy: cofnięty o plan, bez ramki, na tle strony. */}
                            <Rail>
                                {c.kind === 'AUTOMATIC' && c.trigger && (
                                    <FlatSection>
                                        <SectionHead>
                                            <SectionIcon $tone="amber"><CalendarClock /></SectionIcon>
                                            Kiedy wychodzi
                                        </SectionHead>
                                        <ConditionText>
                                            <strong>{c.trigger.afterDays} dni</strong> po usłudze{' '}
                                            <strong>
                                                {c.trigger.serviceIds
                                                    .map((sid) => serviceNames.get(sid) ?? 'usługa')
                                                    .join(', ') || '-'}
                                            </strong>
                                            , o {c.trigger.sendTime}
                                            {c.trigger.onlyIfNoVisitSince &&
                                                ', z pominięciem klientów, którzy byli w międzyczasie'}
                                            .
                                        </ConditionText>
                                    </FlatSection>
                                )}

                                <FlatSection>
                                    <SectionToggle
                                        type="button"
                                        $open={showCriteria}
                                        aria-expanded={showCriteria}
                                        onClick={() => setShowCriteria((v) => !v)}
                                    >
                                        <SectionIcon $tone="slate"><Users /></SectionIcon>
                                        Kryteria odbiorców
                                        {chips.length > 0 && <span className="count">{chips.length}</span>}
                                        <ChevronDown className="chev" />
                                    </SectionToggle>
                                    {showCriteria && (
                                        chips.length > 0 ? (
                                            <ChipRow>{chips.map((ch) => <Chip key={ch}>{ch}</Chip>)}</ChipRow>
                                        ) : (
                                            <MutedText>Bez zawężeń - wszyscy klienci ze zgodą.</MutedText>
                                        )
                                    )}
                                </FlatSection>

                                {/* „Kogo ominęło" usunięte: pominięci i nieudani są teraz
                                    składnikami rozliczenia u góry, obok liczby, której
                                    dotyczą - a nie prozą w osobnym pudełku po drugiej
                                    stronie okna. */}

                                {/* Przebieg jako ciąg zdarzeń, nie lista zdań z datą. */}
                                <FlatSection>
                                    <SectionHead>
                                        <SectionIcon $tone="slate"><CalendarClock /></SectionIcon>
                                        Przebieg
                                    </SectionHead>
                                    <Timeline>
                                        <TimelineItem $color={STATUS_COLORS.DRAFT}>
                                            <strong>Utworzono</strong>
                                            {formatDateTime(c.createdAt)}
                                        </TimelineItem>
                                        {c.status === 'SCHEDULED' && (
                                            <TimelineItem $color={STATUS_COLORS.SCHEDULED}>
                                                <strong>Wyjdzie {describeMoment(c.scheduledAt)}</strong>
                                                {c.scheduledAt ? formatDateTime(c.scheduledAt) : 'najbliższym przebiegiem'}
                                            </TimelineItem>
                                        )}
                                        {c.startedAt && (
                                            <TimelineItem $color={STATUS_COLORS.SENDING}>
                                                <strong>Ruszyła wysyłka</strong>
                                                {formatDateTime(c.startedAt)}
                                            </TimelineItem>
                                        )}
                                        {c.completedAt && (
                                            <TimelineItem $color={STATUS_COLORS[c.status]}>
                                                <strong>Zakończono</strong>
                                                {formatDateTime(c.completedAt)}
                                            </TimelineItem>
                                        )}
                                    </Timeline>
                                </FlatSection>
                            </Rail>
                        </BodyGrid>
                    </ModalBody>
                </ModalContent>

                <ModalFooter>
                    {/*
                        Po lewej, z dala od akcji głównej, stoi ruch nieodwracalny albo
                        odwrotny do niej - dwie akcje o przeciwnych skutkach nie mają
                        prawa sąsiadować pod kursorem.
                    */}
                    {c.status === 'DRAFT' && (
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setPending('delete')}
                            disabled={remove.isPending}
                        >
                            <Trash2 /> Usuń szkic
                        </DangerButton>
                    )}
                    {c.status === 'SCHEDULED' && (
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setPending('cancel')}
                        >
                            <Square /> Anuluj wysyłkę
                        </DangerButton>
                    )}
                    {c.status === 'SENDING' && (
                        <DangerButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => setPending('stop')}
                        >
                            <Square /> Zatrzymaj wysyłkę
                        </DangerButton>
                    )}
                    {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                        <IconButton
                            type="button"
                            style={{ marginRight: 'auto' }}
                            onClick={() => archive.mutate(c.id)}
                            disabled={archive.isPending}
                        >
                            Archiwizuj
                        </IconButton>
                    )}

                    {/*
                        Akcja główna wynika ze stanu kampanii - w tej kolejności:

                        1. są nieudane wiadomości → „Ponów nieudane". Ktoś nie dostał
                           tego, co miał dostać; to bije wszystko inne, także etap.
                        2. szkic → „Dokończ kampanię". Szkic nie wyśle się sam.
                        3. zaplanowana → „Wyślij teraz". Edycja stoi obok, jako druga.
                        4. działa → „Wstrzymaj"; wstrzymana → „Wznów".
                        5. w trakcie wysyłki → nic. Właściwym ruchem jest poczekać,
                           a przycisk, który to udaje, tylko zaprasza do klikania.
                        6. zamknięta → „Duplikuj i wyślij ponownie", czyli jedyne, co
                           da się jeszcze z tą kampanią zrobić.

                        Poza akcją główną stopka niesie najwyżej jeden przycisk.
                    */}
                    {failed > 0 && hasRetryable ? (
                        <PrimaryButton
                            type="button"
                            onClick={() => retryAllFailed.mutate()}
                            disabled={retryAllFailed.isPending}
                        >
                            <RefreshCw /> Ponów nieudane
                        </PrimaryButton>
                    ) : c.status === 'DRAFT' ? (
                        <PrimaryButton type="button" onClick={openEditor}>
                            <Pencil /> Dokończ kampanię
                        </PrimaryButton>
                    ) : c.status === 'SCHEDULED' ? (
                        <>
                            <IconButton type="button" onClick={openEditor}>
                                <Pencil /> Edytuj
                            </IconButton>
                            <PrimaryButton type="button" onClick={() => setPending('send')}>
                                <Send /> Wyślij teraz
                            </PrimaryButton>
                        </>
                    ) : c.status === 'ACTIVE' ? (
                        <>
                            <IconButton type="button" onClick={openEditor}>
                                <Pencil /> Edytuj
                            </IconButton>
                            <PrimaryButton
                                type="button"
                                onClick={() => pause.mutate(c.id)}
                                disabled={pause.isPending}
                            >
                                <Pause /> Wstrzymaj
                            </PrimaryButton>
                        </>
                    ) : c.status === 'PAUSED' ? (
                        <>
                            <IconButton type="button" onClick={openEditor}>
                                <Pencil /> Edytuj
                            </IconButton>
                            <PrimaryButton
                                type="button"
                                onClick={() => activate.mutate(c.id)}
                                disabled={activate.isPending}
                            >
                                <Play /> Wznów
                            </PrimaryButton>
                        </>
                    ) : closed ? (
                        <PrimaryButton type="button" onClick={runDuplicate} disabled={duplicate.isPending}>
                            <Copy /> Wyślij ponownie
                        </PrimaryButton>
                    ) : null}

                    <IconButton type="button" onClick={onClose}>Zamknij</IconButton>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={pending !== null}
                variant={pending === 'send' ? 'warning' : 'danger'}
                title={
                    pending === 'stop' ? 'Zatrzymać wysyłkę?'
                    : pending === 'cancel' ? 'Anulować kampanię?'
                    : pending === 'delete' ? 'Usunąć ten szkic?'
                    : c.kind === 'AUTOMATIC' ? 'Aktywować kampanię?'
                    : c.scheduledAt ? 'Wysłać teraz, z pominięciem terminu?'
                    : 'Wysłać kampanię teraz?'
                }
                message={
                    pending === 'stop'
                        ? 'Wiadomości, które jeszcze nie wyszły, nie zostaną wysłane. Wysłanych nie da się cofnąć.'
                    : pending === 'cancel'
                        ? 'Kampania nie zostanie wysłana. Możesz ją później zduplikować.'
                    : pending === 'delete'
                        ? `Szkic „${c.name}" zostanie trwale usunięty. Tej operacji nie da się cofnąć.`
                    : c.kind === 'AUTOMATIC'
                        ? `Kampania „${c.name}" zacznie działać i sama wyśle wiadomość każdemu klientowi, który spełni warunek.`
                        : `Wyślemy „${c.name}" natychmiast. Listę odbiorców wyliczymy teraz, ta operacja pobierze kredyty.`
                }
                confirmText={
                    pending === 'stop' ? 'Zatrzymaj'
                    : pending === 'cancel' ? 'Anuluj kampanię'
                    : pending === 'delete' ? 'Usuń'
                    : c.kind === 'AUTOMATIC' ? 'Aktywuj'
                    : 'Wyślij teraz'
                }
                cancelText="Wróć"
                onConfirm={confirmPending}
                onCancel={() => setPending(null)}
            />
        </>
    );
}
