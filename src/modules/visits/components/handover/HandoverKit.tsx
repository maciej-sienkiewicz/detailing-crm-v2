import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { ModalFooter } from '@/common/components/ModalKit';
import { ui } from '@/common/components/ui';
import type { HandoverProblem } from '../../types/handover';

/**
 * Prymitywy wspólne dla sekcji ekranu wydania.
 *
 * Ekran ma dwa kroki (podpis, potem rozliczenie), ale nadal jest JEDNYM oknem:
 * krok to zestaw sekcji na tej samej powierzchni, nie osobne okno. Wszystkie
 * bloki mają więc wyglądać jak elementy jednej całości, a nie jak karty
 * konkurujące o uwagę.
 *
 * Język jest ten sam co na karcie wizyty (common/components/ui): nagłówek sekcji
 * zwykłym pismem 15px zamiast szarych wersalików 11px, wybór odcieniem marki
 * zamiast drugiego niebieskiego (#0369A1), kwoty w cyfrach tabelarycznych.
 */

export const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const SectionLabel = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.005em;
    color: ${ui.ink};
`;

export const Box = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surface};
`;

export const PillRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

export const Pill = styled.button<{ $selected: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: ${ui.radiusControl};
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
    white-space: nowrap;

    /* Zaznaczenie niesie ODCIEŃ, nie WYPEŁNIENIE (CLAUDE.md §2): przy dwóch
       pickerach naraz (forma zapłaty + dokument) wypełnione pigułki konkurowałyby
       z jedynym prawowitym wypełnieniem - „Wydaj pojazd" w stopce. */
    background: ${p => p.$selected ? ui.brandTint : ui.surface};
    color: ${p => p.$selected ? ui.brandDeep : ui.textSecondary};
    border: 1px solid ${p => p.$selected ? ui.brandLine : ui.line};

    &:hover { border-color: ${p => p.$selected ? ui.brandLine : ui.lineStrong}; color: ${p => p.$selected ? ui.brandDeep : ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
    svg { width: 14px; height: 14px; flex-shrink: 0; }

    @media (hover: none) and (pointer: coarse) { height: 44px; }
`;

/** Przycisk-link do rozwijania szczegółów i zmiany danych, bez wagi wizualnej. */
export const GhostAction = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;
    white-space: nowrap;

    &:hover { text-decoration: underline; }
    svg { width: 13px; height: 13px; }
`;

export const Muted = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    line-height: 1.5;
`;

// ─── Układ rozliczenia: wydanie pojazdu i poprawka rozliczenia ────────────────
//
// Krok płatności „Wydanie pojazdu” i okno „Popraw rozliczenie” stoją na tych samych
// klockach: decyzje po lewej, podsumowanie po prawej, jeden przycisk w stopce. Dwa
// różne układy jednej czynności (ustalić dokument, cenę i płatność) trzeba było
// poznawać osobno (decyzja biznesu z 23.10.2026).

/**
 * Rozliczenie na dwie kolumny: decyzje po lewej, kwota, podsumowanie i braki po prawej
 * (wzorzec kasy: rachunek obok płatności). Prawa kolumna przykleja się przy przewijaniu,
 * żeby podsumowanie było w polu widzenia przy każdej zmianie. Na wąskim ekranie
 * kolumny schodzą jedna pod drugą - podsumowanie ląduje tuż nad przyciskiem.
 */
export const SettlementGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 28px;
    align-items: start;

    > aside {
        position: sticky;
        top: 0;
        padding: 18px;
        border-radius: 16px;
        background: ${ui.surfaceSoft};
        border: 1px solid ${ui.line};
    }

    @media (max-width: 900px) {
        grid-template-columns: minmax(0, 1fr);
        > aside { position: static; padding: 14px; }
    }
`;

/** Lewa kolumna rozliczenia: decyzje jedna pod drugą. */
export const DecisionStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 26px;
`;

export const DecisionField = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const DecisionTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

/** Prawa kolumna rozliczenia: kwota, „Sprawdź przed …” i lista braków. */
export const SummaryAside = styled.aside`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Kwota, po którą się wraca: nagłówek podsumowania, z jedną linią o jej składzie. */
export const SummaryAmount = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    > span:first-child { font-size: 13px; font-weight: 600; color: ${ui.textMuted}; }
    > strong { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: ${ui.ink}; font-variant-numeric: tabular-nums; }
    > span:last-child { font-size: 13px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

export const Review = styled.section`
    display: flex;
    flex-direction: column;
    padding: 12px 16px 4px;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: ${ui.surface};
`;

export const ReviewTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
`;

export const ReviewRow = styled.div`
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: start;
    padding: 9px 0;
    border-top: 1px solid ${ui.lineFaint};
    font-size: 13px;
    color: ${ui.inkSoft};

    > span:first-child { color: ${ui.textMuted}; }
    strong { color: ${ui.ink}; font-weight: 700; }
    small { display: block; font-size: 12.5px; color: ${ui.textSecondary}; font-variant-numeric: tabular-nums; }
    /* Numer nie łamie się w środku: „502-431-” i „51-66” w dwóch liniach czytały się jak dwa numery. */
    small.nowrap { white-space: nowrap; }

    @media (max-width: 480px) { grid-template-columns: 78px minmax(0, 1fr) auto; }
`;

/** Braki blokujące przycisk w stopce: czerwień = „tego nie da się teraz zrobić”. */
export const SummaryProblems = styled.section`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fef2f2;
    color: #7f1d1d;
    font-size: 13px;

    strong { font-weight: 700; }
    ol { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
    button { all: unset; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    button:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

/** Stopka rozliczenia: wstecz albo anuluj po lewej, jedyny wypełniony przycisk po prawej. */
export const SettlementFooter = styled(ModalFooter)`
    justify-content: space-between;
    gap: 12px;

    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; max-width: none; }
    }
`;

/** Prawa strona stopki: przycisk pomocniczy obok głównego, oba tej samej wysokości. */
export const FooterActions = styled.div`
    display: flex;
    align-items: stretch;
    gap: 10px;

    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

/**
 * Jedyny wypełniony element okna (CLAUDE.md §2): dwie linie - co się stanie i na co,
 * dla kogo - kafelek ikony i cień w kolorze akcji, żeby nie dało się go pomylić
 * z „Zapisz”. Zieleń jak „Wydaj pojazd” w nagłówku wizyty: domyka rozliczenie.
 */
export const PrimaryAction = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    max-width: 520px;
    padding: 10px 16px 10px 10px;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, #16a34a, #15803d);
    box-shadow: 0 8px 20px rgba(21, 128, 61, 0.28);
    color: #ffffff;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    > svg:last-child { width: 18px; height: 18px; flex-shrink: 0; }
`;

export const ActionIcon = styled.span`
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 20px; height: 20px; }
`;

export const ActionText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex-grow: 1;

    > span:first-child { font-size: 15px; font-weight: 800; }
    > span:last-child { font-size: 12.5px; opacity: 0.92; overflow-wrap: anywhere; }
`;

// ─── Komunikaty przy sekcji, nie w banerze na górze ───────────────────────────

const ProblemBox = styled.div`
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.dangerTint};
    border: 1px solid ${ui.dangerLine};
    font-size: 13px;
    line-height: 1.5;
    color: #7f1d1d;

    svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; color: ${ui.dangerInk}; }
`;

const ProblemList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

/**
 * Lista przeszkód dotyczących jednej sekcji. Renderuje się tuż pod polem,
 * którego dotyczy: użytkownik nie musi szukać, co zablokowało przycisk.
 */
export const SectionProblems = ({ problems }: { problems: HandoverProblem[] }) => {
    if (problems.length === 0) return null;
    return (
        <ProblemBox>
            <AlertTriangle strokeWidth={2.2} />
            <ProblemList>
                {problems.map((problem, index) => (
                    <span key={index}>{problem.message}</span>
                ))}
            </ProblemList>
        </ProblemBox>
    );
};
