import React from 'react';
import styled from 'styled-components';
import { Info, RefreshCw } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Slim status bar: when the data was last refreshed and when the next refresh
 * lands, with a hover/focus tooltip explaining the sync model in plain Polish.
 * Rendered above the tabs so every view answers "how fresh is this?" at a glance.
 */

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 7px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bg};
    font-size: ${st.fontXs};
    color: ${st.textSecondary};

    > svg { width: 13px; height: 13px; color: ${st.textMuted}; flex-shrink: 0; }
`;

const Sep = styled.span`
    color: ${st.textMuted};

    @media (max-width: 560px) { display: none; }
`;

const InfoWrap = styled.span`
    position: relative;
    margin-left: auto;
    display: inline-flex;

    &:hover > div,
    &:focus-within > div {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
    }
`;

const InfoBtn = styled.button`
    border: none;
    background: none;
    padding: 2px;
    display: inline-flex;
    color: ${st.textMuted};
    cursor: help;

    svg { width: 14px; height: 14px; }
    &:hover { color: ${st.accentBlue}; }
`;

const TooltipCard = styled.div`
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 30;
    width: min(340px, 82vw);
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowMd};
    padding: 12px 14px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    line-height: 1.55;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-4px);
    transition: opacity ${st.transition}, transform ${st.transition};

    strong { color: ${st.text}; display: block; margin-bottom: 2px; }
    p { margin: 0 0 8px; }
    p:last-child { margin-bottom: 0; }
`;

const fmtDateTime = (iso: string | null): string | null => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

interface SyncStatusBarProps {
    lastSyncAt: string | null;
    nextDailySyncAt: string | null;
    nextDeepSyncAt: string | null;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ lastSyncAt, nextDailySyncAt, nextDeepSyncAt }) => {
    const last = fmtDateTime(lastSyncAt);
    const nextDaily = fmtDateTime(nextDailySyncAt);
    const nextDeep = fmtDateTime(nextDeepSyncAt);

    return (
        <Bar>
            <RefreshCw aria-hidden />
            <span>{last ? <>Dane z: <strong>{last}</strong></> : 'Pierwsza synchronizacja w toku...'}</span>
            {nextDaily && (
                <>
                    <Sep>·</Sep>
                    <span>następna aktualizacja: {nextDaily}</span>
                </>
            )}
            <InfoWrap>
                <InfoBtn type="button" aria-label="Jak działa synchronizacja danych?">
                    <Info />
                </InfoBtn>
                <TooltipCard role="tooltip">
                    <p>
                        <strong>Codziennie{nextDaily ? ` (najbliższa: ${nextDaily})` : ''}</strong>
                        Lekka synchronizacja: aktualne liczby obserwujących i najnowsze posty
                        wszystkich obserwowanych profili. Dzięki niej promocje konkurencji
                        wykrywamy w ciągu doby.
                    </p>
                    <p>
                        <strong>Co tydzień{nextDeep ? ` (najbliższa: ${nextDeep})` : ''}</strong>
                        Pełna synchronizacja: głębsza historia postów, przeliczenie statystyk
                        tygodniowych, nowe wnioski w „Co wymaga Twojej uwagi" i raport tygodnia.
                    </p>
                    <p>
                        Dane pochodzą z publicznych profili Instagrama. Liczniki reakcji
                        odświeżamy dla postów z ostatnich 90 dni.
                    </p>
                </TooltipCard>
            </InfoWrap>
        </Bar>
    );
};
