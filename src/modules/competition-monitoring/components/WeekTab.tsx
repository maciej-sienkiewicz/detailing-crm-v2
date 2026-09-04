import React from 'react';
import styled from 'styled-components';
import { ExternalLink, Lightbulb, Trophy, TrendingUp, Flame, Moon, Minus, Sparkles } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { DigestVerdict, ProfileDigest, WeeklyDigest } from '../types';
import { FORMAT_LABELS } from '../types';
import { Card, CardTitle, CardHint, CenterState, SelfTag, formatNumber } from './MetricBits';
import { SuggestionsSection } from './SuggestionsSection';

/**
 * Tydzień: jeden wiersz na obserwowany profil.
 *
 * Zastąpił parę „Przegląd + Raport", które pokazywały te same insighty, te same
 * trzy metryki i tę samą pozycję w rankingu w dwóch układach graficznych. Zostało
 * to, czego nie ma nigdzie indziej: co każdy profil zrobił w tym tygodniu i co
 * z tego wyszło. Liczby porównawcze (ER, tempo, ranking) mają własną zakładkę
 * „Porównanie" i nie ma powodu powtarzać ich tutaj.
 */

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

// ─── Pasek tygodnia ───────────────────────────────────────────────────────────

const WeekBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const WeekTitle = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong {
        font-size: ${st.fontLg};
        font-weight: 800;
        color: ${st.text};
        letter-spacing: -0.2px;
    }
    span { font-size: ${st.fontSm}; color: ${st.textMuted}; }
`;

const RankChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-size: ${st.fontSm};
    font-weight: 700;
    padding: 6px 14px;
    border-radius: ${st.radiusFull};

    svg { width: 14px; height: 14px; }
`;

// ─── Wiersz profilu ───────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<DigestVerdict, { color: string; dim: string; Icon: typeof Flame }> = {
    STANDOUT: { color: '#b45309', dim: '#fef3c7', Icon: Flame },
    ACCELERATED: { color: '#0369a1', dim: '#e0f2fe', Icon: TrendingUp },
    SILENT: { color: '#6b7280', dim: '#f3f4f6', Icon: Moon },
    STEADY: { color: '#047857', dim: '#ecfdf5', Icon: Minus },
    NEW: { color: '#6b7280', dim: '#f3f4f6', Icon: Sparkles },
};

const ProfileRow = styled.article<{ $self: boolean }>`
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 14px;
    padding: 16px 0;
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }

    ${p => p.$self && `
        margin: 0 -14px;
        padding-left: 14px;
        padding-right: 14px;
        background: ${st.bgAccentBlue};
        border-radius: ${st.radiusSm};
    `}
`;

const VerdictIcon = styled.span<{ $verdict: DigestVerdict }>`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${p => VERDICT_STYLE[p.$verdict].dim};
    color: ${p => VERDICT_STYLE[p.$verdict].color};

    svg { width: 17px; height: 17px; }
`;

const RowBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const Headline = styled.h3`
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    line-height: 1.4;
`;

/** Zdanie o realizacjach - to jest treść, dla której ten ekran istnieje. */
const Achievements = styled.p`
    margin: 0;
    font-size: ${st.fontMd};
    color: ${st.text};
    line-height: 1.55;
`;

/** Liczby są dowodem pod zdaniem, nie komunikatem samym w sobie. */
const Evidence = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    line-height: 1.5;
`;

const PostLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 3px;
`;

const PostLink = styled.a<{ $highlight?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    text-decoration: none;
    border: 1px solid ${p => (p.$highlight ? '#fcd34d' : st.border)};
    background: ${p => (p.$highlight ? '#fffbeb' : st.bgCardAlt)};
    color: ${p => (p.$highlight ? '#b45309' : st.textSecondary)};
    transition: all ${st.transition};

    &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }

    svg { width: 11px; height: 11px; }
`;

// ─── Sugestia ─────────────────────────────────────────────────────────────────

const RecommendationCard = styled(Card)`
    background: ${st.gradientCardBlue};
    border-color: rgba(59, 130, 246, 0.25);
`;

const RecoHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;

    svg { width: 20px; height: 20px; color: ${st.accentBlue}; }
    h3 { margin: 0; font-size: ${st.fontLg}; color: ${st.text}; }
`;

const RecoText = styled.p`
    margin: 0 0 8px;
    font-size: ${st.fontMd};
    font-weight: 600;
    color: ${st.text};
    line-height: 1.5;
`;

const RecoReason = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

// ─── Render ───────────────────────────────────────────────────────────────────

const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

const DigestRow: React.FC<{ profile: ProfileDigest }> = ({ profile }) => {
    const { Icon } = VERDICT_STYLE[profile.verdict];
    const links = profile.highlight ? [profile.highlight, ...profile.posts] : profile.posts;

    return (
        <ProfileRow $self={profile.isSelf}>
            <VerdictIcon $verdict={profile.verdict}>
                <Icon />
            </VerdictIcon>
            <RowBody>
                <Headline>
                    {profile.headline}
                    {profile.isSelf && <SelfTag>Ty</SelfTag>}
                </Headline>

                {profile.achievements && <Achievements>{profile.achievements}</Achievements>}

                <Evidence>{profile.evidence}</Evidence>

                {links.length > 0 && (
                    <PostLinks>
                        {links.map(post => (
                            <PostLink
                                key={post.permalink}
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                $highlight={post === profile.highlight}
                            >
                                {FORMAT_LABELS[post.format]} · {post.topicLabel} ·{' '}
                                {formatNumber(post.engagement)} <ExternalLink />
                            </PostLink>
                        ))}
                    </PostLinks>
                )}
            </RowBody>
        </ProfileRow>
    );
};

export const WeekTab: React.FC<{ digest: WeeklyDigest | null }> = ({ digest }) => {
    if (!digest || digest.profilesWatched === 0) {
        return (
            <Card>
                <CenterState>
                    <strong>Zacznij od dodania profili konkurencji</strong>
                    <span>
                        Kliknij „Profile" i dodaj 3-5 studiów detailingowych z Twojej okolicy oraz własny
                        profil. Pierwsze dane pojawią się po najbliższej synchronizacji.
                    </span>
                </CenterState>
            </Card>
        );
    }

    return (
        <Layout>
            <WeekBar>
                <WeekTitle>
                    <strong>Tydzień od {formatDay(digest.weekStart)}</strong>
                    <span>
                        {digest.profilesWatched}{' '}
                        {digest.profilesWatched === 1 ? 'obserwowany profil' : 'obserwowane profile'}
                        {digest.selfUsername && ` · Twój profil: @${digest.selfUsername}`}
                    </span>
                </WeekTitle>
                {digest.position && (
                    <RankChip>
                        <Trophy /> miejsce {digest.position.rank} z {digest.position.total}
                    </RankChip>
                )}
            </WeekBar>

            {digest.recommendation && (
                <RecommendationCard>
                    <RecoHeader>
                        <Lightbulb />
                        <h3>Sugestia na ten tydzień</h3>
                    </RecoHeader>
                    <RecoText>{digest.recommendation.text}</RecoText>
                    <RecoReason>{digest.recommendation.reason}</RecoReason>
                </RecommendationCard>
            )}

            <Card>
                <CardTitle>Co się działo u obserwowanych profili</CardTitle>
                <CardHint>
                    Każdy profil raz, z tego tygodnia. Liczby porównujemy z normą danego profilu
                    z ostatniego pół roku, a nie ze średnią całej grupy.
                </CardHint>
                {digest.profiles.length === 0 ? (
                    <CardHint style={{ marginBottom: 0 }}>
                        Żaden z obserwowanych profili nie ma jeszcze danych. Wróć po najbliższej
                        synchronizacji.
                    </CardHint>
                ) : (
                    digest.profiles.map(profile => (
                        <DigestRow key={profile.profileId} profile={profile} />
                    ))
                )}
            </Card>

            {digest.profilesWatched < 4 && (
                <Card>
                    <CardTitle>Rozbuduj grupę porównawczą</CardTitle>
                    <CardHint>
                        Obserwujesz {digest.profilesWatched}{' '}
                        {digest.profilesWatched === 1 ? 'profil' : 'profile'}. Od 4 profili odblokujemy
                        porównania z medianą Twojej grupy. Oto konta podobne do tych, które już
                        obserwujesz:
                    </CardHint>
                    <SuggestionsSection compact />
                </Card>
            )}
        </Layout>
    );
};
