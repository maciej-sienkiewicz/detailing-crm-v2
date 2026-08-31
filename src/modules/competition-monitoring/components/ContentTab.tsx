import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ExternalLink, ThumbsDown, ThumbsUp, Tag, Copy, Check } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ContentItem, WeeksOption } from '../types';
import { DAYPART_LABELS, DAY_LABELS, FORMAT_LABELS } from '../types';
import { useContent, useHashtags, useHeatmap, useReactToPost } from '../hooks/useAnalytics';
import { Card, CardTitle, CardHint, CenterState, Pill, SelfTag, Spinner, formatNumber } from './MetricBits';

/** „1 post", „3 posty", „12 postów" — polska odmiana po liczebniku. */
const postsWordForm = (count: number): string => {
    const lastTwo = count % 100;
    if (lastTwo >= 12 && lastTwo <= 14) return 'postów';
    const last = count % 10;
    if (count === 1) return 'post';
    if (last >= 2 && last <= 4) return 'posty';
    return 'postów';
};

/**
 * Treści konkurencji: co naprawdę działa w okolicy.
 * Posty sortowane po skuteczności (nie po dacie), z tematem i linkiem do oryginału.
 * Ocena 👍/👎 uczy generator AI stylu, który podoba się właścicielowi.
 */

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const FilterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
`;

const FilterLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-right: 2px;
`;

// ─── Karta posta ──────────────────────────────────────────────────────────────

const PostsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
`;

const PostCard = styled.article<{ $rated: 'LIKED' | 'DISLIKED' | null }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: ${st.bgCard};
    border: 1px solid
        ${p => (p.$rated === 'LIKED' ? st.accentGreen : p.$rated === 'DISLIKED' ? st.accentRed : st.border)};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    transition: border-color ${st.transition};
`;

const PostTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const PostUser = styled.span`
    font-weight: 700;
    font-size: ${st.fontSm};
    color: ${st.text};
    display: inline-flex;
    align-items: center;
    gap: 6px;
`;

const Badges = styled.div`
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
`;

const Badge = styled.span<{ $tone?: 'promo' | 'contest' | 'topic' | 'format' }>`
    font-size: ${st.fontXs};
    font-weight: 600;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    white-space: nowrap;
    background: ${p =>
        p.$tone === 'promo' ? st.accentRedDim
        : p.$tone === 'contest' ? st.accentAmberDim
        : p.$tone === 'format' ? st.bgCardAlt
        : st.accentBlueDim};
    color: ${p =>
        p.$tone === 'promo' ? st.accentRed
        : p.$tone === 'contest' ? st.accentAmber
        : p.$tone === 'format' ? st.textSecondary
        : st.accentBlue};
`;

const Caption = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
`;

const StatRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;

    strong { color: ${st.text}; }
`;

const ErBadge = styled.span<{ $hot: boolean }>`
    margin-left: auto;
    font-size: ${st.fontXs};
    font-weight: 700;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    background: ${p => (p.$hot ? st.accentGreenDim : st.bgCardAlt)};
    color: ${p => (p.$hot ? st.accentGreen : st.textMuted)};
`;

const PostFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid ${st.border};
`;

const PostLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    text-decoration: none;

    &:hover { text-decoration: underline; }
    svg { width: 12px; height: 12px; }
`;

const RateGroup = styled.div`
    display: flex;
    gap: 6px;
`;

const RateBtn = styled.button<{ $active: boolean; $tone: 'like' | 'dislike' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    border: 1px solid
        ${p => (p.$active ? (p.$tone === 'like' ? st.accentGreen : st.accentRed) : st.border)};
    background: ${p => (p.$active ? (p.$tone === 'like' ? st.accentGreenDim : st.accentRedDim) : st.bgCard)};
    color: ${p => (p.$active ? (p.$tone === 'like' ? st.accentGreen : st.accentRed) : st.textMuted)};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    svg { width: 12px; height: 12px; }
`;

const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 16px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
`;

// ─── Heatmapa ─────────────────────────────────────────────────────────────────

const SideGrid = styled.div`
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 20px;

    @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

const HeatTable = styled.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 4px;

    th {
        font-size: ${st.fontXs};
        color: ${st.textMuted};
        font-weight: 600;
        padding: 2px 4px;
    }

    th.rowLabel { text-align: left; white-space: nowrap; }
`;

const HeatCell = styled.td<{ $intensity: number; $best: boolean }>`
    height: 34px;
    min-width: 34px;
    border-radius: 6px;
    background: ${p =>
        p.$intensity === 0 ? st.bgCardAlt : `rgba(59, 130, 246, ${0.12 + p.$intensity * 0.55})`};
    outline: ${p => (p.$best ? `2px solid ${st.accentAmber}` : 'none')};
    text-align: center;
    font-size: ${st.fontXs};
    color: ${p => (p.$intensity > 0.55 ? '#fff' : st.textSecondary)};
    font-variant-numeric: tabular-nums;
`;

// ─── Hashtagi ─────────────────────────────────────────────────────────────────

const TagList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const TagRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};

    strong { color: ${st.text}; }
    span { color: ${st.textMuted}; font-size: ${st.fontXs}; }
`;

const CopyBtn = styled.button`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: ${st.accentBlue};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;

    svg { width: 12px; height: 12px; }
`;

const PAGE_SIZE = 12;

export const ContentTab: React.FC<{ weeks: WeeksOption }> = ({ weeks }) => {
    const [sort, setSort] = useState<'engagement' | 'date'>('engagement');
    const [topic, setTopic] = useState<string | undefined>(undefined);
    const [format, setFormat] = useState<string | undefined>(undefined);
    const [promoOnly, setPromoOnly] = useState(false);
    const [page, setPage] = useState(0);
    const [copiedTags, setCopiedTags] = useState(false);

    const filters = useMemo(
        () => ({ weeks, sort, topic, format, promoOnly, page, pageSize: PAGE_SIZE }),
        [weeks, sort, topic, format, promoOnly, page]
    );

    const contentQuery = useContent(filters);
    const heatmapQuery = useHeatmap(weeks);
    const hashtagsQuery = useHashtags(weeks);
    const react = useReactToPost();

    const content = contentQuery.data;
    const totalPages = content ? Math.max(1, Math.ceil(content.totalItems / PAGE_SIZE)) : 1;

    const handleRate = (item: ContentItem, reaction: 'LIKED' | 'DISLIKED') => {
        react.mutate({
            postId: item.postId,
            reaction: item.reaction === reaction ? null : reaction,
        });
    };

    const copyTopTags = () => {
        const tags = (hashtagsQuery.data ?? []).slice(0, 10).map(t => `#${t.tag}`).join(' ');
        navigator.clipboard.writeText(tags).then(() => {
            setCopiedTags(true);
            setTimeout(() => setCopiedTags(false), 2000);
        });
    };

    const resetPage = (fn: () => void) => {
        fn();
        setPage(0);
    };

    return (
        <Layout>
            <Card>
                <CardTitle>Najskuteczniejsze posty w Twojej okolicy</CardTitle>
                <CardHint>
                    Domyślnie sortujemy po skuteczności (reakcje względem wielkości profilu), nie po dacie:
                    najpierw widzisz to, co naprawdę zadziałało. Oceniaj posty, a generator AI nauczy się
                    Twojego gustu.
                </CardHint>

                <FilterRow>
                    <FilterLabel>Pokaż</FilterLabel>
                    <Pill $active={sort === 'engagement'} onClick={() => resetPage(() => setSort('engagement'))}>
                        Najskuteczniejsze
                    </Pill>
                    <Pill $active={sort === 'date'} onClick={() => resetPage(() => setSort('date'))}>
                        Najnowsze
                    </Pill>
                    <Pill $active={promoOnly} onClick={() => resetPage(() => setPromoOnly(v => !v))}>
                        Tylko promocje i konkursy
                    </Pill>
                    <FilterLabel style={{ marginLeft: 8 }}>Format</FilterLabel>
                    {(['REELS', 'PHOTO', 'CAROUSEL'] as const).map(f => (
                        <Pill
                            key={f}
                            $active={format === f}
                            onClick={() => resetPage(() => setFormat(prev => (prev === f ? undefined : f)))}
                        >
                            {FORMAT_LABELS[f]}
                        </Pill>
                    ))}
                </FilterRow>

                {content && content.topics.length > 0 && (
                    <FilterRow>
                        <FilterLabel>Temat</FilterLabel>
                        {content.topics.slice(0, 8).map(option => (
                            <Pill
                                key={option.value}
                                $active={topic === option.value}
                                onClick={() =>
                                    resetPage(() => setTopic(prev => (prev === option.value ? undefined : option.value)))
                                }
                            >
                                {option.label} · {option.count}
                            </Pill>
                        ))}
                    </FilterRow>
                )}

                {contentQuery.isLoading && (
                    <CenterState><Spinner /></CenterState>
                )}

                {contentQuery.isError && (
                    <CenterState>
                        <strong>Nie udało się pobrać postów</strong>
                        <span>Spróbuj odświeżyć stronę.</span>
                    </CenterState>
                )}

                {content && content.items.length === 0 && (
                    <CenterState>
                        <strong>Brak postów w tym widoku</strong>
                        <span>Zmień filtry albo poczekaj na najbliższą synchronizację danych.</span>
                    </CenterState>
                )}

                {content && content.items.length > 0 && (
                    <>
                        <PostsGrid>
                            {content.items.map(item => (
                                <PostCard key={item.postId} $rated={item.reaction}>
                                    <PostTop>
                                        <PostUser>
                                            @{item.username}
                                            {item.isSelf && <SelfTag>Ty</SelfTag>}
                                        </PostUser>
                                        <span style={{ fontSize: st.fontXs, color: st.textMuted }}>
                                            {new Date(item.takenAt).toLocaleDateString('pl-PL', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </span>
                                    </PostTop>

                                    <Badges>
                                        <Badge $tone="format">{FORMAT_LABELS[item.format]}</Badge>
                                        {item.topic !== 'INNE' && <Badge>{item.topicLabel}</Badge>}
                                        {item.isPromo && <Badge $tone="promo">Promocja</Badge>}
                                        {item.isContest && <Badge $tone="contest">Konkurs</Badge>}
                                    </Badges>

                                    {item.caption
                                        ? <Caption>{item.caption}</Caption>
                                        : <Caption as="p" style={{ fontStyle: 'italic' }}>Post bez opisu</Caption>}

                                    <StatRow>
                                        <span>♥ <strong>{formatNumber(item.likeCount)}</strong></span>
                                        <span>💬 <strong>{formatNumber(item.commentCount)}</strong></span>
                                        {item.viewCount !== null && (
                                            <span>▶ <strong>{formatNumber(item.viewCount)}</strong></span>
                                        )}
                                        {item.erPct !== null && (
                                            <ErBadge $hot={item.erPct >= 3} title="Reakcje na 100 obserwujących profilu">
                                                {item.erPct.toFixed(1)} na 100 obs.
                                            </ErBadge>
                                        )}
                                    </StatRow>

                                    <PostFooter>
                                        <PostLink href={item.permalink} target="_blank" rel="noopener noreferrer">
                                            Otwórz na Instagramie <ExternalLink />
                                        </PostLink>
                                        <RateGroup>
                                            <RateBtn
                                                $tone="like"
                                                $active={item.reaction === 'LIKED'}
                                                onClick={() => handleRate(item, 'LIKED')}
                                                title="Dobry styl: wzorzec dla generatora AI"
                                            >
                                                <ThumbsUp /> Dobry
                                            </RateBtn>
                                            <RateBtn
                                                $tone="dislike"
                                                $active={item.reaction === 'DISLIKED'}
                                                onClick={() => handleRate(item, 'DISLIKED')}
                                                title="Słaby styl: pomiń przy generowaniu"
                                            >
                                                <ThumbsDown /> Słaby
                                            </RateBtn>
                                        </RateGroup>
                                    </PostFooter>
                                </PostCard>
                            ))}
                        </PostsGrid>

                        {totalPages > 1 && (
                            <Pagination>
                                <Pill disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                                    ← Poprzednie
                                </Pill>
                                <span>
                                    {page + 1} / {totalPages}
                                </span>
                                <Pill
                                    disabled={page + 1 >= totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                >
                                    Następne →
                                </Pill>
                            </Pagination>
                        )}
                    </>
                )}
            </Card>

            <SideGrid>
                <Card>
                    <CardTitle>Kiedy publikować</CardTitle>
                    <CardHint>
                        Rozkład postów Twojej konkurencji według dnia i pory. Liczba w komórce = posty;
                        im ciemniej, tym więcej. Złota ramka to pora z najlepszymi reakcjami.
                    </CardHint>
                    {heatmapQuery.data && heatmapQuery.data.cells.length > 0 ? (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <HeatTable>
                                    <thead>
                                        <tr>
                                            <th className="rowLabel" />
                                            {DAY_LABELS.map(day => <th key={day}>{day}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DAYPART_LABELS.map((label, daypart) => {
                                            const max = Math.max(...heatmapQuery.data!.cells.map(c => c.posts), 1);
                                            return (
                                                <tr key={label}>
                                                    <th className="rowLabel">{label}</th>
                                                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                                                        const cell = heatmapQuery.data!.cells.find(
                                                            c => c.dayOfWeek === day && c.daypart === daypart
                                                        );
                                                        return (
                                                            <HeatCell
                                                                key={day}
                                                                $intensity={(cell?.posts ?? 0) / max}
                                                                $best={
                                                                    heatmapQuery.data!.bestDayOfWeek === day &&
                                                                    heatmapQuery.data!.bestDaypart === daypart
                                                                }
                                                                title={
                                                                    cell
                                                                        ? `${cell.posts} postów, śr. ${cell.avgEngagement.toFixed(0)} reakcji`
                                                                        : 'brak postów'
                                                                }
                                                            >
                                                                {cell?.posts ?? ''}
                                                            </HeatCell>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </HeatTable>
                            </div>
                            {heatmapQuery.data.bestDayOfWeek && heatmapQuery.data.bestDaypart !== null && (
                                <CardHint style={{ marginTop: 12, marginBottom: 0 }}>
                                    Najlepsze reakcje zbierają posty:{' '}
                                    <strong>
                                        {DAY_LABELS[heatmapQuery.data.bestDayOfWeek - 1]},{' '}
                                        {DAYPART_LABELS[heatmapQuery.data.bestDaypart].toLowerCase()}
                                    </strong>
                                </CardHint>
                            )}
                            {/* Bez tej informacji liczby w komórkach nie zgadzałyby się z tym,
                                co widać na profilach konkurencji — a użytkownik nie miałby jak
                                się domyślić, że część postów świadomie pomijamy. */}
                            {heatmapQuery.data.excludedOutliers > 0 && (
                                <CardHint style={{ marginTop: 6, marginBottom: 0 }}>
                                    Pominięto {heatmapQuery.data.excludedOutliers}{' '}
                                    {postsWordForm(heatmapQuery.data.excludedOutliers)} o skrajnie
                                    wysokich reakcjach (górne 10%) — oznaczenia znanych kont, płatne
                                    promocje i virale zaburzałyby wskazanie pory.
                                </CardHint>
                            )}
                        </>
                    ) : (
                        <CardHint>Za mało danych, wróć po najbliższej synchronizacji.</CardHint>
                    )}
                </Card>

                <Card>
                    <CardTitle>
                        <Tag size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                        Hasztagi, które działają
                    </CardTitle>
                    <CardHint>Najczęściej używane przez Twoją konkurencję w tym okresie.</CardHint>
                    {hashtagsQuery.data && hashtagsQuery.data.length > 0 ? (
                        <>
                            <TagList>
                                {hashtagsQuery.data.slice(0, 10).map(stat => (
                                    <TagRow key={stat.tag}>
                                        <strong>#{stat.tag}</strong>
                                        <span>
                                            {stat.uses}× u {stat.profilesCount}{' '}
                                            {stat.profilesCount === 1 ? 'profilu' : 'profili'} · śr.{' '}
                                            {formatNumber(stat.avgEngagement)} reakcji
                                        </span>
                                    </TagRow>
                                ))}
                            </TagList>
                            <CopyBtn onClick={copyTopTags} style={{ marginTop: 10 }}>
                                {copiedTags ? <Check /> : <Copy />}
                                {copiedTags ? 'Skopiowano!' : 'Kopiuj 10 najlepszych do posta'}
                            </CopyBtn>
                        </>
                    ) : (
                        <CardHint>Za mało danych, wróć po najbliższej synchronizacji.</CardHint>
                    )}
                </Card>
            </SideGrid>
        </Layout>
    );
};
