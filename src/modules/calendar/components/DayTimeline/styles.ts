import styled, { keyframes, css } from 'styled-components';

// ─── Root ─────────────────────────────────────────────────────────────────────

export const Root = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
    overflow: hidden;
`;

// ─── Stats strip ──────────────────────────────────────────────────────────────

export const StatsBar = styled.div`
    display: flex;
    align-items: center;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    /* Telefon: cztery liczby dzielą szerokość równo zamiast uciekać
       w przewijanie poziome, w którym ostatnia kolumna była zawsze ucięta. */
    @media (max-width: 767px) {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        padding: 0 10px;
        overflow-x: visible;
    }
`;

export const StatCell = styled.div`
    display: flex;
    flex-direction: column;
    padding: 8px 20px 8px 0;
    margin-right: 20px;
    border-right: 1px solid rgba(15, 23, 42, 0.06);
    flex-shrink: 0;

    &:last-child { border-right: none; margin-right: 0; }

    @media (max-width: 767px) {
        min-width: 0;
        padding: 7px 8px 7px 0;
        margin-right: 8px;
        gap: 1px;
    }
`;

export const StatLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(100, 116, 139, 0.6);
    white-space: nowrap;

    @media (max-width: 767px) {
        font-size: 9px;
        letter-spacing: 0.03em;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

export const StatValue = styled.span<{ $accent?: boolean }>`
    font-size: 16px;
    font-weight: 700;
    color: ${p => p.$accent ? '#6366f1' : '#0f172a'};
    letter-spacing: -0.3px;
    white-space: nowrap;

    @media (max-width: 767px) {
        font-size: 14px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

// ─── Kanban board ─────────────────────────────────────────────────────────────

export const BoardScroll = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-x: auto;
    overflow-y: hidden;
    min-height: 0;
    -webkit-overflow-scrolling: touch;

    /* Telefon: tablica statusów przestaje być czterema kolumnami obok siebie
       (640px minimum na ekranie szerokim na 390px) i staje się jedną kolumną
       sekcji pod sobą — przewijaną pionowo, tak jak reszta aplikacji. */
    @media (max-width: 767px) {
        overflow-x: hidden;
        overflow-y: auto;
    }

    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.12); border-radius: 3px; }
`;

export const Board = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    flex: 1;
    min-height: 0;
    min-width: 640px;
    align-items: stretch;

    @media (max-width: 767px) {
        display: block;
        min-width: 0;
        min-height: auto;
        flex: none;
    }
`;

export const KanbanCol = styled.div`
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(15, 23, 42, 0.06);
    min-height: 0;
    overflow: hidden;

    &:last-child { border-right: none; }

    @media (max-width: 767px) {
        border-right: none;
        border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        overflow: visible;

        &:last-child { border-bottom: none; }
    }
`;

export const ColHeader = styled.div<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 11px;
    background: #fff;
    border-bottom: 2px solid ${p => p.$color}44;
    flex-shrink: 0;

    /* Nagłówek sekcji zostaje na wierzchu przy przewijaniu długiej listy —
       inaczej po kilku kartach nie widać już, do jakiego statusu należą. */
    @media (max-width: 767px) {
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 10px 14px 9px;
    }
`;

export const ColDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

export const ColTitle = styled.span`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #475569;
    flex: 1;
`;

export const ColCount = styled.span<{ $color: string; $active: boolean }>`
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 11px;
    background: ${p => p.$active ? p.$color : '#f1f5f9'};
    color: ${p => p.$active ? '#fff' : '#94a3b8'};
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s, color 0.2s;
`;

export const CardList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 10px 10px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    /* Przewija cała sekcja, nie każda kolumna z osobna. */
    @media (max-width: 767px) {
        flex: none;
        overflow-y: visible;
        padding: 8px 10px 12px;
    }

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.1); border-radius: 2px; }
`;

export const EmptyCol = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(148, 163, 184, 0.45);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
`;

/** Telefon: zamiast czterech pustych sekcji jeden komunikat na cały dzień. */
export const EmptyDay = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 40px 24px;
    color: #94a3b8;
    font-size: 13px;
    text-align: center;
`;

// ─── Event card ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
`;

export const Card = styled.div<{ $color: string; $dimmed: boolean; $crossedOut: boolean; $isSolid: boolean }>`
    background: ${p => p.$isSolid ? p.$color : '#fff'};
    border-radius: 8px;
    border-left: 3px solid ${p => p.$isSolid ? 'rgba(0, 0, 0, 0.12)' : p.$color};
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.05);
    padding: 10px 11px 10px 10px;
    cursor: pointer;
    opacity: ${p => p.$dimmed ? 0.5 : 1};
    text-decoration: ${p => p.$crossedOut ? 'line-through' : 'none'};
    animation: ${fadeUp} 0.16s ease both;
    transition: box-shadow 0.15s, transform 0.15s;

    ${p => p.$isSolid && css`
        && * {
            color: rgba(255, 255, 255, 0.9);
        }
    `}

    &:hover {
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
    }
`;

export const CardTime = styled.div`
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
`;

export const CardTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
    margin-bottom: 3px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
`;

export const CardMeta = styled.div`
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const CardFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 7px;
    gap: 6px;
`;

export const CardPrice = styled.span`
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
`;

export const CardService = styled.span`
    font-size: 10px;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
`;
