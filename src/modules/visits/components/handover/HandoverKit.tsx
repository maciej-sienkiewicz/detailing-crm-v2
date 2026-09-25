import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
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
 * zamiast drugiego niebieskiego (#3B82F6), kwoty w cyfrach tabelarycznych.
 */

export const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const SectionHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
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

export const BoxRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

export const Divider = styled.div`
    height: 1px;
    background: ${ui.lineSoft};
    margin: 2px 0;
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

export const Money = styled.span<{ $strong?: boolean }>`
    font-variant-numeric: tabular-nums;
    font-size: ${p => (p.$strong ? '20px' : '13.5px')};
    font-weight: ${p => (p.$strong ? 700 : 600)};
    color: ${ui.ink};
    letter-spacing: ${p => (p.$strong ? '-0.01em' : '0')};
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
