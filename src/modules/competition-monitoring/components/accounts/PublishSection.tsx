import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Check, Instagram } from 'lucide-react';
import { buttonStyles, Notice, SectionTitle, ui, type ButtonStyleProps } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { InstagramConnection, PublishResult, PublishVisit } from '../../accountsTypes';
import { formatDate } from '../MetricBits';
import { PHONE } from '../../utils/phone';
import { captionProblem, countHashtags, MAX_CAPTION, MAX_HASHTAGS, MAX_PUBLISH_PHOTOS } from './publishLogic';

/**
 * „Opublikuj na Instagramie" w generatorze: zdjęcia z ostatnich wizyt i podpis
 * z wygenerowanego tekstu. Komponent bez własnego stanu - przycisk publikacji stoi
 * w stopce okna (to on jest krokiem następnym), więc stan trzyma okno.
 */

const MAX_VISITS_SHOWN = 6;

const Wrap = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid ${ui.line};
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    > svg { width: 18px; height: 18px; color: ${ui.brandInk}; }

    /* Ikona przy tytule, nie w osobnej linii nad nim: długi handle zawijał tytuł pod ikonę. */
    ${PHONE} {
        flex-wrap: nowrap;
        align-items: flex-start;

        > svg { flex-shrink: 0; margin-top: 1px; }
    }
`;

const VisitGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const VisitMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 12.5px;
    color: ${ui.textMuted};

    strong { font-weight: 650; color: ${ui.ink}; }
`;

export const Thumbs = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 6px;
`;

export const Thumb = styled.button<{ $selected: boolean }>`
    position: relative;
    aspect-ratio: 1 / 1;
    padding: 0;
    border: 2px solid ${p => p.$selected ? ui.brandStrong : 'transparent'};
    border-radius: 10px;
    overflow: hidden;
    background: ${ui.surfaceAlt};
    cursor: pointer;

    img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: ${p => p.$selected ? 1 : 0.92}; }
    &:disabled { cursor: not-allowed; opacity: 0.5; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

/** Numer w karuzeli - kolejność zaznaczania jest kolejnością zdjęć w poście. */
export const Order = styled.span`
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: ${ui.brandStrong};
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px #fff;
`;

const Caption = styled.textarea`
    width: 100%;
    min-height: 120px;
    padding: 11px 14px;
    font-size: 13.5px;
    font-family: inherit;
    line-height: 1.6;
    color: ${ui.ink};
    border: 1.5px solid ${ui.line};
    border-radius: 10px;
    resize: vertical;
    box-sizing: border-box;

    &:focus { outline: none; border-color: ${ui.brand}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
    &:disabled { background: ${ui.surfaceSoft}; }

    ${PHONE} { font-size: 14px; }
`;

const Limits = styled.div<{ $over: boolean }>`
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 2px 12px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$over ? ui.dangerInk : ui.textMuted};
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
    line-height: 1.5;
`;

const LinkButton = styled(Link)<ButtonStyleProps>`
    ${buttonStyles}
    align-self: flex-start;
    text-decoration: none;

    /* Pigułka z jedną linią tekstu wychodziła przy 360 px poza okno - na telefonie
       zajmuje całą szerokość i wolno jej się złamać. */
    ${PHONE} {
        align-self: stretch;
        justify-content: flex-start;
        height: auto;
        min-height: 44px;
        padding: 10px 18px;
        line-height: 1.35;
        white-space: normal;
        text-align: left;
    }
`;

interface Props {
    connection: InstagramConnection | undefined;
    connectionLoading: boolean;
    visits: PublishVisit[] | undefined;
    visitsLoading: boolean;
    selected: string[];
    onToggle: (photoId: string) => void;
    caption: string;
    onCaptionChange: (caption: string) => void;
    publishing: boolean;
    error: string | null;
    result: PublishResult | null;
    /** Przejście do „Moje konta" zamyka generator - inaczej okno zostałoby nad nową zakładką. */
    onGoToConnect: () => void;
}

export const PublishSection = ({
    connection, connectionLoading, visits, visitsLoading, selected, onToggle,
    caption, onCaptionChange, publishing, error, result, onGoToConnect,
}: Props) => {
    if (connectionLoading) return null;

    if (connection?.status !== 'CONNECTED') {
        return (
            <Wrap>
                <LinkButton to="/instagram?widok=moj" $variant="tinted" $size="md" onClick={onGoToConnect}>
                    <Instagram aria-hidden="true" />
                    Połącz konto Instagram, żeby publikować z CRM
                </LinkButton>
            </Wrap>
        );
    }

    if (result) {
        return (
            <Wrap>
                <Notice tone="ok" title="Opublikowane na Instagramie" role="status">
                    {`Post jest już na profilu @${connection.username ?? ''}.`}
                </Notice>
            </Wrap>
        );
    }

    const hashtags = countHashtags(caption);
    const problem = captionProblem(caption);
    const full = selected.length >= MAX_PUBLISH_PHOTOS;
    const shownVisits = (visits ?? []).slice(0, MAX_VISITS_SHOWN);

    return (
        <Wrap aria-label="Publikacja na Instagramie">
            <Head>
                <Instagram aria-hidden="true" />
                <SectionTitle
                    as="h3"
                    count={selected.length > 0
                        ? `${selected.length} ${pluralPl(selected.length, 'zdjęcie', 'zdjęcia', 'zdjęć')}, w tej kolejności`
                        : `do ${MAX_PUBLISH_PHOTOS} zdjęć`}
                >
                    Opublikuj na @{connection.username}
                </SectionTitle>
            </Head>

            {visitsLoading ? (
                <Muted>Wczytuję zdjęcia z wizyt…</Muted>
            ) : shownVisits.length === 0 ? (
                <Muted>Brak zdjęć z wizyt z ostatnich 60 dni. Dodaj zdjęcia w wizycie, żeby opublikować realizację.</Muted>
            ) : (
                shownVisits.map(visit => (
                    <VisitGroup key={visit.visitId}>
                        <VisitMeta>
                            <strong>{visit.vehicle}</strong>
                            <span>{formatDate(visit.date)}</span>
                            {visit.visitNumber && <span>{visit.visitNumber}</span>}
                        </VisitMeta>
                        <Thumbs>
                            {visit.photos.map(photo => {
                                const order = selected.indexOf(photo.id);
                                const isSelected = order >= 0;
                                return (
                                    <Thumb
                                        key={photo.id}
                                        type="button"
                                        $selected={isSelected}
                                        aria-pressed={isSelected}
                                        aria-label={isSelected ? `Zdjęcie ${order + 1} w poście, odznacz` : 'Dodaj zdjęcie do posta'}
                                        disabled={publishing || (!isSelected && full)}
                                        onClick={() => onToggle(photo.id)}
                                    >
                                        <img src={photo.thumbnailUrl} alt="" loading="lazy" />
                                        {isSelected && <Order>{selected.length > 1 ? order + 1 : <Check size={12} />}</Order>}
                                    </Thumb>
                                );
                            })}
                        </Thumbs>
                    </VisitGroup>
                ))
            )}

            <Caption
                aria-label="Podpis posta"
                value={caption}
                disabled={publishing}
                onChange={e => onCaptionChange(e.target.value)}
            />
            <Limits $over={problem !== null}>
                <span>{caption.length}/{MAX_CAPTION} znaków</span>
                <span>{hashtags}/{MAX_HASHTAGS} hashtagów</span>
            </Limits>
            {problem && <Notice tone="danger" role="alert">{problem}</Notice>}
            {error && <Notice tone="danger" title="Instagram nie przyjął posta" role="alert">{error}</Notice>}
            {publishing && (
                <Notice tone="info" role="status">Publikuję. Instagram przetwarza zdjęcia, to potrwa do pół minuty.</Notice>
            )}
        </Wrap>
    );
};
