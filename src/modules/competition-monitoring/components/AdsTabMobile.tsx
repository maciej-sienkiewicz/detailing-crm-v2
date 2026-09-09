import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp, ExternalLink } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { AdBar, AdCalendar, AdCalendarRow, UnlinkedProfile } from '../types';
import { PROFILE_COLORS } from '../types';
import { CenterState, formatExact } from './MetricBits';
import { LinkFacebookPageModal } from './LinkFacebookPageModal';
import { dayOfYear, monthStartDays, yearLength } from '../utils/adCalendar';

/**
 * Mobilny widok Reklamy — twin dla AdsTab (desktop). Zamiast rocznego timeline'a
 * (który na 343 px zamienia 3-dniową kampanię w 3 px słupek) każda karta profilu
 * pokazuje histogram 12 miesięcy z liczbą dni sponsorowanych — czytelne przy każdej
 * szerokości ekranu. Aktualnie aktywne kampanie są przypięte jako klikalne chipy
 * nad histogramem, więc scenariusz „kto reklamuje się DZIŚ" nie wymaga ani jednego
 * tapnięcia poza otwarciem zakładki.
 */

const MONTH_LETTERS = ['S', 'L', 'M', 'K', 'M', 'C', 'L', 'S', 'W', 'P', 'L', 'G'];
const MONTH_NAMES = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

interface Props {
    calendar: AdCalendar;
    onOpenAd: (adId: string) => void;
}

interface MonthBucket {
    /** Suma dni każdej kampanii pokrywającej ten miesiąc — konsystentne z sponsoredDays z API. */
    daysInMonth: number;
    /** Kampanie z jakąkolwiek nakładką na miesiąc, posortowane po dacie startu. */
    ads: AdBar[];
}

/**
 * Rozłożenie reklam profilu na 12 miesięcy: łączne dni sponsorowane (dokładnie
 * tak jak liczy backend — kampanie równoległe liczą się osobno) plus lista kampanii
 * do rozwijalnego panelu. Nie liczymy przyszłości: dla bieżącego roku odcinamy
 * na dziś.
 */
const bucketAdsByMonth = (ads: AdBar[], year: number, today: string): MonthBucket[] => {
    const starts = monthStartDays(year);
    const length = yearLength(year);
    const lastDayInYear = today.startsWith(`${year}-`) ? dayOfYear(today) : length;
    const ends = starts.map((_, i) => (i + 1 < starts.length ? starts[i + 1] - 1 : length));

    const buckets: MonthBucket[] = Array.from({ length: 12 }, () => ({ daysInMonth: 0, ads: [] }));

    ads.forEach(ad => {
        const fromDay = ad.start.startsWith(`${year}-`) ? dayOfYear(ad.start) : 1;
        const rawStop = ad.stop && ad.stop.startsWith(`${year}-`) ? dayOfYear(ad.stop) : lastDayInYear;
        const toDay = Math.min(rawStop, lastDayInYear);
        if (toDay < fromDay) return;

        for (let m = 0; m < 12; m += 1) {
            const overlapStart = Math.max(fromDay, starts[m]);
            const overlapEnd = Math.min(toDay, ends[m]);
            if (overlapEnd >= overlapStart) {
                buckets[m].daysInMonth += overlapEnd - overlapStart + 1;
                buckets[m].ads.push(ad);
            }
        }
    });

    buckets.forEach(bucket => {
        bucket.ads.sort((a, b) => a.start.localeCompare(b.start));
    });

    return buckets;
};

const formatRange = (start: string, stop: string | null): string => {
    const startDate = new Date(`${start}T00:00:00Z`);
    const startLabel = `${startDate.getUTCDate()} ${MONTH_ABBR[startDate.getUTCMonth()]}`;
    if (!stop) return `trwa od ${startLabel}`;
    if (start === stop) return startLabel;
    const stopDate = new Date(`${stop}T00:00:00Z`);
    const stopLabel = `${stopDate.getUTCDate()} ${MONTH_ABBR[stopDate.getUTCMonth()]}`;
    return `${startLabel} – ${stopLabel}`;
};

/** Krótki opis chipa aktywnej kampanii: „trwa" albo „do 24 mar". */
const activeChipLabel = (ad: AdBar): string => {
    if (!ad.stop) return 'trwa';
    const stopDate = new Date(`${ad.stop}T00:00:00Z`);
    return `do ${stopDate.getUTCDate()} ${MONTH_ABBR[stopDate.getUTCMonth()]}`;
};

const colorOf = (index: number) => PROFILE_COLORS[index % PROFILE_COLORS.length];

export const AdsTabMobile: React.FC<Props> = ({ calendar, onOpenAd }) => {
    const [linking, setLinking] = useState<{
        profileId: string;
        username: string;
        pageId?: string | null;
    } | null>(null);

    const rowsWithColors = useMemo(
        () => calendar.rows.map((row, index) => ({ row, color: colorOf(index) })),
        [calendar.rows]
    );

    /**
     * Sortowanie: aktywni dziś na górę (właściciel wraca głównie po to), potem
     * według wolumenu w tym roku, alfabetycznie w razie remisu. Silent-owie schodzą
     * na dno listy — nie są ważni, ale trzeba wiedzieć, że istnieją.
     */
    const sortedRows = useMemo(() => {
        return [...rowsWithColors].sort((a, b) => {
            if ((a.row.activeNow > 0) !== (b.row.activeNow > 0)) return a.row.activeNow > 0 ? -1 : 1;
            if (a.row.sponsoredDays !== b.row.sponsoredDays) return b.row.sponsoredDays - a.row.sponsoredDays;
            return a.row.username.localeCompare(b.row.username, 'pl');
        });
    }, [rowsWithColors]);

    if (!calendar.configured) {
        return (
            <CenterState>
                <strong>Reklamy konkurencji nie są jeszcze podłączone</strong>
                <span>
                    Czekamy na dostęp do Biblioteki reklam Meta. Gdy tylko go dostaniemy, zobaczysz tu
                    kalendarz kampanii obserwowanych profili.
                </span>
            </CenterState>
        );
    }

    if (calendar.rows.length === 0 && calendar.unlinked.length === 0) {
        return (
            <CenterState>
                <strong>Brak obserwowanych profili</strong>
                <span>Dodaj profile konkurencji, żeby sprawdzić, kto z nich się reklamuje.</span>
            </CenterState>
        );
    }

    return (
        <Layout>
            {calendar.unlinked.length > 0 && (
                <UnlinkedGroup
                    profiles={calendar.unlinked}
                    onLink={profile =>
                        setLinking({ profileId: profile.profileId, username: profile.username })
                    }
                />
            )}

            {sortedRows.map(({ row, color }) => (
                <ProfileCard
                    key={row.profileId}
                    row={row}
                    color={color}
                    year={calendar.year}
                    today={calendar.today}
                    onOpenAd={onOpenAd}
                    onEditPage={() =>
                        setLinking({
                            profileId: row.profileId,
                            username: row.username,
                            pageId: row.facebookPageId,
                        })
                    }
                />
            ))}

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

// ─── Zbiorcza karta unlinked profili ─────────────────────────────────────────

/**
 * Jedna karta na WSZYSTKIE niepodpięte profile — nawet gdy jest ich pięć.
 * W pierwszej iteracji było N osobnych kart z powtarzającym się akapitem
 * „profil nie jest połączony ze stroną na Facebooku — nie wiemy, czy się
 * reklamuje" i pół ekranu bez informacji o reklamach.
 *
 * Chip per profil (tap → LinkFacebookPageModal). Karta zwinięta domyślnie
 * gdy profili jest 3+, żeby nie zabierała miejsca — jeden lub dwa chipy
 * pokazujemy od razu, wiele profili chowamy pod chevron.
 */
const UnlinkedGroup: React.FC<{
    profiles: UnlinkedProfile[];
    onLink: (profile: UnlinkedProfile) => void;
}> = ({ profiles, onLink }) => {
    const many = profiles.length >= 3;
    const [expanded, setExpanded] = useState(!many);

    return (
        <Card $variant="unlinked">
            <UnlinkedGroupHead
                as={many ? 'button' : 'div'}
                type={many ? 'button' : undefined}
                onClick={many ? () => setExpanded(v => !v) : undefined}
                aria-expanded={many ? expanded : undefined}
            >
                <UnlinkedIcon>
                    <AlertCircle size={16} />
                </UnlinkedIcon>
                <UnlinkedTitle>
                    {profiles.length === 1
                        ? `@${profiles[0].username} bez strony FB`
                        : `${profiles.length} profili bez strony FB`}
                </UnlinkedTitle>
                {many && (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            </UnlinkedGroupHead>
            {expanded && (
                <UnlinkedChips>
                    {profiles.map(profile => (
                        <UnlinkedChip
                            key={profile.profileId}
                            type="button"
                            onClick={() => onLink(profile)}
                        >
                            @{profile.username}
                            <ExternalLink size={11} aria-hidden />
                        </UnlinkedChip>
                    ))}
                </UnlinkedChips>
            )}
        </Card>
    );
};

// ─── Karta profilu ───────────────────────────────────────────────────────────

const ProfileCard: React.FC<{
    row: AdCalendarRow;
    color: string;
    year: number;
    today: string;
    onOpenAd: (adId: string) => void;
    onEditPage: () => void;
}> = ({ row, color, year, today, onOpenAd, onEditPage }) => {
    const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
    const isSilent = row.ads.length === 0;

    const buckets = useMemo(() => bucketAdsByMonth(row.ads, year, today), [row.ads, year, today]);
    const maxDays = useMemo(() => Math.max(1, ...buckets.map(b => b.daysInMonth)), [buckets]);
    const currentMonth = today.startsWith(`${year}-`) ? new Date(`${today}T00:00:00Z`).getUTCMonth() : -1;

    const activeAds = row.ads.filter(ad => {
        if (!ad.stop) return true;
        return ad.stop >= today;
    });

    if (isSilent) {
        return (
            <Card>
                <SilentHead>
                    <Dot $color={color} />
                    <UserName>@{row.username}</UserName>
                    <SilentMuted>bez reklam w {year}</SilentMuted>
                    <PageActionBtn type="button" onClick={onEditPage}>
                        strona FB
                    </PageActionBtn>
                </SilentHead>
            </Card>
        );
    }

    return (
        <Card>
            <CardHead>
                <Dot $color={color} />
                <UserName>@{row.username}</UserName>
                {row.activeNow > 0 && (
                    <ActivePill>
                        <ActiveDot /> TRWA {row.activeNow}
                    </ActivePill>
                )}
            </CardHead>

            {activeAds.length > 0 && (
                <ActiveChipRow>
                    {activeAds.map(ad => (
                        <ActiveChip key={ad.adId} type="button" onClick={() => onOpenAd(ad.adId)}>
                            <ActiveDot />
                            <ChipTitle>{ad.title ?? 'Kampania'}</ChipTitle>
                            <ChipMeta>· {activeChipLabel(ad)}</ChipMeta>
                            <ExternalLink size={12} aria-hidden />
                        </ActiveChip>
                    ))}
                </ActiveChipRow>
            )}

            <Histogram role="group" aria-label={`Aktywność reklam ${row.username} w roku ${year}`}>
                {buckets.map((bucket, m) => {
                    const height = bucket.daysInMonth > 0
                        ? Math.max(3, (bucket.daysInMonth / maxDays) * 60)
                        : 0;
                    const isCurrent = m === currentMonth;
                    const isExpanded = expandedMonth === m;
                    const hasData = bucket.daysInMonth > 0;
                    return (
                        <HistogramCol
                            key={m}
                            type="button"
                            aria-label={`${MONTH_NAMES[m]}: ${bucket.daysInMonth} dni sponsorowanych, ${bucket.ads.length} kampanii`}
                            aria-expanded={hasData ? isExpanded : undefined}
                            disabled={!hasData}
                            $current={isCurrent}
                            $active={isExpanded}
                            onClick={() => setExpandedMonth(prev => (prev === m ? null : m))}
                        >
                            <HistogramBarSlot>
                                <HistogramBar
                                    style={{ height: `${height}px`, background: color }}
                                    $active={isExpanded}
                                />
                            </HistogramBarSlot>
                            <MonthLetter $current={isCurrent}>{MONTH_LETTERS[m]}</MonthLetter>
                        </HistogramCol>
                    );
                })}
            </Histogram>

            <StatsRow>
                <StatCell>
                    <StatLabel>Kampanie</StatLabel>
                    <StatValue>{row.campaigns}</StatValue>
                </StatCell>
                <StatCell>
                    <StatLabel>Dni</StatLabel>
                    <StatValue>{row.sponsoredDays}</StatValue>
                </StatCell>
                <StatCell>
                    <StatLabel>Zasięg</StatLabel>
                    <StatValue>{row.reachTotal !== null ? formatExact(row.reachTotal) : '—'}</StatValue>
                </StatCell>
            </StatsRow>

            {expandedMonth !== null && (
                <MonthDrawer>
                    <MonthDrawerHead>
                        <ChevronDown size={14} aria-hidden />
                        <span>
                            <strong>{MONTH_NAMES[expandedMonth]}</strong> · {buckets[expandedMonth].ads.length}{' '}
                            {buckets[expandedMonth].ads.length === 1 ? 'kampania' : 'kampanie'}
                        </span>
                    </MonthDrawerHead>
                    {buckets[expandedMonth].ads.map(ad => (
                        <MonthAdRow key={ad.adId} type="button" onClick={() => onOpenAd(ad.adId)}>
                            <AdRowDot $color={color} />
                            <AdRowInfo>
                                <AdRowTitle>{ad.title ?? 'Kampania'}</AdRowTitle>
                                <AdRowMeta>
                                    {formatRange(ad.start, ad.stop)} · {ad.days} dni
                                    {ad.reach !== null && ` · zasięg ${formatExact(ad.reach)}`}
                                </AdRowMeta>
                            </AdRowInfo>
                            <ChevronRight size={16} aria-hidden />
                        </MonthAdRow>
                    ))}
                </MonthDrawer>
            )}

            <FooterRow>
                <PageActionBtn type="button" onClick={onEditPage}>
                    strona FB
                </PageActionBtn>
            </FooterRow>
        </Card>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Card = styled.section<{ $variant?: 'unlinked' }>`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-left: 4px solid ${p => (p.$variant === 'unlinked' ? st.accentAmber : 'transparent')};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowXs};
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const CardHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
`;

const Dot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const UserName = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
`;

const ActivePill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    background: ${st.accentGreenDim};
    color: #047857;
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
`;

const ActiveDot = styled.i`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${st.accentGreen};
    animation: pulse-dot 2s ease-in-out infinite;

    @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.55; }
    }
`;

const ActiveChipRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ActiveChip = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 8px 12px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.accentGreenDim};
    background: rgba(16, 185, 129, 0.06);
    color: ${st.text};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover, &:focus-visible {
        background: rgba(16, 185, 129, 0.12);
        outline: none;
    }

    > svg { color: ${st.textMuted}; margin-left: auto; flex-shrink: 0; }
`;

const ChipTitle = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
`;

const ChipMeta = styled.span`
    color: ${st.textSecondary};
    font-weight: 500;
    flex-shrink: 0;
`;

const Histogram = styled.div`
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
    height: 80px;
    align-items: end;
`;

const HistogramCol = styled.button<{ $current: boolean; $active: boolean }>`
    all: unset;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    padding: 4px 0 2px;
    border-radius: ${st.radiusSm};
    cursor: pointer;
    box-sizing: border-box;
    background: ${p => (p.$active ? st.accentBlueDim : 'transparent')};
    outline: ${p => (p.$current ? `1.5px solid ${st.accentBlue}` : 'none')};
    outline-offset: -2px;
    transition: background ${st.transition};

    &:disabled {
        cursor: default;
    }

    &:hover:not(:disabled), &:focus-visible {
        background: ${p => (p.$active ? st.accentBlueDim : st.bgCardAlt)};
    }
`;

const HistogramBarSlot = styled.span`
    flex: 1;
    display: flex;
    align-items: flex-end;
    width: 100%;
    padding: 0 3px;
`;

const HistogramBar = styled.span<{ $active: boolean }>`
    display: block;
    width: 100%;
    min-height: 0;
    border-radius: 3px 3px 1px 1px;
    opacity: ${p => (p.$active ? 1 : 0.85)};
    transition: opacity ${st.transition};
`;

const MonthLetter = styled.span<{ $current: boolean }>`
    font-size: 10px;
    font-weight: ${p => (p.$current ? 700 : 500)};
    color: ${p => (p.$current ? st.accentBlue : st.textMuted)};
    letter-spacing: 0.4px;
    margin-top: 4px;
`;

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid ${st.border};
`;

const StatCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StatLabel = styled.span`
    font-size: 10.5px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const StatValue = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const MonthDrawer = styled.div`
    display: flex;
    flex-direction: column;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 8px;
    gap: 4px;
`;

const MonthDrawerHead = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 8px;
    font-size: ${st.fontXs};
    color: ${st.textMuted};

    strong { color: ${st.text}; font-weight: 700; font-size: ${st.fontSm}; }
    svg { color: ${st.textMuted}; }
`;

const MonthAdRow = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 8px 8px 8px 6px;
    border: none;
    background: ${st.bgCard};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background ${st.transition};

    &:hover, &:focus-visible {
        background: #F8FAFC;
        outline: none;
    }

    > svg:last-child { color: ${st.textMuted}; flex-shrink: 0; }
`;

const AdRowDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

const AdRowInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
`;

const AdRowTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const AdRowMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

const FooterRow = styled.div`
    display: flex;
    justify-content: flex-end;
`;

const PageActionBtn = styled.button`
    border: none;
    background: none;
    padding: 4px 0;
    margin: 0;
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-decoration: underline;
    cursor: pointer;

    &:hover { color: ${st.accentBlue}; }
`;

const SilentHead = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    width: 100%;
`;

const SilentMuted = styled.span`
    font-size: ${st.fontXs};
    font-weight: 500;
    color: ${st.textMuted};
    font-style: italic;
    margin-left: auto;
`;

// ─── Unlinked ────────────────────────────────────────────────────────────────

const UnlinkedIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${st.accentAmberDim};
    color: ${st.accentAmber};
    flex-shrink: 0;
`;

const UnlinkedGroupHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    font-family: inherit;
    text-align: left;
    cursor: default;

    &[type='button'] {
        cursor: pointer;
    }

    > svg:last-child {
        margin-left: auto;
        color: ${st.textMuted};
        flex-shrink: 0;
    }

    &:focus-visible {
        outline: 2px solid ${st.accentBlue};
        outline-offset: 2px;
        border-radius: ${st.radiusSm};
    }
`;

const UnlinkedTitle = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
`;

const UnlinkedChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
`;

const UnlinkedChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid ${st.accentAmber};
    border-radius: ${st.radiusFull};
    background: ${st.accentAmberDim};
    color: #b45309;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    transition: background ${st.transition};

    &:hover, &:focus-visible {
        background: rgba(245, 158, 11, 0.22);
        outline: none;
    }

    svg { flex-shrink: 0; }
`;
