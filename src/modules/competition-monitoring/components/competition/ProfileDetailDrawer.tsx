import React from 'react';
import styled from 'styled-components';
import { ExternalLink, Megaphone } from 'lucide-react';
import {
    Button,
    ButtonLink,
    DrawerBody,
    Segmented,
    SectionTitle,
    SideDrawer,
    StatusPill,
    ui,
} from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { CompetitionMedian, CompetitionProfile, CompetitionResponse, ProfileRole } from '../../types';
import { useDigest } from '../../hooks/useAnalytics';
import { useProfileActions } from '../../hooks/useProfileActions';
import { EMPTY, formatNumber } from '../MetricBits';
import { calendarLevel, formatPerWeek, formatSignedPct, growthSinceLabel } from '../../utils/competition';
import { colorFor } from '../../utils/profileColors';

/**
 * Wszystko o jednym profilu w jednym miejscu: co zrobił w ostatnim tygodniu (zdanie
 * z opisów postów - najcenniejsza treść modułu), cztery liczby wobec mediany, rytm
 * publikacji, formaty i reklamy. Dawniej te same fakty były rozsiane po czterech
 * zakładkach i trzeba było je składać w głowie.
 */

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Sentence = styled.p`
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: ${ui.ink};
`;

const Evidence = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const Stats = styled.dl`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;

    div {
        border: 1px solid ${ui.line};
        border-radius: ${ui.radiusRow};
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }
    dt { font-size: 12px; color: ${ui.textMuted}; }
    dd { margin: 0; font-size: 20px; font-weight: 700; color: ${ui.ink}; font-variant-numeric: tabular-nums; }
    small { font-size: 12px; color: ${ui.textMuted}; }
`;

const Strip = styled.div`
    display: flex;
    gap: 3px;
    flex-wrap: wrap;

    i { width: 14px; height: 14px; border-radius: 3px; display: inline-block; }
`;

const Formats = styled.div`
    display: flex;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    background: ${ui.lineFaint};
`;

const FormatLegend = styled.div`
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 12px;
    color: ${ui.textSecondary};

    span { display: inline-flex; align-items: center; gap: 6px; }
    i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
`;

const Facts = styled.div`
    display: flex;
    gap: 8px 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${ui.textSecondary};

    b { color: ${ui.ink}; font-weight: 600; }
`;

const PostLinks = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    a {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 13px;
        color: ${ui.brandInk};
        text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    span { color: ${ui.textMuted}; white-space: nowrap; }
`;

const FORMAT_COLORS = { photo: '#94a3b8', reels: ui.brand, carousel: '#8b5cf6' } as const;

const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
    { value: 'LOCAL', label: 'Konkurent z okolicy' },
    { value: 'INSPIRATION', label: 'Wzorzec' },
];

const vsMedian = (value: number | null, median: number | null | undefined, format: (v: number) => string) =>
    median === null || median === undefined || value === null ? null : `mediana lokalnych ${format(median)}`;

const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

interface Props {
    profile: CompetitionProfile;
    data: CompetitionResponse;
    colors: Map<string, string>;
    onClose: () => void;
    onOpenAds: () => void;
}

export const ProfileDetailDrawer: React.FC<Props> = ({ profile, data, colors, onClose, onOpenAds }) => {
    const digestQuery = useDigest(true);
    const { setRole, isSettingRole } = useProfileActions();
    const digest = digestQuery.data?.profiles.find(p => p.profileId === profile.profileId) ?? null;
    const median: CompetitionMedian | null = profile.role === 'LOCAL' || profile.isSelf ? data.localMedian : null;
    const color = colorFor(colors, profile.username);
    const since = growthSinceLabel(profile.growthFrom, data.from);
    const totalFormats = profile.formatMix.photo + profile.formatMix.reels + profile.formatMix.carousel;

    return (
        <SideDrawer
            onClose={onClose}
            title={profile.isSelf ? `Ty, @${profile.username}` : `@${profile.username}`}
            titleId="instagram-profile-detail"
            status={
                profile.isSelf
                    ? <StatusPill $tone="info">Twój profil</StatusPill>
                    : <StatusPill $tone={profile.role === 'LOCAL' ? 'neutral' : 'info'}>
                        {profile.role === 'LOCAL' ? 'Konkurent z okolicy' : 'Wzorzec'}
                    </StatusPill>
            }
            width={520}
            footer={
                <ButtonLink
                    $variant="outline"
                    $size="md"
                    href={`https://www.instagram.com/${profile.username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <ExternalLink size={16} /> Otwórz na Instagramie
                </ButtonLink>
            }
        >
            <DrawerBody>
                {digest && (
                    <Section>
                        <SectionTitle count={digestQuery.data ? `${shortDate(digestQuery.data.weekStart)}–${shortDate(digestQuery.data.weekEnd)}` : undefined}>
                            Ostatni tydzień
                        </SectionTitle>
                        <Sentence>{digest.achievements ?? digest.headline}</Sentence>
                        {digest.achievements && <Evidence>{digest.headline}</Evidence>}
                        <Evidence>{digest.evidence}</Evidence>
                        {digest.posts.length > 0 && (
                            <PostLinks>
                                {digest.posts.slice(0, 4).map(post => (
                                    <li key={post.permalink}>
                                        <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                                            {post.topicLabel}
                                            {/* Serwer podaje dzień już po polsku („13.10.2026") - rok w tym tygodniu jest zbędny. */}
                                            <span>{post.takenAt.replace(/\.\d{4}$/, '')}</span>
                                        </a>
                                    </li>
                                ))}
                            </PostLinks>
                        )}
                    </Section>
                )}

                <Section>
                    <SectionTitle count={data.days === 365 ? 'ostatnie 12 miesięcy' : `ostatnie ${data.days} dni`}>
                        Liczby
                    </SectionTitle>
                    <Stats>
                        <div>
                            <dt>Obserwujący</dt>
                            <dd>{formatNumber(profile.followers)}</dd>
                            <small>
                                {formatSignedPct(profile.followersGainPct) ?? 'przyrost po dwóch pomiarach'}
                                {since ? ` ${since}` : ''}
                            </small>
                        </div>
                        <div>
                            <dt>Posty na tydzień</dt>
                            <dd>{formatPerWeek(profile.postsPerWeek) ?? EMPTY}</dd>
                            <small>{vsMedian(profile.postsPerWeek, median?.postsPerWeek, v => formatPerWeek(v) ?? EMPTY)}</small>
                        </div>
                        <div>
                            <dt>Reakcje na post</dt>
                            <dd>{formatNumber(profile.reactionsPerPost)}</dd>
                            <small>{vsMedian(profile.reactionsPerPost, median?.reactionsPerPost, v => formatNumber(v))}</small>
                        </div>
                        <div>
                            <dt>Reklamy teraz</dt>
                            <dd>{profile.activeCampaigns ?? '?'}</dd>
                            <small>
                                {profile.activeCampaigns === null
                                    ? 'brak wskazanej strony na Facebooku'
                                    : pluralPl(profile.activeCampaigns, 'kampania', 'kampanie', 'kampanii')}
                            </small>
                        </div>
                    </Stats>
                </Section>

                <Section>
                    <SectionTitle count={`regularnie w ${profile.regularityPct}% tygodni`}>Rytm publikacji</SectionTitle>
                    <Strip aria-label="Posty w kolejnych tygodniach">
                        {profile.weeklyPosts.map((posts, index) => {
                            const level = calendarLevel(posts);
                            const alpha = ['', '59', 'A6', ''][level];
                            return (
                                <i
                                    key={data.weeks[index] ?? index}
                                    style={{ background: level === 0 ? ui.lineFaint : `${color}${alpha}` }}
                                    title={`${data.weeks[index] ? shortDate(data.weeks[index]) : ''}: ${posts} ${pluralPl(posts, 'post', 'posty', 'postów')}`}
                                />
                            );
                        })}
                    </Strip>
                    <Facts>
                        <span>Postów w okresie: <b>{profile.postsInWindow}</b></span>
                        <span>Ostatni post: <b>{profile.lastPostAt ? shortDate(profile.lastPostAt) : EMPTY}</b></span>
                    </Facts>
                </Section>

                {totalFormats > 0 && (
                    <Section>
                        <SectionTitle>Formaty</SectionTitle>
                        <Formats aria-hidden="true">
                            <span style={{ width: `${(profile.formatMix.reels / totalFormats) * 100}%`, background: FORMAT_COLORS.reels }} />
                            <span style={{ width: `${(profile.formatMix.carousel / totalFormats) * 100}%`, background: FORMAT_COLORS.carousel }} />
                            <span style={{ width: `${(profile.formatMix.photo / totalFormats) * 100}%`, background: FORMAT_COLORS.photo }} />
                        </Formats>
                        <FormatLegend>
                            <span><i style={{ background: FORMAT_COLORS.reels }} />Rolki {profile.formatMix.reels}%</span>
                            <span><i style={{ background: FORMAT_COLORS.carousel }} />Karuzele {profile.formatMix.carousel}%</span>
                            <span><i style={{ background: FORMAT_COLORS.photo }} />Zdjęcia {profile.formatMix.photo}%</span>
                        </FormatLegend>
                    </Section>
                )}

                {!profile.isSelf && (
                    <Section>
                        <SectionTitle>Rola</SectionTitle>
                        <Segmented
                            label={`Rola @${profile.username}`}
                            options={ROLE_OPTIONS}
                            value={profile.role}
                            onChange={role => setRole({ id: profile.studioProfileId, role })}
                            block
                        />
                        <Evidence>
                            {isSettingRole
                                ? 'Zapisuję…'
                                : profile.role === 'LOCAL'
                                    ? 'Liczy się do mediany i rankingu.'
                                    : 'Nie wpływa na porównania, zostaje w Inspiracjach.'}
                        </Evidence>
                    </Section>
                )}

                {profile.activeCampaigns !== null && (
                    <Section>
                        <Button variant="tinted" onClick={onOpenAds}>
                            <Megaphone size={16} /> Reklamy w kalendarzu roku
                        </Button>
                    </Section>
                )}
            </DrawerBody>
        </SideDrawer>
    );
};
