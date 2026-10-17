import styled from 'styled-components';
import { Bookmark, Eye } from 'lucide-react';
import { SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { MyInstagram, OwnPost } from '../../accountsTypes';
import { formatExact } from '../MetricBits';
import {
    CONTACT_BUTTONS,
    contactTotal,
    formatHour,
    formatSigned,
    netFollowers,
    topHours,
} from './accountsLogic';
import { Chips, Kpi, KpiGrid, KpiLabel, KpiSub, KpiValue, Muted, Section } from './accountsStyles';
import { ChangeLine } from './ChangeLine';

/**
 * Statystyki połączonego konta za 30 dni - to, czego scraper nie widzi: zasięg,
 * kliknięcia „zadzwoń" i „trasa", godziny, w których obserwujący są online.
 *
 * Kolejność to kolejność pytań właściciela: czy ktoś mnie widzi, czy ktoś dzwoni,
 * kiedy publikować, skąd są ludzie, co zadziałało.
 */

// ─── Godziny ──────────────────────────────────────────────────────────────────

const Bars = styled.div`
    display: grid;
    grid-template-columns: repeat(24, minmax(0, 1fr));
    gap: 2px;
    align-items: end;
    height: 96px;
    padding-bottom: 2px;
    border-bottom: 1px solid ${ui.line};
`;

/** Jedna seria, jeden odcień: najlepsze godziny ciemniejsze, opisane też słownie nad wykresem. */
const Bar = styled.span<{ $height: number; $top: boolean }>`
    display: block;
    height: ${p => Math.max(p.$height, 2)}%;
    border-radius: 4px 4px 0 0;
    background: ${p => p.$top ? ui.brandStrong : ui.brandLineSoft};
    transition: background 120ms ease;

    &:hover { background: ${p => p.$top ? ui.brandInk : ui.brandLine}; }
`;

const HourAxis = styled.div`
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    font-size: 11px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const BestHours = ({ hours }: { hours: number[] }) => {
    const best = topHours(hours);
    const max = Math.max(...hours, 1);
    return (
        <Section>
            <SectionTitle as="h3" count={best.length ? `najwięcej o ${best.map(formatHour).join(', ')}` : undefined}>
                Kiedy Twoi obserwujący są online
            </SectionTitle>
            <Bars role="img" aria-label={`Obserwujący online wg godziny. Najwięcej o ${best.map(formatHour).join(', ')}.`}>
                {hours.map((value, hour) => (
                    <Bar
                        key={hour}
                        $height={(value / max) * 100}
                        $top={best.includes(hour)}
                        title={`${formatHour(hour)}: ${formatExact(value)} ${pluralPl(value, 'osoba', 'osoby', 'osób')} online`}
                    />
                ))}
            </Bars>
            <HourAxis aria-hidden="true">
                {[0, 3, 6, 9, 12, 15, 18, 21].map(h => <span key={h}>{h}</span>)}
            </HourAxis>
        </Section>
    );
};

// ─── Miasta ───────────────────────────────────────────────────────────────────

const CityRow = styled.div`
    display: grid;
    grid-template-columns: minmax(90px, 140px) minmax(0, 1fr) 40px;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: ${ui.ink};
`;

const CityTrack = styled.span`
    display: block;
    height: 8px;
    border-radius: 4px;
    background: ${ui.surfaceAlt};
    overflow: hidden;
`;

const CityFill = styled.span<{ $pct: number }>`
    display: block;
    height: 100%;
    width: ${p => p.$pct}%;
    border-radius: 4px;
    background: ${ui.brand};
`;

const CityPct = styled.span`
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${ui.textSecondary};
`;

const CityName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

// ─── Posty ────────────────────────────────────────────────────────────────────

const PostGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 640px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const PostTile = styled.a`
    display: flex;
    flex-direction: column;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    background: ${ui.surface};
    min-width: 0;

    &:hover { border-color: ${ui.lineStrong}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const Thumb = styled.div`
    aspect-ratio: 1 / 1;
    background: ${ui.surfaceAlt};

    img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;

const PostInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px 10px;
`;

const PostHeadline = styled.span`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 15px;
    font-weight: 750;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;

    svg { width: 14px; height: 14px; color: ${ui.brandInk}; }
`;

const PostSub = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${ui.textMuted};

    svg { width: 12px; height: 12px; }
`;

const postScore = (post: OwnPost) => (post.saved ?? 0) + (post.shares ?? 0);

const TopPosts = ({ posts }: { posts: OwnPost[] }) => (
    <Section>
        <SectionTitle as="h3" count="zapisy i udostępnienia">Co zadziałało</SectionTitle>
        <PostGrid>
            {posts.map(post => (
                <PostTile
                    key={post.mediaId}
                    href={post.permalink ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Post: ${postScore(post)} zapisów i udostępnień`}
                >
                    <Thumb>
                        {post.thumbnailUrl && (
                            <img
                                src={post.thumbnailUrl}
                                alt={post.caption?.slice(0, 120) ?? 'Post na Instagramie'}
                                loading="lazy"
                            />
                        )}
                    </Thumb>
                    <PostInfo>
                        <PostHeadline><Bookmark aria-hidden="true" />{formatExact(postScore(post))}</PostHeadline>
                        {post.reach !== null && (
                            <PostSub><Eye aria-hidden="true" />zasięg {formatExact(post.reach)}</PostSub>
                        )}
                    </PostInfo>
                </PostTile>
            ))}
        </PostGrid>
    </Section>
);

// ─── Całość ───────────────────────────────────────────────────────────────────

export const OwnStats = ({ mine }: { mine: MyInstagram }) => {
    const last = mine.last30;
    const previous = mine.previous30;

    if (!last) {
        return <Muted>Pierwsze statystyki pojawią się po pobraniu danych z Instagrama, zwykle w kilka minut po połączeniu.</Muted>;
    }

    const net = netFollowers(last);
    const netPrevious = netFollowers(previous);
    const taps = contactTotal(last);
    const tapButtons = CONTACT_BUTTONS.filter(b => (last.contactTaps[b.key] ?? 0) > 0);

    return (
        <>
            <KpiGrid>
                <Kpi>
                    <KpiLabel>Zasięg</KpiLabel>
                    <KpiValue>{formatExact(last.reach)}</KpiValue>
                    <ChangeLine current={last.reach} previous={previous?.reach ?? null} />
                </Kpi>
                <Kpi>
                    <KpiLabel>Wyświetlenia</KpiLabel>
                    <KpiValue>{formatExact(last.views)}</KpiValue>
                    <ChangeLine current={last.views} previous={previous?.views ?? null} />
                </Kpi>
                <Kpi>
                    <KpiLabel>Obserwujący netto</KpiLabel>
                    <KpiValue>{formatSigned(net)}</KpiValue>
                    <KpiSub>
                        {netPrevious !== null ? `wcześniej ${formatSigned(netPrevious)}` : `obserwuje ${formatExact(mine.followers)}`}
                    </KpiSub>
                </Kpi>
                <Kpi>
                    <KpiLabel>Kliknięcia kontaktu</KpiLabel>
                    <KpiValue>{formatExact(taps)}</KpiValue>
                    <ChangeLine current={taps} previous={contactTotal(previous)} />
                </Kpi>
            </KpiGrid>

            {tapButtons.length > 0 && (
                <Chips aria-label="Kliknięcia przycisków na profilu">
                    {tapButtons.map(button => (
                        <StatusPill key={button.key} $tone="info" $size="md">
                            {button.label} {formatExact(last.contactTaps[button.key] ?? 0)}
                        </StatusPill>
                    ))}
                </Chips>
            )}

            {mine.bestHours.length === 24 && <BestHours hours={mine.bestHours} />}

            {mine.cities.length > 0 && (
                <Section>
                    <SectionTitle as="h3">Skąd są obserwujący</SectionTitle>
                    {mine.cities.map(city => (
                        <CityRow key={city.name}>
                            <CityName title={city.name}>{city.name}</CityName>
                            <CityTrack><CityFill $pct={city.sharePct} /></CityTrack>
                            <CityPct>{city.sharePct}%</CityPct>
                        </CityRow>
                    ))}
                </Section>
            )}

            {mine.topPosts.length > 0 && <TopPosts posts={mine.topPosts} />}
        </>
    );
};
