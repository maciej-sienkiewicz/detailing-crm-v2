// src/modules/comms/views/LeadAnalyticsView.tsx
// Analityka leadów jako RACHUNEK PIENIĘDZY, nie raport ze wskaźnikami.
//
// ── Dlaczego tak mało ──────────────────────────────────────────────────────
//
// Właściciel studia detailingowego dostaje 60–110 zapytań miesięcznie, o cenach
// od trzystu złotych po dziesięć tysięcy. Przy tym wolumenie prawie każdy wykres
// rozkładu i skuteczności - macierz dni tygodnia, słupki wygrane/przegrane po
// usłudze, skuteczność po segmencie auta, po kanale, po czasie odpowiedzi - to
// szum: trzy-pięć rozstrzygniętych rozmów na słupek, gdzie jedno zlecenie
// przewraca wynik. Taki wykres wygląda na dane, a niesie przypadek. Dlatego ich
// tu nie ma. Zostało to, na czym da się podjąć decyzję, i wszystko w złotówkach.
//
// FRONT (widać od razu, ~1 ekran, bez klikania):
//  1. Ile ZAMKNĄŁEŚ w tym okresie - jedna duża kwota (wonValue). Zielona krawędź:
//     to fakt, nie alarm. Świeże studio bez wygranej dostaje „w toku", nie 0 zł.
//  2. Wartość zapytań - jedna belka: zamknięte / w toku / ucichło / stracone.
//  3. Jedno działanie - odezwij się do rozmów, które ucichły (odzysk za 0 zł).
//
// SZCZEGÓŁY (zwinięte pod „Zobacz szczegóły", dla ciekawskiego):
//  • Powody straconych zleceń - w złotówkach, każdy klikalny.
//  • Skąd przychodzą zapytania - ranking kanałów po liczbie.
//  • Czy szybka odpowiedź się opłaca - jedno zdanie werdyktu.
//  • Zamknięte pieniądze miesiąc po miesiącu - jedyny prawdziwy wykres (Recharts),
//    tylko przy dłuższym zakresie i realnym wolumenie.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff, Sparkles } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { useLeadAnalytics } from '../hooks/useLeads';
import type { LeadAnalytics, LeadStatus } from '../types';
import { EmptyHint } from '../components/shared';
import { PeriodPicker } from '../components/analytics/PeriodPicker';
import { buildPeriod, type Period } from '../components/analytics/period';
import { buildDemoAnalytics } from '../components/analytics/demoData';
import { Hero, LeakList, MoneyLedger } from '../components/analytics/money';
import { AnalyticsCard, RankedBars, WonMoneyChart } from '../components/analytics/charts';
import { SOURCE_LABELS, formatMoney, formatPeriodTick, percent, points } from '../components/analytics/tokens';

// ── Progi ────────────────────────────────────────────────────────────────────

/**
 * Poniżej tylu zapytań większość liczb i tak nic nie znaczy, więc zamiast szczegółów
 * proponujemy podgląd na przykładzie. Kwota zamknięta i belka zostają - są prawdziwe
 * od pierwszego zlecenia; chowa się dopiero sekcja pogłębiona.
 */
const THIN_DATA_BELOW = 10;
/** Od tylu zapytań kierunek względem poprzedniego okresu przestaje być rzutem monetą. */
const MIN_LEADS_FOR_DELTA = 20;
/** Powody straty mają sens, gdy jest ich z czego złożyć. */
const MIN_LEADS_FOR_LEAKS = 15;
/** Ranking kanałów po liczbie zapytań - solidny dopiero od pewnej próby. */
const MIN_LEADS_FOR_SOURCE = 25;
/** Poniżej tylu rozstrzygniętych rozmów w kanale jego skuteczność (%) to szum - pokazujemy samą liczbę. */
const MIN_CLOSED_FOR_SOURCE_RATE = 10;
/** Werdykt „czy szybka odpowiedź się opłaca" pokazujemy dopiero przy realnym wolumenie. */
const MIN_LEADS_FOR_SPEED = 40;
/** Wykres pieniędzy w czasie - tylko przy długim zakresie i dużej liczbie zapytań. */
const MIN_LEADS_FOR_TREND = 60;

/** Stan rozwinięcia sekcji szczegółów - per przeglądarka, przeżywa odświeżenie. */
const DEEP_OPEN_KEY = 'leadAnalytics.deepOpen';

// ── Obudowa ────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: ${p => p.theme.spacing.md};
    max-width: 1180px;
    margin: 0 auto;
    width: 100%;
    /* Kontener zapytań szerokości: karty w środku patrzą na szerokość widoku,
       nie okna - ten sam kod stoi raz na pełnym ekranie, raz w wąskim panelu. */
    container-type: inline-size;

    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

/**
 * Obudowa analityki wstawionej w panel widoku leadów (desktop): lekki nagłówek
 * z samym wyborem okresu, przewijanie w obrębie panelu, bez linku „← Leady".
 */
const EmbeddedShell = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    /* Szara podłoga aplikacji, nie biel: dopiero na niej białe karty czytają się
       jako uniesione powierzchnie, a nie płaskie prostokąty na bieli. */
    background: ${p => p.theme.colors.background};
`;

/**
 * Nagłówek stoi POZA obszarem przewijania: rozwijany wybór okresu jest pozycjonowany
 * absolutnie (bez portalu), więc w kontenerze z overflow zostałby przycięty.
 */
const EmbeddedHeader = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px 16px;
    flex-wrap: wrap;
    flex-shrink: 0;
    padding: 18px 22px 16px 22px;
    background: ${p => p.theme.colors.background};
    border-bottom: 1px solid ${st.border};

    h2 {
        margin: 0;
        font-size: 21px;
        font-weight: ${p => p.theme.fontWeights.bold};
        letter-spacing: -0.02em;
        line-height: 1.15;
        color: ${st.text};
    }
    p {
        margin: 2px 0 0 0;
        font-size: 12.5px;
        color: ${st.textSecondary};
    }
    & > div:first-child {
        min-width: 0;
    }
`;

/** Sama treść analityki się przewija; nagłówek z wyborem okresu zostaje na miejscu. */
const EmbeddedBody = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 4px 20px 40px 20px;
    /* Kontener zapytań szerokości: karty reagują na szerokość PANELU (~600px),
       nie okna desktopu - dzięki temu układ się nie rozjeżdża. */
    container-type: inline-size;

    /*
     * W kolumnie flex o ustalonej wysokości dzieci domyślnie się KURCZĄ, więc karty
     * z overflow:hidden były ściskane do jednej linijki. Każda sekcja ma zachować
     * naturalną wysokość, a nadmiar oddać do przewijania.
     */
    & > * {
        flex-shrink: 0;
    }
`;

/**
 * Pusta analityka nie kończy się na „wróć tu potem". Studio, które dopiero zaczyna,
 * widzi tu, po co w ogóle zbierać leady - pusty ekran uczy, że nic nie ma, wypełniony
 * przykładem uczy, co tu będzie.
 */
const EmptyCard = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;

    h2 {
        margin: 0;
        font-size: 20px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${st.text};
    }
    p {
        margin: 0;
        font-size: 14px;
        line-height: 1.55;
        color: ${st.textSecondary};
        max-width: 58ch;
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 28px 18px;
    }
`;

/** Zaproszenie do trybu pokazowego przy szczupłych, ale prawdziwych danych. */
const ThinDataBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: ${st.radius};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    font-size: 13px;
    color: ${st.textSecondary};

    .grow { flex: 1; min-width: 200px; }
`;

/**
 * Pasek trybu pokazowego - jedyne miejsce, w którym zostaje bursztyn, bo jedynym
 * realnym niebezpieczeństwem tej funkcji jest pomylenie przykładu z własnym wynikiem.
 */
const DemoBanner = styled.div`
    position: sticky;
    top: 8px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-radius: ${st.radius};
    background: ${p => p.theme.colors.warningLight};
    border: 1px solid ${p => p.theme.colors.warning}55;
    box-shadow: ${st.shadowSm};
    font-size: 13px;
    color: #92400e;

    svg { width: 16px; height: 16px; flex-shrink: 0; }
    .grow { flex: 1; min-width: 180px; }
    strong { font-weight: ${p => p.theme.fontWeights.semibold}; }
`;

const DemoButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.text};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    padding: 9px 16px;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    white-space: nowrap;
    transition: all 160ms ease;

    svg { width: 15px; height: 15px; }
    &:hover { border-color: ${st.borderHover}; box-shadow: ${st.shadowSm}; }
`;

/**
 * Jedyne wezwanie do działania na froncie: odezwij się do rozmów, które ucichły.
 * Zdanie-bohater już nie ma przycisku - rachunek stwierdza, nie rozkazuje. Ale jedno
 * da się naprawić dziś i za zero złotych: rozmowy, które ostygły. Cienka niebieska
 * listwa i strzałka to ten sam język, co klikalne kwoty niżej - zaproszenie, nie alarm.
 */
const ActionStrip = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    width: 100%;
    text-align: left;
    padding: 15px 18px;
    border: 1px solid ${st.border};
    border-left: 3px solid ${st.accentBlue};
    background: ${st.bgCard};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.4;
    color: ${st.textSecondary};
    transition: border-color 160ms ease, box-shadow 160ms ease;

    strong {
        color: ${st.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
    .go {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        color: ${st.accentBlue};
        transition: transform 160ms ease;
    }
    &:hover { border-color: ${st.borderHover}; box-shadow: ${st.shadowMd}; }
    &:hover .go { transform: translateX(3px); }
`;

/**
 * Granica między „dziś" a „przy okazji". Szczegóły są domyślnie zwinięte: większość
 * wejść to szybki rzut oka na pieniądze, a nie studiowanie wykresów. Kto chce, rozwija
 * - i stan tego wyboru zostaje zapamiętany.
 */
const DeepToggle = styled.button`
    margin-top: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 15px 18px;
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${st.text};
    transition: border-color 160ms ease, box-shadow 160ms ease;

    &:hover { border-color: ${st.borderHover}; }

    svg {
        width: 18px;
        height: 18px;
        color: ${st.textSecondary};
        transition: transform 200ms ease;
    }
    svg.open { transform: rotate(180deg); }
`;

interface LeadAnalyticsViewProps {
    /**
     * true = analityka renderowana jako panel w widoku leadów (desktop): bez PageHeadera
     * i linku powrotu, przewijana w panelu; odnośniki sterują tym samym widokiem.
     */
    embedded?: boolean;
    /** Embedded: pokaż kolejkę „Twój ruch" (zamiast navigate('/leads')). */
    onOpenQueue?: () => void;
    /** Embedded: pokaż archiwum, opcjonalnie z filtrem statusu (zamiast navigate('/leads?status=...')). */
    onOpenArchive?: (status?: LeadStatus) => void;
}

export default function LeadAnalyticsView({ embedded = false, onOpenQueue, onOpenArchive }: LeadAnalyticsViewProps) {
    // „Ten miesiąc" domyślnie: właściciel rozlicza się miesiącami (księgowa, podatek, ZUS).
    const [period, setPeriod] = useState<Period>(() => buildPeriod('current', new Date()));
    const [demo, setDemo] = useState(false);
    const { data, isLoading } = useLeadAnalytics(period.from, period.to);

    // Wykres pieniędzy w czasie ma sens miesiącami dopiero przy zakresie dłuższym niż
    // kwartał - rok w tygodniach to 52 słupki, w których ginie kształt.
    const monthly = period.to.getTime() - period.from.getTime() > 120 * 24 * 3600 * 1000;

    const thin = Boolean(data) && data!.totalCreated < THIN_DATA_BELOW;
    const shown = demo ? buildDemoAnalytics(period.from, period.to) : data;

    const body = (
        <>
            {isLoading && <EmptyHint>Liczenie…</EmptyHint>}

            {demo && (
                <DemoBanner role="status">
                    <Sparkles />
                    <span className="grow">
                        <strong>To są przykładowe dane.</strong> Tak wygląda ten widok w studiu,
                        do którego wpływa około stu zapytań miesięcznie. Twoje dane są ukryte.
                    </span>
                    <DemoButton type="button" onClick={() => setDemo(false)}>
                        <EyeOff /> Schowaj
                    </DemoButton>
                </DemoBanner>
            )}

            {!demo && data && data.totalCreated === 0 && (
                <EmptyCard>
                    <h2>Jeszcze nic tu nie ma</h2>
                    <p>
                        W tym okresie nie wpłynęło żadne zapytanie, więc nie ma czego liczyć.
                        Widok wypełni się sam, gdy zaczną przychodzić — a na razie możesz zobaczyć,
                        co się tu pojawi.
                    </p>
                    <DemoButton type="button" onClick={() => setDemo(true)}>
                        <Eye /> Zobacz ten widok na przykładzie
                    </DemoButton>
                </EmptyCard>
            )}

            {!demo && thin && data && data.totalCreated > 0 && (
                <ThinDataBar>
                    <span className="grow">
                        Na razie {leadCount(data.totalCreated)} w tym okresie — za mało, żeby
                        porównania i wnioski były wiarygodne.
                    </span>
                    <DemoButton type="button" onClick={() => setDemo(true)}>
                        <Eye /> Zobacz ten widok na przykładzie
                    </DemoButton>
                </ThinDataBar>
            )}

            {shown && (demo || shown.totalCreated > 0) && (
                <Report
                    data={shown}
                    monthly={demo ? false : monthly}
                    embedded={embedded}
                    onOpenQueue={onOpenQueue}
                    onOpenArchive={onOpenArchive}
                />
            )}
        </>
    );

    if (embedded) {
        return (
            <EmbeddedShell>
                <EmbeddedHeader>
                    <div>
                        <h2>Pieniądze w zapytaniach</h2>
                        <p>Podsumowanie za {period.label}</p>
                    </div>
                    <PeriodPicker value={period} onChange={setPeriod} variant="light" />
                </EmbeddedHeader>
                <EmbeddedBody>{body}</EmbeddedBody>
            </EmbeddedShell>
        );
    }

    return (
        <ViewContainer>
            <PageHeader
                title="Pieniądze w zapytaniach"
                subtitle={`Podsumowanie za ${period.label}`}
                actions={
                    <>
                        <PeriodPicker value={period} onChange={setPeriod} />
                        <Link to="/leads">
                            <PageHeaderGhostButton as="span">
                                <ArrowLeft /> Leady
                            </PageHeaderGhostButton>
                        </Link>
                    </>
                }
            />
            {body}
        </ViewContainer>
    );
}

function Report({
    data,
    monthly,
    embedded = false,
    onOpenQueue,
    onOpenArchive,
}: {
    data: LeadAnalytics;
    monthly: boolean;
    embedded?: boolean;
    onOpenQueue?: () => void;
    onOpenArchive?: (status?: LeadStatus) => void;
}) {
    const navigate = useNavigate();

    const goQueue = () => (embedded ? onOpenQueue?.() : navigate('/leads'));
    const goSilent = () => (embedded ? onOpenQueue?.() : navigate('/leads?awaiting=1'));
    const goLost = () => (embedded ? onOpenArchive?.('LOST') : navigate('/leads?status=LOST'));

    const [deepOpen, setDeepOpen] = useState(() => {
        try { return localStorage.getItem(DEEP_OPEN_KEY) === '1'; } catch { return false; }
    });
    const toggleDeep = () => setDeepOpen((open) => {
        const next = !open;
        try { localStorage.setItem(DEEP_OPEN_KEY, next ? '1' : '0'); } catch { /* prywatne okno itp. */ }
        return next;
    });

    const total = data.wonValue + data.pipelineValue + data.silentValue + data.lostValue;
    const hasWins = data.wonValue > 0;

    const wonDelta = data.wonValue - data.wonValuePrevious;
    const deltaNote = data.totalCreated >= MIN_LEADS_FOR_DELTA && data.wonValuePrevious > 0
        ? (wonDelta === 0
            ? 'Tyle samo, ile w poprzednim okresie.'
            : `O ${formatMoney(Math.abs(wonDelta))} ${wonDelta > 0 ? 'więcej' : 'mniej'} niż w poprzednim okresie.`)
        : undefined;

    const reward = data.confirmedValueThisWeek > 0
        ? `W tym tygodniu domknąłeś zlecenia za ${formatMoney(data.confirmedValueThisWeek)}.`
        : undefined;
    const rewardNote = reward ? 'Za bieżący tydzień, niezależnie od wybranego okresu.' : undefined;

    const showDeep = data.totalCreated >= THIN_DATA_BELOW;

    return (
        <>
            {/* ── FRONT · ile zamknąłeś ───────────────────────────────────────── */}
            {hasWins ? (
                <Hero
                    lead="Zamknięte w tym okresie"
                    amount={formatMoney(data.wonValue)}
                    body={<>Tyle przyniosły zapytania, które <strong>zamieniłeś w zlecenia</strong>.</>}
                    reward={reward}
                    rewardNote={rewardNote}
                    note={deltaNote}
                />
            ) : (
                <Hero
                    accent="pipeline"
                    lead="W toku w tym okresie"
                    amount={formatMoney(data.pipelineValue)}
                    body={
                        <>
                            Tyle są warte zapytania w toku. Gdy pierwsze zamienisz w zlecenie,{' '}
                            <strong>zobaczysz tu przychód</strong>.
                        </>
                    }
                    reward={reward}
                    rewardNote={rewardNote}
                />
            )}

            {/* ── FRONT · wartość zapytań (belka) ─────────────────────────────── */}
            {total === 0 ? (
                <EmptyHint>W tym okresie nie wpłynęło żadne zapytanie.</EmptyHint>
            ) : (
                <MoneyLedger
                    total={formatMoney(total)}
                    kept={{ amount: formatMoney(data.wonValue), raw: data.wonValue }}
                    inPlay={{ amount: formatMoney(data.pipelineValue), raw: data.pipelineValue, onClick: goQueue }}
                    silent={{ amount: formatMoney(data.silentValue), raw: data.silentValue, onClick: goSilent }}
                    gone={{ amount: formatMoney(data.lostValue), raw: data.lostValue, onClick: goLost }}
                />
            )}

            {/* ── FRONT · jedno działanie ─────────────────────────────────────── */}
            {data.silentValue > 0 && (
                <ActionStrip type="button" onClick={goSilent}>
                    <span>
                        <strong>{formatMoney(data.silentValue)}</strong> w zapytaniach, które ucichły.
                        Odezwij się, zanim klient pojedzie gdzie indziej.
                    </span>
                    <ArrowRight className="go" />
                </ActionStrip>
            )}

            {/* ── SZCZEGÓŁY (zwinięte) ────────────────────────────────────────── */}
            {showDeep && (
                <>
                    <DeepToggle type="button" aria-expanded={deepOpen} onClick={toggleDeep}>
                        <span>Zobacz szczegóły</span>
                        <ChevronDown className={deepOpen ? 'open' : undefined} />
                    </DeepToggle>
                    {deepOpen && <DeepSection data={data} monthly={monthly} goLost={goLost} />}
                </>
            )}
        </>
    );
}

/**
 * Szczegóły „dla ciekawskiego" - płaska lista, po jednej odpowiedzi na temat, każda
 * pod własnym progiem danych. Bez zakładek, bez sześciu wykresów naraz.
 */
function DeepSection({ data, monthly, goLost }: { data: LeadAnalytics; monthly: boolean; goLost: () => void }) {
    return (
        <>
            {data.totalCreated >= MIN_LEADS_FOR_LEAKS && data.leaks.length > 0 && (
                <LeakList
                    rows={[...data.leaks]
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 3)
                        .map((leak) => ({
                            code: leak.code,
                            label: leak.label,
                            amount: formatMoney(leak.value),
                            raw: leak.value,
                            count: leadCount(leak.count),
                        }))}
                    note={
                        data.leaks.length > 3
                            ? `Trzy największe powody z ${formatMoney(data.leaks.reduce((sum, l) => sum + l.value, 0))} straconych i ucichłych.`
                            : undefined
                    }
                    onPick={goLost}
                />
            )}

            {data.totalCreated >= MIN_LEADS_FOR_SOURCE && <SourceCard data={data} />}

            <SpeedCard data={data} />

            {monthly && data.timeline.length >= 3 && data.totalCreated >= MIN_LEADS_FOR_TREND && (
                <TrendCard data={data} monthly={monthly} />
            )}
        </>
    );
}

/** Skąd przychodzą zapytania - ranking kanałów po LICZBIE (solidnej), skuteczność drobnym drukiem. */
function SourceCard({ data }: { data: LeadAnalytics }) {
    const sorted = [...data.bySource].sort((a, b) => b.count - a.count);
    const top = sorted[0];
    return (
        <AnalyticsCard
            question="Skąd przychodzą zapytania"
            answer={
                top && top.count > 0
                    ? <>Najwięcej zapytań przychodzi przez <strong>{SOURCE_LABELS[top.source] ?? top.source}</strong>.</>
                    : 'Za mało zamkniętych zapytań, żeby porównać kanały.'
            }
        >
            <RankedBars
                rows={sorted.map((entry) => ({
                    key: entry.source,
                    label: SOURCE_LABELS[entry.source] ?? entry.source,
                    value: entry.count,
                    // Skuteczność tylko przy stabilnej próbie: przy pięciu rozstrzygniętych
                    // rozmowach jedna wygrana to 20 punktów - taki procent kłamie.
                    meta: entry.closed >= MIN_CLOSED_FOR_SOURCE_RATE
                        ? `${leadCount(entry.count)} · skuteczność ${percent(entry.winRate)}`
                        : leadCount(entry.count),
                }))}
            />
        </AnalyticsCard>
    );
}

/** Czy szybka odpowiedź się opłaca - jedno zdanie werdyktu, bez wykresu przedziałów. */
function SpeedCard({ data }: { data: LeadAnalytics }) {
    const impact = data.responseImpact;

    // Przy braku danych nie pokazujemy nawet zdania „za mało", dopóki nie ma sensownej próby.
    if (impact.verdict === 'NOT_ENOUGH_DATA' && data.totalCreated < MIN_LEADS_FOR_SPEED) return null;

    const answer = (() => {
        if (impact.verdict === 'FASTER_WINS') {
            const gap = (impact.fastWinRate ?? 0) - (impact.slowWinRate ?? 0);
            return (
                <>
                    <strong>Tak.</strong> Gdy odpiszesz w ciągu doby, zamykasz {percent(impact.fastWinRate)}{' '}
                    zapytań, później tylko {percent(impact.slowWinRate)} — różnica {points(gap)}
                </>
            );
        }
        if (impact.verdict === 'NO_RELATION') {
            return (
                <>
                    Nie widać zależności. Skuteczność przy odpowiedzi w dobę ({percent(impact.fastWinRate)})
                    i później ({percent(impact.slowWinRate)}) jest podobna — o wyniku decyduje coś innego
                    niż tempo.
                </>
            );
        }
        return 'Za mało zamkniętych zapytań, żeby coś stwierdzić. Wróć tu przy szerszym zakresie.';
    })();

    return <AnalyticsCard question="Czy szybka odpowiedź się opłaca" answer={answer} />;
}

/** Zamknięte pieniądze miesiąc po miesiącu - jedyny prawdziwy wykres (Recharts). */
function TrendCard({ data, monthly }: { data: LeadAnalytics; monthly: boolean }) {
    const last = data.timeline[data.timeline.length - 1];
    const previous = data.timeline[data.timeline.length - 2];
    const delta = last && previous ? last.wonValue - previous.wonValue : null;

    return (
        <AnalyticsCard
            question="Przychód miesiąc po miesiącu"
            answer={
                delta === null || delta === 0
                    ? 'Ile pieniędzy zamykasz w kolejnych miesiącach.'
                    : (
                        <>
                            W ostatnim miesiącu zamknąłeś <strong>{formatMoney(last.wonValue)}</strong> —
                            o {formatMoney(Math.abs(delta))} {delta > 0 ? 'więcej' : 'mniej'} niż miesiąc wcześniej.
                        </>
                    )
            }
        >
            <WonMoneyChart
                points={data.timeline.map((point) => ({
                    period: formatPeriodTick(point.periodStart, monthly),
                    value: point.wonValue,
                }))}
            />
        </AnalyticsCard>
    );
}

/** „1 zapytanie", „3 zapytania", „11 zapytań" - polska odmiana bez zaskoczeń przy 12–14. */
function leadCount(n: number): string {
    if (n === 1) return `${n} zapytanie`;
    const rest = n % 10;
    const teens = n % 100;
    return rest >= 2 && rest <= 4 && (teens < 12 || teens > 14) ? `${n} zapytania` : `${n} zapytań`;
}
