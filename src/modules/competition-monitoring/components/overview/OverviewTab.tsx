import React from 'react';
import styled from 'styled-components';
import {
    ArrowRight,
    CalendarCheck,
    Megaphone,
    MessageCircle,
    Phone,
    Sparkles,
    Store,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Button, Card, Notice, Panel, PanelBody, PanelHead, SectionTitle, ui } from '@/common/components/ui';
import { formatCurrency } from '@/common/utils/formatters';
import { pluralPl } from '@/common/utils/plural';
import type { HomeMarketEvent, HomeTodo, InstagramHome } from '../../types';
import { useHome } from '../../hooks/useAnalytics';
import { CenterState, Spinner, formatNumber } from '../MetricBits';
import { formatSignedCount, formatSignedPct } from '../../utils/competition';
import { contactTapsTotal, isActionableTarget, lastPostLabel } from '../../utils/overview';

/**
 * Przegląd: jeden ekran, który odpowiada na „co się zmieniło i co mam zrobić".
 *
 * Kolejność czytania: własne liczby (3-4 kafle), najwyżej trzy rzeczy do zrobienia,
 * najwyżej sześć zdarzeń z rynku. Wszystko, co szczegółowe, jest w innych zakładkach.
 * Jedyne wypełnienie w oknie to przycisk pierwszej rzeczy do zrobienia - to jest krok
 * następny. Pozostałe akcje mają obwódkę.
 */

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Tiles = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;

    @media (max-width: 520px) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
`;

const Tile = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 14px 16px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
`;

const TileLabel = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${ui.textSecondary};

    svg { width: 15px; height: 15px; color: ${ui.textMuted}; flex-shrink: 0; }
`;

const TileValue = styled.span`
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;

    small { font-size: 15px; font-weight: 600; color: ${ui.textMuted}; }

    @media (max-width: 520px) { font-size: 22px; }
`;

const TileSub = styled.span<{ $tone?: 'ok' | 'warn' | 'muted' }>`
    font-size: 12.5px;
    color: ${p => (p.$tone === 'ok' ? ui.okInk : p.$tone === 'warn' ? ui.warnInk : ui.textMuted)};
    display: flex;
    gap: 4px 8px;
    flex-wrap: wrap;
`;

const TileLink = styled.button`
    margin-top: auto;
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &:hover { text-decoration: underline; }
    svg { width: 14px; height: 14px; }
`;

const Columns = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;

    @media (max-width: 900px) { grid-template-columns: minmax(0, 1fr); }
`;

const TodoHead = styled.div`
    padding: 18px 20px 4px;

    @media (max-width: 640px) { padding: 16px 16px 4px; }
`;

const TodoList = styled.ol`
    list-style: none;
    margin: 0;
    padding: 6px 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const TodoItem = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 8px;
    border-radius: ${ui.radiusRow};

    & + & { border-top: 1px solid ${ui.lineSoft}; }

    @media (max-width: 520px) { flex-wrap: wrap; }
`;

const TodoIcon = styled.span`
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: ${ui.brandTint};
    color: ${ui.brandInk};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg { width: 18px; height: 18px; }
`;

const TodoText = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 14.5px; color: ${ui.ink}; overflow-wrap: anywhere; }
    span { font-size: 13px; color: ${ui.textMuted}; }
`;

const Quiet = styled.p`
    margin: 0;
    padding: 4px 20px 18px;
    font-size: 14px;
    color: ${ui.textMuted};
`;

const MarketList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
`;

const MarketItem = styled.li`
    display: flex;
    gap: 10px;
    padding: 10px 0;
    align-items: flex-start;

    & + & { border-top: 1px solid ${ui.lineSoft}; }
`;

const MarketDate = styled.time`
    flex-shrink: 0;
    width: 52px;
    font-size: 12px;
    color: ${ui.textMuted};
    padding-top: 2px;
`;

const MarketText = styled.div`
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    line-height: 1.45;
    color: ${ui.ink};
`;

const MarketLink = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;
    white-space: nowrap;

    &:hover { text-decoration: underline; }
`;

const TODO_ICONS: Record<string, React.ComponentType> = {
    PUBLISH: Sparkles,
    MARK_SELF: Users,
    COMPETITOR_PROMO: Megaphone,
    NEW_LOCAL_ADVERTISER: Store,
    STOREFRONT: Store,
    DM_AWAITING: MessageCircle,
    GOOGLE_REVIEWS: Store,
};

const shortDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

export interface OverviewActions {
    onTodo: (todo: HomeTodo) => void;
    onMarket: (event: HomeMarketEvent) => void;
    onOpenProfiles: () => void;
    onOpenAccounts: () => void;
}

const OwnTiles: React.FC<{ home: InstagramHome } & OverviewActions> = ({ home, onOpenProfiles, onOpenAccounts }) => {
    const { plan, followers, leads, insights, google, connection } = home;
    const connected = connection?.status === 'CONNECTED';
    const taps = contactTapsTotal(insights?.contactTaps);

    return (
        <Tiles>
            {plan ? (
                <Tile>
                    <TileLabel><CalendarCheck /> Posty w {plan.monthLabel}</TileLabel>
                    <TileValue>{plan.postsThisMonth} <small>z {plan.monthGoal}</small></TileValue>
                    <TileSub $tone={plan.daysSinceLastPost !== null && plan.daysSinceLastPost >= 5 ? 'warn' : 'muted'}>
                        {lastPostLabel(plan.daysSinceLastPost)}
                    </TileSub>
                </Tile>
            ) : (
                <Tile>
                    <TileLabel><CalendarCheck /> Plan publikacji</TileLabel>
                    <TileSub>Policzymy go, gdy wskażesz swój profil.</TileSub>
                    <TileLink type="button" onClick={onOpenProfiles}>Wskaż profil <ArrowRight /></TileLink>
                </Tile>
            )}

            <Tile>
                <TileLabel><Users /> Obserwujący</TileLabel>
                <TileValue>{formatNumber(followers?.value)}</TileValue>
                <TileSub $tone={followers?.gain30d && followers.gain30d > 0 ? 'ok' : 'muted'}>
                    {followers?.gain30d !== null && followers?.gain30d !== undefined
                        ? <span>{formatSignedCount(followers.gain30d)} w 30 dni</span>
                        : <span>przyrost po dwóch pomiarach</span>}
                </TileSub>
                {followers?.localMedianGain30dPct !== null && followers?.localMedianGain30dPct !== undefined && (
                    <TileSub>
                        Ty {formatSignedPct(followers.gain30dPct) ?? '0%'}, lokalni {formatSignedPct(followers.localMedianGain30dPct)}
                    </TileSub>
                )}
            </Tile>

            {leads ? (
                <Tile>
                    <TileLabel><MessageCircle /> Zapytania z Instagrama</TileLabel>
                    <TileValue>{leads.conversations}</TileValue>
                    {leads.awaitingReply > 0 ? (
                        <TileSub $tone="warn">
                            {leads.awaitingReply} {pluralPl(leads.awaitingReply, 'czeka', 'czekają', 'czeka')} na odpowiedź
                        </TileSub>
                    ) : (
                        <TileSub>w {leads.days} dni, z tego umówione: {leads.convertedToVisits}</TileSub>
                    )}
                    {leads.wonValueGrossCents > 0 && (
                        <TileSub $tone="ok">wygrane {formatCurrency(leads.wonValueGrossCents / 100)}</TileSub>
                    )}
                </Tile>
            ) : connected && insights ? (
                <Tile>
                    <TileLabel><Phone /> Kliknięcia „Zadzwoń” i „Trasa”</TileLabel>
                    <TileValue>{formatNumber(taps)}</TileValue>
                    <TileSub>zasięg {formatNumber(insights.reach)} w {insights.days} dni</TileSub>
                </Tile>
            ) : !connected ? (
                <Tile>
                    <TileLabel><MessageCircle /> Zapytania z Instagrama</TileLabel>
                    <TileSub>Po połączeniu konta: wiadomości jako zapytania, zasięg i kliknięcia „Zadzwoń”.</TileSub>
                    <TileLink type="button" onClick={onOpenAccounts}>Połącz konto <ArrowRight /></TileLink>
                </Tile>
            ) : null}

            {google && (
                <Tile>
                    <TileLabel><Phone /> Telefony z Google</TileLabel>
                    <TileValue>{formatNumber(google.calls)}</TileValue>
                    <TileSub>
                        {google.averageRating !== null && (
                            <span>
                                ocena {google.averageRating.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}
                                {google.totalReviews !== null ? ` z ${google.totalReviews} opinii` : ''}
                            </span>
                        )}
                    </TileSub>
                    {google.calls !== null && google.callsPrevious !== null && google.callsPrevious > 0 && (
                        <TileSub $tone={google.calls >= google.callsPrevious ? 'ok' : 'warn'}>
                            {google.calls >= google.callsPrevious ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            poprzednie {google.days} dni: {google.callsPrevious}
                        </TileSub>
                    )}
                </Tile>
            )}
        </Tiles>
    );
};

export const OverviewTab: React.FC<OverviewActions> = actions => {
    const homeQuery = useHome();

    if (homeQuery.isLoading) return <CenterState><Spinner /></CenterState>;
    if (homeQuery.isError || !homeQuery.data) {
        return (
            <CenterState>
                <strong>Nie udało się pobrać Przeglądu</strong>
                <span>Odśwież stronę. Jeśli problem wraca, daj nam znać.</span>
            </CenterState>
        );
    }

    const home = homeQuery.data;
    const todo = home.todo.filter(t => isActionableTarget(t.target));

    return (
        <Layout>
            {home.connection?.status === 'ERROR' && (
                <Notice
                    tone="warn"
                    title="Meta odrzuciła dostęp do Twojego konta"
                    action={<Button size="sm" variant="tinted" onClick={actions.onOpenAccounts}>Połącz ponownie</Button>}
                >
                    Statystyki i wiadomości z Instagrama stoją, dopóki nie połączysz konta jeszcze raz.
                </Notice>
            )}
            {home.pendingApproval > 0 && (
                <Notice
                    tone="info"
                    action={<Button size="sm" variant="outline" onClick={actions.onOpenProfiles}>Przejrzyj</Button>}
                >
                    {home.pendingApproval} {pluralPl(home.pendingApproval, 'profil czeka', 'profile czekają', 'profili czeka')} na akceptację.
                </Notice>
            )}

            <OwnTiles home={home} {...actions} />

            <Columns>
                <Card>
                    <TodoHead><SectionTitle size="lg">Do zrobienia</SectionTitle></TodoHead>
                    {todo.length === 0 ? (
                        <Quiet>Wszystko zrobione. Wrócimy, gdy coś się zmieni.</Quiet>
                    ) : (
                        <TodoList>
                            {todo.map((item, index) => {
                                const Icon = TODO_ICONS[item.kind] ?? Sparkles;
                                return (
                                    <TodoItem key={`${item.kind}-${index}`}>
                                        <TodoIcon><Icon /></TodoIcon>
                                        <TodoText>
                                            <strong>{item.title}</strong>
                                            {item.detail && <span>{item.detail}</span>}
                                        </TodoText>
                                        <Button
                                            size="sm"
                                            variant={index === 0 ? 'primary' : 'outline'}
                                            onClick={() => actions.onTodo(item)}
                                        >
                                            {item.actionLabel}
                                        </Button>
                                    </TodoItem>
                                );
                            })}
                        </TodoList>
                    )}
                </Card>

                <Panel>
                    <PanelHead><SectionTitle count="7 dni">Rynek w tym tygodniu</SectionTitle></PanelHead>
                    <PanelBody>
                        {home.market.length === 0 ? (
                            <Quiet style={{ padding: 0 }}>
                                {home.profilesWatched === 0
                                    ? 'Dodaj konkurentów z okolicy, a pokażemy tu ich promocje, kampanie i ciszę.'
                                    : 'Spokojny tydzień u lokalnych konkurentów.'}
                            </Quiet>
                        ) : (
                            <MarketList>
                                {[...home.market].sort((a, b) => b.date.localeCompare(a.date)).map((event, index) => (
                                    <MarketItem key={`${event.kind}-${event.date}-${index}`}>
                                        <MarketDate dateTime={event.date}>{shortDate(event.date)}</MarketDate>
                                        <MarketText>{event.title}</MarketText>
                                        {(event.url || event.target) && isActionableTarget(event.target ?? 'OPEN_URL') && (
                                            <MarketLink type="button" onClick={() => actions.onMarket(event)}>Zobacz</MarketLink>
                                        )}
                                    </MarketItem>
                                ))}
                            </MarketList>
                        )}
                    </PanelBody>
                </Panel>
            </Columns>
        </Layout>
    );
};
