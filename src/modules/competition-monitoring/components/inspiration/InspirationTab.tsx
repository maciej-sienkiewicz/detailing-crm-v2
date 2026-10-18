import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ExternalLink, Film, Images, Image as ImageIcon, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button, ButtonLink, IconButton, Segmented, StatusPill, ui } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import type { ContentFormat, ContentItem } from '../../types';
import { FORMAT_LABELS } from '../../types';
import { useContent, useReactToPost } from '../../hooks/useAnalytics';
import { CenterState, Spinner } from '../MetricBits';
import type { GeneratePostPrefill } from '../GeneratePostModal';
import {
    embedUrl,
    INSPIRATION_SORT_OPTIONS,
    inspirationSortCaption,
    normLabel,
    type InspirationSort,
} from '../../utils/inspiration';
import { PHONE } from '../../utils/phone';

/**
 * Inspiracje: co zadziałało u innych, policzone uczciwie.
 *
 * Skuteczność to krotność typowego posta TEGO SAMEGO profilu („3,4× normy"), a nie
 * reakcje na 100 obserwujących - tamten wskaźnik premiował najmniejsze konta i konkursy
 * „oznacz dwóch znajomych". Konkursy serwer odsyła na koniec listy. Kolejność do wyboru:
 * skuteczność (domyślnie), najnowsze i najsłabsze - te ostatnie mówią, czego nie powtarzać.
 *
 * Zdjęcie posta to OFICJALNE OSADZENIE Instagrama (instagram.com/p/{kod}/embed) - to samo,
 * co „Osadź" pod postem. Niczego nie pobieramy ani nie zapisujemy: obraz serwuje Instagram,
 * więc działa bez połączonego konta i zgodnie z regulaminem Meta, który zabrania kopiowania
 * cudzych treści. Ramka jest przycięta do samego zdjęcia (bez paska z nazwą konta i stopki),
 * a kliknięcie w nią otwiera post - karta ma wyglądać jak miniatura, nie jak drugi Instagram.
 */

type FormatFilter = 'ALL' | ContentFormat;

const FORMAT_OPTIONS: { value: FormatFilter; label: string }[] = [
    { value: 'ALL', label: 'Każdy format' },
    { value: 'REELS', label: FORMAT_LABELS.REELS },
    { value: 'CAROUSEL', label: FORMAT_LABELS.CAROUSEL },
    { value: 'PHOTO', label: FORMAT_LABELS.PHOTO },
];

/*
 * Na 360 px „Każdy format" z trzema formatami wychodził poza ekran („Zdjęcie" ucięte).
 * Telefon dostaje krótszą pierwszą opcję, żeby cały przełącznik zmieścił się w szerokości.
 */
const PHONE_FORMAT_OPTIONS: { value: FormatFilter; label: string }[] = [
    { value: 'ALL', label: 'Wszystkie' },
    ...FORMAT_OPTIONS.slice(1),
];

const PAGE_SIZE = 24;
/**
 * Post na telefonie to ~560 px (kwadrat osadzenia i opis), więc 24 posty były
 * szesnastoma ekranami przewijania przed „Pokaż więcej". Na telefonie strona jest krótsza.
 */
const PHONE_PAGE_SIZE = 8;
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

    /* Każdy filtr w osobnym rzędzie na całą szerokość; opcje przełączników węższe o padding. */
    ${PHONE} {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;

        [role='group'] > button { padding: 0 4px; }
    }
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

    /* 16 px: mniejsza czcionka w polu każe iOS powiększać stronę przy dotknięciu. */
    ${PHONE} {
        width: 100%;
        height: 44px;
        padding: 0 14px;
        font-size: 16px;
    }
`;

const Period = styled.span`
    margin-left: auto;
    font-size: 13px;
    color: ${ui.textMuted};

    @media (max-width: 640px) { margin-left: 0; width: 100%; }
    ${PHONE} { margin-left: 0; }
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

/**
 * Wysokość paska z nazwą konta na stronie osadzenia. Ramkę przesuwamy o tyle w górę,
 * żeby karta zaczynała się od zdjęcia - nazwa konta i tak stoi pod spodem w karcie.
 */
const EMBED_HEADER_PX = 54;

/*
 * Kwadrat, bo osadzenie rysuje zdjęcie na całą szerokość ramki w proporcji posta, a pod
 * nim pasek „Zobacz więcej na Instagramie" z ikonami. Przy 4:5 kwadratowy post (większość
 * realizacji) odsłaniał ten pasek; w kwadracie post 4:5 traci najwyżej dół zdjęcia.
 */
const Thumb = styled.div`
    position: relative;
    aspect-ratio: 1 / 1;
    background: ${ui.surfaceAlt};
    overflow: hidden;

    iframe {
        position: absolute;
        top: -${EMBED_HEADER_PX}px;
        left: 0;
        width: 100%;
        /* Zapas na stopkę osadzenia - przycina ją dolna krawędź karty. */
        height: calc(100% + ${EMBED_HEADER_PX + 240}px);
        border: 0;
        /* Ramka tylko pokazuje; klik przejmuje warstwa-odnośnik nad nią. */
        pointer-events: none;
    }
`;

/** Przezroczysta warstwa nad ramką: cała miniatura otwiera post w nowej karcie. */
const ThumbLink = styled.a`
    position: absolute;
    inset: 0;
    z-index: 1;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
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
    z-index: 2;
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

    /* Uchwyt w osobnej linii: inaczej data i format łamały się pod nim w przypadkowym miejscu. */
    ${PHONE} {
        strong { flex-basis: 100%; font-size: 14px; overflow-wrap: anywhere; }
    }
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

    /*
     * Cztery przyciski z napisami potrzebowały ~321 px na 298. Na telefonie „Zrób podobny"
     * (akcja, po którą się tu przychodzi) zajmuje resztę rzędu, a „Otwórz" i oceny są ikonami.
     */
    ${PHONE} {
        flex-wrap: nowrap;
        gap: 4px;

        > :first-child { flex: 1 1 auto; min-width: 0; }
    }
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
    const isDesktop = useBreakpoint('md');
    const pageSize = isDesktop ? PAGE_SIZE : PHONE_PAGE_SIZE;
    const [sort, setSort] = useState<InspirationSort>('norm');
    const [format, setFormat] = useState<FormatFilter>('ALL');
    const [topic, setTopic] = useState<string>('');
    const [pages, setPages] = useState(1);

    const filters = useMemo(() => ({
        weeks: WEEKS as 12,
        sort,
        format: format === 'ALL' ? undefined : format,
        topic: topic || undefined,
        page: 0,
        pageSize: pageSize * pages,
    }), [sort, format, topic, pages, pageSize]);

    const contentQuery = useContent(filters);
    const react = useReactToPost();
    const items = contentQuery.data?.items ?? [];

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
                <Segmented
                    label="Kolejność"
                    options={INSPIRATION_SORT_OPTIONS}
                    value={sort}
                    onChange={v => reset(() => setSort(v))}
                    block={!isDesktop}
                />
                <Segmented
                    label="Format"
                    options={isDesktop ? FORMAT_OPTIONS : PHONE_FORMAT_OPTIONS}
                    value={format}
                    onChange={v => reset(() => setFormat(v))}
                    block={!isDesktop}
                />
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
                <Period>{inspirationSortCaption(sort, WEEKS)}</Period>
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
                    <span>Zmień filtry albo dodaj konkurentów w „Profile”.</span>
                </CenterState>
            )}

            {items.length > 0 && (
                <Grid>
                    {items.map(item => {
                        const embed = embedUrl(item.postCode);
                        const norm = normLabel(item.relativeToNorm);
                        return (
                            <Post key={item.postId} $muted={item.isContest}>
                                <Thumb>
                                    {/* Ikona formatu pod ramką: widać ją, zanim osadzenie się wczyta. */}
                                    <Placeholder><FormatIcon format={item.format} /></Placeholder>
                                    {embed && (
                                        <iframe
                                            src={embed}
                                            title={`Post @${item.username} z ${shortDate(item.takenAt)}`}
                                            loading="lazy"
                                            scrolling="no"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                            tabIndex={-1}
                                        />
                                    )}
                                    <ThumbLink
                                        href={item.permalink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Otwórz post @${item.username} na Instagramie`}
                                    />
                                    {norm && <Norm $strong={(item.relativeToNorm ?? 0) >= 1.5}>{norm}</Norm>}
                                </Thumb>
                                <Body>
                                    <Meta>
                                        <strong>@{item.username}</strong>
                                        <span>{shortDate(item.takenAt)}</span>
                                        <span>{FORMAT_LABELS[item.format]}</span>
                                        {item.topic !== 'INNE' && !(item.isPromo && item.topicLabel === 'Promocja') && (
                                            <span>{item.topicLabel}</span>
                                        )}
                                        {item.isPromo && <StatusPill $tone="warn" $size="sm">Promocja</StatusPill>}
                                        {item.isContest && <StatusPill $size="sm">Konkurs, poza rankingiem</StatusPill>}
                                    </Meta>
                                    {item.caption && <Caption>{item.caption}</Caption>}
                                    <Actions>
                                        <Button size={isDesktop ? 'sm' : 'md'} variant="tinted" onClick={() => makeSimilar(item)}>
                                            <Sparkles size={14} /> Zrób podobny
                                        </Button>
                                        {isDesktop ? (
                                            <ButtonLink
                                                $variant="ghost"
                                                $size="sm"
                                                href={item.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink size={14} /> Otwórz
                                            </ButtonLink>
                                        ) : (
                                            <ButtonLink
                                                $variant="ghost"
                                                $size="sm"
                                                $iconOnly
                                                href={item.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`Otwórz post @${item.username} na Instagramie`}
                                                title="Otwórz na Instagramie"
                                            >
                                                <ExternalLink size={14} />
                                            </ButtonLink>
                                        )}
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
