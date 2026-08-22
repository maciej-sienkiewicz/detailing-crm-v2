// src/modules/comms/components/analytics/money.tsx
// Rachunek pieniędzy — trzy elementy, na których stoi cały widok analityki.
//
// Wspólne założenie: właściciel studia myśli w złotówkach, nie w procentach.
// Procent wymaga tłumaczenia na pieniądze, zanim cokolwiek znaczy, i nie ma skali
// odniesienia — „skuteczność 41%" to ocena szkolna bez kryteriów. Przy rozrzucie
// wartości zleceń od czterystu złotych do dwunastu tysięcy procent dodatkowo
// kłamie: miesiąc z dziesięcioma przegranymi praniami tapicerki i jedną wygraną
// powłoką to dziewięć procent i świetny miesiąc.
import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { ChevronRight } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { LOST, OPEN, SILENT, WON } from './tokens';

/**
 * Wspólna powierzchnia robocza: biała karta z hairline'ową ramką, promieniem 14px
 * i miękkim cieniem — dokładnie ta sama, którą ma moduł statystyk.
 *
 * Sekcje bez tła kładły treść wprost na teksturze heksagonów z tła aplikacji.
 * Tekstura jest tam po to, żeby coś się delikatnie działo POD interfejsem, a nie
 * pod zdaniem, które ktoś czyta — litery na wzorze męczą przy pierwszym akapicie.
 * Osobno: karta niesie informację o głębi. Biel z ramką mówi „to jest powierzchnia
 * robocza", tło strony mówi „to jest kontekst". Bez tej różnicy wszystko leży
 * na jednym planie i nic nie jest ważniejsze.
 */
const surface = css`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    ${cardEntrance}
`;

// ── Zdanie-bohater ──────────────────────────────────────────────────────────

const HeroBand = styled.section<{ $urgent: boolean }>`
    ${surface}
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 26px 28px 24px;

    /*
     * Czerwona listwa przy krawędzi, gdy jest zaległość — ten sam znak pilności,
     * co przy wierszu tabeli leadów. Kto nauczył się go tam, rozumie go tutaj bez
     * tłumaczenia, a listwa nie zabiera ani piksela szerokości treści.
     */
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: ${p => (p.$urgent ? p.theme.colors.error : p.theme.colors.success)};
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 20px 18px 18px;
    }
`;

const HeroLead = styled.span`
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.textSecondary};
`;

/**
 * Kwota-bohater. Największy element ekranu i jedyny, który wolno tak wyeksponować.
 *
 * Rozmiar niesie hierarchię, kolor niesie znaczenie. Kwota jest atramentem, nie
 * kolorem: liczba pieniędzy pomalowana na czerwono albo zielono wygląda jak alarm,
 * a to ma być fakt.
 */
const HeroAmount = styled.strong`
    font-size: 52px;
    line-height: 1.05;
    font-weight: ${p => p.theme.fontWeights.bold};
    letter-spacing: -0.03em;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        font-size: 38px;
    }
`;

const HeroBody = styled.p`
    margin: 6px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textSecondary};
    max-width: 62ch;

    strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
`;

const HeroFoot = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 14px;
`;

const HeroNote = styled.span`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Kwit za ostatnią wizytę: „w tym tygodniu zamieniłeś w rezerwacje 6 200 zł".
 *
 * Bez tego zdania ekran tylko wymaga i nigdy nie kwituje — a widok, który zawsze
 * mówi, ile jeszcze zostało do zrobienia, i nigdy nie odnotowuje, co zostało
 * zrobione, przestaje być narzędziem, a staje się wyrzutem.
 */
const HeroReward = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.success};
`;

interface HeroProps {
    lead: string;
    amount: string;
    body: ReactNode;
    action?: ReactNode;
    reward?: string;
    note?: ReactNode;
    /** Jest zaległość — listwa przy krawędzi robi się czerwona. */
    urgent?: boolean;
}

export function Hero({ lead, amount, body, action, reward, note, urgent = false }: HeroProps) {
    return (
        <HeroBand $urgent={urgent}>
            <HeroLead>{lead}</HeroLead>
            <HeroAmount>{amount}</HeroAmount>
            <HeroBody>{body}</HeroBody>
            {reward && <HeroReward>{reward}</HeroReward>}
            {(action || note) && (
                <HeroFoot>
                    {action}
                    {note && <HeroNote>{note}</HeroNote>}
                </HeroFoot>
            )}
        </HeroBand>
    );
}

// ── Rachunek zapytań: jedna belka pieniędzy ─────────────────────────────────

const LedgerBox = styled.section`
    ${surface}
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px 24px 24px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 18px 16px;
    }
`;

/** Nagłówek karty w języku modułu statystyk: mały, wersalikami, wygaszony. */
const LedgerTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: ${st.textMuted};
`;

const LedgerTotal = styled.p`
    margin: 0;
    font-size: 26px;
    font-weight: ${p => p.theme.fontWeights.bold};
    letter-spacing: -0.02em;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
    line-height: 1.1;

    span {
        display: block;
        font-size: 12.5px;
        font-weight: ${p => p.theme.fontWeights.normal};
        letter-spacing: 0;
        color: ${st.textMuted};
        margin-top: 2px;
    }
`;

/**
 * Nie wykres — jeden przedmiot. Trzy odcinki jednej belki czyta się jak poziom
 * paliwa albo plik banknotów: bez osi, bez legendy do rozszyfrowania, bez
 * znajomości procentów. Wykres kołowy w tym miejscu kazałby porównywać kąty,
 * czyli wykonać najgorzej działające zadanie percepcyjne, jakie znamy.
 */
const Bar = styled.div`
    display: flex;
    /* Trzy piksele tła między odcinkami — bez szczeliny granica gubi się dokładnie
       tam, gdzie siedzi cała treść. */
    gap: 3px;
    height: 30px;
`;

const Segment = styled.div`
    border-radius: 7px;
    min-width: 4px;
    transition: filter 160ms ease, transform 160ms ease;

    &:hover { filter: brightness(0.94); }
`;

/**
 * Pionowy gradient w obrębie JEDNEGO odcienia, nie tęcza. To jest zwykłe
 * cieniowanie bryły — nadaje paskowi materialność, której płaski prostokąt nie ma,
 * i nie koduje przy tym żadnej dodatkowej informacji, więc niczego nie zaciemnia.
 */
const Kept = styled(Segment)`
    background: linear-gradient(180deg, #3b82f6 0%, ${WON} 100%);
    box-shadow: 0 1px 2px rgba(37, 99, 235, 0.28);
`;

const InPlay = styled(Segment)`
    /* Wygaszone wypełnienie: to są pieniądze, których jeszcze nie masz. */
    background: linear-gradient(180deg, #dbe3ee 0%, ${OPEN} 100%);
`;

/**
 * Rozmowy, które ucichły — otwarte dłużej niż klient realnie potrzebuje na decyzję.
 * Kreskowany kontur w tej samej szarości: to wciąż brak rozstrzygnięcia, ale już
 * nie pipeline.
 */
const Silent = styled(Segment)`
    background: ${SILENT};
    border: 1px dashed #c3ccd8;
`;

/**
 * Strata jako dziura, nie jako blok. Sam kontur z pustym środkiem czyta się jak
 * brak, a nie jak trzeci wynik — i to jest dokładnie to, czym jest.
 */
const Gone = styled(Segment)`
    border: 1px solid ${LOST}66;
    background: repeating-linear-gradient(
        135deg,
        ${LOST}0d,
        ${LOST}0d 6px,
        ${LOST}26 6px,
        ${LOST}26 9px
    );
`;

/**
 * Podpisy siedzą pod swoimi odcinkami, a nie w równej siatce trzech kolumn.
 * Ta sama szerokość co odcinek nad nimi wiąże etykietę z paskiem prawem
 * bliskości — w równej siatce „Poszło do konkurencji" stało pod środkiem
 * odcinka „w grze" i trzeba było wodzić wzrokiem w górę i w dół, żeby sprawdzić,
 * co do czego należy.
 */
const Keys = styled.div`
    display: flex;
    gap: 3px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-direction: column;
        gap: 10px;
    }
`;

const Key = styled.div<{ $clickable?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    text-align: left;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    cursor: ${p => (p.$clickable ? 'pointer' : 'default')};

    .name {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        color: ${p => p.theme.colors.textMuted};
    }
    .amount {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 20px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${st.text};
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
    }
    .amount svg {
        width: 15px;
        height: 15px;
        color: ${st.textMuted};
        opacity: 0;
        transition: opacity 160ms ease, transform 160ms ease;
    }
    &:hover .amount svg { opacity: 1; transform: translateX(2px); }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
    }
`;

const Swatch = styled.i<{ $kind: 'kept' | 'play' | 'silent' | 'gone' }>`
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
    background: ${p => (
        p.$kind === 'kept' ? WON
        : p.$kind === 'play' ? OPEN
        : p.$kind === 'silent' ? SILENT
        : 'transparent'
    )};
    border: ${p => (
        p.$kind === 'gone' ? `1px solid ${LOST}99`
        : p.$kind === 'silent' ? '1px dashed #c3ccd8'
        : 'none'
    )};
`;

const Delta = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
`;

interface LedgerProps {
    total: string;
    kept: { amount: string; raw: number };
    inPlay: { amount: string; raw: number; onClick?: () => void };
    silent: { amount: string; raw: number; onClick?: () => void };
    gone: { amount: string; raw: number; onClick?: () => void };
    delta?: ReactNode;
}

export function MoneyLedger({ total, kept, inPlay, silent, gone, delta }: LedgerProps) {
    const sum = Math.max(1, kept.raw + inPlay.raw + silent.raw + gone.raw);
    const share = (value: number) => `${(value / sum) * 100}%`;

    return (
        <LedgerBox>
            <LedgerTitle>Rachunek zapytań</LedgerTitle>
            <LedgerTotal>
                {total}
                <span>tyle pieniędzy przeszło przez Twoje drzwi w tym okresie</span>
            </LedgerTotal>

            <Bar aria-hidden>
                {kept.raw > 0 && (
                    <Kept style={{ width: share(kept.raw) }} title={`Zatrzymałeś ${kept.amount}`} />
                )}
                {inPlay.raw > 0 && (
                    <InPlay style={{ width: share(inPlay.raw) }} title={`Wciąż w grze ${inPlay.amount}`} />
                )}
                {silent.raw > 0 && (
                    <Silent style={{ width: share(silent.raw) }} title={`Ucichło ${silent.amount}`} />
                )}
                {gone.raw > 0 && (
                    <Gone style={{ width: share(gone.raw) }} title={`Poszło do konkurencji ${gone.amount}`} />
                )}
            </Bar>

            {/* Kwoty podpisane wprost przy każdym odcinku: kolor nigdy nie niesie
                znaczenia sam, więc belka działa też wydrukowana i dla kogoś, kto
                tych barw nie rozróżnia. */}
            {/* Szerokość podpisu = szerokość jego odcinka, z podłogą, żeby wąski
                odcinek nie ścisnął etykiety do wielokropka. */}
            <Keys>
                <Key as="div" style={{ flex: `1 1 ${share(kept.raw)}`, minWidth: 120 }}>
                    <span className="name"><Swatch $kind="kept" /> Zatrzymałeś</span>
                    <span className="amount">{kept.amount}</span>
                </Key>
                <Key
                    as={inPlay.onClick ? 'button' : 'div'}
                    type={inPlay.onClick ? 'button' : undefined}
                    $clickable={Boolean(inPlay.onClick)}
                    onClick={inPlay.onClick}
                    style={{ flex: `1 1 ${share(inPlay.raw)}`, minWidth: 120 }}
                >
                    <span className="name"><Swatch $kind="play" /> Wciąż w grze</span>
                    <span className="amount">
                        {inPlay.amount}
                        {inPlay.onClick && <ChevronRight />}
                    </span>
                </Key>
                {silent.raw > 0 && (
                    <Key
                        as={silent.onClick ? 'button' : 'div'}
                        type={silent.onClick ? 'button' : undefined}
                        $clickable={Boolean(silent.onClick)}
                        onClick={silent.onClick}
                        style={{ flex: `1 1 ${share(silent.raw)}`, minWidth: 120 }}
                    >
                        <span className="name"><Swatch $kind="silent" /> Ucichło</span>
                        <span className="amount">
                            {silent.amount}
                            {silent.onClick && <ChevronRight />}
                        </span>
                    </Key>
                )}
                <Key
                    as={gone.onClick ? 'button' : 'div'}
                    type={gone.onClick ? 'button' : undefined}
                    $clickable={Boolean(gone.onClick)}
                    onClick={gone.onClick}
                    style={{ flex: `1 1 ${share(gone.raw)}`, minWidth: 150 }}
                >
                    <span className="name"><Swatch $kind="gone" /> Poszło do konkurencji</span>
                    <span className="amount">
                        {gone.amount}
                        {gone.onClick && <ChevronRight />}
                    </span>
                </Key>
            </Keys>

            {delta && <Delta>{delta}</Delta>}
        </LedgerBox>
    );
}

// ── Gdzie wyciekły pieniądze ────────────────────────────────────────────────

const LeakBox = styled.section`
    ${surface}
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 22px 24px 16px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 18px 16px 12px;
    }
`;

const LeakTitle = styled.h3`
    margin: 0 0 8px;
    font-size: ${st.fontXs};
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: ${st.textMuted};
`;

const LeakRow = styled.button`
    display: grid;
    grid-template-columns: minmax(120px, 220px) minmax(0, 1fr) minmax(104px, auto) 16px;
    align-items: center;
    gap: 14px;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    padding: 12px 8px;
    margin: 0 -8px;
    border-radius: ${st.radiusSm};
    font: inherit;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    border-bottom: 1px solid ${st.border};
    transition: background 160ms ease;

    &:last-of-type { border-bottom: none; }
    &:hover { background: ${st.bgCardAlt}; }
    &:hover .go { opacity: 1; transform: translateX(2px); }

    .go {
        width: 16px;
        height: 16px;
        color: ${st.textMuted};
        opacity: 0;
        transition: opacity 160ms ease, transform 160ms ease;
    }

    .name {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.medium};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .amount {
        text-align: right;
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .count {
        display: block;
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: minmax(0, 1fr) minmax(88px, auto);
        gap: 10px;
        .track, .go { display: none; }
    }
`;

const LeakTrack = styled.div`
    height: 10px;
    border-radius: 5px;
    background: ${st.bgCardAlt};
    overflow: hidden;
`;

const LeakFill = styled.div`
    height: 100%;
    border-radius: 5px;
    background: linear-gradient(180deg, #ef4444 0%, ${LOST} 100%);
`;

interface LeakListProps {
    rows: { code: string; label: string; amount: string; raw: number; count: string }[];
    onPick?: (code: string) => void;
}

/**
 * Powody straty w złotówkach, nie w sztukach. Sześć przegranych praniach tapicerki
 * i sześć przegranych powłok ceramicznych to ta sama liczba i zupełnie inna strata,
 * więc lista posortowana po liczbie zdarzeń wskazywałaby nie ten problem.
 *
 * Każdy wiersz prowadzi do rozmów, które go utworzyły. Kwota nieklikalna jest
 * twierdzeniem; klikalna jest dowodem — i to jest jedyny prawdziwy mechanizm
 * zaufania do liczby na ekranie.
 */
export function LeakList({ rows, onPick }: LeakListProps) {
    const max = Math.max(1, ...rows.map(r => r.raw));
    return (
        <LeakBox>
            <LeakTitle>Dlaczego utraciliśmy te pieniądze</LeakTitle>
            {rows.map((row) => (
                <LeakRow key={row.code} type="button" onClick={() => onPick?.(row.code)}>
                    <span className="name">{row.label}</span>
                    <LeakTrack className="track">
                        <LeakFill style={{ width: `${Math.max(3, (row.raw / max) * 100)}%` }} />
                    </LeakTrack>
                    <span className="amount">
                        {row.amount}
                        <span className="count">{row.count}</span>
                    </span>
                    <ChevronRight className="go" />
                </LeakRow>
            ))}
        </LeakBox>
    );
}
