import React, { Fragment, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronRight, ChevronUp, Link2, X } from 'lucide-react';
import { Button, IconButton, Notice, Panel, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import type { AdBar, AdCalendar, AdCalendarRow, UnlinkedProfile } from '../types';
import { CenterState, formatExact } from './MetricBits';
import { LinkFacebookPageModal } from './LinkFacebookPageModal';
import { AreaSection } from './AreaSection';
import { useProfileColors } from '../hooks/useProfileColors';
import { useSuggestedPageLink } from '../hooks/useSuggestedPageLink';
import { colorFor } from '../utils/profileColors';
import {
    MONTH_ABBR,
    MONTH_NAMES,
    bucketAdsByMonth,
    currentMonthIndex,
    formatAdRange,
    isAdRunning,
    runningAdLabel,
} from '../utils/adCalendar';

/**
 * Mobilny widok Reklamy — twin dla AdsTab (desktop). Zamiast rocznego timeline'a
 * (który na 343 px zamienia 3-dniową kampanię w 3 px słupek) każdy reklamodawca
 * dostaje panel z histogramem 12 miesięcy: liczba dni reklam w miesiącu, dotknięcie
 * miesiąca pokazuje jego kampanie. Trwające reklamy stoją na górze panelu jako
 * wiersze, więc „kto reklamuje się DZIŚ" nie wymaga ani jednego tapnięcia.
 *
 * Panele są z tych samych klocków co reszta modułu (`Panel`, `StatusPill`, `Notice`):
 * dawna wersja na motywie statystyk, z kolorowym paskiem z lewej, pulsującą kropką
 * i etykietami 10 px wersalikami wyglądała jak wklejona z innej aplikacji.
 */

interface Props {
    calendar: AdCalendar;
    onOpenAd: (adId: string) => void;
    /**
     * Firmy z rejonu pod kalendarzem. W Konkurencji „W okolicy" ma własny widok, więc
     * tam ich tu nie dokładamy - ta sama lista dwa razy to ten sam fakt dwa razy.
     */
    showArea?: boolean;
}

type Linking = { profileId: string; username: string; pageId?: string | null };

/**
 * Nazwa profilu łamie się na `_` i `.`, a nie w środku słowa: „@lustro_detailing_" /
 * „wilanow" czyta się jak nazwa, „@lustro_detailing_wil" / „anow" już nie.
 */
const breakableHandle = (username: string): React.ReactNode =>
    username.split(/([_.])/).map((part, index) =>
        part === '_' || part === '.' ? <Fragment key={index}>{part}<wbr /></Fragment> : part
    );

/**
 * Jedno zdanie zamiast trzech etykiet nad liczbami. Twarde spacje trzymają liczbę
 * z jej słowem, więc na wąskim ekranie zdanie łamie się tylko po przecinku.
 */
const summarySentence = (row: AdCalendarRow): React.ReactNode => {
    const nb = (text: string) => text.replace(/ /g, ' ');
    return (
        <>
            <b>{row.campaigns}</b>{nb(` ${pluralPl(row.campaigns, 'kampania', 'kampanie', 'kampanii')}`)},{' '}
            <b>{row.sponsoredDays}</b>{nb(` ${pluralPl(row.sponsoredDays, 'dzień reklam', 'dni reklam', 'dni reklam')}`)}
            {row.reachTotal !== null && (
                <>, {nb('zasięg ')}<b>{formatExact(row.reachTotal)}</b></>
            )}
        </>
    );
};

export const AdsTabMobile: React.FC<Props> = ({ calendar, onOpenAd, showArea = true }) => {
    const colors = useProfileColors();
    const [linking, setLinking] = useState<Linking | null>(null);

    /**
     * Sortowanie: aktywni dziś na górę (właściciel wraca głównie po to), potem
     * według wolumenu w tym roku, alfabetycznie w razie remisu. Profile bez reklam
     * schodzą na dno listy — nie są ważne, ale trzeba wiedzieć, że istnieją.
     */
    const sortedRows = useMemo(() => {
        return calendar.rows
            .map(row => ({ row, color: colorFor(colors, row.username) }))
            .sort((a, b) => {
                if ((a.row.activeNow > 0) !== (b.row.activeNow > 0)) return a.row.activeNow > 0 ? -1 : 1;
                if (a.row.sponsoredDays !== b.row.sponsoredDays) return b.row.sponsoredDays - a.row.sponsoredDays;
                return a.row.username.localeCompare(b.row.username, 'pl');
            });
    }, [calendar.rows, colors]);

    if (!calendar.configured) {
        return (
            <Panel>
                <CenterState>
                    <strong>Reklamy konkurencji nie są jeszcze podłączone</strong>
                    <span>
                        Czekamy na dostęp do Biblioteki reklam Meta. Gdy tylko go dostaniemy, zobaczysz tu
                        kalendarz kampanii obserwowanych profili.
                    </span>
                </CenterState>
            </Panel>
        );
    }

    if (calendar.rows.length === 0 && calendar.unlinked.length === 0) {
        return (
            <Layout>
                <Panel>
                    <CenterState>
                        <strong>Brak obserwowanych profili</strong>
                        <span>Dodaj profile konkurencji, żeby sprawdzić, kto z nich się reklamuje.</span>
                    </CenterState>
                </Panel>
                {showArea && <AreaSection />}
            </Layout>
        );
    }

    return (
        <Layout>
            {calendar.rows.length > 0 && (
                <Intro>
                    <SectionTitle
                        count={calendar.activeToday > 0
                            ? `${calendar.activeToday} ${pluralPl(
                                calendar.activeToday,
                                'reklama aktywna dziś',
                                'reklamy aktywne dziś',
                                'reklam aktywnych dziś'
                            )}`
                            : undefined}
                    >
                        Kalendarz reklam {calendar.year}
                    </SectionTitle>
                    <Hint>Słupek to dni reklam w miesiącu. Dotknij miesiąca, żeby zobaczyć jego kampanie.</Hint>
                </Intro>
            )}

            {calendar.unlinked.length > 0 && (
                <UnlinkedNotice
                    profiles={calendar.unlinked}
                    onLink={profile => setLinking({ profileId: profile.profileId, username: profile.username })}
                />
            )}

            {/*
              * Nowe studio ma same niepodpięte profile i poza ostrzeżeniem nie widziało
              * tu niczego - nie wiadomo było, po co w ogóle wskazywać strony.
              */}
            {calendar.rows.length === 0 && (
                <Panel>
                    <Explain>
                        <SectionTitle as="h3">Tu zobaczysz reklamy konkurencji</SectionTitle>
                        <p>
                            Dla każdego profilu ze wskazaną stroną pokażemy, które reklamy trwają dziś,
                            w których miesiącach się reklamował i ile osób zobaczyło jego kampanie.
                        </p>
                    </Explain>
                </Panel>
            )}

            {sortedRows.map(({ row, color }) => (
                <AdvertiserPanel
                    key={row.profileId}
                    row={row}
                    color={color}
                    year={calendar.year}
                    today={calendar.today}
                    onOpenAd={onOpenAd}
                    onEditPage={() =>
                        setLinking({ profileId: row.profileId, username: row.username, pageId: row.facebookPageId })
                    }
                />
            ))}

            {showArea && <AreaSection />}

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

// ─── Profile bez strony FB ───────────────────────────────────────────────────

/**
 * Jeden komunikat na WSZYSTKIE niepodpięte profile — nawet gdy jest ich pięć.
 * W pierwszej iteracji było N osobnych kart z powtarzającym się akapitem i pół
 * ekranu bez informacji o reklamach.
 *
 * Przyciski mają ikonę spinacza, nie strzałki „na zewnątrz": otwierają okno
 * wskazania strony w aplikacji, nie Facebooka. Od trzech profili lista leży
 * zwinięta, żeby komunikat nie wypychał reklam poza pierwszy ekran.
 */
const UnlinkedNotice: React.FC<{
    profiles: UnlinkedProfile[];
    onLink: (profile: UnlinkedProfile) => void;
}> = ({ profiles, onLink }) => {
    // Profil ze stroną znaną z „W okolicy" łączy się jednym dotknięciem, bez szukania.
    const suggested = useSuggestedPageLink();
    const pick = (profile: UnlinkedProfile) => (profile.suggestedPage ? suggested.connect(profile) : onLink(profile));
    const single = profiles.length === 1 ? profiles[0] : null;
    const many = profiles.length >= 3;
    const [expanded, setExpanded] = useState(!many);

    if (single) {
        return (
            <Notice
                tone="warn"
                title={<>@{breakableHandle(single.username)} bez strony na Facebooku</>}
                action={
                    <Button
                        size="sm"
                        disabled={suggested.pendingId !== null}
                        onClick={() => pick(single)}
                        aria-label={single.suggestedPage
                            ? `Połącz @${single.username} ze stroną ${single.suggestedPage.pageName}`
                            : `Wskaż stronę na Facebooku dla @${single.username}`}
                    >
                        <Link2 /> {single.suggestedPage ? 'Połącz' : 'Wskaż stronę'}
                    </Button>
                }
            >
                <span>
                    {single.suggestedPage
                        ? `W Twojej okolicy reklamuje się jako „${single.suggestedPage.pageName}”. Połącz, a pokażemy jej reklamy.`
                        : 'Wskaż stronę na Facebooku, a pokażemy jej reklamy.'}
                </span>
            </Notice>
        );
    }

    return (
        <Notice
            tone="warn"
            title={`${profiles.length} ${pluralPl(profiles.length, 'profil', 'profile', 'profili')} bez strony na Facebooku`}
        >
            <span>Wskaż ich strony na Facebooku, a pokażemy ich reklamy.</span>
            {expanded && (
                <LinkList>
                    {profiles.map(profile => (
                        <LinkButton
                            key={profile.profileId}
                            size="sm"
                            disabled={suggested.pendingId !== null}
                            onClick={() => pick(profile)}
                            aria-label={profile.suggestedPage
                                ? `Połącz @${profile.username} ze stroną ${profile.suggestedPage.pageName}`
                                : `Wskaż stronę na Facebooku dla @${profile.username}`}
                        >
                            <Link2 />
                            <span>@{profile.username}</span>
                        </LinkButton>
                    ))}
                </LinkList>
            )}
            {many && (
                <ToggleList type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
                    {expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                    {expanded ? 'Zwiń listę' : `Pokaż ${profiles.length} ${pluralPl(profiles.length, 'profil', 'profile', 'profili')}`}
                </ToggleList>
            )}
        </Notice>
    );
};

// ─── Panel reklamodawcy ──────────────────────────────────────────────────────

const AdvertiserPanel: React.FC<{
    row: AdCalendarRow;
    color: string;
    year: number;
    today: string;
    onOpenAd: (adId: string) => void;
    onEditPage: () => void;
}> = ({ row, color, year, today, onOpenAd, onEditPage }) => {
    const [openMonth, setOpenMonth] = useState<number | null>(null);
    const silent = row.ads.length === 0;

    const buckets = useMemo(() => bucketAdsByMonth(row.ads, year, today), [row.ads, year, today]);
    const maxDays = Math.max(1, ...buckets.map(bucket => bucket.daysInMonth));
    const currentMonth = currentMonthIndex(year, today);
    const running = row.ads.filter(ad => isAdRunning(ad, today));
    const pageLabel = row.facebookPageId ? 'Zmień stronę na Facebooku' : 'Wskaż stronę na Facebooku';

    return (
        <AdvPanel aria-label={`@${row.username}`}>
            <Head>
                <Dot $color={color} aria-hidden />
                <Who>
                    <Name>@{breakableHandle(row.username)}</Name>
                    <Summary>{silent ? `Bez reklam w ${year}` : summarySentence(row)}</Summary>
                </Who>
                <PageButton label={pageLabel} variant="ghost" onClick={onEditPage}>
                    <Link2 />
                </PageButton>
            </Head>

            {running.length > 0 && (
                <Section>
                    <StatusPill $tone="ok">
                        <LiveDot aria-hidden />
                        {running.length} {pluralPl(running.length, 'aktywna reklama', 'aktywne reklamy', 'aktywnych reklam')}
                    </StatusPill>
                    <AdList>
                        {running.map(ad => (
                            <AdRowButton key={ad.adId} ad={ad} meta={runningAdLabel(ad)} onOpen={onOpenAd} />
                        ))}
                    </AdList>
                </Section>
            )}

            {!silent && (
                <Section>
                    <Chart role="group" aria-label={`Dni reklam @${row.username} w kolejnych miesiącach ${year}`}>
                        {buckets.map((bucket, month) => {
                            const hasData = bucket.daysInMonth > 0;
                            const isOpen = openMonth === month;
                            const height = hasData ? Math.max(4, (bucket.daysInMonth / maxDays) * BAR_MAX) : 0;
                            return (
                                <MonthCol
                                    key={month}
                                    type="button"
                                    disabled={!hasData}
                                    aria-expanded={hasData ? isOpen : undefined}
                                    aria-current={month === currentMonth ? 'date' : undefined}
                                    aria-label={`${MONTH_NAMES[month]}: ${bucket.daysInMonth} ${pluralPl(bucket.daysInMonth, 'dzień reklam', 'dni reklam', 'dni reklam')}, ${bucket.ads.length} ${pluralPl(bucket.ads.length, 'kampania', 'kampanie', 'kampanii')}`}
                                    $open={isOpen}
                                    onClick={() => setOpenMonth(prev => (prev === month ? null : month))}
                                >
                                    <BarSlot $future={currentMonth >= 0 && month > currentMonth}>
                                        <Bar
                                            style={{ height: `${height}px`, background: color }}
                                            $dim={openMonth !== null && !isOpen}
                                        />
                                    </BarSlot>
                                    <MonthLabel $current={month === currentMonth}>{MONTH_ABBR[month]}</MonthLabel>
                                </MonthCol>
                            );
                        })}
                    </Chart>

                    {openMonth !== null && (
                        <MonthDetail>
                            <MonthHead>
                                <div>
                                    <strong>{MONTH_NAMES[openMonth]} {year}</strong>
                                    <span>
                                        {buckets[openMonth].daysInMonth}{' '}
                                        {pluralPl(buckets[openMonth].daysInMonth, 'dzień reklam', 'dni reklam', 'dni reklam')},{' '}
                                        {buckets[openMonth].ads.length}{' '}
                                        {pluralPl(buckets[openMonth].ads.length, 'kampania', 'kampanie', 'kampanii')}
                                    </span>
                                </div>
                                <CloseMonth label="Zwiń miesiąc" variant="ghost" onClick={() => setOpenMonth(null)}>
                                    <X />
                                </CloseMonth>
                            </MonthHead>
                            <AdList>
                                {buckets[openMonth].ads.map(ad => (
                                    <AdRowButton
                                        key={ad.adId}
                                        ad={ad}
                                        meta={`${formatAdRange(ad.start, ad.stop)}, ${ad.days} ${pluralPl(ad.days, 'dzień', 'dni', 'dni')}${ad.reach !== null ? `, zasięg ${formatExact(ad.reach)}` : ''}`}
                                        onOpen={onOpenAd}
                                    />
                                ))}
                            </AdList>
                        </MonthDetail>
                    )}
                </Section>
            )}
        </AdvPanel>
    );
};

/** Wiersz kampanii: tytuł w dwóch linijkach, pod nim kiedy, a strzałka mówi „otworzy się tutaj". */
const AdRowButton: React.FC<{ ad: AdBar; meta: string; onOpen: (adId: string) => void }> = ({ ad, meta, onOpen }) => (
    <AdRow type="button" onClick={() => onOpen(ad.adId)}>
        <AdText>
            <AdTitle>{ad.title ?? 'Kampania bez tytułu'}</AdTitle>
            <AdMeta>{meta}</AdMeta>
        </AdText>
        <ChevronRight size={18} aria-hidden />
    </AdRow>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

/** Wysokość najwyższego słupka; reszta skaluje się do niej. */
const BAR_MAX = 56;

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Intro = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 2px 0;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const Explain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;

    p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: ${ui.textSecondary};
    }
`;

const LinkList = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-top: 8px;
`;

/** Pełna nazwa profilu w przycisku, a przy wyjątkowo długiej - wielokropek zamiast wyjechania poza komunikat. */
const LinkButton = styled(Button)`
    max-width: 100%;

    span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

const ToggleList = styled.button`
    position: relative;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 4px 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: inherit;
    cursor: pointer;

    /* Cel dotykowy 44 px bez rozpychania komunikatu. */
    &::after {
        content: '';
        position: absolute;
        left: -8px;
        right: -8px;
        top: 50%;
        height: 44px;
        transform: translateY(-50%);
    }
`;

const AdvPanel = styled(Panel)`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 14px 16px 16px;
`;

const Head = styled.div`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    column-gap: 10px;
    align-items: start;
`;

const Dot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    margin-top: 7px;
    border-radius: 50%;
    background: ${p => p.$color};
`;

const Who = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 1px;
`;

const Name = styled.h3`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.35;
    color: ${ui.ink};
    letter-spacing: -0.01em;
    overflow-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const Summary = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.textSecondary};
    font-variant-numeric: tabular-nums;

    b { font-weight: 700; color: ${ui.ink}; }
`;

/**
 * Sama ikona bez obwódki, ale cel 44 × 44 także bez ekranu dotykowego. Ujemny
 * margines stawia ikonę na wysokości pierwszej linijki nazwy, zamiast spychać
 * nazwę w dół o pół przycisku.
 */
const PageButton = styled(IconButton)`
    width: 44px;
    height: 44px;
    margin: -11px -10px 0 0;
    color: ${ui.textSecondary};
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;

    > * { align-self: stretch; }
    > ${StatusPill} { align-self: flex-start; }
`;

/** Kropka „na żywo" bez pulsowania: ruch w nieskończoność męczy na liście i nic nie dodaje. */
const LiveDot = styled.i`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #16a34a;
`;

const AdList = styled.div`
    display: flex;
    flex-direction: column;
`;

const AdRow = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 56px;
    padding: 9px 0;
    border: none;
    border-top: 1px solid ${ui.line};
    background: none;
    font-family: inherit;
    text-align: left;
    color: ${ui.ink};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:first-child { border-top: none; }
    &:active { background: ${ui.surfaceSoft}; }

    &:focus-visible {
        outline: 2px solid ${ui.focusRing};
        outline-offset: 2px;
        border-radius: ${ui.radiusRow};
    }

    > svg { flex-shrink: 0; color: ${ui.textMuted}; }
`;

const AdText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
`;

const AdTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: ${ui.ink};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const AdMeta = styled.span`
    font-size: 13px;
    line-height: 1.4;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

/**
 * Dwanaście miesięcy bez odstępów: na 360 px kolumna ma ~24 px, a trzyliterowy
 * skrót ~20 px. Słupki są węższe od kolumny, więc oddech między nimi zostaje.
 */
const Chart = styled.div`
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    margin: 0 -2px;
`;

const MonthCol = styled.button<{ $open: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    min-width: 0;
    padding: 6px 0 4px;
    border: none;
    border-radius: 8px;
    /* Wybrany miesiąc na szarości, nie na odcieniu marki - ten niesie „dziś" w podpisie. */
    background: ${p => (p.$open ? ui.surfaceAlt : 'transparent')};
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:disabled { cursor: default; }

    &:focus-visible {
        outline: 2px solid ${ui.focusRing};
        outline-offset: -2px;
    }
`;

/** Miesiące, których jeszcze nie było, są zakreskowane jak przyszłość na osi desktopu - pusty to nie to samo co zero. */
const BarSlot = styled.span<{ $future: boolean }>`
    display: flex;
    align-items: flex-end;
    justify-content: center;
    height: ${BAR_MAX}px;
    margin: 0 2px;
    border-bottom: 1px solid ${ui.line};
    border-radius: 4px 4px 0 0;
    ${p => p.$future && `
        background: repeating-linear-gradient(
            45deg,
            rgba(148, 163, 184, 0.14) 0 4px,
            transparent 4px 8px
        );
    `}
`;

const Bar = styled.span<{ $dim: boolean }>`
    display: block;
    width: 62%;
    max-width: 16px;
    border-radius: 3px 3px 0 0;
    opacity: ${p => (p.$dim ? 0.3 : 1)};
`;

/** Bieżący miesiąc: pogrubiony skrót na odcieniu marki - na pierwszy rzut oka „tu jest dziś". */
const MonthLabel = styled.span<{ $current: boolean }>`
    align-self: center;
    padding: 1px 3px;
    border-radius: 5px;
    font-size: 11px;
    line-height: 1.3;
    font-weight: ${p => (p.$current ? 700 : 500)};
    color: ${p => (p.$current ? ui.brandInk : ui.textMuted)};
    background: ${p => (p.$current ? ui.brandTintHover : 'transparent')};
    white-space: nowrap;

    @media (min-width: 400px) { font-size: 12px; }
`;

const MonthDetail = styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 6px;
    padding-top: 10px;
    border-top: 1px solid ${ui.line};
`;

const MonthHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    strong { font-size: 15px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 13px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
`;

const CloseMonth = styled(IconButton)`
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    margin-right: -10px;
`;
