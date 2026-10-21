import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Minus } from 'lucide-react';
import { Card, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { useBreakpoint } from '@/common/hooks';
import type { CompetitionMedian, CompetitionProfile, CompetitionResponse } from '../../types';
import { EMPTY, formatNumber } from '../MetricBits';
import { colorFor } from '../../utils/profileColors';
import { PHONE } from '../../utils/phone';
import {
    formatPerWeek,
    formatSignedPct,
    growthSinceLabel,
    splitProfiles,
    versusMedian,
} from '../../utils/competition';

/**
 * Tabela konkurencji: cztery liczby na profil i JEDEN punkt odniesienia - wiersz
 * „Mediana konkurencji" na dole. Wcześniej każda komórka miała wartość, zmianę i zdanie
 * o medianie grupy (około 150 informacji na 7 profili) i właściciel nie umiał
 * powiedzieć, czy u niego jest dobrze. Strzałki są tylko w Twoim wierszu: to jedyny
 * wiersz, przy którym to pytanie pada.
 */

const COLUMNS = 'minmax(180px, 1.7fr) minmax(110px, 1fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(100px, 0.9fr)';

const Head = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    padding: 18px 20px 6px;

    span { font-size: 13px; color: ${ui.textMuted}; }

    @media (max-width: 640px) { padding: 16px 16px 4px; }
    ${PHONE} { padding: 16px 16px 4px; }
`;

const Table = styled.div`
    display: flex;
    flex-direction: column;
    padding: 4px 8px 12px;
`;

const HeaderRow = styled.div`
    display: grid;
    grid-template-columns: ${COLUMNS};
    gap: 12px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    color: ${ui.textMuted};

    > span:not(:first-child) { text-align: right; }
`;

const RowButton = styled.button<{ $self?: boolean }>`
    display: grid;
    grid-template-columns: ${COLUMNS};
    gap: 12px;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: ${ui.radiusRow};
    background: ${p => (p.$self ? ui.brandTint : 'transparent')};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    color: ${ui.ink};

    &:hover { background: ${p => (p.$self ? ui.brandTintHover : ui.surfaceSoft)}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const MedianRow = styled.div`
    display: grid;
    grid-template-columns: ${COLUMNS};
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    margin-top: 4px;
    border-top: 1px dashed ${ui.line};
    color: ${ui.textSecondary};
    font-size: 14px;
`;

const Name = styled.span`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;

    > b {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: inherit;
    }
`;

const Dot = styled.i<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const Num = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    font-variant-numeric: tabular-nums;
    font-size: 15px;
    font-weight: 600;

    small {
        font-size: 12px;
        font-weight: 500;
        color: ${ui.textMuted};
        white-space: nowrap;
    }
`;

const Growth = styled.small<{ $tone: 'up' | 'down' | 'flat' }>`
    && { color: ${p => (p.$tone === 'up' ? ui.okInk : p.$tone === 'down' ? ui.dangerInk : ui.textMuted)}; }
`;

const Inline = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;

    svg { width: 13px; height: 13px; }
`;

const Unknown = styled.span`
    color: ${ui.textFaint};
    font-weight: 600;
`;

const ApiError = styled(AlertTriangle)`
    width: 14px;
    height: 14px;
    color: ${ui.warnInk};
    flex-shrink: 0;
`;

// ─── Telefon: płaska lista, podpisy kolumn raz ────────────────────────────────

/*
 * Wcześniej każdy profil był osobną kartą z czterema podpisanymi liczbami: karta w karcie,
 * „Obserwujący / Posty na tydzień…" powtórzone przy każdym profilu i pięciu konkurentów
 * na dwóch i pół ekranach. Teraz wiersz to nazwa i jedna linia liczb pod podpisami
 * kolumn, które stoją raz nad listą - jak w tabeli na komputerze.
 */
const PHONE_COLUMNS = 'minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.85fr) 18px';

const PhoneCaptions = styled.div`
    display: grid;
    grid-template-columns: ${PHONE_COLUMNS};
    column-gap: 8px;
    align-items: end;
    padding: 8px 16px 8px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    color: ${ui.textMuted};

    > span:not(:first-child) { text-align: right; }
`;

const PhoneRow = styled.button<{ $self?: boolean }>`
    display: grid;
    grid-template-columns: ${PHONE_COLUMNS};
    column-gap: 8px;
    row-gap: 6px;
    align-items: start;
    width: 100%;
    padding: 12px 16px;
    border: none;
    border-top: 1px solid ${ui.line};
    background: ${p => (p.$self ? ui.brandTint : 'transparent')};
    font-family: inherit;
    text-align: left;
    color: ${ui.ink};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active { background: ${p => (p.$self ? ui.brandTintHover : ui.surfaceSoft)}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
`;

const PhoneName = styled.span`
    grid-column: 1 / 5;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: 15px;
    font-weight: 600;

    /* Nazwa ma całą szerokość wiersza; skrajnie długi uchwyt łamie się na dwie linie. */
    > b {
        min-width: 0;
        font-weight: inherit;
        overflow-wrap: anywhere;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;

const Chevron = styled(ChevronRight)`
    grid-column: 5;
    grid-row: 1 / 3;
    align-self: center;
    width: 18px;
    height: 18px;
    color: ${ui.textFaint};
`;

const PhoneNum = styled.span<{ $first?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: ${p => (p.$first ? 'flex-start' : 'flex-end')};
    gap: 1px;
    min-width: 0;
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    small {
        font-size: 12px;
        font-weight: 600;
    }
`;

/** „od 8 wrz" pod procentem, w całości: łamane w środku dawało samotne „wrz" w trzeciej linii. */
const PhoneSince = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: ${ui.textMuted};
`;

const PhoneMedian = styled.div`
    display: grid;
    grid-template-columns: ${PHONE_COLUMNS};
    column-gap: 8px;
    row-gap: 6px;
    padding: 12px 16px 14px;
    border-top: 1px solid ${ui.line};
    background: ${ui.surfaceSoft};
    color: ${ui.textSecondary};

    ${PhoneNum} { font-weight: 600; }
    ${PhoneNum} small { color: ${ui.textMuted}; font-weight: 500; }
`;

const PhoneMedianTitle = styled.span`
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 13px;
    font-weight: 600;

    span { font-size: 12px; font-weight: 500; color: ${ui.textMuted}; }
`;

const PhoneNote = styled.p`
    margin: 0;
    padding: 10px 16px 14px;
    border-top: 1px solid ${ui.line};
    font-size: 12px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const PhoneMuted = styled.span`
    color: ${ui.textMuted};
`;

// ─── Komórki ──────────────────────────────────────────────────────────────────

type Direction = ReturnType<typeof versusMedian>;

const DirectionIcon: React.FC<{ direction: Direction }> = ({ direction }) => {
    if (direction === null) return null;
    if (direction === 'above') return <ArrowUp aria-label="powyżej mediany konkurencji" color={ui.okInk} />;
    if (direction === 'below') return <ArrowDown aria-label="poniżej mediany konkurencji" color={ui.warnInk} />;
    return <Minus aria-label="w medianie konkurencji" color={ui.textFaint} />;
};

const growthTone = (pct: number | null): 'up' | 'down' | 'flat' =>
    pct === null || Math.abs(pct) < 0.05 ? 'flat' : pct > 0 ? 'up' : 'down';

const campaignsLabel = (n: number) => `${n} ${pluralPl(n, 'kampania', 'kampanie', 'kampanii')}`;

const AdsCell: React.FC<{ value: number | null }> = ({ value }) => {
    if (value === null) {
        return <Unknown title="Profil nie ma wskazanej strony na Facebooku, więc nie wiemy, czy się reklamuje">?</Unknown>;
    }
    if (value === 0) return <span style={{ color: ui.textFaint }}>0</span>;
    return <StatusPill $tone="info">{campaignsLabel(value)}</StatusPill>;
};

interface RowProps {
    profile: CompetitionProfile;
    color: string;
    median: CompetitionMedian | null;
    windowFrom: string;
    showDirections: boolean;
    onOpen: (profile: CompetitionProfile) => void;
}

const DesktopRow: React.FC<RowProps> = ({ profile, color, median, windowFrom, showDirections, onOpen }) => {
    const since = growthSinceLabel(profile.growthFrom, windowFrom);
    const growth = formatSignedPct(profile.followersGainPct);
    return (
        <RowButton type="button" $self={profile.isSelf} onClick={() => onOpen(profile)}>
            <Name>
                <Dot $color={color} />
                <b>@{profile.username}</b>
                {profile.isSelf && <StatusPill $tone="info" $size="sm">Ty</StatusPill>}
                {profile.apiError && <ApiError aria-label="Ostatnie pobranie danych nie powiodło się" />}
            </Name>
            <Num>
                {formatNumber(profile.followers)}
                {growth && (
                    <Growth $tone={growthTone(profile.followersGainPct)}>
                        {growth}{since ? ` ${since}` : ''}
                    </Growth>
                )}
            </Num>
            <Num>
                <Inline>
                    {showDirections && <DirectionIcon direction={versusMedian(profile.postsPerWeek, median?.postsPerWeek)} />}
                    {formatPerWeek(profile.postsPerWeek) ?? EMPTY}
                </Inline>
            </Num>
            <Num>
                <Inline>
                    {showDirections && <DirectionIcon direction={versusMedian(profile.reactionsPerPost, median?.reactionsPerPost)} />}
                    {formatNumber(profile.reactionsPerPost)}
                </Inline>
            </Num>
            <Num><AdsCell value={profile.activeCampaigns} /></Num>
        </RowButton>
    );
};

/** Reklamy w wąskiej kolumnie: liczba kampanii; „?" ma wyjaśnienie pod listą i dla czytnika. */
const PhoneAds: React.FC<{ value: number | null }> = ({ value }) => {
    if (value === null) return <PhoneMuted aria-label="nie wiadomo, brak wskazanej strony na Facebooku">?</PhoneMuted>;
    if (value === 0) return <PhoneMuted>0</PhoneMuted>;
    return <StatusPill $tone="info" $size="sm">{value}</StatusPill>;
};

/*
 * Podpisy kolumn stoją raz nad listą i czytnik ekranu ich nie zobaczy przy wierszu,
 * więc wiersz-przycisk dostaje pełne zdanie zamiast ciągu „41 tys. +3,0% 4,2 612 2".
 */
const phoneRowLabel = (profile: CompetitionProfile, growth: string | null, since: string | null) => [
    `@${profile.username}${profile.isSelf ? ', Twój profil' : ''}`,
    `obserwujący ${formatNumber(profile.followers)}${growth ? ` (${growth}${since ? ` ${since}` : ''})` : ''}`,
    `posty na tydzień ${formatPerWeek(profile.postsPerWeek) ?? 'brak danych'}`,
    `reakcje na post ${profile.reactionsPerPost === null ? 'brak danych' : formatNumber(profile.reactionsPerPost)}`,
    `reklamy teraz ${profile.activeCampaigns === null ? 'nie wiadomo' : campaignsLabel(profile.activeCampaigns)}`,
    profile.apiError ? 'ostatnie pobranie danych nie powiodło się' : null,
].filter(Boolean).join(', ');

const PhoneListRow: React.FC<RowProps> = ({ profile, color, median, windowFrom, showDirections, onOpen }) => {
    const since = growthSinceLabel(profile.growthFrom, windowFrom);
    const growth = formatSignedPct(profile.followersGainPct);
    return (
        <PhoneRow
            type="button"
            $self={profile.isSelf}
            onClick={() => onOpen(profile)}
            aria-label={phoneRowLabel(profile, growth, since)}
        >
            <PhoneName>
                <Dot $color={color} />
                <b>@{profile.username}</b>
                {profile.isSelf && <StatusPill $tone="info" $size="sm">Ty</StatusPill>}
                {profile.apiError && <ApiError aria-hidden="true" />}
            </PhoneName>
            <Chevron aria-hidden="true" />
            <PhoneNum $first>
                {formatNumber(profile.followers)}
                {growth && <Growth $tone={growthTone(profile.followersGainPct)}>{growth}</Growth>}
                {growth && since && <PhoneSince>{since}</PhoneSince>}
            </PhoneNum>
            <PhoneNum>
                <Inline>
                    {showDirections && <DirectionIcon direction={versusMedian(profile.postsPerWeek, median?.postsPerWeek)} />}
                    {formatPerWeek(profile.postsPerWeek) ?? EMPTY}
                </Inline>
            </PhoneNum>
            <PhoneNum>
                <Inline>
                    {showDirections && <DirectionIcon direction={versusMedian(profile.reactionsPerPost, median?.reactionsPerPost)} />}
                    {formatNumber(profile.reactionsPerPost)}
                </Inline>
            </PhoneNum>
            <PhoneNum><PhoneAds value={profile.activeCampaigns} /></PhoneNum>
        </PhoneRow>
    );
};

interface Props {
    data: CompetitionResponse;
    colors: Map<string, string>;
    onOpenProfile: (profile: CompetitionProfile) => void;
}

export const ProfilesPanel: React.FC<Props> = ({ data, colors, onOpenProfile }) => {
    const isDesktop = useBreakpoint('md');
    const { self, competitors } = splitProfiles(data.profiles);
    const median = data.median;
    const rows = [...(self ? [self] : []), ...competitors];
    const unknownAds = rows.some(p => p.activeCampaigns === null);

    const renderRow = (profile: CompetitionProfile, showDirections: boolean) => {
        const props: RowProps = {
            profile,
            color: colorFor(colors, profile.username),
            median,
            windowFrom: data.from,
            showDirections,
            onOpen: onOpenProfile,
        };
        return isDesktop
            ? <DesktopRow key={profile.studioProfileId} {...props} />
            : <PhoneListRow key={profile.studioProfileId} {...props} />;
    };

    const title = (
        <SectionTitle as="h2" size="lg" count={`${competitors.length} ${pluralPl(competitors.length, 'konkurent', 'konkurentów', 'konkurentów')}`}>
            Ty i konkurencja
        </SectionTitle>
    );

    if (!isDesktop) {
        return (
            <Card>
                {/* Bez „kliknij profil…": na telefonie dotyk wiersza zapowiada strzałka w prawo. */}
                <Head>{title}</Head>
                <PhoneCaptions aria-hidden="true">
                    <span>Obserwujący</span>
                    <span>Posty na tydzień</span>
                    <span>Reakcje na post</span>
                    <span>Reklamy teraz</span>
                </PhoneCaptions>
                <div role="list" aria-label="Profile, dotknij, żeby zobaczyć szczegóły">
                    {rows.map(profile => (
                        <div role="listitem" key={profile.studioProfileId}>
                            {renderRow(profile, profile.isSelf && median !== null)}
                        </div>
                    ))}
                </div>
                {median && (
                    <PhoneMedian>
                        <PhoneMedianTitle>
                            Mediana konkurencji
                            <span>z {median.basedOn} {pluralPl(median.basedOn, 'profilu', 'profili', 'profili')}</span>
                        </PhoneMedianTitle>
                        <PhoneNum $first>
                            {formatNumber(median.followers)}
                            {formatSignedPct(median.followersGainPct) && <small>{formatSignedPct(median.followersGainPct)}</small>}
                        </PhoneNum>
                        <PhoneNum>{formatPerWeek(median.postsPerWeek) ?? EMPTY}</PhoneNum>
                        <PhoneNum>{formatNumber(median.reactionsPerPost)}</PhoneNum>
                    </PhoneMedian>
                )}
                {unknownAds && (
                    <PhoneNote>„?” przy reklamach: profil nie ma wskazanej strony na Facebooku, więc nie wiemy, czy się reklamuje.</PhoneNote>
                )}
            </Card>
        );
    }

    return (
        <Card>
            <Head>
                {title}
                <span>kliknij profil, żeby zobaczyć szczegóły</span>
            </Head>

            <Table>
                <HeaderRow>
                    <span>Profil</span>
                    <span>Obserwujący</span>
                    <span>Posty na tydzień</span>
                    <span>Reakcje na post</span>
                    <span>Reklamy teraz</span>
                </HeaderRow>

                {rows.map(profile => renderRow(profile, profile.isSelf && median !== null))}

                {median && (
                    <MedianRow>
                        <Name as="span">
                            Mediana konkurencji
                            <span style={{ fontSize: 12, fontWeight: 500, color: ui.textMuted }}>
                                z {median.basedOn} {pluralPl(median.basedOn, 'profilu', 'profili', 'profili')}
                            </span>
                        </Name>
                        <Num>
                            {formatNumber(median.followers)}
                            {formatSignedPct(median.followersGainPct) && <small>{formatSignedPct(median.followersGainPct)}</small>}
                        </Num>
                        <Num>{formatPerWeek(median.postsPerWeek) ?? EMPTY}</Num>
                        <Num>{formatNumber(median.reactionsPerPost)}</Num>
                        <Num />
                    </MedianRow>
                )}
            </Table>
        </Card>
    );
};
