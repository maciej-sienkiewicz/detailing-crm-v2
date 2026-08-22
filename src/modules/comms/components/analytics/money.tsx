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
import styled from 'styled-components';
import { LOST, OPEN, WON } from './tokens';

// ── Zdanie-bohater ──────────────────────────────────────────────────────────

const HeroBand = styled.section`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0 8px;
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
}

export function Hero({ lead, amount, body, action, reward, note }: HeroProps) {
    return (
        <HeroBand>
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
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 18px 20px 20px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        padding: 14px;
    }
`;

const LedgerTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};

    strong { font-weight: ${p => p.theme.fontWeights.bold}; }
`;

/**
 * Nie wykres — jeden przedmiot. Trzy odcinki jednej belki czyta się jak poziom
 * paliwa albo plik banknotów: bez osi, bez legendy do rozszyfrowania, bez
 * znajomości procentów. Wykres kołowy w tym miejscu kazałby porównywać kąty,
 * czyli wykonać najgorzej działające zadanie percepcyjne, jakie znamy.
 */
const Bar = styled.div`
    display: flex;
    /* Dwa piksele tła między odcinkami — bez szczeliny granica gubi się dokładnie
       tam, gdzie siedzi cała treść. */
    gap: 2px;
    height: 22px;
`;

const Kept = styled.div`
    background: ${WON};
    border-radius: 4px;
    min-width: 3px;
`;

const InPlay = styled.div`
    /* Wygaszone wypełnienie: to są pieniądze, których jeszcze nie masz. */
    background: ${OPEN};
    border-radius: 4px;
    min-width: 3px;
`;

/**
 * Strata jako dziura, nie jako blok. Sam kontur z pustym środkiem czyta się jak
 * brak, a nie jak trzeci wynik — i to jest dokładnie to, czym jest.
 */
const Gone = styled.div`
    border: 1.5px solid ${LOST};
    background: repeating-linear-gradient(
        135deg,
        transparent,
        transparent 5px,
        ${LOST}22 5px,
        ${LOST}22 7px
    );
    border-radius: 4px;
    min-width: 3px;
`;

const Keys = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        grid-template-columns: 1fr;
        gap: 6px;
    }
`;

const Key = styled.div<{ $clickable?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 2px;
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
        font-size: 19px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }
    &:hover .amount {
        text-decoration: ${p => (p.$clickable ? 'underline' : 'none')};
    }
`;

const Swatch = styled.i<{ $kind: 'kept' | 'play' | 'gone' }>`
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
    background: ${p => (p.$kind === 'kept' ? WON : p.$kind === 'play' ? OPEN : 'transparent')};
    border: ${p => (p.$kind === 'gone' ? `1.5px solid ${LOST}` : 'none')};
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
    gone: { amount: string; raw: number; onClick?: () => void };
    delta?: ReactNode;
}

export function MoneyLedger({ total, kept, inPlay, gone, delta }: LedgerProps) {
    const sum = Math.max(1, kept.raw + inPlay.raw + gone.raw);
    const share = (value: number) => `${(value / sum) * 100}%`;

    return (
        <LedgerBox>
            <LedgerTitle>
                Przez Twoje drzwi przeszło <strong>{total}</strong>
            </LedgerTitle>

            <Bar aria-hidden>
                {kept.raw > 0 && <Kept style={{ width: share(kept.raw) }} />}
                {inPlay.raw > 0 && <InPlay style={{ width: share(inPlay.raw) }} />}
                {gone.raw > 0 && <Gone style={{ width: share(gone.raw) }} />}
            </Bar>

            {/* Kwoty podpisane wprost przy każdym odcinku: kolor nigdy nie niesie
                znaczenia sam, więc belka działa też wydrukowana i dla kogoś, kto
                tych barw nie rozróżnia. */}
            <Keys>
                <Key as="div">
                    <span className="name"><Swatch $kind="kept" /> Zatrzymałeś</span>
                    <span className="amount">{kept.amount}</span>
                </Key>
                <Key
                    as={inPlay.onClick ? 'button' : 'div'}
                    type={inPlay.onClick ? 'button' : undefined}
                    $clickable={Boolean(inPlay.onClick)}
                    onClick={inPlay.onClick}
                >
                    <span className="name"><Swatch $kind="play" /> Wciąż w grze</span>
                    <span className="amount">{inPlay.amount}</span>
                </Key>
                <Key
                    as={gone.onClick ? 'button' : 'div'}
                    type={gone.onClick ? 'button' : undefined}
                    $clickable={Boolean(gone.onClick)}
                    onClick={gone.onClick}
                >
                    <span className="name"><Swatch $kind="gone" /> Poszło do konkurencji</span>
                    <span className="amount">{gone.amount}</span>
                </Key>
            </Keys>

            {delta && <Delta>{delta}</Delta>}
        </LedgerBox>
    );
}

// ── Gdzie wyciekły pieniądze ────────────────────────────────────────────────

const LeakBox = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* Węższa niż strona z rozmysłem: na pełnej szerokości między nazwą powodu
       a kwotą zostaje pół ekranu pustego toru i wzrok musi przez nie przejechać
       przy każdym wierszu. To jest pionowy trzon F-patternu, nie belka. */
    max-width: 780px;
`;

const LeakTitle = styled.h3`
    margin: 0;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

const LeakRow = styled.button`
    display: grid;
    grid-template-columns: minmax(120px, 210px) minmax(0, 1fr) minmax(104px, auto);
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    padding: 7px 0;
    font: inherit;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    &:last-child { border-bottom: none; }
    &:hover .amount { text-decoration: underline; }

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
        .track { display: none; }
    }
`;

const LeakTrack = styled.div`
    height: 8px;
    border-radius: 4px;
    background: ${p => p.theme.colors.surfaceAlt};
    overflow: hidden;
`;

const LeakFill = styled.div`
    height: 100%;
    border-radius: 4px;
    background: ${LOST};
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
            <LeakTitle>Gdzie wyciekły te pieniądze</LeakTitle>
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
                </LeakRow>
            ))}
        </LeakBox>
    );
}
