import React from 'react';
import styled from 'styled-components';
import { Panel, PanelBody, PanelHead, SectionTitle, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { CompetitionEvent, CompetitionProfile } from '../../types';
import { calendarLevel } from '../../utils/competition';
import { colorFor } from '../../utils/profileColors';

/**
 * Kalendarz publikacji zamiast wykresu „Ile publikują tydzień po tygodniu".
 *
 * Wykres linii odpowiadał na pytanie „kto publikuje regularnie, a kto zamilkł" tak,
 * że trzeba było zgadywać kolor linii i odczytywać wartości 0-8 z wygładzonej krzywej.
 * Kalendarz odpowiada na nie jednym rzutem oka: wiersz to profil, kwadrat to tydzień,
 * dziura to tydzień bez posta. Działa tak samo dla 13 i 53 tygodni i na telefonie.
 */

const Legend = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${ui.textMuted};

    i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
`;

const Scroll = styled.div`
    overflow-x: auto;
    padding-bottom: 4px;
`;

const Grid = styled.div<{ $weeks: number; $cell: number }>`
    display: grid;
    grid-template-columns: minmax(120px, 160px) repeat(${p => p.$weeks}, ${p => p.$cell}px);
    gap: 4px;
    align-items: center;
    min-width: max-content;
`;

const RowName = styled.span<{ $self?: boolean }>`
    font-size: 13px;
    font-weight: ${p => (p.$self ? 700 : 500)};
    color: ${ui.ink};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 8px;
`;

const Cell = styled.span<{ $bg: string; $current?: boolean; $cell: number; $event?: boolean }>`
    position: relative;
    width: ${p => p.$cell}px;
    height: ${p => p.$cell}px;
    border-radius: ${p => (p.$cell > 12 ? 4 : 2)}px;
    background: ${p => p.$bg};
    outline: ${p => (p.$current ? `1.5px dashed ${ui.lineStrong}` : 'none')};
    outline-offset: 1px;

    /* Kropka nad kwadratem: w tym tygodniu było wydarzenie (promocja, konkurs, hit). */
    &::after {
        content: '';
        display: ${p => (p.$event ? 'block' : 'none')};
        position: absolute;
        top: -5px;
        right: -2px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${ui.warnInk};
        border: 1px solid ${ui.surface};
    }
`;

const WeekLabel = styled.span`
    font-size: 11px;
    color: ${ui.textMuted};
    white-space: nowrap;
    overflow: visible;
`;

const Foot = styled.p`
    margin: 10px 0 0;
    font-size: 12px;
    color: ${ui.textMuted};
`;

const ALPHA = ['', '59', 'A6', ''] as const;

const fillFor = (color: string, level: 0 | 1 | 2 | 3) => (level === 0 ? ui.lineFaint : `${color}${ALPHA[level]}`);

const shortDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

interface Props {
    weeks: string[];
    profiles: CompetitionProfile[];
    events: CompetitionEvent[];
    colors: Map<string, string>;
}

export const PublicationCalendar: React.FC<Props> = ({ weeks, profiles, events, colors }) => {
    const long = weeks.length > 20;
    const cell = long ? 10 : 18;
    // Etykieta co miesiąc przy roku, co cztery tygodnie przy 90 dniach.
    const labelEvery = long ? 0 : 4;
    const eventsByKey = new Map<string, CompetitionEvent[]>();
    events.forEach(e => {
        const key = `${e.profileId}:${e.weekStart}`;
        eventsByKey.set(key, [...(eventsByKey.get(key) ?? []), e]);
    });

    const label = (week: string, index: number) => {
        if (long) {
            const date = new Date(`${week}T00:00:00`);
            const prev = index > 0 ? new Date(`${weeks[index - 1]}T00:00:00`) : null;
            return !prev || prev.getMonth() !== date.getMonth()
                ? date.toLocaleDateString('pl-PL', { month: 'short' })
                : '';
        }
        return index % labelEvery === 0 ? shortDate(week) : '';
    };

    return (
        <Panel>
            <PanelHead>
                <SectionTitle count={`${weeks.length} ${pluralPl(weeks.length, 'tydzień', 'tygodnie', 'tygodni')}`}>
                    Kalendarz publikacji
                </SectionTitle>
                <Legend aria-label="Legenda: posty w tygodniu">
                    <span>0</span>
                    <i style={{ background: fillFor(ui.brand, 0) }} />
                    <i style={{ background: fillFor(ui.brand, 1) }} />
                    <i style={{ background: fillFor(ui.brand, 2) }} />
                    <i style={{ background: fillFor(ui.brand, 3) }} />
                    <span>3+ posty</span>
                </Legend>
            </PanelHead>
            <PanelBody>
                <Scroll>
                    <Grid $weeks={weeks.length} $cell={cell} role="table" aria-label="Posty w kolejnych tygodniach">
                        <span />
                        {weeks.map((week, index) => <WeekLabel key={week}>{label(week, index)}</WeekLabel>)}

                        {profiles.map(profile => {
                            const color = colorFor(colors, profile.username);
                            return (
                                <React.Fragment key={profile.studioProfileId}>
                                    <RowName $self={profile.isSelf} title={`@${profile.username}`}>
                                        {profile.isSelf ? 'Ty' : `@${profile.username}`}
                                    </RowName>
                                    {weeks.map((week, index) => {
                                        const posts = profile.weeklyPosts[index] ?? 0;
                                        const weekEvents = eventsByKey.get(`${profile.profileId}:${week}`) ?? [];
                                        const current = index === weeks.length - 1;
                                        const title = [
                                            `@${profile.username}, tydzień od ${shortDate(week)}: ${posts} ${pluralPl(posts, 'post', 'posty', 'postów')}`,
                                            current ? 'tydzień w toku' : null,
                                            ...weekEvents.map(e => e.title),
                                        ].filter(Boolean).join('\n');
                                        return (
                                            <Cell
                                                key={week}
                                                $cell={cell}
                                                $bg={fillFor(color, calendarLevel(posts))}
                                                $current={current}
                                                $event={weekEvents.length > 0}
                                                title={title}
                                                aria-label={title}
                                                role="cell"
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </Grid>
                </Scroll>
                <Foot>Ostatni tydzień jest w toku (obrys przerywany). Kropka oznacza promocję, konkurs albo hit.</Foot>
            </PanelBody>
        </Panel>
    );
};
