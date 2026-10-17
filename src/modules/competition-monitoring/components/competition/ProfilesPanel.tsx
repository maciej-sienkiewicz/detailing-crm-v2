import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { useBreakpoint } from '@/common/hooks';
import type { CompetitionMedian, CompetitionProfile, CompetitionResponse } from '../../types';
import { EMPTY, formatNumber } from '../MetricBits';
import { colorFor } from '../../utils/profileColors';
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

// ─── Telefon: karty zamiast pięciu kolumn ─────────────────────────────────────

const MobileList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 12px 14px;
`;

const MobileRow = styled.button<{ $self?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    border: 1px solid ${p => (p.$self ? ui.brandLineSoft : ui.line)};
    border-radius: ${ui.radiusRow};
    background: ${p => (p.$self ? ui.brandTint : ui.surface)};
    font-family: inherit;
    text-align: left;
    color: ${ui.ink};
    cursor: pointer;
`;

const MobileStats = styled.dl`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 12px;
    margin: 0;

    div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    dt { font-size: 12px; color: ${ui.textMuted}; }
    dd { margin: 0; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
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

const MobileCard: React.FC<RowProps> = ({ profile, color, windowFrom, onOpen }) => {
    const since = growthSinceLabel(profile.growthFrom, windowFrom);
    const growth = formatSignedPct(profile.followersGainPct);
    return (
        <MobileRow type="button" $self={profile.isSelf} onClick={() => onOpen(profile)}>
            <Name>
                <Dot $color={color} />
                <b>@{profile.username}</b>
                {profile.isSelf && <StatusPill $tone="info" $size="sm">Ty</StatusPill>}
                {profile.apiError && <ApiError aria-label="Ostatnie pobranie danych nie powiodło się" />}
            </Name>
            <MobileStats>
                <div>
                    <dt>Obserwujący</dt>
                    <dd>
                        {formatNumber(profile.followers)}{' '}
                        {growth && <Growth as="span" $tone={growthTone(profile.followersGainPct)}>{growth}</Growth>}
                    </dd>
                    {since && <dt>{since}</dt>}
                </div>
                <div><dt>Posty na tydzień</dt><dd>{formatPerWeek(profile.postsPerWeek) ?? EMPTY}</dd></div>
                <div><dt>Reakcje na post</dt><dd>{formatNumber(profile.reactionsPerPost)}</dd></div>
                <div><dt>Reklamy teraz</dt><dd><AdsCell value={profile.activeCampaigns} /></dd></div>
            </MobileStats>
        </MobileRow>
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
            : <MobileCard key={profile.studioProfileId} {...props} />;
    };

    const Body = isDesktop ? Table : MobileList;

    return (
        <Card>
            <Head>
                <SectionTitle as="h2" size="lg" count={`${competitors.length} ${pluralPl(competitors.length, 'konkurent', 'konkurentów', 'konkurentów')}`}>
                    Ty i konkurencja
                </SectionTitle>
                <span>kliknij profil, żeby zobaczyć szczegóły</span>
            </Head>

            <Body>
                {isDesktop && (
                    <HeaderRow>
                        <span>Profil</span>
                        <span>Obserwujący</span>
                        <span>Posty na tydzień</span>
                        <span>Reakcje na post</span>
                        <span>Reklamy teraz</span>
                    </HeaderRow>
                )}

                {rows.map(profile => renderRow(profile, profile.isSelf && median !== null))}

                {isDesktop && median && (
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
                {!isDesktop && median && (
                    <MobileStats style={{ padding: '4px 4px 0' }}>
                        <div><dt>Mediana konkurencji, posty na tydzień</dt><dd>{formatPerWeek(median.postsPerWeek) ?? EMPTY}</dd></div>
                        <div><dt>Mediana, reakcje na post</dt><dd>{formatNumber(median.reactionsPerPost)}</dd></div>
                    </MobileStats>
                )}
            </Body>
        </Card>
    );
};
