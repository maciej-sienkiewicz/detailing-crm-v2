import React from 'react';
import styled from 'styled-components';
import { ExternalLink, X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
} from '@/common/components/ModalKit';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { AD_PLATFORM_LABELS, type AdDetail, type AdReachBucket } from '../types';
import { useAdDetail } from '../hooks/useAds';
import { CenterState, Spinner, formatExact } from './MetricBits';

/**
 * Szczegóły kampanii. Okno na całą aplikację, nie panel boczny - piramida wieku
 * i płci potrzebuje szerokości, a w wąskiej szufladzie liczby po obu stronach
 * schodziły się do kilku pikseli.
 *
 * Układ niesie rozróżnienie, którego nie trzeba tłumaczyć zdaniem: po lewej,
 * na białej karcie, jest RZECZYWISTY zasięg; po prawej, na szarym tle, USTAWIENIA
 * reklamodawcy. Wiersze wieku spoza ustawionego przedziału są przygaszone, więc
 * widać, że reklama ustawiona na 25-54 i tak trafiła do dwudziestolatków.
 *
 * Demografię pokazujemy wyłącznie dla Polski. Zasięg w Niemczech nie zmienia
 * niczego w decyzjach właściciela studia w Krakowie, a wybór kraju byłby wyborem,
 * którego nikt nigdy nie zmieni.
 */

/** Stały podział Meta - trzymamy wszystkie przedziały, żeby kształt dało się porównywać między reklamami. */
const AGE_BUCKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

const GENDER_LABELS: Record<string, string> = {
    All: 'Wszyscy',
    Men: 'Mężczyźni',
    Women: 'Kobiety',
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
    country: 'kraj',
    region: 'region',
    city: 'miasto',
    zip: 'kod pocztowy',
    neighborhood: 'dzielnica',
    location: 'lokalizacja',
};

const Summary = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid ${st.border};
    border-left: 3px solid ${st.accentGreen};
    border-radius: ${st.radiusLg};
    overflow: hidden;
    background: ${st.bgCard};

    @media (max-width: 640px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

const Cell = styled.div<{ $big?: boolean }>`
    padding: 13px 16px;
    border-right: 1px solid ${st.border};
    min-width: 0;

    &:last-child { border-right: none; }

    .k {
        font-size: ${st.fontXs};
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${st.textMuted};
    }

    .v {
        margin-top: 5px;
        font-size: ${p => (p.$big ? '28px' : '16px')};
        font-weight: 700;
        color: ${st.text};
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
        overflow-wrap: anywhere;
        letter-spacing: ${p => (p.$big ? '-0.5px' : 'normal')};
    }

    .u {
        margin-top: 2px;
        font-size: 11.5px;
        color: ${st.textMuted};
    }

    @media (max-width: 640px) {
        border-bottom: 1px solid ${st.border};
        &:nth-child(2) { border-right: none; }
        &:nth-child(3), &:nth-child(4) { border-bottom: none; }
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;

    @media (max-width: 900px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const Panel = styled.section<{ $quiet?: boolean }>`
    border: 1px solid ${p => (p.$quiet ? 'transparent' : st.border)};
    border-radius: ${st.radiusLg};
    padding: 14px 16px;
    background: ${p => (p.$quiet ? st.bgCardAlt : st.bgCard)};
    min-width: 0;

    h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 10px;
        font-size: ${st.fontXs};
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${st.textMuted};
    }

    h4 em {
        font-style: normal;
        margin-left: auto;
        font-size: ${st.fontXs};
        font-weight: 700;
        color: ${st.textSecondary};
        letter-spacing: 0;
        text-transform: none;
    }
`;

const Kv = styled.dl`
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 8px 10px;
    margin: 0;
    font-size: 12.5px;

    dt { color: ${st.textMuted}; font-size: 11.5px; padding-top: 2px; }
    dd { margin: 0; color: ${st.text}; font-weight: 600; display: flex; gap: 5px; flex-wrap: wrap; }
`;

const Chip = styled.span<{ $excluded?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => (p.$excluded ? st.accentRed : st.borderHover)};
    background: ${p => (p.$excluded ? st.accentRedDim : st.bgCard)};
    color: ${p => (p.$excluded ? '#b91c1c' : st.text)};
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;

    u { text-decoration: none; font-size: 10px; font-weight: 500; color: ${st.textMuted}; }
`;

const Ages = styled.div`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
`;

const AgeCell = styled.div<{ $on: boolean }>`
    text-align: center;
    padding: 7px 0 6px;
    border-radius: 6px;
    border: 1px solid ${p => (p.$on ? 'transparent' : st.border)};
    background: ${p => (p.$on ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$on ? st.accentBlue : st.textMuted)};
    font-size: 10px;
    font-weight: ${p => (p.$on ? 700 : 600)};
`;

const Legend = styled.span`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;

    s { text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
    i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
`;

const Pyramid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PyramidRow = styled.div<{ $dim: boolean }>`
    display: grid;
    grid-template-columns: 1fr 70px 1fr;
    align-items: center;
    height: 31px;
    opacity: ${p => (p.$dim ? 0.42 : 1)};
`;

const Side = styled.div<{ $left?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: ${p => (p.$left ? 'flex-end' : 'flex-start')};
    gap: 6px;
`;

/** Słupek mężczyzn rośnie od środka w lewo, kobiet w prawo - stąd płaska krawędź od strony osi. */
const Rail = styled.span<{ $left?: boolean }>`
    flex: 1;
    height: 12px;
    border-radius: 3px;
    background: ${st.bgCardAlt};
    display: flex;
    justify-content: ${p => (p.$left ? 'flex-end' : 'flex-start')};

    i {
        display: block;
        height: 12px;
        background: ${p => (p.$left ? st.accentBlue : st.accentAmber)};
        border-radius: ${p => (p.$left ? '3px 0 0 3px' : '0 3px 3px 0')};
    }
`;

const Num = styled.span<{ $left?: boolean }>`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
    min-width: 42px;
    text-align: ${p => (p.$left ? 'right' : 'left')};
`;

const Gutter = styled.div`
    text-align: center;
    line-height: 1.05;

    b { display: block; font-size: ${st.fontXs}; font-weight: 700; color: ${st.text}; }
    span { display: block; margin-top: 2px; font-size: 10px; color: ${st.textMuted}; font-variant-numeric: tabular-nums; }
`;

const PyramidFoot = styled.div`
    margin-top: 11px;
    padding-top: 10px;
    border-top: 1px solid ${st.border};
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;

    b { color: ${st.textSecondary}; }
`;

const SnapshotLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    color: ${st.accentBlue};
    text-decoration: none;

    &:hover { text-decoration: underline; }
    svg { width: 13px; height: 13px; }
`;

const StatusTag = styled.span<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    background: ${p => (p.$active ? st.accentGreenDim : st.bgCardAlt)};
    color: ${p => (p.$active ? '#047857' : st.textMuted)};
    font-size: ${st.fontXs};
    font-weight: 700;
    white-space: nowrap;
`;

const formatDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('pl-PL');

/** Uzupełniamy brakujące przedziały zerami - kształt piramidy ma być porównywalny między reklamami. */
const fullBreakdown = (buckets: AdReachBucket[]): AdReachBucket[] => {
    const byAge = new Map(buckets.map(bucket => [bucket.ageRange, bucket]));
    return AGE_BUCKETS.map(
        age => byAge.get(age) ?? { ageRange: age, male: 0, female: 0, inTargetAge: true }
    );
};

interface Props {
    adId: string;
    onClose: () => void;
}

export const AdDetailModal: React.FC<Props> = ({ adId, onClose }) => {
    const { data, isLoading, isError } = useAdDetail(adId);

    return (
        <ModalShell isOpen onClose={onClose} size="xl">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{data?.title ?? 'Kampania reklamowa'}</ModalTitle>
                    <ModalSubtitle>
                        {data ? `@${data.username}` : 'Wczytuję szczegóły…'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>

            <ModalContent>
                {isLoading && <CenterState><Spinner /></CenterState>}
                {isError && (
                    <CenterState>
                        <strong>Nie udało się pobrać szczegółów</strong>
                        <span>Odśwież stronę i spróbuj ponownie.</span>
                    </CenterState>
                )}
                {data && <AdDetailBody ad={data} />}
            </ModalContent>
        </ModalShell>
    );
};

const AdDetailBody: React.FC<{ ad: AdDetail }> = ({ ad }) => {
    const buckets = fullBreakdown(ad.breakdown);
    const total = buckets.reduce((sum, bucket) => sum + bucket.male + bucket.female, 0);
    const scale = Math.max(1, ...buckets.map(bucket => Math.max(bucket.male, bucket.female)));
    const platforms = ad.platforms.map(platform => AD_PLATFORM_LABELS[platform] ?? platform);

    return (
        <>
            <Summary>
                <Cell $big>
                    <div className="k">Zasięg</div>
                    <div className="v">{ad.reach !== null ? formatExact(ad.reach) : '—'}</div>
                    <div className="u">kont w Polsce</div>
                </Cell>
                <Cell>
                    <div className="k">Od kiedy</div>
                    <div className="v">{formatDay(ad.start)}</div>
                </Cell>
                <Cell>
                    <div className="k">Do kiedy</div>
                    <div className="v">{ad.stop ? formatDay(ad.stop) : 'trwa'}</div>
                    <div className="u">
                        {ad.active ? `${ad.days}. dzień emisji` : `${ad.days} dni emisji`}
                    </div>
                </Cell>
                <Cell>
                    <div className="k">Gdzie</div>
                    <div className="v" style={{ fontSize: '13.5px' }}>
                        {platforms.length > 0 ? platforms.join(', ') : '—'}
                    </div>
                    <div className="u">{platforms.length} z 4 miejsc Meta</div>
                </Cell>
            </Summary>

            <Grid>
                <Column>
                    <Panel>
                        <h4>
                            Zasięg według wieku i płci
                            <Legend>
                                <s><i style={{ background: st.accentBlue }} />Mężczyźni</s>
                                <s><i style={{ background: st.accentAmber }} />Kobiety</s>
                            </Legend>
                        </h4>
                        <Pyramid>
                            {buckets.map(bucket => {
                                const share = total > 0 ? ((bucket.male + bucket.female) / total) * 100 : 0;
                                return (
                                    <PyramidRow key={bucket.ageRange} $dim={!bucket.inTargetAge}>
                                        <Side $left>
                                            <Num $left>{formatExact(bucket.male)}</Num>
                                            <Rail $left>
                                                <i style={{ width: `${(bucket.male / scale) * 100}%` }} />
                                            </Rail>
                                        </Side>
                                        <Gutter>
                                            <b>{bucket.ageRange}</b>
                                            <span>{share.toFixed(1).replace('.', ',')}%</span>
                                        </Gutter>
                                        <Side>
                                            <Rail>
                                                <i style={{ width: `${(bucket.female / scale) * 100}%` }} />
                                            </Rail>
                                            <Num>{formatExact(bucket.female)}</Num>
                                        </Side>
                                    </PyramidRow>
                                );
                            })}
                        </Pyramid>
                        {ad.outOfTargetAgeReach > 0 && total > 0 && (
                            <PyramidFoot>
                                Poza ustawionym wiekiem:{' '}
                                <b>
                                    {formatExact(ad.outOfTargetAgeReach)} osób ·{' '}
                                    {Math.round((ad.outOfTargetAgeReach / total) * 100)}%
                                </b>
                            </PyramidFoot>
                        )}
                    </Panel>
                </Column>

                <Column>
                    <Panel $quiet>
                        <h4>
                            Grupa odbiorców <em>ustawienia</em>
                        </h4>
                        <Kv>
                            <dt>Status</dt>
                            <dd>
                                <StatusTag $active={ad.active}>
                                    {ad.active ? 'AKTYWNA' : 'ZAKOŃCZONA'}
                                </StatusTag>
                            </dd>
                            <dt>Płeć</dt>
                            <dd>{ad.targetGender ? GENDER_LABELS[ad.targetGender] ?? ad.targetGender : '—'}</dd>
                            {ad.locations.some(location => !location.excluded) && (
                                <>
                                    <dt>Lokalizacje</dt>
                                    <dd>
                                        {ad.locations
                                            .filter(location => !location.excluded)
                                            .map(location => (
                                                <Chip key={location.name}>
                                                    {location.name}{' '}
                                                    <u>{LOCATION_TYPE_LABELS[location.type] ?? location.type}</u>
                                                </Chip>
                                            ))}
                                    </dd>
                                </>
                            )}
                            {ad.locations.some(location => location.excluded) && (
                                <>
                                    <dt>Wykluczone</dt>
                                    <dd>
                                        {ad.locations
                                            .filter(location => location.excluded)
                                            .map(location => (
                                                <Chip key={location.name} $excluded>
                                                    − {location.name}{' '}
                                                    <u>{LOCATION_TYPE_LABELS[location.type] ?? location.type}</u>
                                                </Chip>
                                            ))}
                                    </dd>
                                </>
                            )}
                            {ad.payer && (
                                <>
                                    <dt>Płatnik</dt>
                                    <dd>{ad.payer}</dd>
                                </>
                            )}
                            {ad.beneficiary && (
                                <>
                                    <dt>Beneficjent</dt>
                                    <dd>{ad.beneficiary}</dd>
                                </>
                            )}
                        </Kv>
                    </Panel>

                    <Panel $quiet>
                        <h4>
                            Wiek odbiorców <em>{ad.targetAges ?? 'nieustawiony'}</em>
                        </h4>
                        <Ages>
                            {buckets.map(bucket => (
                                <AgeCell key={bucket.ageRange} $on={bucket.inTargetAge}>
                                    {bucket.ageRange}
                                </AgeCell>
                            ))}
                        </Ages>
                    </Panel>

                    {ad.snapshotUrl && (
                        <SnapshotLink href={ad.snapshotUrl} target="_blank" rel="noopener noreferrer">
                            Podgląd reklamy w Bibliotece reklam Meta <ExternalLink />
                        </SnapshotLink>
                    )}
                </Column>
            </Grid>
        </>
    );
};
