import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { HandoverProblem } from '../../types/handover';

/**
 * Prymitywy wspólne dla sekcji ekranu wydania.
 *
 * Ekran jest jednym oknem złożonym z sekcji — nie ma tu kroków ani modali
 * zagnieżdżonych, więc wszystkie bloki muszą wyglądać jak elementy jednej
 * powierzchni, a nie jak osobne karty konkurujące o uwagę.
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
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

export const Box = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
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
    background: ${st.border};
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
    padding: 7px 15px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all 140ms ease;
    white-space: nowrap;

    ${p =>
        p.$selected
            ? `
        background: ${st.accentBlue};
        color: white;
        border: 1px solid ${st.accentBlue};
        box-shadow: ${st.shadowXs};
    `
            : `
        background: ${st.bgCard};
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
        &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
    `}

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

/** Przycisk-link do rozwijania szczegółów i zmiany danych — bez wagi wizualnej. */
export const GhostAction = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0;
    border: none;
    background: none;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    white-space: nowrap;

    &:hover { text-decoration: underline; }
    svg { width: 13px; height: 13px; }
`;

export const Muted = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    line-height: 1.5;
`;

export const Money = styled.span<{ $strong?: boolean }>`
    font-variant-numeric: tabular-nums;
    font-size: ${p => (p.$strong ? '20px' : st.fontSm)};
    font-weight: ${p => (p.$strong ? 700 : 600)};
    color: ${st.text};
    letter-spacing: ${p => (p.$strong ? '-0.3px' : '0')};
`;

// ─── Komunikaty przy sekcji, nie w banerze na górze ───────────────────────────

const ProblemBox = styled.div`
    display: flex;
    gap: 8px;
    padding: 9px 11px;
    border-radius: ${st.radiusSm};
    background: ${st.accentRedDim};
    border: 1px solid rgba(239, 68, 68, 0.3);
    font-size: ${st.fontSm};
    line-height: 1.5;
    color: #7f1d1d;

    svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 2px; color: ${st.accentRed}; }
`;

const ProblemList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

/**
 * Lista przeszkód dotyczących jednej sekcji. Renderuje się tuż pod polem,
 * którego dotyczy — użytkownik nie musi szukać, co zablokowało przycisk.
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
