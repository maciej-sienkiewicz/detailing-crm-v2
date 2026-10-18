import { useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Bookmark, ChevronLeft, ChevronRight, Heart, ImageOff, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { ui } from '@/common/components/ui';
import {
    avatarInitials, formatCount, postAspect, sampleComments, tokenizeCaption,
} from './postPreviewLogic';

/**
 * Podgląd posta tak, jak zobaczy go obserwujący w kanale aplikacji Instagram.
 *
 * Wierność tam, gdzie decyduje o ocenie tekstu:
 * - krój systemowy (San Francisco na iPhonie, Roboto na Androidzie) - Instagram w kanale
 *   nie używa własnego kroju, Instagram Sans jest tylko w nagłówkach i grafikach marki;
 * - 14 px na 18 px interlinii, tekst do lewej, bez justowania, z zachowanymi enterami;
 * - podpis zwinięty do dwóch linii z „… więcej" - to, co widać przed rozwinięciem, jest
 *   jedynym tekstem, który przeczyta większość osób, więc właśnie to musi być widać;
 * - kadr jak przy publikacji: proporcja pierwszego zdjęcia w zakresie 4:5-1,91:1,
 *   kolejne zdjęcia karuzeli przycięte do niej ze środka;
 * - karuzela z licznikiem „1/4" w rogu i kropkami pod zdjęciem, pojedyncze zdjęcie bez nich.
 *
 * Kolory kanału Instagrama (czerń, szarość #737373, granat linków #00376B, błękit #0095F6)
 * są tu celowo obce reszcie CRM: to makieta cudzego interfejsu, nie element naszego.
 */

const IG = {
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    text: '#000000',
    secondary: '#737373',
    link: '#00376b',
    blue: '#0095f6',
    dot: '#a8a8a8',
    separator: '#dbdbdb',
    placeholder: '#efefef',
};

const Card = styled.figure`
    margin: 0 auto;
    width: 100%;
    max-width: 400px;
    background: #ffffff;
    border: 1px solid ${IG.separator};
    border-radius: 12px;
    overflow: hidden;
    font-family: ${IG.font};
    font-size: 14px;
    line-height: 18px;
    color: ${IG.text};
    text-align: left;
    -webkit-font-smoothing: antialiased;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 54px;
    padding: 0 8px 0 12px;

    > svg { margin-left: auto; width: 24px; height: 24px; color: ${IG.text}; }
`;

const Avatar = styled.span`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a, #334155);
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    /* Cienka obwódka jak na zdjęciu profilowym w kanale. */
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
`;

const Username = styled.span`
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Media = styled.div<{ $aspect: number }>`
    position: relative;
    width: 100%;
    aspect-ratio: ${p => p.$aspect};
    background: ${IG.placeholder};
`;

const Track = styled.div`
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }

    img {
        flex: 0 0 100%;
        width: 100%;
        height: 100%;
        object-fit: cover;
        scroll-snap-align: start;
        display: block;
        user-select: none;
    }
`;

const Counter = styled.span`
    position: absolute;
    top: 14px;
    right: 14px;
    padding: 3px 8px;
    border-radius: 12px;
    background: rgba(18, 18, 18, 0.7);
    color: #ffffff;
    font-size: 12px;
    line-height: 18px;
    font-weight: 500;
    pointer-events: none;
`;

const Nav = styled.button<{ $side: 'left' | 'right' }>`
    position: absolute;
    top: 50%;
    ${p => p.$side}: 8px;
    transform: translateY(-50%);
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.85);
    color: #262626;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:focus-visible { outline: 2px solid ${IG.blue}; outline-offset: 2px; }
`;

const Empty = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px;
    text-align: center;
    color: ${IG.secondary};
    font-size: 13px;
    line-height: 18px;

    svg { width: 28px; height: 28px; }
`;

const ActionRow = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    height: 46px;
    padding: 0 12px;

    > svg { width: 24px; height: 24px; color: ${IG.text}; flex-shrink: 0; }
    /* Dymek komentarza w Instagramie ma ogonek po lewej - lucide rysuje go po prawej. */
    > svg.ig-comment { transform: scaleX(-1); }
    > svg.ig-save { margin-left: auto; }
`;

const Dots = styled.span`
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 4px;
    pointer-events: none;
`;

const Dot = styled.span<{ $active: boolean }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => (p.$active ? IG.blue : IG.dot)};
`;

const Lines = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 12px 14px;
`;

const Likes = styled.div`
    font-weight: 600;
`;

const CaptionBlock = styled.div<{ $collapsed: boolean }>`
    position: relative;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    ${p => p.$collapsed && `
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
    `}

    strong { font-weight: 600; }
`;

const Tag = styled.span`
    color: ${IG.link};
`;

/** „… więcej" na końcu drugiej linii, jak w aplikacji - z bielą pod spodem zasłaniającą urwany wyraz. */
const More = styled.button`
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 0 0 0 28px;
    border: none;
    background: linear-gradient(to right, rgba(255, 255, 255, 0), #ffffff 24px);
    font: inherit;
    color: ${IG.secondary};
    cursor: pointer;
`;

const Secondary = styled.div`
    color: ${IG.secondary};
`;

const Comment = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;

    > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    strong { font-weight: 600; }
    > svg { width: 12px; height: 12px; margin-top: 3px; color: ${IG.secondary}; flex-shrink: 0; }
`;

const Time = styled.div`
    font-size: 12px;
    line-height: 16px;
    color: ${IG.secondary};
`;

export interface PreviewPhoto {
    id: string;
    url: string;
}

interface Props {
    username: string;
    photos: PreviewPhoto[];
    caption: string;
    likes: number;
}

export const InstagramPostPreview = ({ username, photos, caption, likes }: Props) => {
    const [index, setIndex] = useState(0);
    const [aspect, setAspect] = useState(1);
    const [expanded, setExpanded] = useState(false);
    const [overflowing, setOverflowing] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const captionRef = useRef<HTMLDivElement>(null);

    const firstId = photos[0]?.id;
    const carousel = photos.length > 1;
    const current = Math.min(index, Math.max(0, photos.length - 1));

    // Czy zwinięty podpis coś chowa - dopiero wtedy „… więcej" ma sens. Mierzone po każdej
    // zmianie podpisu, bo właściciel poprawia go w polu pod spodem i widzi skutek na żywo.
    useLayoutEffect(() => {
        const el = captionRef.current;
        if (!el || expanded) return;
        setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }, [caption, expanded]);

    // Nowe pierwsze zdjęcie to nowy kadr i powrót na początek karuzeli. W renderze, nie w efekcie:
    // licznik „2/3" nie może mignąć przy nowym zestawie; pasek przewijania zeruje `key` na Track.
    const [shownFirstId, setShownFirstId] = useState(firstId);
    if (shownFirstId !== firstId) {
        setShownFirstId(firstId);
        setIndex(0);
    }

    const goTo = (next: number) => {
        const track = trackRef.current;
        if (!track) return;
        track.scrollTo?.({ left: next * track.clientWidth, behavior: 'smooth' });
        setIndex(next);
    };

    const onScroll = () => {
        const track = trackRef.current;
        if (!track || track.clientWidth === 0) return;
        setIndex(Math.round(track.scrollLeft / track.clientWidth));
    };

    const comments = sampleComments(caption, likes);
    const text = caption.trim();

    return (
        <Card aria-label="Podgląd posta na Instagramie">
            <Header>
                <Avatar aria-hidden="true">{avatarInitials(username)}</Avatar>
                <Username>{username}</Username>
                <MoreHorizontal aria-hidden="true" />
            </Header>

            <Media $aspect={photos.length > 0 ? aspect : 1}>
                {photos.length === 0 ? (
                    <Empty>
                        <ImageOff aria-hidden="true" />
                        Instagram nie opublikuje posta bez zdjęcia. Zaznacz zdjęcia z realizacji poniżej.
                    </Empty>
                ) : (
                    <>
                        <Track key={firstId} ref={trackRef} onScroll={onScroll}>
                            {photos.map((photo, i) => (
                                <img
                                    key={photo.id}
                                    src={photo.url}
                                    alt={carousel ? `Zdjęcie ${i + 1} z ${photos.length}` : 'Zdjęcie posta'}
                                    draggable={false}
                                    onLoad={i === 0
                                        ? e => setAspect(postAspect(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))
                                        : undefined}
                                />
                            ))}
                        </Track>
                        {carousel && <Counter aria-hidden="true">{current + 1}/{photos.length}</Counter>}
                        {carousel && current > 0 && (
                            <Nav type="button" $side="left" aria-label="Poprzednie zdjęcie" onClick={() => goTo(current - 1)}>
                                <ChevronLeft aria-hidden="true" />
                            </Nav>
                        )}
                        {carousel && current < photos.length - 1 && (
                            <Nav type="button" $side="right" aria-label="Następne zdjęcie" onClick={() => goTo(current + 1)}>
                                <ChevronRight aria-hidden="true" />
                            </Nav>
                        )}
                    </>
                )}
            </Media>

            <ActionRow aria-hidden="true">
                <Heart strokeWidth={1.75} />
                <MessageCircle strokeWidth={1.75} className="ig-comment" />
                <Send strokeWidth={1.75} />
                {carousel && (
                    <Dots>
                        {photos.map((photo, i) => <Dot key={photo.id} $active={i === current} />)}
                    </Dots>
                )}
                <Bookmark strokeWidth={1.75} className="ig-save" />
            </ActionRow>

            <Lines>
                <Likes>Liczba polubień: {formatCount(likes)}</Likes>

                {text && (
                    <CaptionBlock ref={captionRef} $collapsed={!expanded} data-testid="preview-caption">
                        <strong>{username}</strong>{' '}
                        {tokenizeCaption(text).map((token, i) =>
                            token.kind === 'text' ? token.value : <Tag key={i}>{token.value}</Tag>
                        )}
                        {!expanded && overflowing && (
                            <More type="button" onClick={() => setExpanded(true)}>… więcej</More>
                        )}
                    </CaptionBlock>
                )}

                <Secondary>Zobacz wszystkie komentarze ({formatCount(comments.total)})</Secondary>
                {comments.shown.map(comment => (
                    <Comment key={comment.username}>
                        <span><strong>{comment.username}</strong> {comment.text}</span>
                        <Heart aria-hidden="true" strokeWidth={2} />
                    </Comment>
                ))}
                <Time>1 minutę temu</Time>
            </Lines>
        </Card>
    );
};

/** Podpis pod podglądem - uczciwie mówi, co jest prawdziwe, a co przykładowe. */
export const PreviewNote = styled.p`
    margin: 8px auto 0;
    max-width: 400px;
    font-size: 12px;
    line-height: 1.5;
    color: ${ui.textMuted};
    text-align: center;
`;
