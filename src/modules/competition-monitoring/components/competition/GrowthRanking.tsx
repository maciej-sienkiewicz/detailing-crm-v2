import React from 'react';
import styled from 'styled-components';
import { Panel, PanelBody, PanelHead, SectionTitle, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { CompetitionMedian, CompetitionProfile } from '../../types';
import { formatSignedCount, formatSignedPct, growthRanking, medianMarker } from '../../utils/competition';
import { colorFor } from '../../utils/profileColors';
import { PHONE } from '../../utils/phone';

/**
 * Ranking przyrostu obserwujących w procentach zamiast linii skumulowanych w sztukach.
 *
 * „Jesteś 4. z 4., @autopodrobku zdobył 11× więcej" było prawdą, z której nic nie
 * wynikało: konto ogólnopolskie zawsze wygra w sztukach. W procentach pytanie brzmi tak,
 * jak zadaje je właściciel: czy rosnę szybciej niż studia, z którymi rywalizuję. Liczba
 * osób zostaje w etykiecie, bo „+3,8%" bez niej nic nie waży.
 */

const List = styled.ol`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Item = styled.li`
    display: grid;
    grid-template-columns: minmax(110px, 170px) 1fr minmax(92px, auto);
    gap: 12px;
    align-items: center;

    @media (max-width: 520px) { grid-template-columns: minmax(90px, 120px) 1fr auto; gap: 8px; }

    /*
     * Nazwa, pasek i liczby w jednym rzędzie zostawiały nazwie 120 px i pełne uchwyty
     * („@glosswerk_war…") ginęły. Na telefonie nazwa stoi nad paskiem na jego szerokość,
     * a procent z liczbą osób zajmuje prawą kolumnę obu linii. Kolumna ma stałą
     * szerokość: każdy wiersz to osobna siatka, a przy „auto" paski miały różne długości
     * i kreska mediany stała w każdym wierszu gdzie indziej.
     */
    ${PHONE} {
        grid-template-columns: minmax(0, 1fr) 92px;
        grid-template-areas: 'who value' 'track value';
        gap: 6px 14px;
    }
`;

const Who = styled.span<{ $self?: boolean }>`
    font-size: 13px;
    font-weight: ${p => (p.$self ? 700 : 500)};
    color: ${ui.ink};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    ${PHONE} { grid-area: who; }
`;

const Track = styled.span`
    position: relative;
    height: 14px;
    border-radius: 999px;
    background: ${ui.lineFaint};

    ${PHONE} { grid-area: track; }
`;

const Bar = styled.span<{ $width: number; $color: string; $negative: boolean }>`
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${p => Math.max(p.$width, 2)}%;
    border-radius: 999px;
    background: ${p => (p.$negative ? ui.dangerLine : p.$color)};
`;

const Median = styled.span<{ $left: number }>`
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: ${p => p.$left}%;
    width: 0;
    border-left: 2px dashed ${ui.inkSoft};
`;

const Value = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};

    small { font-size: 12px; font-weight: 500; color: ${ui.textMuted}; white-space: nowrap; }

    ${PHONE} { grid-area: value; align-self: center; }
`;

const Foot = styled.p`
    margin: 12px 0 0;
    font-size: 12px;
    color: ${ui.textMuted};
    display: flex;
    align-items: center;
    gap: 6px;

    i { display: inline-block; width: 0; height: 12px; border-left: 2px dashed ${ui.inkSoft}; }
`;

const Empty = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

interface Props {
    profiles: CompetitionProfile[];
    median: CompetitionMedian | null;
    colors: Map<string, string>;
    periodLabel: string;
}

export const GrowthRanking: React.FC<Props> = ({ profiles, median, colors, periodLabel }) => {
    const rows = growthRanking(profiles);
    const marker = medianMarker(rows, median);
    const medianPct = formatSignedPct(median?.followersGainPct);

    return (
        <Panel>
            <PanelHead>
                <SectionTitle count={periodLabel}>Przyrost obserwujących</SectionTitle>
            </PanelHead>
            <PanelBody>
                {rows.length === 0 ? (
                    <Empty>Przyrost policzymy po dwóch pomiarach, zwykle następnego dnia po dodaniu profilu.</Empty>
                ) : (
                    <>
                        <List>
                            {rows.map(({ profile, width, negative }) => {
                                const people = profile.followersGain;
                                return (
                                    <Item key={profile.studioProfileId}>
                                        <Who $self={profile.isSelf} title={`@${profile.username}`}>
                                            {profile.isSelf ? 'Ty' : `@${profile.username}`}
                                        </Who>
                                        <Track>
                                            <Bar $width={width} $color={colorFor(colors, profile.username)} $negative={negative} />
                                            {marker !== null && <Median $left={marker} aria-hidden="true" />}
                                        </Track>
                                        <Value>
                                            {formatSignedPct(profile.followersGainPct)}
                                            {people !== null && (
                                                <small>
                                                    {formatSignedCount(people)} {pluralPl(Math.abs(people), 'osoba', 'osoby', 'osób')}
                                                </small>
                                            )}
                                        </Value>
                                    </Item>
                                );
                            })}
                        </List>
                        {marker !== null && medianPct && (
                            <Foot><i /> mediana konkurencji {medianPct}</Foot>
                        )}
                    </>
                )}
            </PanelBody>
        </Panel>
    );
};
