// src/modules/activity/components/EntityActivityTimeline.tsx
// Sekcja „Historia zmian" na kartach wizyty, klienta i pojazdu.
//
// Te same zdarzenia i te same wiersze co zakładka Aktywność — jeden dziennik,
// jeden język wizualny. Wcześniej karty miały własny, starszy moduł z własnym
// słownikiem etykiet po stronie przeglądarki; dwa moduły tłumaczące te same
// zdarzenia dwiema listami słów rozjeżdżały się przy każdej nowej akcji.
// Feed z backendu przychodzi już przetłumaczony, więc tutaj zostaje sam układ.
//
// Różnice wobec zakładki są celowe i wynikają z miejsca:
//  • bez hero, filtrów i wyszukiwarki — kontekst obiektu JEST filtrem;
//  • starsze zdarzenia pod przyciskiem, nie na scrollu — sekcja siedzi w środku
//    strony, która sama się przewija, i sentinel dociągałby historię za każdym
//    przejściem obok, rozpychając sekcję na całą stronę.
import styled, { keyframes } from 'styled-components';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { ActivityRow } from './ActivityRow';
import { groupByDay } from '../activityTheme';
import { useEntityActivityFeed } from '../hooks/useActivityFeed';
import type { ActivityEntityScope } from '../api/activityApi';

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
    0%   { opacity: 0.55; }
    50%  { opacity: 1; }
    100% { opacity: 0.55; }
`;

/* Ten sam kontener co Timeline zakładki Aktywność — biel, ramka, 14 px. */
const Shell = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    overflow: hidden;
`;

const DayGroup = styled.div`
    & + & {
        border-top: 1px solid ${p => p.theme.colors.border};
    }
`;

const DayHeader = styled.h3`
    margin: 0;
    padding: 10px 20px;
    background: ${p => p.theme.colors.surfaceHover};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textSecondary};
`;

const DayRows = styled.div`
    padding: 4px 0;
`;

const StateBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 36px 20px;
    text-align: center;

    svg { width: 24px; height: 24px; color: ${p => p.theme.colors.textMuted}; }
    p {
        margin: 0;
        max-width: 46ch;
        font-size: 13px;
        line-height: 1.5;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: 58px 40px 1fr;
    gap: 0 14px;
    padding: 16px 20px 16px 0;
    animation: ${shimmer} 1.4s ease-in-out infinite;

    div {
        border-radius: 8px;
        background: ${p => p.theme.colors.surfaceAlt};
    }

    .time { height: 12px; margin-top: 12px; }
    .tile { height: 40px; border-radius: 12px; }
    .body { display: flex; flex-direction: column; gap: 8px; }
    .line-a { height: 14px; width: 46%; }
    .line-b { height: 12px; width: 68%; }
`;

const LoadOlder = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px;
    border: none;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
    &:disabled { cursor: default; color: ${p => p.theme.colors.textMuted}; }

    svg {
        width: 15px;
        height: 15px;
        animation: ${spin} 900ms linear infinite;
    }
`;

interface EntityActivityTimelineProps {
    scope: ActivityEntityScope;
}

export function EntityActivityTimeline({ scope }: EntityActivityTimelineProps) {
    const {
        data,
        isLoading,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useEntityActivityFeed(scope);

    const items = data?.pages.flatMap(page => page.items) ?? [];
    const groups = groupByDay(items);

    return (
        <Shell aria-busy={isLoading}>
            {isLoading && (
                <div aria-label="Wczytywanie historii zmian">
                    {[0, 1, 2].map(index => (
                        <SkeletonRow key={index}>
                            <div className="time" />
                            <div className="tile" />
                            <div className="body">
                                <div className="line-a" />
                                <div className="line-b" />
                            </div>
                        </SkeletonRow>
                    ))}
                </div>
            )}

            {!isLoading && isError && (
                <StateBox>
                    <AlertCircle />
                    <p>
                        Nie udało się wczytać historii.{' '}
                        <a
                            href="#retry"
                            onClick={(event) => { event.preventDefault(); void refetch(); }}
                        >
                            Spróbuj ponownie
                        </a>
                    </p>
                </StateBox>
            )}

            {!isLoading && !isError && items.length === 0 && (
                <StateBox>
                    <Inbox />
                    <p>Brak zarejestrowanych zdarzeń. Pojawią się tutaj automatycznie.</p>
                </StateBox>
            )}

            {!isLoading && !isError && groups.map(group => (
                <DayGroup key={group.key}>
                    <DayHeader>{group.label}</DayHeader>
                    <DayRows>
                        {group.items.map(item => (
                            <ActivityRow key={item.id} item={item} />
                        ))}
                    </DayRows>
                </DayGroup>
            ))}

            {!isLoading && !isError && hasNextPage && (
                <LoadOlder
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                >
                    {isFetchingNextPage && <Loader2 />}
                    {isFetchingNextPage ? 'Wczytywanie starszych zdarzeń' : 'Pokaż starsze zdarzenia'}
                </LoadOlder>
            )}
        </Shell>
    );
}
