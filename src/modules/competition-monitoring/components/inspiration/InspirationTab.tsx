import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ExternalLink, Film, Images, Image as ImageIcon, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button, ButtonLink, IconButton, Segmented, StatusPill, ui } from '@/common/components/ui';
import type { ContentFormat, ContentItem, ProfileRole } from '../../types';
import { FORMAT_LABELS } from '../../types';
import { useContent, usePreviews, useReactToPost } from '../../hooks/useAnalytics';
import { CenterState, Spinner } from '../MetricBits';
import type { GeneratePostPrefill } from '../GeneratePostModal';
import { normLabel } from '../../utils/inspiration';

/**
 * Inspiracje: co zadziałało u innych, policzone uczciwie.
 *
 * Skuteczność to krotność typowego posta TEGO SAMEGO profilu („3,4× normy"), a nie
 * reakcje na 100 obserwujących - tamten wskaźnik premiował najmniejsze konta i konkursy
 * „oznacz dwóch znajomych". Konkursy serwer odsyła na koniec listy. Miniatura przychodzi
 * z połączonego konta studia i nie jest nigdzie zapisywana; bez połączenia karta pokazuje
 * sam opis i ikonę formatu.
 */

type RoleFilter = 'ALL' | ProfileRole;

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
    { value: 'ALL', label: 'Wszyscy' },
    { value: 'INSPIRATION', label: 'Wzorce' },
    { value: 'LOCAL', label: 'Z okolicy' },
];

type FormatFilter = 'ALL' | ContentFormat;

const FORMAT_OPTIONS: { value: FormatFilter; label: string }[] = [
    { value: 'ALL', label: 'Każdy format' },
    { value: 'REELS', label: FORMAT_LABELS.REELS },
    { value: 'CAROUSEL', label: FORMAT_LABELS.CAROUSEL },
    { value: 'PHOTO', label: FORMAT_LABELS.PHOTO },
];

const PAGE_SIZE = 24;
const WEEKS = 12;

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Filters = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
`;

const TopicSelect = styled.select`
    height: 36px;
    padding: 0 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface};
    font-family: inherit;
    font-size: 13px;
    color: ${ui.ink};
`;

const Period = styled.span`
    margin-left: auto;
    font-size: 13px;
    color: ${ui.textMuted};

    @media (max-width: 640px) { margin-left: 0; width: 100%; }
`;

const Grid = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;

    @media (max-width: 520px) { grid-template-columns: minmax(0, 1fr); }
`;

const Post = styled.li<{ $muted?: boolean }>`
    display: flex;
    flex-direction: column;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
    overflow: hidden;
    opacity: ${p => (p.$muted ? 0.72 : 1)};
`;

const Thumb = styled.a`
    position: relative;
    display: block;
    aspect-ratio: 4 / 5;
    background: ${ui.surfaceAlt};
    overflow: hidden;

    img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const Placeholder = styled.span`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${ui.textFaint};

    svg { width: 36px; height: 36px; }
`;

const Norm = styled.span<{ $strong: boolean }>`
    position: absolute;
    left: 10px;
    top: 10px;
    padding: 4px 10px;
    border-radius: ${ui.radiusControl};
    font-size: 13px;
    font-weight: 700;
    background: ${p => (p.$strong ? ui.okTint : ui.surface)};
    color: ${p => (p.$strong ? ui.okInk : ui.inkSoft)};
    border: 1px solid ${p => (p.$strong ? ui.okLine : ui.line)};
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px 14px;
    flex: 1;
`;

const Meta = styled.div`
    display: flex;
    gap: 6px 10px;
    flex-wrap: wrap;
    align-items: center;
    font-size: 12px;
    color: ${ui.textMuted};

    strong { font-size: 13px; color: ${ui.ink}; }
`;

const Caption = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.textSecondary};
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const Actions = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: auto;
    flex-wrap: wrap;
`;

const More = styled.div`
    display: flex;
    justify-content: center;
`;

const FormatIcon: React.FC<{ format: ContentFormat }> = ({ format }) =>
    format === 'REELS' ? <Film /> : format === 'CAROUSEL' ? <Images /> : <ImageIcon />;

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

interface Props {
    onMakeSimilar: (prefill: GeneratePostPrefill) => void;
}

export const InspirationTab: React.FC<Props> = ({ onMakeSimilar }) => {
    const [role, setRole] = useState<RoleFilter>('ALL');
    const [format, setFormat] = useState<FormatFilter>('ALL');
    const [topic, setTopic] = useState<string>('');
    const [pages, setPages] = useState(1);

    const filters = useMemo(() => ({
        weeks: WEEKS as 12,
        sort: 'norm' as const,
        role: role === 'ALL' ? undefined : role,
        format: format === 'ALL' ? undefined : format,
        topic: topic || undefined,
        page: 0,
        pageSize: PAGE_SIZE * pages,
    }), [role, format, topic, pages]);

    const contentQuery = useContent(filters);
    const react = useReactToPost();
    const items = contentQuery.data?.items ?? [];
    const previewsQuery = usePreviews(items.map(i => i.username));
    const previews = previewsQuery.data ?? {};

    const reset = (fn: () => void) => { fn(); setPages(1); };

    const rate = (item: ContentItem, reaction: 'LIKED' | 'DISLIKED') =>
        react.mutate({ postId: item.postId, reaction: item.reaction === reaction ? null : reaction });

    const makeSimilar = (item: ContentItem) => onMakeSimilar({
        topic: item.topicLabel,
        context: [
            `Inspiracja: ${FORMAT_LABELS[item.format].toLowerCase()} @${item.username}`,
            item.caption ? `Opis oryginału: ${item.caption.slice(0, 400)}` : null,
        ].filter(Boolean).join('\n'),
    });

    return (
        <Layout>
            <Filters>
                <Segmented label="Czyje posty" options={ROLE_OPTIONS} value={role} onChange={v => reset(() => setRole(v))} />
                <Segmented label="Format" size="sm" options={FORMAT_OPTIONS} value={format} onChange={v => reset(() => setFormat(v))} />
                {contentQuery.data && contentQuery.data.topics.length > 0 && (
                    <TopicSelect
                        aria-label="Temat"
                        value={topic}
                        onChange={e => reset(() => setTopic(e.target.value))}
                    >
                        <option value="">Każdy temat</option>
                        {contentQuery.data.topics.map(t => (
                            <option key={t.value} value={t.value}>{t.label} ({t.count})</option>
                        ))}
                    </TopicSelect>
                )}
                <Period>ostatnie {WEEKS} tygodni, od najlepszych względem normy profilu</Period>
            </Filters>

            {contentQuery.isLoading && <CenterState><Spinner /></CenterState>}
            {contentQuery.isError && (
                <CenterState>
                    <strong>Nie udało się pobrać postów</strong>
                    <span>Spróbuj odświeżyć stronę.</span>
                </CenterState>
            )}
            {contentQuery.data && items.length === 0 && (
                <CenterState>
                    <strong>Brak postów w tym widoku</strong>
                    <span>Zmień filtry albo dodaj wzorce z innych miast w „Profile”.</span>
                </CenterState>
            )}

            {items.length > 0 && (
                <Grid>
                    {items.map(item => {
                        const image = item.postCode ? previews[item.postCode] : undefined;
                        const norm = normLabel(item.relativeToNorm);
                        return (
                            <Post key={item.postId} $muted={item.isContest}>
                                <Thumb href={item.permalink} target="_blank" rel="noopener noreferrer" aria-label={`Otwórz post @${item.username}`}>
                                    {image
                                        ? <img src={image} alt={item.caption?.slice(0, 120) ?? `Post @${item.username}`} loading="lazy" referrerPolicy="no-referrer" />
                                        : <Placeholder><FormatIcon format={item.format} /></Placeholder>}
                                    {norm && <Norm $strong={(item.relativeToNorm ?? 0) >= 1.5}>{norm}</Norm>}
                                </Thumb>
                                <Body>
                                    <Meta>
                                        <strong>@{item.username}</strong>
                                        <span>{shortDate(item.takenAt)}</span>
                                        <span>{FORMAT_LABELS[item.format]}</span>
                                        {item.topic !== 'INNE' && <span>{item.topicLabel}</span>}
                                        {item.isPromo && <StatusPill $tone="warn" $size="sm">Promocja</StatusPill>}
                                        {item.isContest && <StatusPill $size="sm">Konkurs, poza rankingiem</StatusPill>}
                                    </Meta>
                                    {item.caption && <Caption>{item.caption}</Caption>}
                                    <Actions>
                                        <Button size="sm" variant="tinted" onClick={() => makeSimilar(item)}>
                                            <Sparkles size={14} /> Zrób podobny
                                        </Button>
                                        <ButtonLink
                                            $variant="ghost"
                                            $size="sm"
                                            href={item.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink size={14} /> Otwórz
                                        </ButtonLink>
                                        <IconButton
                                            label={item.reaction === 'LIKED' ? 'Cofnij: podoba mi się' : 'Podoba mi się, ucz generator'}
                                            variant="ghost"
                                            size="sm"
                                            active={item.reaction === 'LIKED'}
                                            aria-pressed={item.reaction === 'LIKED'}
                                            onClick={() => rate(item, 'LIKED')}
                                        >
                                            <ThumbsUp color={item.reaction === 'LIKED' ? ui.okInk : undefined} />
                                        </IconButton>
                                        <IconButton
                                            label={item.reaction === 'DISLIKED' ? 'Cofnij: nie w moim stylu' : 'Nie w moim stylu'}
                                            variant="ghost"
                                            size="sm"
                                            active={item.reaction === 'DISLIKED'}
                                            aria-pressed={item.reaction === 'DISLIKED'}
                                            onClick={() => rate(item, 'DISLIKED')}
                                        >
                                            <ThumbsDown color={item.reaction === 'DISLIKED' ? ui.dangerInk : undefined} />
                                        </IconButton>
                                    </Actions>
                                </Body>
                            </Post>
                        );
                    })}
                </Grid>
            )}

            {contentQuery.data && contentQuery.data.totalItems > items.length && (
                <More>
                    <Button variant="outline" onClick={() => setPages(p => p + 1)} disabled={contentQuery.isFetching}>
                        Pokaż więcej
                    </Button>
                </More>
            )}
        </Layout>
    );
};
