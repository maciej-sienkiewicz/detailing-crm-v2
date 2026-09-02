// src/modules/live-metrics/views/LiveMetricsView.tsx
import styled from 'styled-components';
import { PageHeader } from '@/common/components/PageHeader';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ViewContainer } from '@/modules/statistics/components/shared';
import { useLiveMetricsOverview } from '../hooks/useLiveMetrics';
import { useLiveMetricsSocket } from '../hooks/useLiveMetricsSocket';
import { KPI_ORDER } from '../components/liveMetricsTheme';
import { KpiTile } from '../components/KpiTile';
import { SeriesChart } from '../components/SeriesChart';
import { HourProfileChart } from '../components/HourProfileChart';
import { EventFeed } from '../components/EventFeed';
import { LiveBadge } from '../components/LiveBadge';
import { formatClock } from '../components/format';

const KpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;

    @media (max-width: 1200px) { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 700px)  { grid-template-columns: repeat(2, 1fr); }
`;

const ChartGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;

    @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

const StateBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 48px 24px;
    text-align: center;
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
`;

const RetryButton = styled.button`
    margin-top: 14px;
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.text};
    border-radius: ${st.radiusSm};
    padding: 8px 16px;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: ${st.transition};

    &:hover { border-color: ${st.borderHover}; box-shadow: ${st.shadowXs}; }
`;

/**
 * Metryki studia w czasie rzeczywistym.
 *
 * Jedno żądanie `/overview` zasila cały widok, a subskrypcja STOMP nanosi na tę samą
 * migawkę kolejne zdarzenia, więc liczby ruszają się w chwili, w której coś się dzieje,
 * a nie przy kolejnym odpytaniu serwera. Refetch co 60 s zostaje jako korekta dryfu
 * i sposób na odzyskanie tego, co przepadło przy zerwanym połączeniu.
 */
export const LiveMetricsView = () => {
    const { overview, isLoading, isFetching, isError, refetch } = useLiveMetricsOverview();
    const { isLive, lastEventAt } = useLiveMetricsSocket();

    const statsFor = (series: string) => overview?.stats.find(entry => entry.series === series);

    return (
        <ViewContainer>
            <PageHeader
                title="Metryki na żywo"
                subtitle={
                    overview
                        ? `Zdarzenia biznesowe Twojego studia. Stan z ${formatClock(overview.generatedAt, overview.zone)}, strefa ${overview.zone}.`
                        : 'Zdarzenia biznesowe Twojego studia w czasie rzeczywistym.'
                }
                actions={<LiveBadge isLive={isLive} isRefreshing={isFetching} />}
            />

            {isError && (
                <StateBox>
                    Nie udało się pobrać metryk.
                    <div>
                        <RetryButton type="button" onClick={() => void refetch()}>
                            Spróbuj ponownie
                        </RetryButton>
                    </div>
                </StateBox>
            )}

            {isLoading && !overview && <StateBox>Wczytywanie metryk…</StateBox>}

            {overview && (
                <>
                    <KpiGrid>
                        {KPI_ORDER.map(series => (
                            <KpiTile
                                key={series}
                                series={series}
                                stats={statsFor(series)}
                                minutePoints={overview.lastHourByMinute[series]}
                            />
                        ))}
                    </KpiGrid>

                    <ChartGrid>
                        <SeriesChart
                            title="Rezerwacje na żywo"
                            description="Przyrost rezerwacji tworzonych przez pracowników. Przełącz okno, żeby zobaczyć ostatnią godzinę, dobę albo miesiąc."
                            overview={overview}
                            series={['RESERVATION_CREATED']}
                        />
                        <HourProfileChart
                            counts={overview.hourOfDayProfile7d.RESERVATION_CREATED}
                            series="RESERVATION_CREATED"
                            days={7}
                            zone={overview.zone}
                        />

                        <SeriesChart
                            title="Wizyty: bezpośrednie vs z rezerwacji"
                            description="Lejek konwersji. Wizyta „bezpośrednia” powstała z palca w kalendarzu, „z rezerwacji” to przekształcenie istniejącego terminu."
                            overview={overview}
                            series={['VISIT_CREATED:FROM_RESERVATION', 'VISIT_CREATED:DIRECT']}
                        />
                        <SeriesChart
                            title="Zdjęcia i multimedia"
                            description="Udane uploady w podziale na miejsce przypięcia: wizyta, karta pojazdu, check-in z telefonu, zlecenie zbiorcze."
                            overview={overview}
                            series={[
                                'PHOTO_UPLOADED:VISIT',
                                'PHOTO_UPLOADED:VEHICLE',
                                'PHOTO_UPLOADED:CHECKIN',
                                'PHOTO_UPLOADED:BATCH_ORDER',
                            ]}
                        />

                        <SeriesChart
                            title="Katalog usług — nowości"
                            description="Kiedy studio rozszerza ofertę: nowe pozycje w cenniku i pakiety."
                            overview={overview}
                            series={['SERVICE_CREATED:SERVICE', 'SERVICE_CREATED:PACKAGE']}
                            ranges={['day', 'hour']}
                            defaultRange="day"
                        />
                        <SeriesChart
                            title="Log aktywności"
                            description="Przyrost wpisów w historii aktywności — każda operacja zostawiająca ślad w dzienniku."
                            overview={overview}
                            series={['ACTIVITY_LOGGED']}
                        />
                    </ChartGrid>

                    <EventFeed
                        events={overview.recentEvents}
                        zone={overview.zone}
                        key={lastEventAt ?? 'feed'}
                    />
                </>
            )}
        </ViewContainer>
    );
};

export default LiveMetricsView;
