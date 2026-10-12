// src/modules/statistics/components/PeriodDetailDrawer.tsx
//
// Panel „Szczegóły okresu": klik w słupek wykresu w Statystykach.
//
// Odpowiada na pytanie właściciela „co tego dnia złożyło się na X wizyt i Y zł" -
// LICZBAMI, nie zdaniami. Trzy rzeczy, w kolejności czytania:
//   1. Wynik: kwota, liczba wizyt i jedna plakietka - ile więcej albo mniej niż zwykle.
//   2. Na co poszły pieniądze: kategorie (z filtrem - usługi kategorii), kwota i pasek.
//   3. Wizyty od największej, klik przenosi do wizyty.
//
// Historia: dawny panel pokazywał klucz okresu („2026-W40"), trzy liczby w trzech
// kolorach bez punktu odniesienia i listę wizyt z rozwiniętą pierwszą. Następna wersja
// dołożyła rozkład różnicy, akapit o największej wizycie i podpowiedzi - biznes odrzucił
// ją jako przegadaną („za dużo tekstu, za dużo się dzieje"). Nie dokładaj tu zdań.
//
// Panel służy do czytania, nie ma kroku następnego - nic nie jest wypełnione kolorem
// (CLAUDE.md §2). Stoi na SideDrawer: blokada przewijania tła, Escape i telefon w cenie.

import { useId } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import {
    Button,
    DrawerBody,
    Notice,
    SectionTitle,
    SideDrawer,
    StatusPill,
    ui,
} from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { fetchPeriodDetail } from '../api/periodDetailApi';
import type { CategoryBreakdownItem, Granularity, PeriodVisit, StatsDataPoint } from '../types';
import {
    PERIOD_NOUN,
    comparePeriod,
    composition,
    coverageDay,
    isAboutTheSame,
    periodCoverage,
    periodTitle,
} from '../utils/periodInsight';

/*
 * Pełne złote z odstępem tysięcy ZAWSZE. toLocaleString('pl-PL') nie grupuje liczb
 * czterocyfrowych, więc obok siebie stały „25 860 zł" i „9040 zł" - kolumna kwot
 * przestawała się czytać.
 */
const zl = (grosz: number) =>
    `${String(Math.abs(Math.round(grosz / 100))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}\u00a0zł`;

const visitsLabel = (n: number) => `${n} ${pluralPl(n, 'wizyta', 'wizyty', 'wizyt')}`;

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── Wynik ────────────────────────────────────────────────────────────────────

const Result = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const AmountLine = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
`;

const Amount = styled.span`
    font-size: 30px;
    line-height: 1.15;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const Sub = styled.span`
    font-size: 14px;
    color: ${ui.textSecondary};
    font-variant-numeric: tabular-nums;
`;

// ─── Listy ────────────────────────────────────────────────────────────────────

const Section = styled.section`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

const Rows = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ShareRow = styled.li`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px 12px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;

    > span:first-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: ${ui.inkSoft};
    }
    > span:nth-child(2) { font-weight: 700; color: ${ui.ink}; }
`;

const Track = styled.span`
    grid-column: 1 / -1;
    display: block;
    height: 6px;
    border-radius: 3px;
    background: ${ui.surfaceAlt};
    overflow: hidden;
`;

/* Kolor kategorii jak w wykresie kołowym obok - ta sama kategoria, ten sam odcień. */
const Fill = styled.span<{ $pct: number; $color: string | null }>`
    display: block;
    height: 100%;
    width: ${p => Math.max(p.$pct, 2)}%;
    border-radius: 3px;
    background: ${p => p.$color ?? ui.lineStrong};
`;

const VisitList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const VisitLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 8px 4px;
    border-bottom: 1px solid ${ui.lineFaint};
    color: inherit;
    text-decoration: none;

    &:hover { background: ${ui.surfaceSoft}; }
    &:hover svg { color: ${ui.brandInk}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; border-radius: 8px; }

    svg { flex-shrink: 0; width: 16px; height: 16px; color: ${ui.textFaint}; }
`;

const VisitText = styled.span`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    > span:first-child { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    > span + span { font-size: 13px; color: ${ui.textMuted}; }
`;

const VisitAmount = styled.span`
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const Skeleton = styled.li<{ $w: string }>`
    height: 14px;
    width: ${p => p.$w};
    border-radius: 6px;
    background: ${ui.surfaceAlt};
`;

const Loading = () => (
    <Rows aria-label="Wczytywanie">
        <Skeleton $w="70%" /><Skeleton $w="55%" /><Skeleton $w="40%" />
    </Rows>
);

// ─── Panel ────────────────────────────────────────────────────────────────────

export interface PeriodDetailDrawerProps {
    period: string | null;
    granularity: Granularity;
    /** Zakres dat widoku (włącznie) - przycina okres na brzegu i wyznacza „zwykły" okres. */
    startDate: string;
    endDate: string;
    /** Szereg wykresu (przy filtrze kategorii - szereg kategorii). */
    series: StatsDataPoint[];
    /** Kategorie z podziału - nazwy i kolory do „Na co poszły pieniądze". */
    categories: CategoryBreakdownItem[];
    categoryId?: string | null;
    categoryName?: string | null;
    onClose: () => void;
}

export const PeriodDetailDrawer = (props: PeriodDetailDrawerProps) =>
    props.period ? <PeriodDetailPanel {...props} period={props.period} /> : null;

function PeriodDetailPanel({
    period, granularity, startDate, endDate, series, categories, categoryId, categoryName, onClose,
}: PeriodDetailDrawerProps & { period: string }) {
    const titleId = useId();
    const filtered = !!categoryId;
    const noun = PERIOD_NOUN[granularity];

    const { data: detail, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['statistics', 'period', period, granularity, categoryId ?? null, startDate, endDate],
        queryFn: () => fetchPeriodDetail(period, granularity, { categoryId, from: startDate, to: endDate }),
    });

    const now = today();
    const coverage = periodCoverage(period, granularity, startDate, endDate, now);
    // Niepełny okres (trwa albo ucięty zakresem) nie dostaje porównania - niepełny
    // tydzień wypadałby zawsze „gorzej niż zwykle".
    const comparison = comparePeriod(series, period, p => periodCoverage(p, granularity, startDate, endDate, now).kind === 'full');

    // Wynik ze słupka, który się kliknęło: stoi od razu, bez czekania na listę wizyt -
    // a serwer liczy okres tak samo (przycięty do zakresu), więc liczby się zgadzają.
    const point = series.find(p => p.period === period);
    const revenue = point?.totalRevenueGross ?? detail?.totalRevenueGross ?? 0;
    const visitCount = point?.orderCount ?? detail?.orderCount ?? 0;

    const visits = [...(detail?.visits ?? [])].sort((a, b) => b.totalRevenueGross - a.totalRevenueGross);
    const shares = composition(visits, categories, filtered);
    const maxShare = shares[0]?.amount ?? 0;

    const pills = [
        filtered && <StatusPill key="cat" $tone="info">Kategoria: {categoryName}</StatusPill>,
        coverage.kind === 'ongoing' && (
            <StatusPill key="cov" $tone="warn">{noun.nom.charAt(0).toUpperCase() + noun.nom.slice(1)} trwa, dane do {coverageDay(coverage.until)}</StatusPill>
        ),
        coverage.kind === 'clipped' && (
            <StatusPill key="cov" $tone="warn">
                {coverage.from === coverage.to
                    ? `Okres niepełny: tylko ${coverageDay(coverage.from)}`
                    : `Okres niepełny: ${coverageDay(coverage.from)}–${coverageDay(coverage.to)}`}
            </StatusPill>
        ),
    ].filter(Boolean);

    return (
        <SideDrawer
            onClose={onClose}
            title={periodTitle(period, granularity)}
            titleId={titleId}
            status={pills.length > 0 ? pills : undefined}
            width={520}
        >
            <DrawerBody>
                <Result aria-label="Wynik okresu">
                    <AmountLine>
                        <Amount>{zl(revenue)}</Amount>
                        {comparison && (
                            <StatusPill $tone="neutral" $size="md">
                                {isAboutTheSame(comparison)
                                    ? 'tyle co zwykle'
                                    : `${comparison.diff > 0 ? '+' : '\u2212'}${zl(comparison.diff)} niż zwykle`}
                            </StatusPill>
                        )}
                    </AmountLine>
                    <Sub>
                        {visitsLabel(visitCount)}
                        {comparison && `, zwykle ${zl(comparison.refRevenue)} z ${visitsLabel(Math.round(comparison.refCount))}`}
                    </Sub>
                </Result>

                {isError && (
                    <Notice
                        tone="danger"
                        role="alert"
                        title="Nie udało się wczytać wizyt"
                        action={<Button size="sm" onClick={() => refetch()} disabled={isFetching}>Spróbuj ponownie</Button>}
                    />
                )}

                {!isError && (isLoading || visits.length > 0) && (
                    <>
                        <Section aria-labelledby={`${titleId}-shares`}>
                            <SectionTitle id={`${titleId}-shares`}>Na co poszły pieniądze</SectionTitle>
                            {isLoading ? <Loading /> : (
                                <Rows>
                                    {shares.map(row => (
                                        <ShareRow key={row.key}>
                                            <span title={row.name}>{row.name}</span>
                                            <span>{zl(row.amount)}</span>
                                            <Track aria-hidden="true">
                                                <Fill $pct={maxShare > 0 ? (row.amount / maxShare) * 100 : 0} $color={row.color} />
                                            </Track>
                                        </ShareRow>
                                    ))}
                                </Rows>
                            )}
                        </Section>

                        <Section aria-labelledby={`${titleId}-visits`}>
                            <SectionTitle id={`${titleId}-visits`} count={detail ? visits.length : undefined}>Wizyty</SectionTitle>
                            {isLoading ? <Loading /> : (
                                <VisitList>
                                    {visits.map(visit => <li key={visit.visitId}><VisitRow visit={visit} /></li>)}
                                </VisitList>
                            )}
                        </Section>
                    </>
                )}
            </DrawerBody>
        </SideDrawer>
    );
}

function VisitRow({ visit }: { visit: PeriodVisit }) {
    return (
        <VisitLink to={`/visits/${visit.visitId}`} aria-label={`${visit.clientName}, ${zl(visit.totalRevenueGross)}, otwórz wizytę`}>
            <VisitText>
                <span>{visit.clientName}</span>
                {visit.vehicleInfo && <span>{visit.vehicleInfo}</span>}
            </VisitText>
            <VisitAmount>{zl(visit.totalRevenueGross)}</VisitAmount>
            <ChevronRight aria-hidden="true" />
        </VisitLink>
    );
}
