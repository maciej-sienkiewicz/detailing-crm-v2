// src/modules/campaigns/components/shared.tsx
// Język wizualny modułu kampanii — ten sam, którym mówi moduł leadów.
//
// Prawo Jakoba działa też wewnątrz jednej aplikacji: użytkownik spędza w CRM-ie
// cały dzień i uczy się jednego zestawu znaków. Kampanie miały do niedawna
// własny — inne promienie, inne przyciski, własną paletę akcentów — więc każdy
// ekran trzeba było czytać od zera. Podstawowe klocki (karta-powierzchnia, chip
// filtra, przyciski, pusty stan) są tu dlatego **re-eksportowane** z modułu
// komunikacji, a nie skopiowane: jedna definicja to jedyna gwarancja, że oba
// moduły nie rozjadą się przy następnej zmianie.
import styled from 'styled-components';
import { Repeat, Send } from 'lucide-react';
import { KIND_DESCRIPTIONS, KIND_LABELS, STATUS_COLORS, STATUS_LABELS } from '../constants';
import type { CampaignKind, CampaignStatus } from '../types';

import { PrimaryButton as PrimaryButtonBase } from '@/modules/comms/components/shared';

export {
    EmptyHint,
    FilterChip,
    IconButton,
    PrimaryButton,
    SurfaceCard,
} from '@/modules/comms/components/shared';

// ─── Layout strony ────────────────────────────────────────────────────────────

/** Ten sam kontener, co w widoku leadów i w statystykach. */
export const ViewContainer = styled.main`
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

/** @deprecated Nazwa z poprzedniego układu — zostaje, żeby nie przepisywać importów naraz. */
export const Page = ViewContainer;

/**
 * Panel treści. Wariant [$quiet] to materiał pomocniczy: siada na tle aplikacji
 * bez ramki, przez co cofa się o plan względem powierzchni roboczych. Gdy każdy
 * panel jest białym prostokątem w identycznej ramce, żaden nie jest ważniejszy
 * i trzeba przeczytać wszystkie, żeby dowiedzieć się, co było istotne.
 *
 * Bliźniak panelu z okna leada — łącznie z nagłówkiem h4 pisanym wersalikami.
 */
export const Panel = styled.section<{ $quiet?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
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
    h4 .spacer { flex: 1; }
`;

/** @deprecated Używaj [Panel] — SectionCard to ta sama rzecz pod starą nazwą. */
export const SectionCard = Panel;

export const Eyebrow = styled.div`
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${p => p.theme.colors.textMuted};
`;

// ─── Etap kampanii ────────────────────────────────────────────────────────────

/**
 * Etap: kropka i nazwa zdaniem — dokładnie jak status leada w tabeli leadów.
 *
 * Poprzednio stała tu wypełniona plakietka pisana KAPITALIKAMI. W kolumnie,
 * w której każdy wiersz ma status, wypełnione plakietki nie wyróżniają niczego
 * (świeci cała kolumna, czyli nie świeci nic), a wersalikami i odstępem między
 * literami zjadają szerokość, której potrzebuje treść.
 */
export const StatusLine = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};
    white-space: nowrap;
`;

export const StatusDot = styled.span<{ $color: string }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$color};
`;

export function CampaignStatusLine({ status }: { status: CampaignStatus }) {
    return (
        <StatusLine>
            <StatusDot $color={STATUS_COLORS[status]} />
            {STATUS_LABELS[status]}
        </StatusLine>
    );
}

/**
 * Rodzaj kampanii — ikona i słowo, bez ramki.
 *
 * To nie jest stan i nie ma prawa wyglądać jak stan: w wierszu, który obok nosi
 * już etap, druga owalna plakietka zamienia komórkę w kolaż. Rodzaj rozpoznaje
 * się po ikonie (strzałka = raz, pętla = stale) szybciej niż po przeczytaniu
 * słowa, więc słowo w wąskich miejscach można pominąć.
 */
const KindMark = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.normal};
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

export function CampaignKindMark({ kind, iconOnly }: { kind: CampaignKind; iconOnly?: boolean }) {
    const Icon = kind === 'AUTOMATIC' ? Repeat : Send;
    return (
        <KindMark title={KIND_DESCRIPTIONS[kind]}>
            <Icon />
            {!iconOnly && KIND_LABELS[kind]}
        </KindMark>
    );
}

// ─── Drobnica ─────────────────────────────────────────────────────────────────

export const MutedText = styled.span`
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Chip kryterium odbiorców — opis, nie akcja i nie stan.
 *
 * Wcześniej był wypełniony błękitem, tym samym, którym mówi akcja główna.
 * Kilkanaście niebieskich owali pod tabelą wyglądało jak kilkanaście przycisków
 * i odbierało barwę jedynemu miejscu, w którym coś ona znaczy.
 */
export const Chip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    font-size: 11.5px;
    color: ${p => p.theme.colors.textSecondary};
    white-space: nowrap;
`;

export const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

/**
 * Notka nad treścią — wyjaśnienie stanu, nie pole formularza. Trzy tony,
 * te same co w oknie leada: bursztyn ostrzega, czerwień mówi „coś nie wyszło",
 * zieleń potwierdza wynik. Neutralna wersja niesie samą informację.
 */
export const Note = styled.div<{ $tone?: 'warn' | 'error' | 'ok' }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 12px;
    color: ${({ $tone, theme }) =>
        $tone === 'error' ? theme.colors.error
        : $tone === 'warn' ? theme.colors.warning
        : $tone === 'ok' ? theme.colors.success
        : theme.colors.textSecondary};
    background: ${({ $tone, theme }) =>
        $tone === 'error' ? theme.colors.errorLight
        : $tone === 'warn' ? theme.colors.warningLight
        : $tone === 'ok' ? theme.colors.successLight
        : theme.colors.surfaceAlt};
    border: 1px solid ${({ $tone, theme }) =>
        $tone === 'error' ? `${theme.colors.error}33`
        : $tone === 'warn' ? `${theme.colors.warning}33`
        : $tone === 'ok' ? `${theme.colors.success}33`
        : theme.colors.border};

    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
    svg { width: 15px; height: 15px; flex-shrink: 0; }
    .spacer { flex: 1; }
`;

/** @deprecated Używaj [Note] z tonem 'warn'. */
export const InfoBanner = Note;

/**
 * Droga do innego miejsca albo drobna akcja poboczna — odnośnik tekstowy,
 * nie przycisk. Nawigacja nie ma prawa konkurować wagą z akcją główną okna.
 */
export const QuietLink = styled.button`
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
    &:disabled { opacity: 0.5; cursor: default; text-decoration: none; }
`;

/** Akcja nieodwracalna — stoi z dala od akcji głównej. Bliźniak z okna leada. */
export const DangerButton = styled.button`
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

    svg { width: 14px; height: 14px; }
`;

/**
 * Historia jako oś czasu, nie jako lista linijek z datą na początku.
 *
 * Przebieg kampanii jest ciągiem: „utworzono, zaplanowano, ruszyło, skończyło
 * się". Płaskie zdania każą ten ciąg złożyć w głowie, bo wszystkie linijki ważą
 * tyle samo. Pionowa nitka z kropkami pokazuje go wprost — to ten sam element,
 * którym historia statusów rysowana jest w oknie leada.
 */
export const Timeline = styled.ol`
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

export const TimelineItem = styled.li<{ $color: string }>`
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
 * Pole tekstowe / liczbowe w tokenach motywu — jedno na cały moduł.
 *
 * [$invalid] to nie ozdoba, tylko odpowiedź na pytanie „dlaczego nie mogę iść
 * dalej": czerwona ramka zapala się dopiero wtedy, gdy ktoś spróbował przejść
 * dalej bez wypełnienia pola, i gaśnie z pierwszym wpisanym znakiem. Pole puste
 * od początku nie jest jeszcze błędem.
 */
export const TextField = styled.input<{ $invalid?: boolean }>`
    padding: 9px 14px;
    border: 1px solid ${({ $invalid, theme }) => ($invalid ? theme.colors.error : theme.colors.border)};
    border-radius: ${p => p.theme.radii.md};
    font-size: 14px;
    font-family: inherit;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    transition: border-color ${p => p.theme.transitions.fast};

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
    &:focus {
        outline: none;
        border-color: ${({ $invalid, theme }) => ($invalid ? theme.colors.error : theme.colors.primary)};
    }
`;

/**
 * Akcja główna, która nie może jeszcze zadziałać — ale odpowiada na kliknięcie.
 *
 * `disabled` w HTML-u wycisza przycisk całkowicie: nie da się go kliknąć, nie da
 * się na niego wejść tabulatorem, a przeglądarka nie mówi, czego brakuje. Ktoś,
 * kto nie zauważył pustego pola dwa ekrany wyżej, zostaje z martwym przyciskiem
 * i bez podpowiedzi. `aria-disabled` zachowuje komunikat „to jeszcze nie zadziała"
 * i dla oka, i dla czytnika ekranu, a kliknięcie zostaje, żeby okno mogło zrobić
 * jedyną sensowną rzecz: przewinąć do brakującego pola i je wskazać.
 */
export const GuardedButton = styled(PrimaryButtonBase)`
    &[aria-disabled='true'] {
        opacity: 0.45;
        box-shadow: none;
        background: ${p => p.theme.colors.textMuted};
        cursor: default;
    }
    &[aria-disabled='true']:hover {
        background: ${p => p.theme.colors.textMuted};
        box-shadow: none;
    }
`;

/**
 * Pole wyboru odbiorcy. Natywny [input type=checkbox] przemalowany akcentem
 * motywu — własna implementacja z div-ów traci obsługę klawiatury i czytników
 * ekranu, a nie daje w zamian nic poza kształtem.
 */
export const CheckBox = styled.input.attrs({ type: 'checkbox' })`
    appearance: none;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin: 0;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.sm};
    background: ${p => p.theme.colors.surface};
    cursor: pointer;
    display: inline-grid;
    place-content: center;
    transition: all ${p => p.theme.transitions.fast};

    &::before {
        content: '';
        width: 9px;
        height: 9px;
        transform: scale(0);
        transition: transform ${p => p.theme.transitions.fast};
        background: #ffffff;
        clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    }

    &:checked, &:indeterminate {
        background: ${p => p.theme.colors.primary};
        border-color: ${p => p.theme.colors.primary};
    }
    &:checked::before { transform: scale(1); }
    &:indeterminate::before {
        transform: scale(1);
        clip-path: polygon(0 40%, 100% 40%, 100% 60%, 0 60%);
    }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 2px; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

export const SelectField = styled.select`
    padding: 9px 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: 14px;
    font-family: inherit;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
`;

export const TextAreaField = styled.textarea`
    padding: 12px 14px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: 14px;
    font-family: inherit;
    line-height: 1.55;
    resize: vertical;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    transition: border-color ${p => p.theme.transitions.fast};

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
    &:focus { outline: none; border-color: ${p => p.theme.colors.primary}; }
`;

/** Etykieta pola: wersaliki, jak nagłówek panelu — nie krzyczy, porządkuje. */
export const FieldLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${p => p.theme.colors.textMuted};
`;

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const HintText = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.5;
`;
