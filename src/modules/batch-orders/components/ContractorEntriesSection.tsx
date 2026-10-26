// src/modules/batch-orders/components/ContractorEntriesSection.tsx
//
// Karta kontrahenta w wyglądzie sprzed przebudowy z 25.09 - na telefonie i na
// komputerze. Biznes wolał dawny układ (stos kart, każda z własnym okresem i listą
// aut), więc wraca WYGLĄD, a logika zostaje nowa:
//   - kliknięcie w auto otwiera okno edycji (dawne EntryFormModal) - dawniej wiersz nic nie robił,
//     od czego zaczęło się zgłoszenie „nie da się edytować cen";
//   - rozliczone auto otwiera się do odczytu, a „Popraw auto" odblokowuje je do korekty
//     dopiero razem z zapisem zmian (dawniej samo kliknięcie zdejmowało rozliczenie
//     i „Anuluj" zostawiał korektę, którą następne zestawienie wysyłało drugi raz);
//   - zestawienie, historia i PDF to te same okna co w nowym widoku;
//   - rozliczone auta są zawsze na liście (pod nierozliczonymi, z zieloną poświatą
//     i ikoną z wyjaśnieniem pod dotknięciem) - przełącznik „Pokaż rozliczone” chował
//     je domyślnie i na telefonie nikt nie wiedział, gdzie zniknęły auta z okresu.
import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { applyFloatingPlacement } from '@/common/utils/floatingPlacement';
import { pluralPl } from '@/common/utils/plural';
import { useContractorEntries, useDeleteEntry } from '../hooks/useBatchOrders';
import { EntryFormModal } from './EntryFormModal';
import { BatchOrderPhotoSection } from './BatchOrderPhotoSection';
import { SettlementModal } from './SettlementModal';
import { SettlementHistoryModal } from './SettlementHistoryModal';
import { DateRangeFilter } from './DateRangeFilter';
import { TapInfo } from '@/common/components/InfoTooltip';
import { currentMonthPeriod, formatDay, monthPeriod, parseIsoDate, periodPhrase } from '../utils/period';
import { formatMoney } from '../utils/format';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchContractor, BatchOrderEntry } from '../types';
import { problemDetail } from '@/core/problem';

const Section = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    overflow: hidden;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* Wcięcie zgodne z tabelą (20px), żeby nazwa kontrahenta stała w jednej
       linii z kolumną „Data" poniżej. */
    padding: 14px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    /* Biel karty, nie szarość tła strony: wyciszone przyciski mają tło
       surfaceAlt i na szarym nagłówku były od niego nie do odróżnienia. */
    background: ${p => p.theme.colors.surface};
    gap: 12px;
    flex-wrap: wrap;

    /* Na telefonie bez zawijania: przy długiej nazwie kontrahenta „⋯" spadało
       do własnego wiersza i zostawiało pod nazwą pusty blok wysokości przycisku.
       Nazwa ma się łamać w swojej kolumnie, a nie spychać przycisk. */
    @media (max-width: 639px) {
        flex-wrap: nowrap;
        align-items: flex-start;
        padding: 14px 14px;
        gap: 10px;
    }

    /* Blok tytułu musi móc się kurczyć, inaczej długa nazwa rozpycha nagłówek. */
    > div:first-child { min-width: 0; }
`;

const ContractorName = styled.h3`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.md};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

/**
 * „Edytuj" i „Usuń" działają na kontrahencie, a nie na liście wpisów, więc stoją
 * przy jego nazwie - a nie w rzędzie akcji po prawej, gdzie sąsiadowały
 * z „Dodaj wpis" i „Rozlicz" i wyglądały jak operacje na wpisach.
 */
const ContractorTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const TitleIconBtn = styled.button<{ $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;
    -webkit-tap-highlight-color: transparent;

    svg { width: 15px; height: 15px; }

    &:hover {
        background: ${p => p.$danger ? p.theme.colors.errorLight : p.theme.colors.surfaceAlt};
        color: ${p => p.$danger ? p.theme.colors.error : p.theme.colors.text};
    }

    /* Na telefonie te dwie ikony schodzą do menu „⋯". Edycja i usunięcie
       KONTRAHENTA to akcje rzadkie (raz przy zakładaniu, potem prawie nigdy),
       a jako stale widoczne ikony zabierały cały wiersz nad tabelą - ten sam
       wiersz, na którym miały stanąć kwoty. */
    @media (max-width: 639px) {
        display: none;
    }
`;

/* NIP, osoba i telefon jako osobne elementy obok siebie, nie sklejone kropką
   (CLAUDE.md §4). */
const ContractorMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    margin-top: 2px;

    &:empty { display: none; }

    /* NIP i telefon to dane do faktury - potrzebne przy biurku, nie w hali.
       Na telefonie ten wiersz oddaje miejsce podsumowaniu okresu. */
    @media (max-width: 639px) { display: none; }
`;



/**
 * Po tę liczbę wchodzi się na ten ekran: „ile mi ten kontrahent uzbierał".
 * Dotąd stała w stopce POD wszystkimi wpisami, więc na telefonie trzeba było
 * przewinąć całą listę, żeby ją zobaczyć. Teraz stoi w nagłówku karty i przy
 * okazji zastępuje wiersz z NIP-em, więc nie kosztuje ani jednej linii więcej.
 */
const MobileMeta = styled.div`
    display: none;

    @media (max-width: 639px) {
        display: flex;
        align-items: baseline;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 3px;
        font-size: ${p => p.theme.fontSizes.xs};
        color: ${p => p.theme.colors.textMuted};
    }
`;

const MobileMetaTotal = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

/**
 * `margin-left: auto` zamiast polegania na `justify-content` nagłówka: gdy rząd
 * akcji zawinie się pod nazwę kontrahenta (tablet), bez tego lądował przy lewej
 * krawędzi i dwie sąsiadujące karty miały akcje w dwóch różnych miejscach.
 */
const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;

    /* Na telefonie NIE dostaje własnego wiersza: zostaje samo „⋯" i stoi
       w linii z nazwą kontrahenta. Cała reszta zeszła albo do menu pod „⋯",
       albo do wiersza filtrów. Wcześniej ten rząd był drugim z czterech
       wierszy sterowania, które trzeba było minąć, zanim pokazał się wpis. */
    @media (max-width: 639px) {
        align-self: flex-start;
    }
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    flex-wrap: wrap;

    /* Na telefonie to JEDYNY wiersz sterowania nad tabelą: chip okresu po lewej,
       „+ Dodaj auto" po prawej. */
    @media (max-width: 639px) {
        padding: 10px 14px;
        flex-wrap: nowrap;
    }
`;

/* Jedyna akcja karty, która ma sens z telefonem w ręce przy aucie. Reszta
   („Nowe zestawienie", „PDF", „Historia") to robota miesięczna przy biurku i siedzi
   pod „⋯". Stoi w wierszu filtrów, żeby nie otwierać własnego wiersza. */
const MobileAddEntry = styled.div`
    display: none;

    @media (max-width: 639px) {
        display: flex;
        margin-left: auto;
        flex-shrink: 0;
    }
`;

/**
 * Jeden kształt na całą aplikację: pigułka (`radii.full`), tak jak
 * `PageHeaderPrimaryButton`, `SharedButton` i chipy okresu stojące wiersz niżej.
 * Wcześniej te przyciski były prostokątami o promieniu 8px, a „⋯" kwadratem o
 * promieniu 7px - trzy języki kształtu jeden pod drugim w tej samej karcie.
 *
 * Żaden z nich nie jest WYPEŁNIONY i to jest celowe (CLAUDE.md §2). Wypełnienie
 * niesie priorytet, a krokiem następnym całego okna jest „+ Kontrahent" w
 * nagłówku strony. „+ Dodaj auto" powtarza się przy KAŻDYM kontrahencie, więc
 * wypełniony dawał trzy nasycone bloki na jedną listę - dokładnie ten remis,
 * którego reguła zabrania. Odcień zostaje i dalej niesie znaczenie: błękit =
 * główna akcja karty, zieleń = domknięcie, szarość = wydruk i archiwum.
 *
 * Jedna metryka dla wszystkich: 34px (38px pod palcem), 13px, promień pełny.
 */
const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'outline' | 'ghost' | 'success'; $mobileHide?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: ${p => p.theme.radii.full};
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    line-height: 1;
    cursor: pointer;
    white-space: nowrap;
    transition: background ${p => p.theme.transitions.fast}, border-color ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};
    -webkit-tap-highlight-color: transparent;

    svg { width: 14px; height: 14px; flex-shrink: 0; }

    @media (hover: none) and (pointer: coarse) {
        height: 38px;
    }

    @media (max-width: 639px) {
        display: ${p => p.$mobileHide ? 'none' : undefined};
        /* Bez rozciągania: szerokość niesie etykieta, nie dostępne miejsce. */
        flex: 0 0 auto;
    }

    &:disabled { opacity: 0.55; cursor: not-allowed; }

    ${p => p.$variant === 'primary' && `
        border-color: color-mix(in srgb, var(--brand-ink) 32%, transparent);
        background: color-mix(in srgb, var(--brand-ink) 10%, transparent);
        color: var(--brand-ink);
        &:hover:not(:disabled) {
            border-color: var(--brand-ink);
            background: color-mix(in srgb, var(--brand-ink) 18%, transparent);
        }
    `}
    ${p => p.$variant === 'success' && `
        /* Zieleń w tekście i delikatnej obwódce, nie miętowe tło z jaskrawą ramką. */
        border-color: rgba(21, 128, 61, 0.32);
        background: transparent;
        color: #15803d;
        &:hover:not(:disabled) { background: rgba(21, 128, 61, 0.06); border-color: rgba(21, 128, 61, 0.55); }
    `}
    ${p => p.$variant === 'danger' && `
        border-color: ${p.theme.colors.border};
        background: transparent;
        color: ${p.theme.colors.textSecondary};
        &:hover:not(:disabled) {
            border-color: #fecaca;
            background: ${p.theme.colors.errorLight};
            color: ${p.theme.colors.error};
        }
    `}
    ${p => (!p.$variant || p.$variant === 'outline' || p.$variant === 'ghost') && `
        border-color: ${p.theme.colors.border};
        background: transparent;
        color: ${p.theme.colors.textSecondary};
        &:hover:not(:disabled) {
            border-color: ${p.theme.colors.textMuted};
            background: ${p.theme.colors.surfaceAlt};
            color: ${p.theme.colors.text};
        }
    `}
`;

/* ── Mobile overflow menu ── */

/* Ta sama pigułka co reszta rzędu, tylko okrągła - kwadrat z promieniem 7px
   był jedynym takim kształtem w całej karcie. `flex: 0 0 38px`, żeby nie brał
   udziału w równym podziale szerokości razem z etykietowanymi przyciskami. */
const MoreActionsTrigger = styled.button<{ $active?: boolean }>`
    display: none;

    @media (max-width: 639px) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 38px;
        width: 38px;
        height: 38px;
        padding: 0;
        border-radius: ${p => p.theme.radii.full};
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        border: 1px solid ${p => p.$active ? 'var(--brand-ink)' : p.theme.colors.border};
        background: ${p => p.$active ? 'color-mix(in srgb, var(--brand-ink) 10%, transparent)' : 'transparent'};
        color: ${p => p.$active ? 'var(--brand-ink)' : p.theme.colors.textSecondary};
        transition: border-color ${p => p.theme.transitions.fast}, background ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};
        -webkit-tap-highlight-color: transparent;
    }
`;

/**
 * Lista pozycji, nie rząd przycisków: pozycje menu czytają się z góry na dół
 * i nie udają akcji równorzędnych temu, co zostało widoczne. Mieszczą się tu
 * akcje miesięczne (rozliczenie, wydruk, historia) i akcje na samym
 * kontrahencie (edycja, usunięcie).
 */
const MobileSecondaryPanel = styled.div<{ $open: boolean }>`
    display: none;

    @media (max-width: 639px) {
        display: ${p => p.$open ? 'flex' : 'none'};
        flex-direction: column;
        padding: 6px;
        border-bottom: 1px solid ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surfaceAlt};
    }
`;

const PanelItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-family: inherit;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: ${p => p.theme.fontWeights.medium};
    text-align: left;
    cursor: pointer;
    color: ${p => p.$danger ? p.theme.colors.error : p.theme.colors.text};
    -webkit-tap-highlight-color: transparent;

    svg { width: 16px; height: 16px; flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
    ${p => p.$danger && `svg { color: ${p.theme.colors.error}; }`}

    &:active { background: ${p => p.theme.colors.surfaceHover}; }
    &:disabled { opacity: 0.55; }
`;

const PanelDivider = styled.div`
    height: 1px;
    margin: 5px 10px;
    background: ${p => p.theme.colors.border};
`;

/* ── Table ── */
const TableWrapper = styled.div`
    width: 100%;
    overflow-x: auto;

    /* Na telefonie siedem kolumn nie ma jak się zmieścić - zamiast przewijania
       w poziomie każdy wpis staje się kartą. Zmiana jest czysto prezentacyjna:
       znaczniki tabeli zostają, więc nic nie traci semantyki ani zachowania. */
    @media (max-width: 767px) {
        overflow-x: visible;
    }
`;

/* Stałe szerokości kolumn: każda karta to osobna tabela, a przy szerokościach liczonych
   z treści „Usługi" i kwoty stały w każdej karcie gdzie indziej. */
const Table = styled.table`
    width: 100%;
    min-width: 680px;
    table-layout: fixed;
    border-collapse: collapse;
    background: ${p => p.theme.colors.surface};

    @media (max-width: 767px) {
        display: block;
        min-width: 0;
        tbody { display: block; }
        colgroup { display: none; }
    }
`;



const TableHead = styled.thead`
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};

    /* Nagłówki kolumn zastępują etykiety przy polach w karcie. */
    @media (max-width: 767px) {
        display: none;
    }
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
    padding: 12px 20px;
    text-align: ${p => p.$align ?? 'left'};
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

const Tr = styled.tr<{ $closed?: boolean }>`
    /* Wiersz otwiera edytor wpisu - to samo, co „Edytuj" w menu ⋮, tylko bez
       szukania. Kursor mówi o tym na każdej szerokości, żeby zachowanie nie
       różniło się między telefonem a biurkiem. */
    cursor: pointer;

    /* Linia w kolorze surfaceAlt, nie border: wiersze mają się rozdzielać,
       a nie być kratkownicą. Tak samo jak w tabeli Leadów. */
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    transition: background ${p => p.theme.transitions.fast};
    background: ${p => p.$closed ? 'rgba(34, 197, 94, 0.05)' : 'transparent'};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.$closed ? 'rgba(34, 197, 94, 0.09)' : p.theme.colors.surfaceHover}; }

    /* Na telefonie wpis to POZYCJA LISTY, nie rozpisana karta: dwie linie,
       które odpowiadają na „który to samochód" i „za ile". Reszta (netto,
       rozbicie na usługi z cenami, VIN, uwagi, zdjęcia) czeka w edytorze
       pod tapnięciem wiersza - tym samym, który i tak trzeba otworzyć, żeby
       cokolwiek poprawić. Dziewięć linii na wpis sprawiało, że na ekran
       wchodziły dwa wpisy i nie dało się listy przeskanować. */
    @media (max-width: 767px) {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto 36px;
        grid-template-areas:
            "veh  veh  gross menu"
            "date svc  svc   menu";
        align-items: center;
        column-gap: 8px;
        row-gap: 1px;
        padding: 9px 14px;
        cursor: pointer;
    }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
    padding: 12px 20px;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    vertical-align: middle;
    text-align: ${p => p.$align ?? 'left'};

    @media (max-width: 767px) {
        display: block;
        padding: 0;
        text-align: left;

        &[data-cell='vehicle'] { grid-area: veh; }
        &[data-cell='date'] {
            grid-area: date;
            /* Stała szerokość, bo każdy wiersz jest osobnym gridem: przy torze
               o szerokości auto „3.09.2026" i „15.09.2026" dawały dwa różne
               wcięcia i nazwy usług nie stały w jednej kolumnie. */
            width: 76px;
            flex-shrink: 0;
        }
        &[data-cell='services'] {
            grid-area: svc;
            min-width: 0;
            /* Flex, nie blok: „+2" ma stać OBOK nazwy usługi. Jako rodzeństwo
               listy blokowej lądowało w nowej linii i robiło z pozycji trzy
               wiersze zamiast dwóch. */
            display: flex;
            align-items: baseline;
            gap: 0;
        }
        &[data-cell='gross']   { grid-area: gross; text-align: right; }
        &[data-cell='menu']    { grid-area: menu; justify-self: end; }

        /* Netto i uwagi nie jadą na listę: netto jest pochodną brutta i VAT-u,
           a uwagi bywają długie. Obie rzeczy pokazuje edytor wpisu. */
        &[data-cell='net'], &[data-cell='notes'] { display: none; }

        /* Etykiety „NETTO"/„BRUTTO" przestały być potrzebne: w dwuwierszowym
           układzie została jedna kwota i stoi tam, gdzie zawsze - po prawej. */
        &[data-label]::before { content: none; }
    }
`;

/* Status auta: ikona zamiast plakietki. „ROZLICZONE” zajmowało na telefonie pół
   linii, a „KOREKTA” w kolumnie daty o stałej szerokości wjeżdżała na nazwę usługi.
   Rozliczone niesie już zielona poświata wiersza - ikona tylko je nazywa, a słowo
   jest pod dotknięciem. Korekta (auto rozliczone i odblokowane, wraca do najbliższego
   rozliczenia) ma bursztyn = „przeczytaj”, żeby nikt nie wziął jej za zwykły nowy wpis.
   Stoi PRZED nazwą auta, bo wzrok zaczyna wiersz od auta. Pole dotyku 28 px
   (32 px pod palcem), choć sam znak ma 16 px. */
const StatusMark = styled.span<{ $tone: 'settled' | 'correction' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin: -6px 0 -6px -6px;
    color: ${p => p.$tone === 'settled' ? '#16a34a' : '#d97706'};
    vertical-align: middle;

    svg { width: 16px; height: 16px; }

    @media (hover: none) and (pointer: coarse) {
        width: 32px;
        height: 32px;
        margin: -8px -2px -8px -8px;
    }
`;

const SETTLED_EXPLANATION =
    'Rozliczone: to auto jest już w zestawieniu dla kontrahenta i nie trafi do kolejnego zestawienia. ' +
    'Żeby coś w nim zmienić, dotknij wiersza i wybierz „Popraw auto”.';

const CORRECTION_EXPLANATION =
    'Korekta: to auto było już rozliczone i zostało odblokowane do poprawki. ' +
    'Trafi do najbliższego zestawienia jako korekta, pełną kwotą, a wcześniejsze zestawienie zostaje bez zmian.';

/* ── Vehicle cell ── */
const VehicleCell = styled.div`
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    line-height: 1.4;
    color: ${p => p.theme.colors.text};

    @media (max-width: 767px) {
        display: inline;
        font-size: 14px;
    }
`;

/* Na telefonie marka i tablica stoją w jednej linii - stąd `display: inline`
   na obu, zamiast tablicy w osobnym bloku pod spodem. */
const VehicleIdent = styled.div`
    @media (max-width: 767px) { display: inline; }
`;

const PlateTag = styled.span`
    display: inline-block;
    margin-top: 3px;
    padding: 3px 8px;
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    line-height: 1.5;

    /* Na telefonie tablica traci ciemne wypełnienie. Przy jednym wpisie był to
       detal, przy liście - czarny klocek w każdym wierszu, czyli piąty kolor
       na ekranie walczący o uwagę z kwotą. Że to tablica, wystarczająco mówi
       krój maszynowy i wersaliki; wypełnienie nie niosło tu żadnej informacji. */
    @media (max-width: 767px) {
        margin-top: 0;
        margin-left: 6px;
        padding: 0;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
    }
`;

const VinTag = styled.span`
    display: inline-block;
    margin-top: 2px;

    /* VIN jest długi i na liście nie służy do niczego - szuka się po tablicy.
       Zostaje w edytorze wpisu. */
    @media (max-width: 767px) { display: none; }
    margin-left: 6px;
    padding: 2px 7px;
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textMuted};
    border-radius: 5px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    line-height: 1.6;
`;

/* Liczba zdjęć przy aucie - dotąd nigdzie nie było widać, które auto ma dokumentację.
   Klik rozwija zdjęcia pod wierszem, bez otwierania okna auta. */
const PhotoCountBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
    padding: 2px 7px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
    vertical-align: middle;

    svg { width: 12px; height: 12px; }
    &:hover { color: ${p => p.theme.colors.text}; border-color: ${p => p.theme.colors.textMuted}; }
`;

/** Auto z wydania wizyty: numer wizyty jako odnośnik - tam poprawia się jego ceny. */
const VisitLink = styled(Link)`
    display: inline-flex;
    align-items: center;
    margin-left: 6px;
    padding: 2px 7px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    color: ${p => p.theme.colors.textMuted};
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    text-decoration: none;
    vertical-align: middle;
    white-space: nowrap;

    &:hover { color: ${p => p.theme.colors.text}; border-color: ${p => p.theme.colors.textMuted}; }
`;

const PhotoRow = styled.tr`
    @media (max-width: 767px) { display: block; }

    > td {
        padding: 10px 20px 14px;
        border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};

        @media (max-width: 767px) { display: block; padding: 8px 14px 12px; }
    }
`;

const PhotoRowTitle = styled.div`
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textSecondary};
`;

/* ── Services list ── */
const ServiceList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;

    /* Nazwa nad ceną, nie obok: cena dociśnięta do prawej krawędzi wąskiej
       kolumny odjeżdżała od usługi, do której należy, a przy dwóch pozycjach
       nie było już wiadomo, co z czym. Ten sam układ „tytuł + podtytuł" co
       kontakt w tabeli Leadów. */
    li {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    /* Na telefonie z listy usług zostaje pierwsza pozycja, bez ceny - rozbicie
       na kwoty jest w edytorze. Ceny per usługa w wierszu listy powtarzały to,
       co i tak sumuje kwota po prawej, i robiły z wpisu akapit. */
    @media (max-width: 767px) {
        flex-direction: row;
        li { display: none; }
        li:first-child {
            display: block;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
`;

const ServiceName = styled.span`
    font-size: 13px;
    color: ${p => p.theme.colors.text};
    font-weight: ${p => p.theme.fontWeights.medium};
    line-height: 1.35;

    @media (max-width: 767px) {
        font-size: 12px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }
`;

const ServicePrice = styled.span`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    @media (max-width: 767px) { display: none; }
`;

/* „+2" zamiast wypisywania reszty usług: mówi, że wpis ma więcej pozycji,
   i nie rośnie razem z ich liczbą. */
const MoreServices = styled.span`
    display: none;

    @media (max-width: 767px) {
        display: inline;
        margin-left: 6px;
        font-size: 12px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.textMuted};
        white-space: nowrap;
    }
`;

/* Wiersz drugi pozycji listy: data i usługi czytają się jako podpis pod marką,
   więc dostają jeden stopień mniej kontrastu niż ona. */
const RowSubText = styled.span`
    @media (max-width: 767px) {
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
        white-space: nowrap;
    }
`;

/* ── Money values ── */
const Money = styled.span`
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
`;

/* Brutto to kwota, po której skanuje się tabelę - jedyna w wierszu pisana
   pełnym kontrastem, jak „wartość" leada. */
const GrossMoney = styled(Money)`
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};

    /* Jedyna kwota w pozycji listy - i jedyna rzecz po prawej stronie, więc
       skanuje się ją pionowo bez czytania reszty wiersza. */
    @media (max-width: 767px) {
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.bold};
    }
`;

/* ── Notes cell ── */
const NoteText = styled.span`
    display: block;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

/* ── Three-dots trigger ── */
const DotsBtn = styled.button<{ $open?: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid ${p => p.$open ? p.theme.colors.border : 'transparent'};
    background: ${p => p.$open ? p.theme.colors.surfaceAlt : 'transparent'};
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    /* Zawsze widoczne, także na komputerze: pojawiające się dopiero po najechaniu
       na wiersz menu wyglądało, jakby wpisu nie dało się edytować ani usunąć. */
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    /* Expand tap target without changing visual size */
    position: relative;

    &:hover {
        background: ${p => p.theme.colors.surfaceAlt};
        border-color: ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.text};
    }

    @media (hover: none) and (pointer: coarse) {
        /* Tap target 44px on touch */
        width: 44px;
        height: 44px;
    }

    @media (max-width: 767px) {
        width: 36px;
        height: 36px;
    }
`;

/* ── Portal dropdown ── */
const DropdownMenu = styled.div`
    position: fixed;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
    z-index: 9999;
    min-width: 172px;
    max-width: calc(100vw - 16px);
    padding: 4px;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
    width: 100%;
    padding: 7px 10px;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: 5px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    color: ${p => p.$danger ? p.theme.colors.error : p.theme.colors.text};
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 100ms ease;

    &:hover {
        background: ${p => p.$danger ? 'rgba(239,68,68,0.08)' : p.theme.colors.surfaceAlt};
    }
`;

const MenuDivider = styled.div`
    height: 1px;
    background: ${p => p.theme.colors.border};
    margin: 3px 0;
`;

/* ── Summary footer ── */
const SummaryBar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    /* Na telefonie stopka znika: te same trzy liczby (a właściwie ta jedna,
       po którą się wraca) stoją teraz w nagłówku karty, czyli NAD listą,
       zamiast za nią. */
    @media (max-width: 639px) {
        display: none;
    }

    @media (max-width: 767px) {
        flex-wrap: nowrap;
    }
    background: ${p => p.theme.colors.surfaceAlt};
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const SummaryItem = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    /* Stopka czyta się jak drugi nagłówek tabeli, więc bierze jego wcięcie.
       Pionowe kreski między pozycjami zniknęły - odstęp wystarcza, a kreski
       robiły z podsumowania kratkownicę obcą reszcie widoku. */
    padding: 12px 20px;

    & + & { padding-left: 0; }

    /* Trzy pozycje w jednym rzędzie zamiast łamania się „2 + 1” z nierówną
       ostatnią komórką na całą szerokość. */
    @media (max-width: 767px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        flex: 1;
        min-width: 0;
        padding: 9px 10px;
    }
`;

const SummaryLabel = styled.span`
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${p => p.theme.colors.textMuted};
`;

const SummaryValue = styled.span`
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;

    @media (max-width: 767px) {
        font-size: 14px;
    }
`;

/* ── Empty / loading ── */
const EmptyRow = styled.div`
    padding: 28px 20px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
`;

/** 1 auto, 2-4 auta, 5+ aut. */
function entryCountLabel(count: number) {
    return pluralPl(count, 'auto', 'auta', 'aut');
}

function vatLabel(rate: number) {
    if (rate === -1) return 'ZW';
    return `${rate}%`;
}

interface Props {
    contractor: BatchContractor;
    onEdit: () => void;
    onDelete: () => void;
}

type DrawerState = { entry: BatchOrderEntry | null } | null;

function vehicleName(entry: BatchOrderEntry): string {
    return [entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ') || entry.vehicleLicensePlate || 'Auto';
}

/** Które auto znika i co razem z nim - dawniej okno mówiło tylko „Auto zniknie z listy". */
function deleteMessage(entry: BatchOrderEntry): string {
    const name = [vehicleName(entry), entry.vehicleLicensePlate].filter((v, i, all) => v && all.indexOf(v) === i).join(', ');
    const photos = entry.photoCount > 0 ? ` Razem z nim znikną zdjęcia (${entry.photoCount}).` : '';
    return `${name}, ${formatDay(entry.serviceDate)}, ${formatMoney(entry.grossAmountCents)}.${photos} Tego nie da się cofnąć.`;
}

export function ContractorEntriesSection({ contractor, onEdit, onDelete }: Props) {
    const { showSuccess, showError, showInfo } = useToast();
    const initial = currentMonthPeriod();
    const [filterFrom, setFilterFrom] = useState(initial.from);
    const [filterTo, setFilterTo] = useState(initial.to);
    const [drawer, setDrawer] = useState<DrawerState>(null);
    const [confirmDelete, setConfirmDelete] = useState<BatchOrderEntry | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [expandedPhotoEntryId, setExpandedPhotoEntryId] = useState<string | null>(null);
    const [showSettlement, setShowSettlement] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
    const [menuEl, setMenuEl] = useState<HTMLDivElement | null>(null);
    const [showMoreActions, setShowMoreActions] = useState(false);

    useEffect(() => {
        if (!openMenuEntryId) return;
        function close() { setOpenMenuEntryId(null); setMenuAnchor(null); }
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [openMenuEntryId]);

    // Menu wiersza w ekranie z obu stron i nad przyciskiem, gdy pod nim brak miejsca.
    useEffect(() => {
        if (menuEl && menuAnchor) applyFloatingPlacement(menuEl, menuAnchor, { align: 'right', offset: 4 });
    }, [menuEl, menuAnchor]);

    // Lista bierze wszystkie wpisy okresu: rozliczone nie znikają (patrz nagłówek pliku),
    // tylko schodzą pod nierozliczone. Sumy „do rozliczenia" idą z `openSummary`, które
    // serwer liczy niezależnie od filtra.
    const { data, isLoading, isError } = useContractorEntries(contractor.id, filterFrom, filterTo, 'ALL');
    const deleteEntry = useDeleteEntry(contractor.id);

    function openMenu(e: React.MouseEvent<HTMLButtonElement>, entryId: string) {
        e.stopPropagation();
        if (openMenuEntryId === entryId) {
            setOpenMenuEntryId(null);
            setMenuAnchor(null);
            return;
        }
        setMenuAnchor(e.currentTarget.getBoundingClientRect());
        setOpenMenuEntryId(entryId);
    }

    async function handleDownloadReport() {
        setDownloading(true);
        try {
            // PDF zostaje zestawieniem tego, co czeka na rozliczenie - tak jak dotąd przy
            // domyślnym widoku. Rozliczone okresy mają swoje PDF-y w „Historii rozliczeń".
            await batchOrderApi.downloadReport(contractor.id, contractor.name, filterFrom, filterTo, 'OPEN');
        } catch {
            showError('Nie udało się pobrać zestawienia', 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloading(false);
        }
    }

    async function handleDelete(entry: BatchOrderEntry) {
        try {
            await deleteEntry.mutateAsync(entry.id);
            showSuccess('Auto usunięte', vehicleName(entry));
        } catch (e) {
            showError('Nie udało się usunąć auta', problemDetail(e, 'Spróbuj ponownie.'));
        }
    }

    /**
     * Auto zapisane z datą spoza widocznego okresu znikało z karty, choć komunikat mówił
     * „czeka na zestawienie". Teraz karta przechodzi na miesiąc auta i mówi to wprost.
     */
    function showSavedEntry(saved: BatchOrderEntry) {
        if (saved.serviceDate >= filterFrom && saved.serviceDate <= filterTo) return;
        const day = parseIsoDate(saved.serviceDate);
        const month = monthPeriod(day.getFullYear(), day.getMonth());
        setFilterFrom(month.from);
        setFilterTo(month.to);
        showInfo('Karta pokazuje teraz inny okres', `Auto ma datę ${formatDay(saved.serviceDate)}, więc widać ${periodPhrase(month)}.`);
    }

    // Nierozliczone (także odblokowane do korekty) zawsze na górze: to z nimi jest
    // jeszcze robota. W obrębie grupy zostaje kolejność z serwera - sort jest stabilny.
    const entries = [...(data?.entries ?? [])].sort((a, b) => Number(a.isClosed) - Number(b.isClosed));
    // Nagłówek i stopka mówią, ile czeka na rozliczenie. Lista pokazuje też auta już
    // rozliczone, więc suma listy byłaby inną liczbą pod tym samym podpisem.
    const summary = data?.openSummary ?? data?.summary;
    // Rozliczone auta okresu też mają swoją sumę: przy liście za 5407 zł stopka z samymi
    // zerami („do rozliczenia 0") wyglądała jak błąd.
    const settledSummary = data?.settledSummary;
    const hasSettled = (settledSummary?.entryCount ?? 0) > 0;
    const openEntry = entries.find(e => e.id === openMenuEntryId) ?? null;

    return (
        <>
            <Section>
                <SectionHeader>
                    <div>
                        <ContractorTitleRow>
                            <ContractorName>{contractor.name}</ContractorName>
                            <TitleIconBtn onClick={onEdit} title="Edytuj kontrahenta" aria-label="Edytuj kontrahenta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                            </TitleIconBtn>
                            <TitleIconBtn $danger onClick={onDelete} title="Usuń kontrahenta" aria-label="Usuń kontrahenta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                    <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                                </svg>
                            </TitleIconBtn>
                        </ContractorTitleRow>
                        <ContractorMeta>
                            {contractor.taxId && <span>NIP {contractor.taxId}</span>}
                            {contractor.contactPersonName && <span>{contractor.contactPersonName}</span>}
                            {contractor.phone && <span>{contractor.phone}</span>}
                        </ContractorMeta>
                        <MobileMeta>
                            {(summary?.entryCount ?? 0) === 0 && hasSettled ? (
                                <>
                                    <MobileMetaTotal>{formatMoney(settledSummary!.totalGrossCents)}</MobileMetaTotal>
                                    <span>
                                        rozliczono, {settledSummary!.entryCount} {entryCountLabel(settledSummary!.entryCount)}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <MobileMetaTotal>{formatMoney(summary?.totalGrossCents ?? 0)}</MobileMetaTotal>
                                    <span>
                                        do rozliczenia, {summary?.entryCount ?? 0} {entryCountLabel(summary?.entryCount ?? 0)}
                                    </span>
                                </>
                            )}
                        </MobileMeta>
                    </div>
                    <HeaderActions>
                        {/* Od 640 px w górę akcje stoją w nagłówku karty; poniżej chowają się pod „⋯". */}
                        <ActionBtn $mobileHide $variant="ghost" onClick={handleDownloadReport} disabled={downloading}>
                            {downloading ? 'Generowanie…' : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    PDF
                                </>
                            )}
                        </ActionBtn>
                        <ActionBtn $mobileHide $variant="ghost" onClick={() => setShowHistory(true)} title="Historia zestawień">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Historia
                        </ActionBtn>
                        <ActionBtn $mobileHide $variant="success" onClick={() => setShowSettlement(true)}>
                            Nowe zestawienie
                        </ActionBtn>
                        <ActionBtn $mobileHide $variant="primary" onClick={() => setDrawer({ entry: null })}>
                            + Dodaj auto
                        </ActionBtn>
                        <MoreActionsTrigger
                            $active={showMoreActions}
                            onClick={() => setShowMoreActions(v => !v)}
                            title={showMoreActions ? 'Ukryj opcje' : 'Więcej opcji'}
                            aria-label={showMoreActions ? 'Ukryj opcje' : 'Więcej opcji'}
                            aria-expanded={showMoreActions}
                        >
                            {showMoreActions ? '✕' : '⋯'}
                        </MoreActionsTrigger>
                    </HeaderActions>
                </SectionHeader>

                <MobileSecondaryPanel $open={showMoreActions}>
                    <PanelItem onClick={() => { setShowMoreActions(false); setShowSettlement(true); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Nowe zestawienie
                    </PanelItem>
                    <PanelItem onClick={() => { setShowMoreActions(false); handleDownloadReport(); }} disabled={downloading}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        {downloading ? 'Generowanie zestawienia…' : 'Pobierz zestawienie PDF'}
                    </PanelItem>
                    <PanelItem onClick={() => { setShowMoreActions(false); setShowHistory(true); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Historia zestawień
                    </PanelItem>

                    <PanelDivider />

                    {/* Akcje na samym kontrahencie, nie na jego wpisach - stąd
                        oddzielone kreską i na samym dole. */}
                    <PanelItem onClick={() => { setShowMoreActions(false); onEdit(); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Edytuj kontrahenta
                    </PanelItem>
                    <PanelItem $danger onClick={() => { setShowMoreActions(false); onDelete(); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                            <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
                        </svg>
                        Usuń kontrahenta
                    </PanelItem>
                </MobileSecondaryPanel>

                <FilterRow>
                    <DateRangeFilter
                        from={filterFrom}
                        to={filterTo}
                        onChange={(f, t) => { setFilterFrom(f); setFilterTo(t); }}
                    />
                    <MobileAddEntry>
                        <ActionBtn $variant="primary" onClick={() => setDrawer({ entry: null })}>
                            + Dodaj auto
                        </ActionBtn>
                    </MobileAddEntry>
                </FilterRow>

                {isLoading ? (
                    <EmptyRow>Wczytywanie…</EmptyRow>
                ) : isError ? (
                    <EmptyRow>Nie udało się wczytać aut.</EmptyRow>
                ) : entries.length === 0 ? (
                    <EmptyRow>W tym okresie nie ma jeszcze aut. Dodaj pierwsze przyciskiem „+ Dodaj auto”.</EmptyRow>
                ) : (
                    <>
                        <TableWrapper>
                            <Table>
                                <colgroup>
                                    <col style={{ width: 112 }} />
                                    <col style={{ width: '22%' }} />
                                    <col />
                                    <col style={{ width: 120 }} />
                                    <col style={{ width: 120 }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: 48 }} />
                                </colgroup>
                                <TableHead>
                                    <tr>
                                        <Th>Data</Th>
                                        <Th>Pojazd</Th>
                                        <Th>Usługi</Th>
                                        <Th $align="right">Netto</Th>
                                        <Th $align="right">Brutto</Th>
                                        <Th>Uwagi</Th>
                                        <Th style={{ width: 40 }}></Th>
                                    </tr>
                                </TableHead>
                                <tbody>
                                    {entries.map(entry => (
                                        <Fragment key={entry.id}>
                                            <Tr
                                                $closed={entry.isClosed}
                                                // Rozliczone auto otwiera się do odczytu - poprawka to osobna
                                                // decyzja w oknie, a nie skutek kliknięcia w wiersz.
                                                onClick={() => setDrawer({ entry })}
                                            >
                                                <Td style={{ whiteSpace: 'nowrap' }} data-cell="date">
                                                    <RowSubText>
                                                        {formatDay(entry.serviceDate)}
                                                    </RowSubText>
                                                </Td>
                                                <Td data-cell="vehicle">
                                                    <VehicleCell>
                                                        {entry.isClosed ? (
                                                            <TapInfo text={SETTLED_EXPLANATION} label="Rozliczone - co to znaczy?">
                                                                <StatusMark $tone="settled">
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <circle cx="12" cy="12" r="10" />
                                                                        <path d="m8 12 3 3 5-6" />
                                                                    </svg>
                                                                </StatusMark>
                                                            </TapInfo>
                                                        ) : entry.isCorrection && (
                                                            <TapInfo text={CORRECTION_EXPLANATION} label="Korekta - co to znaczy?">
                                                                <StatusMark $tone="correction">
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                                                                        <path d="M3 3v5h5" />
                                                                    </svg>
                                                                </StatusMark>
                                                            </TapInfo>
                                                        )}
                                                        {[entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(' ') || '-'}
                                                    </VehicleCell>
                                                    {(entry.vehicleLicensePlate || entry.vehicleVin) && (
                                                        <VehicleIdent>
                                                            {entry.vehicleLicensePlate && (
                                                                <PlateTag>{entry.vehicleLicensePlate}</PlateTag>
                                                            )}
                                                            {entry.vehicleVin && (
                                                                <VinTag>VIN {entry.vehicleVin}</VinTag>
                                                            )}
                                                        </VehicleIdent>
                                                    )}
                                                    {entry.visitId && (
                                                        <VisitLink
                                                            to={`/visits/${entry.visitId}`}
                                                            onClick={e => e.stopPropagation()}
                                                            title="Auto z wydania wizyty - ceny poprawisz na wizycie"
                                                        >
                                                            Wizyta {entry.visitNumber ?? ''}
                                                        </VisitLink>
                                                    )}
                                                    {entry.photoCount > 0 && (
                                                        <PhotoCountBtn
                                                            type="button"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setExpandedPhotoEntryId(expandedPhotoEntryId === entry.id ? null : entry.id);
                                                            }}
                                                            title="Pokaż zdjęcia"
                                                            aria-label={`Zdjęcia: ${entry.photoCount}`}
                                                            aria-expanded={expandedPhotoEntryId === entry.id}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                                <circle cx="12" cy="13" r="4" />
                                                            </svg>
                                                            {entry.photoCount}
                                                        </PhotoCountBtn>
                                                    )}
                                                </Td>
                                                <Td data-cell="services">
                                                    {entry.services.length > 0 ? (
                                                        <>
                                                            <ServiceList>
                                                                {entry.services.map((s, i) => (
                                                                    <li key={i}>
                                                                        <ServiceName>{s.name}</ServiceName>
                                                                        <ServicePrice>
                                                                            {formatMoney(s.netAmountCents)} / {formatMoney(s.grossAmountCents)} {vatLabel(s.vatRate)}
                                                                        </ServicePrice>
                                                                    </li>
                                                                ))}
                                                            </ServiceList>
                                                            {entry.services.length > 1 && (
                                                                <MoreServices>+{entry.services.length - 1}</MoreServices>
                                                            )}
                                                        </>
                                                    ) : '-'}
                                                </Td>
                                                <Td $align="right" data-label="Netto" data-cell="net">
                                                    <Money>{formatMoney(entry.netAmountCents)}</Money>
                                                </Td>
                                                <Td $align="right" data-label="Brutto" data-cell="gross">
                                                    <GrossMoney>{formatMoney(entry.grossAmountCents)}</GrossMoney>
                                                </Td>
                                                <Td data-empty={!entry.notes} data-cell="notes">
                                                    <NoteText title={entry.notes ?? undefined}>
                                                        {entry.notes || '-'}
                                                    </NoteText>
                                                </Td>
                                                <Td style={{ width: 40, paddingLeft: 4 }} data-cell="menu">
                                                    <DotsBtn
                                                        $open={openMenuEntryId === entry.id}
                                                        onClick={e => openMenu(e, entry.id)}
                                                        title="Opcje"
                                                        aria-label={`Opcje: ${vehicleName(entry)}`}
                                                    >
                                                        ⋮
                                                    </DotsBtn>
                                                </Td>
                                            </Tr>
                                            {expandedPhotoEntryId === entry.id && (
                                                <PhotoRow>
                                                    <td colSpan={7}>
                                                        <PhotoRowTitle>Zdjęcia: {vehicleName(entry)}</PhotoRowTitle>
                                                        <BatchOrderPhotoSection entryId={entry.id} contractorId={contractor.id} />
                                                    </td>
                                                </PhotoRow>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </Table>
                        </TableWrapper>

                        {summary && (
                            <SummaryBar>
                                <SummaryItem>
                                    <SummaryLabel>Do rozliczenia</SummaryLabel>
                                    <SummaryValue>{summary.entryCount} {entryCountLabel(summary.entryCount)}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Netto</SummaryLabel>
                                    <SummaryValue>{formatMoney(summary.totalNetCents)}</SummaryValue>
                                </SummaryItem>
                                <SummaryItem>
                                    <SummaryLabel>Brutto</SummaryLabel>
                                    <SummaryValue>{formatMoney(summary.totalGrossCents)}</SummaryValue>
                                </SummaryItem>
                                {hasSettled && (
                                    <SummaryItem style={{ marginLeft: 'auto' }}>
                                        <SummaryLabel>Rozliczono</SummaryLabel>
                                        <SummaryValue>
                                            {settledSummary!.entryCount} {entryCountLabel(settledSummary!.entryCount)}, {formatMoney(settledSummary!.totalGrossCents)}
                                        </SummaryValue>
                                    </SummaryItem>
                                )}
                            </SummaryBar>
                        )}
                    </>
                )}
            </Section>

            {/* Menu wiersza w portalu do <body>: wychodzi poza overflow:hidden karty. */}
            {openEntry && menuAnchor && createPortal(
                <DropdownMenu
                    ref={setMenuEl}
                    role="menu"
                    style={{ visibility: 'hidden' }}
                    onClick={e => e.stopPropagation()}
                >
                    <MenuItem
                        onClick={() => {
                            setExpandedPhotoEntryId(
                                expandedPhotoEntryId === openEntry.id ? null : openEntry.id
                            );
                            setOpenMenuEntryId(null);
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        Dokumentacja zdjęciowa
                    </MenuItem>
                    {openEntry.isClosed ? (
                        // Rozliczone auto: podgląd, a poprawka to osobny przycisk w oknie.
                        <MenuItem
                            onClick={() => {
                                setDrawer({ entry: openEntry });
                                setOpenMenuEntryId(null);
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            Podgląd i poprawka
                        </MenuItem>
                    ) : (
                        <>
                            <MenuItem
                                onClick={() => {
                                    setDrawer({ entry: openEntry });
                                    setOpenMenuEntryId(null);
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edytuj auto
                            </MenuItem>
                            {/* Auto z wizyty znika z listy tylko razem z rozliczeniem wizyty - bez „Usuń”. */}
                            {!openEntry.visitId && <MenuDivider />}
                            {!openEntry.visitId && <MenuItem
                                $danger
                                onClick={() => {
                                    setConfirmDelete(openEntry);
                                    setOpenMenuEntryId(null);
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                                Usuń auto
                            </MenuItem>}
                        </>
                    )}
                </DropdownMenu>,
                document.body
            )}

            {drawer && (
                <EntryFormModal
                    key={drawer.entry?.id ?? 'new'}
                    contractorId={contractor.id}
                    contractorName={contractor.name}
                    initial={drawer.entry}
                    onSaved={showSavedEntry}
                    onClose={() => setDrawer(null)}
                />
            )}

            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Usunąć auto?"
                message={confirmDelete ? deleteMessage(confirmDelete) : ''}
                variant="danger"
                confirmText="Usuń auto"
                cancelText="Anuluj"
                onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); }}
                onCancel={() => setConfirmDelete(null)}
            />

            {showSettlement && (
                <SettlementModal
                    contractor={contractor}
                    period={{ from: filterFrom, to: filterTo }}
                    onClose={() => setShowSettlement(false)}
                />
            )}

            {showHistory && (
                <SettlementHistoryModal
                    contractor={contractor}
                    onClose={() => setShowHistory(false)}
                />
            )}
        </>
    );
}
