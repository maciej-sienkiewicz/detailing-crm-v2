import React, { useState } from 'react';
import styled from 'styled-components';
import { Panel, PanelBody, PanelHead, SectionTitle, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { useBreakpoint } from '@/common/hooks';
import type { CompetitionEvent, CompetitionProfile } from '../../types';
import { calendarLevel, formatPerWeek, monthColumns, monthLevel, weekRangeLabel } from '../../utils/competition';
import { colorFor } from '../../utils/profileColors';

/**
 * Kalendarz publikacji zamiast wykresu „Ile publikują tydzień po tygodniu".
 *
 * Wykres linii odpowiadał na pytanie „kto publikuje regularnie, a kto zamilkł" tak,
 * że trzeba było zgadywać kolor linii i odczytywać wartości 0-8 z wygładzonej krzywej.
 * Kalendarz odpowiada na nie jednym rzutem oka: wiersz to profil, kwadrat to tydzień,
 * dziura to tydzień bez posta. Działa tak samo dla 13 i 53 tygodni; telefon ma własny
 * układ (niżej), bo kolumna nazw i 53 kolumny nie mieszczą się w jego szerokości.
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

// ─── Telefon: cały okres w szerokości ekranu ──────────────────────────────────

/*
 * Na telefonie siatka z kolumną nazw zaczynała się od najstarszego tygodnia: bieżący
 * tydzień był poza ekranem, nazwy odjeżdżały razem z kwadratami, a rok to były kwadraty
 * po 10 px z wartością tylko w dymku, którego palcem nie da się wywołać. Teraz nazwa
 * stoi nad swoim rzędem, rząd mieści cały okres bez przewijania (13 tygodni albo
 * 12-13 miesięcy zamiast 53 tygodni), a dotknięty kwadrat mówi swoją wartość pod siatką.
 */

const PhoneLegend = styled(Legend)`
    font-size: 13px;
    color: ${ui.textSecondary};

    i { width: 14px; height: 14px; }
`;

const PhoneRows = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

/* Kolumna rośnie najwyżej do 30 px: telefon poziomo (do 767 px) dawał kwadraty po 45 px. */
const PhoneCols = styled.div<{ $count: number }>`
    display: grid;
    grid-template-columns: repeat(${p => p.$count}, minmax(0, 30px));
    gap: 4px;
`;

const PhoneTicks = styled(PhoneCols)`
    height: 16px;
    margin-bottom: -2px;
`;

const PhoneTick = styled.span<{ $end?: boolean }>`
    justify-self: ${p => (p.$end ? 'end' : 'start')};
    font-size: 12px;
    color: ${ui.textMuted};
    white-space: nowrap;
`;

const PhoneProfile = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const PhoneName = styled.span<{ $self?: boolean }>`
    font-size: 13px;
    font-weight: ${p => (p.$self ? 700 : 500)};
    color: ${ui.ink};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const PhoneCell = styled.button<{ $bg: string; $current?: boolean; $event?: boolean; $selected?: boolean }>`
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: ${p => p.$bg};
    outline: ${p => (p.$selected ? `2px solid ${ui.ink}` : p.$current ? `1.5px dashed ${ui.lineStrong}` : 'none')};
    outline-offset: 1px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    /* Kwadrat ma ~20 px; cel dotyku sięga w pionie do nazwy nad rzędem i odstępu pod nim. */
    &::before {
        content: '';
        position: absolute;
        inset: -8px -2px;
    }

    &::after {
        content: '';
        display: ${p => (p.$event ? 'block' : 'none')};
        position: absolute;
        top: -4px;
        right: -3px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${ui.warnInk};
        border: 1px solid ${ui.surface};
    }

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const Readout = styled.p`
    margin: 14px 0 0;
    min-height: 42px;
    padding: 10px 12px;
    border-radius: ${ui.radiusRow};
    background: ${ui.surfaceSoft};
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.textSecondary};

    b { color: ${ui.ink}; font-weight: 600; }
`;

const PhoneFoot = styled(Foot)`
    font-size: 12px;
    line-height: 1.45;
`;

interface PhoneColumn {
    key: string;
    tick: string;
    /** Podpis pod siatką: „6–12 paź", „październik 2025". */
    label: string;
    weekIndexes: number[];
}

const monthTick = (month: string) => {
    const date = new Date(`${month}T00:00:00`);
    const short = date.toLocaleDateString('pl-PL', { month: 'short' });
    // Styczeń niesie rok - w widoku 12 miesięcy ten sam miesiąc bywa dwa razy.
    return date.getMonth() === 0 ? `${short} ${date.getFullYear()}` : short;
};

const PhoneCalendar: React.FC<Props> = ({ weeks, profiles, events, colors }) => {
    const monthly = weeks.length > 20;
    const [selected, setSelected] = useState<{ profileId: string; column: number } | null>(null);

    const columns: PhoneColumn[] = monthly
        ? monthColumns(weeks).map((m, i, all) => ({
            key: m.month,
            // Podpis co trzy miesiące licząc od bieżącego, żeby bieżący zawsze go miał.
            tick: (all.length - 1 - i) % 3 === 0 ? monthTick(m.month) : '',
            label: new Date(`${m.month}T00:00:00`).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
            weekIndexes: m.weekIndexes,
        }))
        : weeks.map((week, i, all) => ({
            key: week,
            tick: (all.length - 1 - i) % 4 === 0 ? shortDate(week) : '',
            label: weekRangeLabel(week),
            weekIndexes: [i],
        }));
    const last = columns.length - 1;

    const eventsByProfile = new Map<string, CompetitionEvent[]>();
    events.forEach(e => {
        if (!e.profileId) return;
        eventsByProfile.set(e.profileId, [...(eventsByProfile.get(e.profileId) ?? []), e]);
    });
    const columnEvents = (profile: CompetitionProfile, column: PhoneColumn) => {
        const starts = new Set(column.weekIndexes.map(i => weeks[i]));
        return (eventsByProfile.get(profile.profileId) ?? []).filter(e => starts.has(e.weekStart));
    };
    const columnPosts = (profile: CompetitionProfile, column: PhoneColumn) =>
        column.weekIndexes.reduce((sum, i) => sum + (profile.weeklyPosts[i] ?? 0), 0);

    const describe = (profile: CompetitionProfile, column: PhoneColumn, index: number) => {
        const posts = columnPosts(profile, column);
        const perWeek = monthly && posts > 0 ? `, średnio ${formatPerWeek(posts / column.weekIndexes.length)} na tydzień` : '';
        const inProgress = index === last ? (monthly ? ' (miesiąc w toku)' : ' (tydzień w toku)') : '';
        const titles = columnEvents(profile, column).map(e => e.title);
        return {
            who: profile.isSelf ? 'Ty' : `@${profile.username}`,
            when: column.label,
            value: `${posts} ${pluralPl(posts, 'post', 'posty', 'postów')}${perWeek}${inProgress}`,
            events: titles.map(t => (/[.!?…]$/.test(t) ? t : `${t}.`)).join(' '),
        };
    };

    const picked = selected ? profiles.find(p => p.profileId === selected.profileId) : undefined;
    const readout = picked && selected ? describe(picked, columns[selected.column], selected.column) : null;

    return (
        <Panel>
            <PanelHead>
                <SectionTitle
                    count={monthly
                        ? `${columns.length} ${pluralPl(columns.length, 'miesiąc', 'miesiące', 'miesięcy')}`
                        : `${weeks.length} ${pluralPl(weeks.length, 'tydzień', 'tygodnie', 'tygodni')}`}
                >
                    Kalendarz publikacji
                </SectionTitle>
                <PhoneLegend aria-label={monthly ? 'Legenda: średnio postów na tydzień' : 'Legenda: posty w tygodniu'}>
                    <span>0</span>
                    <i style={{ background: fillFor(ui.brand, 0) }} />
                    <i style={{ background: fillFor(ui.brand, 1) }} />
                    <i style={{ background: fillFor(ui.brand, 2) }} />
                    <i style={{ background: fillFor(ui.brand, 3) }} />
                    <span>{monthly ? '3+ posty na tydzień' : '3+ posty'}</span>
                </PhoneLegend>
            </PanelHead>
            <PanelBody>
                <PhoneRows>
                    <PhoneTicks $count={columns.length} aria-hidden="true">
                        {columns.map((c, i) => <PhoneTick key={c.key} $end={i === last}>{c.tick}</PhoneTick>)}
                    </PhoneTicks>
                    {profiles.map(profile => {
                        const color = colorFor(colors, profile.username);
                        return (
                            <PhoneProfile key={profile.studioProfileId}>
                                <PhoneName $self={profile.isSelf}>{profile.isSelf ? 'Ty' : `@${profile.username}`}</PhoneName>
                                <PhoneCols $count={columns.length} role="group" aria-label={profile.isSelf ? 'Ty' : `@${profile.username}`}>
                                    {columns.map((column, index) => {
                                        const posts = columnPosts(profile, column);
                                        const level = monthly ? monthLevel(posts, column.weekIndexes.length) : calendarLevel(posts);
                                        const isSelected = selected?.profileId === profile.profileId && selected.column === index;
                                        const d = describe(profile, column, index);
                                        return (
                                            <PhoneCell
                                                key={column.key}
                                                type="button"
                                                $bg={fillFor(color, level)}
                                                $current={index === last}
                                                $event={columnEvents(profile, column).length > 0}
                                                $selected={isSelected}
                                                aria-pressed={isSelected}
                                                aria-label={`${d.when}: ${d.value}.${d.events ? ` ${d.events}` : ''}`}
                                                onClick={() => setSelected(isSelected ? null : { profileId: profile.profileId, column: index })}
                                            />
                                        );
                                    })}
                                </PhoneCols>
                            </PhoneProfile>
                        );
                    })}
                </PhoneRows>
                <Readout aria-live="polite">
                    {readout
                        ? <><b>{readout.who}, {readout.when}:</b> {readout.value}.{readout.events ? ` ${readout.events}` : ''}</>
                        : monthly
                            ? 'Dotknij kwadratu, żeby zobaczyć, ile postów było w tym miesiącu.'
                            : 'Dotknij kwadratu, żeby zobaczyć, ile postów było w tym tygodniu.'}
                </Readout>
                <PhoneFoot>
                    {monthly
                        ? 'Kwadrat to miesiąc, odcień to średnia postów na tydzień. Ostatni miesiąc jest w toku (obrys przerywany). Kropka oznacza promocję, konkurs albo hit.'
                        : 'Ostatni tydzień jest w toku (obrys przerywany). Kropka oznacza promocję, konkurs albo hit.'}
                </PhoneFoot>
            </PanelBody>
        </Panel>
    );
};

interface Props {
    weeks: string[];
    profiles: CompetitionProfile[];
    events: CompetitionEvent[];
    colors: Map<string, string>;
}

export const PublicationCalendar: React.FC<Props> = props => {
    const isDesktop = useBreakpoint('md');
    return isDesktop ? <DesktopCalendar {...props} /> : <PhoneCalendar {...props} />;
};

const DesktopCalendar: React.FC<Props> = ({ weeks, profiles, events, colors }) => {
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
