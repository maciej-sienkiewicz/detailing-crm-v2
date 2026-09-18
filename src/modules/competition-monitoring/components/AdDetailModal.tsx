import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
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

/**
 * Typy lokalizacji przychodzą z Meta w kilku postaciach naraz („countries", „CITY");
 * backend sprowadza je do jednej i to ją tu tłumaczymy. Nieznany typ zostaje sobą -
 * surowa nazwa jest uczciwsza niż zgadnięta.
 */
const LOCATION_TYPE_LABELS: Record<string, string> = {
    country: 'kraj',
    region: 'region',
    city: 'miasto',
    place: 'miejsce',
    zip: 'kod pocztowy',
    neighborhood: 'dzielnica',
    location: 'lokalizacja',
};

const Summary = styled.div`
    /*
     * ModalContent jest kolumną flex, więc dziecko z domyślnym flex-shrink: 1
     * zostaje ŚCIŚNIĘTE, gdy treść nie mieści się w oknie — a przy overflow:
     * hidden nie widać tego jako przewinięcia, tylko jako przyciętą zawartość.
     * Na 390 px kafelki zapadały się do dwóch pikseli. W przewijanej kolumnie
     * dziecko ma trzymać swoją naturalną wysokość i to okno ma się przewijać.
     */
    flex-shrink: 0;
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) minmax(0, 1fr);
    border: 1px solid ${st.border};
    border-left: 3px solid ${st.accentGreen};
    border-radius: ${st.radiusLg};
    overflow: hidden;
    background: ${st.bgCard};

    /* Trzy kafelki obok siebie potrzebują ~520 px; niżej idą jedna pod drugą,
       bo ściśnięta data łamie się w środku i przestaje być datą. */
    @media (max-width: 560px) {
        grid-template-columns: minmax(0, 1fr);
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
        margin-top: 3px;
        font-size: 11.5px;
        color: ${st.textMuted};
    }

    @media (max-width: 560px) {
        border-right: none;
        border-bottom: 1px solid ${st.border};
        &:last-child { border-bottom: none; }
    }
`;

/** „12.06.2026 → trwa" jako jedna wartość: początek, strzałka, koniec. */
const Span = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 5px;
    font-size: 16px;
    font-weight: 700;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
    line-height: 1.2;

    i {
        font-style: normal;
        font-weight: 500;
        color: ${st.textMuted};
    }
`;

/**
 * Panele jeden pod drugim, każdy na pełną szerokość okna.
 *
 * Wcześniej były dwie kolumny: piramida po lewej, ustawienia po prawej. Wąska
 * kolumna ustawień łamała „województwo zachodniopomorskie" w środku słowa,
 * wiek rozlewał się na cztery linijki chipów, a pod piramidą zostawała pustka
 * na pół okna, bo prawa kolumna była dwa razy wyższa.
 *
 * Kolejność niesie porządek czytania: najpierw CO WYSZŁO (zasięg, piramida),
 * potem CO USTAWIONO (grupa odbiorców). Przygaszone wiersze piramidy nadal
 * pokazują, że reklama trafiła poza ustawiony przedział.
 */
const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    flex-shrink: 0;
`;

const Panel = styled.section<{ $quiet?: boolean }>`
    flex-shrink: 0;
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
        /* Bez tego „ustawienia reklamodawcy" łamie się na dwie linijki i rozpycha nagłówek. */
        white-space: nowrap;
    }
`;

/**
 * Jeden wiersz ustawień: etykieta i wartość.
 *
 * Wcześniej każdy wiersz wyglądał inaczej — status jako zielona pigułka, płeć
 * gołym tekstem, lokalizacje jako chipy, płatnik pogrubioną nazwą łamiącą się
 * na cztery linijki. Teraz w tej sekcji jest WYŁĄCZNIE targetowanie i wszystko
 * w niej jest chipem tej samej klasy.
 *
 * Czego tu świadomie NIE MA: statusu emisji (mówi to kafelka „Emisja" nad
 * panelem — to samo dwa razy) i płatnika (to prawie zawsze ta sama spółka, co
 * reklamodawca w nagłówku okna, i nie jest ustawieniem grupy odbiorców).
 */
const Rows = styled.dl`
    display: grid;
    grid-template-columns: 116px minmax(0, 1fr);
    gap: 10px 14px;
    margin: 0;
    align-items: start;

    dt {
        color: ${st.textMuted};
        font-size: 11.5px;
        padding-top: 3px;
    }

    dd {
        margin: 0;
        min-width: 0;
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        align-items: center;
    }

    /* W wąskiej kolumnie 96 px etykiety zabiera połowę miejsca wartości —
       poniżej etykieta siada nad wartością i chipy dostają pełną szerokość. */
    @media (max-width: 520px) {
        grid-template-columns: minmax(0, 1fr);
        gap: 3px;

        dt { padding-top: 0; }
        dd + dt { margin-top: 10px; }
    }
`;

/**
 * Chip ustawienia. Zawija się w środku nazwy — „województwo zachodniopomorskie"
 * nie mieści się w kolumnie w żadnej szerokości okna i to ono wyjeżdżało poza
 * panel, bo poprzednia wersja miała `white-space: nowrap`.
 */
const Chip = styled.span<{ $tone?: 'plain' | 'excluded' | 'active' | 'off' }>`
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    max-width: 100%;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.45;
    overflow-wrap: anywhere;

    ${p => {
        switch (p.$tone) {
            case 'excluded':
                return `border: 1px solid ${st.accentRed}; background: ${st.accentRedDim}; color: #b91c1c;`;
            case 'active':
                return `border: 1px solid transparent; background: ${st.accentGreenDim}; color: #047857;`;
            case 'off':
                return `border: 1px dashed ${st.border}; background: transparent; color: ${st.textMuted};`;
            default:
                return `border: 1px solid ${st.borderHover}; background: ${st.bgCard}; color: ${st.text};`;
        }
    }}

    u {
        text-decoration: none;
        font-size: 10px;
        font-weight: 500;
        color: ${st.textMuted};
        white-space: nowrap;
    }
`;

/**
 * Treść reklamy pokazana U NAS, a nie za linkiem do Biblioteki Meta.
 *
 * Granica jest twarda i wynika z API, nie z naszej wygody: `ads_archive` oddaje
 * TEKST kreacji (nagłówek, treść, opis, domenę) i NIE oddaje materiału — adresu
 * zdjęcia ani wideo nie ma w żadnym polu.
 *
 * Sprawdzone do końca, żeby nie wracać do tego pomysłu co kwartał:
 *   • `ad_snapshot_url` (jedyna wyrenderowana wersja reklamy) niesie w adresie
 *     nasz token instalacji, a strona odpowiada `X-Frame-Options: DENY` —
 *     osadzenie w ramce odpada dwukrotnie;
 *   • pobrana po stronie serwera ta strona to 200 kB szkieletu i JavaScriptu;
 *     ani jednego adresu `scontent*.fbcdn.net`, bo materiał dociąga dopiero
 *     ich skrypt w przeglądarce — nie ma czego sparsować;
 *   • zrzut ekranu z headless Chromium odpada, bo reklama bywa wideo, a klatka
 *     podana za całość kłamie.
 *
 * Pokazujemy więc to, co da się pokazać uczciwie, i mówimy wprost, po co jest
 * przycisk pod spodem.
 */
const Creative = styled.div`
    font-size: 13.5px;
    line-height: 1.55;
    color: ${st.text};
`;

/** Treść reklamy. Meta trzyma w niej łamania linii — i to one robią rytm oferty. */
const Body = styled.p<{ $clamped: boolean }>`
    margin: 0;
    white-space: pre-line;
    overflow-wrap: anywhere;

    ${p => p.$clamped && `
        display: -webkit-box;
        -webkit-line-clamp: 7;
        -webkit-box-orient: vertical;
        overflow: hidden;
    `}
`;

const MoreButton = styled.button`
    margin-top: 6px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;

    &:hover { text-decoration: underline; }
`;

/**
 * Pasek odnośnika — tak, jak układa go Meta pod treścią: domena, nagłówek,
 * zdanie zachęty. Przy braku grafiki to on niesie ofertę.
 */
const LinkCard = styled.div`
    margin-top: 12px;
    padding: 10px 13px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    min-width: 0;

    .domain {
        display: block;
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: ${st.textMuted};
        overflow-wrap: anywhere;
    }

    strong {
        display: block;
        margin-top: 3px;
        font-size: 13.5px;
        font-weight: 700;
        color: ${st.text};
        line-height: 1.35;
        overflow-wrap: anywhere;
    }

    .desc {
        display: block;
        margin-top: 3px;
        font-size: 12px;
        color: ${st.textSecondary};
        line-height: 1.4;
        overflow-wrap: anywhere;
    }
`;

/** Wyjaśnienie, czego w podglądzie nie ma i dlaczego — zaraz nad przyciskiem, który to dopełnia. */
const Missing = styled.p`
    margin: 12px 0 0;
    padding-top: 10px;
    border-top: 1px solid ${st.border};
    font-size: 11.5px;
    line-height: 1.5;
    color: ${st.textMuted};
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

/**
 * Wyjście do Biblioteki reklam Meta.
 *
 * Wcześniej był tu goły niebieski link wiszący pod panelami — jedyny element
 * w oknie bez ramki i tła, wyglądał jak wklejony z innej aplikacji. Teraz jest
 * przyciskiem w stylu reszty, na pełną szerokość kolumny, domykającym panel.
 */
/**
 * Odnośnik do oryginału w nagłówku, nie na dole okna.
 *
 * Na dole kończył długą kolumnę paneli i trzeba było do niego doscrollować przez
 * całą demografię — czyli znajdował go ten, kto i tak już wszystko przeczytał.
 * Tu jest widoczny od pierwszej chwili, obok tytułu kampanii, której dotyczy.
 */
/**
 * Przełącznik „Pokaż / Ukryj" przy nagłówku panelu.
 *
 * Treść reklamy bywa na dwadzieścia linijek i stoi PRZED danymi zasięgu, po które
 * najczęściej się tu wchodzi. Domyślnie więc leży zwinięta — kto chce przeczytać
 * ofertę konkurenta, rozwija ją jednym kliknięciem.
 */
const PanelToggle = styled.button`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    background: ${st.bgCard};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }

    svg { width: 12px; height: 12px; }
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const HeaderSnapshotLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 600;
    white-space: nowrap;
    text-decoration: none;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlueDim};
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }

    svg { width: 14px; height: 14px; flex-shrink: 0; }

    /* Na telefonie zostaje sama ikona: nagłówek ma tam do podziału 320 px. */
    @media (max-width: 599px) {
        padding: 7px 9px;
        span { display: none; }
    }
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
                <HeaderActions>
                    {data?.snapshotUrl && (
                        <HeaderSnapshotLink
                            href={data.snapshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Zobacz oryginał w Bibliotece Meta"
                        >
                            <ExternalLink />
                            <span>Oryginał w Bibliotece Meta</span>
                        </HeaderSnapshotLink>
                    )}
                    <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                        <X />
                    </ModalCloseButton>
                </HeaderActions>
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
    // Treść reklamy startuje zwinięta: stoi przed danymi zasięgu, a bywa dłuższa
    // niż cała reszta okna razem wzięta.
    const [creativeOpen, setCreativeOpen] = useState(false);
    const buckets = fullBreakdown(ad.breakdown);
    const total = buckets.reduce((sum, bucket) => sum + bucket.male + bucket.female, 0);
    const scale = Math.max(1, ...buckets.map(bucket => Math.max(bucket.male, bucket.female)));
    const platforms = ad.platforms.map(platform => AD_PLATFORM_LABELS[platform] ?? platform);

    // Przedziały objęte ustawieniem wieku bierzemy z rozbicia, a nie parsujemy „18-65+"
    // jeszcze raz na froncie: backend już to policzył i to on zna regułę.
    const targetAges = new Set(buckets.filter(bucket => bucket.inTargetAge).map(bucket => bucket.ageRange));
    const included = ad.locations.filter(location => !location.excluded);
    const excluded = ad.locations.filter(location => location.excluded);

    // Reklama bez ani jednego pola tekstowego zdarza się (kreacja czysto graficzna)
    // — wtedy panelu nie rysujemy wcale, zamiast pokazywać pustą ramkę.
    const hasCreative = !!(ad.body || ad.title || ad.linkDescription || ad.linkCaption);
    const hasLinkCard = !!(ad.linkCaption || ad.title || ad.linkDescription);

    return (
        <>
            <Summary>
                <Cell $big>
                    <div className="k">Zasięg</div>
                    <div className="v">{ad.reach !== null ? formatExact(ad.reach) : '—'}</div>
                    <div className="u">kont w Polsce</div>
                </Cell>
                <Cell>
                    <div className="k">Emisja</div>
                    <Span>
                        {formatDay(ad.start)}
                        <i>→</i>
                        {ad.stop ? formatDay(ad.stop) : 'trwa'}
                    </Span>
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

            <Stack>
                {hasCreative && (
                    <Panel>
                        <h4>
                            Treść reklamy
                            {creativeOpen && <em>tak widzi ją odbiorca</em>}
                            <PanelToggle
                                type="button"
                                onClick={() => setCreativeOpen(open => !open)}
                                aria-expanded={creativeOpen}
                            >
                                {creativeOpen ? <ChevronUp /> : <ChevronDown />}
                                {creativeOpen ? 'Ukryj' : 'Pokaż'}
                            </PanelToggle>
                        </h4>
                        {creativeOpen && <AdCreative ad={ad} hasLinkCard={hasLinkCard} />}
                    </Panel>
                )}
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
                <Panel $quiet>
                    <h4>
                        Grupa odbiorców <em>ustawienia reklamodawcy</em>
                    </h4>
                    <Rows>
                        <dt>Płeć</dt>
                        <dd>
                            <Chip>
                                {ad.targetGender ? GENDER_LABELS[ad.targetGender] ?? ad.targetGender : 'nieustawiona'}
                            </Chip>
                        </dd>

                        {/*
                          * Wiek był wcześniej osobnym panelem pod tym. Mówił dokładnie to samo,
                          * co przygaszone wiersze piramidy obok — jedno ustawienie pokazane
                          * dwa razy, w dwóch różnych formach.
                          */}
                        <dt>Wiek</dt>
                        <dd>
                            {AGE_BUCKETS.map(age => (
                                <Chip key={age} $tone={targetAges.has(age) ? 'plain' : 'off'}>
                                    {age}
                                </Chip>
                            ))}
                        </dd>

                        {included.length > 0 && (
                            <>
                                <dt>Lokalizacje</dt>
                                <dd>
                                    {included.map(location => (
                                        <Chip key={location.name}>
                                            {location.name}{' '}
                                            <u>{LOCATION_TYPE_LABELS[location.type] ?? location.type}</u>
                                        </Chip>
                                    ))}
                                </dd>
                            </>
                        )}

                        {excluded.length > 0 && (
                            <>
                                <dt>Wykluczone</dt>
                                <dd>
                                    {excluded.map(location => (
                                        <Chip key={location.name} $tone="excluded">
                                            − {location.name}{' '}
                                            <u>{LOCATION_TYPE_LABELS[location.type] ?? location.type}</u>
                                        </Chip>
                                    ))}
                                </dd>
                            </>
                        )}
                    </Rows>
                </Panel>
            </Stack>
        </>
    );
};

/**
 * Kreacja złożona z tego, co oddaje API: treść, a pod nią pasek odnośnika.
 *
 * Długie treści bywają na dwadzieścia linijek i wypychały panele zasięgu poza
 * ekran, więc domyślnie przycinamy do siedmiu — rozwinięcie jest o jedno
 * kliknięcie i nie chowa niczego bezpowrotnie.
 */
const AdCreative: React.FC<{ ad: AdDetail; hasLinkCard: boolean }> = ({ ad, hasLinkCard }) => {
    const [expanded, setExpanded] = useState(false);

    // Przycisk „pokaż całość" tylko wtedy, gdy jest co pokazywać: przy trzech
    // linijkach byłby obietnicą bez pokrycia. Siedem linijek to ~340 znaków.
    const longBody = !!ad.body && (ad.body.length > 340 || ad.body.split('\n').length > 7);

    return (
        <Creative>
            {ad.body && (
                <>
                    <Body $clamped={longBody && !expanded}>{ad.body}</Body>
                    {longBody && (
                        <MoreButton type="button" onClick={() => setExpanded(value => !value)}>
                            {expanded ? 'Zwiń treść' : 'Pokaż całość'}
                        </MoreButton>
                    )}
                </>
            )}

            {hasLinkCard && (
                <LinkCard>
                    {ad.linkCaption && <span className="domain">{ad.linkCaption}</span>}
                    {ad.title && <strong>{ad.title}</strong>}
                    {ad.linkDescription && <span className="desc">{ad.linkDescription}</span>}
                </LinkCard>
            )}

            <Missing>
                Biblioteka reklam Meta udostępnia przez API wyłącznie tekst reklamy — zdjęcia
                ani wideo nie ma w żadnym polu. Materiał zobaczysz w oryginale u Meta.
            </Missing>
        </Creative>
    );
};
