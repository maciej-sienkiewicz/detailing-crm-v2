import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { AdCalendar, AdCalendarRow } from '../types';
import { PROFILE_COLORS } from '../types';
import { Card, CardTitle, CardHint, CenterState, formatExact } from './MetricBits';
import { LinkFacebookPageModal } from './LinkFacebookPageModal';
import { barGeometry, dayOfYear, monthStartDays, yearLength } from '../utils/adCalendar';

/**
 * Reklamy konkurencji: kalendarz roku i jedna tabela pod nim.
 *
 * Kalendarz, a nie lista reklam, bo pytanie właściciela brzmi „kto i kiedy się
 * reklamował", a nie „jakie były reklamy". Dwanaście miesięcy w poziomie, jeden
 * wiersz na profil, jeden pasek na kampanię — nakładające się kampanie leżą jedna
 * pod drugą, więc widać, że dni liczą się podwójnie, zamiast przyjmować to na wiarę.
 *
 * Wszystko poza tymi dwiema rzeczami jest w oknie szczegółów: ekran ma dać się
 * przeczytać w trzy sekundy, a nie zasypać właściciela danymi.
 */

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const HeadRow = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 14px;
`;

const LivePill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 11px;
    border-radius: ${st.radiusFull};
    background: ${st.accentGreenDim};
    color: #047857;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;

    i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${st.accentGreen};
    }
`;

const Unlinked = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 9px 13px;
    margin-bottom: 14px;
    border: 1px solid ${st.accentAmber};
    border-radius: ${st.radiusSm};
    background: ${st.accentAmberDim};
    font-size: ${st.fontSm};
    color: ${st.text};

    strong { font-weight: 700; }
`;

const LinkBtn = styled.button`
    margin-left: auto;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: #b45309;
    text-decoration: underline;
    cursor: pointer;
`;

// ── Kalendarz ─────────────────────────────────────────────────────────────────

const CalScroll = styled.div`
    overflow-x: auto;
`;

const Cal = styled.div`
    min-width: 720px;
`;

const CalRow = styled.div`
    display: grid;
    grid-template-columns: 186px minmax(0, 1fr);
    align-items: center;
`;

const CalHead = styled(CalRow)`
    border-bottom: 1px solid ${st.border};
    padding-bottom: 6px;
`;

const Months = styled.div`
    position: relative;
    height: 16px;

    span {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        font-size: ${st.fontXs};
        font-weight: 600;
        color: ${st.textMuted};
    }
`;

const CalBody = styled.div`
    position: relative;
`;

/** Siatka miesięcy, obszar przyszłości i linia „dziś" - jedna warstwa na wszystkie wiersze. */
const Grid = styled.div`
    position: absolute;
    left: 186px;
    right: 0;
    top: 0;
    bottom: 0;
    pointer-events: none;
`;

const GridLine = styled.span<{ $left: number }>`
    position: absolute;
    top: 0;
    bottom: 0;
    left: ${p => p.$left}%;
    width: 1px;
    background: ${st.border};
`;

const Future = styled.span<{ $left: number }>`
    position: absolute;
    top: 0;
    bottom: 0;
    left: ${p => p.$left}%;
    right: 0;
    background: repeating-linear-gradient(
        45deg,
        rgba(148, 163, 184, 0.06) 0 6px,
        transparent 6px 12px
    );
`;

const TodayLine = styled.span<{ $left: number }>`
    position: absolute;
    top: 0;
    bottom: 0;
    left: ${p => p.$left}%;
    width: 2px;
    background: ${st.accentBlue};
    opacity: 0.7;
`;

const ProfileRow = styled(CalRow)<{ $muted: boolean }>`
    border-top: 1px solid ${st.border};
    opacity: ${p => (p.$muted ? 0.55 : 1)};
`;

const Name = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 14px;
    font-size: 13.5px;
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    em {
        font-style: normal;
        font-weight: 400;
        font-size: ${st.fontXs};
        color: ${st.textMuted};
    }
`;

const Dot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const Lanes = styled.div`
    position: relative;
    padding: 9px 0;
`;

const Lane = styled.div`
    position: relative;
    height: 10px;
    margin-bottom: 4px;

    &:last-child { margin-bottom: 0; }

    &::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 4px;
        height: 2px;
        background: ${st.bgCardAlt};
        border-radius: 2px;
    }
`;

const Bar = styled.button<{ $left: number; $width: number; $color: string }>`
    position: absolute;
    top: 0;
    left: ${p => p.$left}%;
    width: ${p => p.$width}%;
    height: 10px;
    padding: 0;
    border: none;
    border-radius: ${st.radiusFull};
    background: ${p => p.$color};
    cursor: pointer;
    transition: box-shadow ${st.transition};

    &:hover, &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px ${st.bgCard}, 0 0 0 4px ${st.accentBlue};
    }
`;

const Legend = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${st.border};
    font-size: 11.5px;
    color: ${st.textMuted};

    span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
`;

const LegendBar = styled.i`
    width: 22px;
    height: 8px;
    border-radius: ${st.radiusFull};
    background: ${st.textMuted};
`;

const LegendToday = styled.i`
    width: 2px;
    height: 12px;
    background: ${st.accentBlue};
    opacity: 0.7;
`;

// ── Tabela podsumowania ───────────────────────────────────────────────────────

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;

    th {
        text-align: left;
        font-size: ${st.fontXs};
        font-weight: 700;
        color: ${st.textMuted};
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 8px 12px;
        border-bottom: 1px solid ${st.border};
        white-space: nowrap;
    }

    th.num { text-align: right; }

    td {
        padding: 12px;
        border-bottom: 1px solid ${st.border};
        font-size: 13.5px;
        color: ${st.text};
    }

    td.num {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        font-size: ${st.fontMd};
    }

    tbody tr:last-child td { border-bottom: none; }
`;

const DaysBar = styled.div`
    margin-top: 5px;
    height: 5px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    overflow: hidden;
    display: flex;
    justify-content: flex-end;

    i { display: block; height: 100%; border-radius: ${st.radiusFull}; }
`;

const ActiveTag = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    margin-left: 8px;
    border-radius: ${st.radiusFull};
    background: ${st.accentGreenDim};
    color: #047857;
    font-size: ${st.fontXs};
    font-weight: 700;
    white-space: nowrap;
`;

/**
 * Cicha akcja przy nazwie konkurenta: podejrzenie i zmiana wskazanej strony.
 * Stoi w tabeli podsumowania, a nie w kalendarzu, bo tam kolumna nazwy ma 186 px
 * i każdy dodatkowy element odbierałby miejsce nazwie.
 */
const PageAction = styled.button`
    margin-left: 8px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-decoration: underline;
    cursor: pointer;
    white-space: nowrap;

    &:hover { color: ${st.accentBlue}; }
`;

const FootNote = styled.div`
    padding: 12px 12px 0;
    margin-top: 4px;
    border-top: 1px solid ${st.border};
    font-size: 11.5px;
    color: ${st.textMuted};
    line-height: 1.6;

    strong { color: ${st.textSecondary}; font-weight: 700; }
`;

const colorOf = (index: number) => PROFILE_COLORS[index % PROFILE_COLORS.length];

interface Props {
    calendar: AdCalendar;
    onOpenAd: (adId: string) => void;
}

export const AdsTab: React.FC<Props> = ({ calendar, onOpenAd }) => {
    const [linking, setLinking] = useState<
        { profileId: string; username: string; pageId?: string | null } | null
    >(null);

    const { year, today, rows } = calendar;
    const length = yearLength(year);
    const todayLeft = today.startsWith(String(year)) ? (dayOfYear(today) / length) * 100 : 100;

    const months = useMemo(() => {
        const starts = monthStartDays(year);
        return starts.map((day, index) => {
            const next = starts[index + 1] ?? length + 1;
            return {
                label: MONTHS[index],
                center: (((day + next - 1) / 2 - 1) / length) * 100,
                line: ((day - 1) / length) * 100,
            };
        });
    }, [year, length]);

    const colors = useMemo(() => {
        const map = new Map<string, string>();
        rows.forEach((row, index) => map.set(row.profileId, colorOf(index)));
        return map;
    }, [rows]);

    const maxDays = Math.max(1, ...rows.map(row => row.sponsoredDays));

    if (!calendar.configured) {
        return (
            <Card>
                <CenterState>
                    <strong>Reklamy konkurencji nie są jeszcze podłączone</strong>
                    <span>
                        Czekamy na dostęp do Biblioteki reklam Meta. Gdy tylko go dostaniemy,
                        zobaczysz tu kalendarz kampanii obserwowanych profili.
                    </span>
                </CenterState>
            </Card>
        );
    }

    if (rows.length === 0 && calendar.unlinked.length === 0) {
        return (
            <Card>
                <CenterState>
                    <strong>Brak obserwowanych profili</strong>
                    <span>Dodaj profile konkurencji, żeby sprawdzić, kto z nich się reklamuje.</span>
                </CenterState>
            </Card>
        );
    }

    return (
        <Layout>
            <Card>
                <HeadRow>
                    <CardTitle>Kalendarz reklam · {year}</CardTitle>
                    {calendar.activeToday > 0 && (
                        <LivePill>
                            <i />
                            {calendar.activeToday}{' '}
                            {calendar.activeToday === 1 ? 'reklama aktywna dziś' : 'reklamy aktywne dziś'}
                        </LivePill>
                    )}
                </HeadRow>

                {calendar.unlinked.map(profile => (
                    <Unlinked key={profile.profileId}>
                        <span>
                            <strong>@{profile.username}</strong> — profil nie jest połączony ze stroną na
                            Facebooku, więc nie wiemy, czy się reklamuje
                        </span>
                        <LinkBtn
                            type="button"
                            onClick={() => setLinking({ profileId: profile.profileId, username: profile.username })}
                        >
                            Wskaż stronę FB
                        </LinkBtn>
                    </Unlinked>
                ))}

                {rows.length > 0 && (
                    <>
                        <CalScroll>
                            <Cal>
                                <CalHead>
                                    <div />
                                    <Months>
                                        {months.map(month => (
                                            <span key={month.label} style={{ left: `${month.center}%` }}>
                                                {month.label}
                                            </span>
                                        ))}
                                    </Months>
                                </CalHead>

                                <CalBody>
                                    <Grid>
                                        {months.slice(1).map(month => (
                                            <GridLine key={month.label} $left={month.line} />
                                        ))}
                                        {todayLeft < 100 && (
                                            <>
                                                <Future $left={todayLeft} />
                                                <TodayLine $left={todayLeft} />
                                            </>
                                        )}
                                    </Grid>

                                    {rows.map(row => (
                                        <ProfileRow key={row.profileId} $muted={row.ads.length === 0}>
                                            <Name>
                                                <Dot $color={colors.get(row.profileId) ?? st.textMuted} />
                                                {row.username}
                                                {row.ads.length === 0 && <em>bez reklam</em>}
                                            </Name>
                                            <Lanes>
                                                {Array.from({ length: Math.max(row.lanes, 1) }).map((_, lane) => (
                                                    <Lane key={lane}>
                                                        {row.ads
                                                            .filter(ad => ad.lane === lane)
                                                            .map(ad => {
                                                                const geometry = barGeometry(ad.start, ad.stop, year, today);
                                                                return (
                                                                    <Bar
                                                                        key={ad.adId}
                                                                        type="button"
                                                                        $left={geometry.left}
                                                                        $width={geometry.width}
                                                                        $color={colors.get(row.profileId) ?? st.textMuted}
                                                                        title={`${ad.title ?? 'Kampania'} · ${ad.days} dni`}
                                                                        aria-label={`${row.username}: ${ad.title ?? 'kampania'}, ${ad.days} dni`}
                                                                        onClick={() => onOpenAd(ad.adId)}
                                                                    />
                                                                );
                                                            })}
                                                    </Lane>
                                                ))}
                                            </Lanes>
                                        </ProfileRow>
                                    ))}
                                </CalBody>
                            </Cal>
                        </CalScroll>

                        <Legend>
                            <span><LegendBar /> jeden pasek = jedna kampania</span>
                            <span>paski jeden pod drugim = kampanie w tym samym czasie</span>
                            <span><LegendToday /> niebieska linia = dziś</span>
                            <span>kliknij pasek → szczegóły</span>
                        </Legend>
                    </>
                )}
            </Card>

            {rows.length > 0 && (
                <Card>
                    <CardTitle>Podsumowanie roku</CardTitle>
                    <CardHint>Dni liczone dla każdej kampanii osobno.</CardHint>
                    <Table>
                        <thead>
                            <tr>
                                <th>Konkurent</th>
                                <th className="num">Kampanie</th>
                                <th className="num">Dni sponsorowane</th>
                                <th className="num">Zasięg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <SummaryRow
                                    key={row.profileId}
                                    row={row}
                                    color={colors.get(row.profileId) ?? st.textMuted}
                                    maxDays={maxDays}
                                    onEditPage={() =>
                                        setLinking({
                                            profileId: row.profileId,
                                            username: row.username,
                                            pageId: row.facebookPageId,
                                        })
                                    }
                                />
                            ))}
                        </tbody>
                    </Table>
                    <FootNote>
                        <strong>Dni sponsorowane</strong> — dni każdej kampanii liczone osobno: 4 kampanie
                        od 14 do 16 marca to 4 × 3 = 12 dni.<br />
                        <strong>Zasięg</strong> — szacunkowa liczba kont Meta w Polsce, które zobaczyły
                        reklamę co najmniej raz.
                    </FootNote>
                </Card>
            )}

            {linking && (
                <LinkFacebookPageModal
                    profileId={linking.profileId}
                    username={linking.username}
                    currentPageId={linking.pageId}
                    onClose={() => setLinking(null)}
                />
            )}
        </Layout>
    );
};

const SummaryRow: React.FC<{
    row: AdCalendarRow;
    color: string;
    maxDays: number;
    onEditPage: () => void;
}> = ({ row, color, maxDays, onEditPage }) => (
    <tr style={row.ads.length === 0 ? { opacity: 0.6 } : undefined}>
        <td>
            <Name>
                <Dot $color={color} />
                {row.username}
                {row.activeNow > 0 && <ActiveTag>TRWA {row.activeNow}</ActiveTag>}
                {/* Przy profilu bez reklam to jest pierwsze pytanie, jakie się nasuwa:
                    czy na pewno wskazano właściwą stronę. */}
                <PageAction type="button" onClick={onEditPage}>
                    {row.ads.length === 0 ? 'sprawdź stronę FB' : 'strona FB'}
                </PageAction>
            </Name>
        </td>
        <td className="num">{row.campaigns > 0 ? row.campaigns : '—'}</td>
        <td className="num">
            {row.sponsoredDays}
            {row.sponsoredDays > 0 && (
                <DaysBar>
                    <i style={{ width: `${(row.sponsoredDays / maxDays) * 100}%`, background: color }} />
                </DaysBar>
            )}
        </td>
        <td className="num">{row.reachTotal !== null ? formatExact(row.reachTotal) : '—'}</td>
    </tr>
);
