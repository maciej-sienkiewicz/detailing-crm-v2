// src/modules/comms/components/LeadQueueCard.tsx
// Jedna sprawa w kolejce. Trzy fakty, żadnego przycisku.
//
// Karta zastąpiła wiersz tabeli o sześciu kolumnach, którego na telefonie nie
// dało się przeczytać bez przewijania w bok. Klik w kartę otwiera szczegóły, gdzie
// stoją wszystkie akcje razem z kontekstem (wycena, termin) - osobny przycisk na
// karcie tylko dublował jedną z nich i przyciągał wzrok na każdym wierszu.
//
// ── Dlaczego zniknął kolorowy pasek przy krawędzi ───────────────────────────
//
// Pasek nosił KATEGORIĘ: czerwony „ruch po naszej stronie", bursztynowy „cisza".
// Odkąd lista dzieli się na sekcje, kategorię mówi już nagłówek nad wierszami -
// pasek powtarzał ją przy każdym z nich i zamieniał kolumnę w ciągły pas barwy,
// w którym nie widać granicy między sekcjami.
//
// Gorzej: czerwień #dc2626 i bursztyn #d97706 dzieli ΔE 41 przy normalnym widzeniu,
// ale tylko 11 przy deuteranopii - dla mniej więcej jednego mężczyzny na dwunastu
// to były dwa paski w tym samym kolorze. Para ciepłych barw nie nadaje się do
// rozróżniania dwóch rzeczy, które i tak stoją jedna pod drugą.
//
// Zamiast paska: WAGA PISMA niesie „czyj ruch" (jak nieprzeczytane w Poczcie),
// a kolor zostaje wyłącznie dla wyjątku - wieku, który przekroczył próg studia.
// Jeden akcent na wiersz, i to nie na każdym wierszu.
//
// Wiek wraca na kartę - po prawej, cyframi tabelarycznymi. Kolumna liczb przy
// prawej krawędzi skanuje się w dół szybciej niż cokolwiek innego na liście
// i jest jedyną rzeczą, która RÓŻNI wiersze w obrębie sekcji. Etykieta
// „Nowa wiadomość" przy każdym z nich różniła ich zero.
import styled from 'styled-components';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { formatVehicle } from '../utils/leadFormat';
import { formatAge, type LeadUrgency } from '../utils/leadUrgency';
import type { Lead } from '../types';
import { LeadSourceIcon } from './LeadSourceIcon';

/**
 * Pole wyboru wiersza. Pojawia się dopiero w trybie zaznaczania.
 *
 * Nie ma go na stałe, choć tak byłoby prościej: kolumna kwadracików przy każdym
 * wierszu jest widoczna zawsze, a przydaje się parę razy w miesiącu - i na liście,
 * którą cały ten moduł upraszczał do trzech faktów, dokładałaby czwarty.
 *
 * Stoi POZA obszarem otwierania sprawy, a nie w nim: zagnieżdżone byłoby klikane
 * dwa razy jednym kliknięciem. 44 px szerokości, bo na telefonie trafia w nie kciuk.
 */
const SelectCell = styled.label`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    cursor: pointer;

    input {
        width: 17px;
        height: 17px;
        margin: 0;
        accent-color: ${p => p.theme.colors.primary};
        cursor: pointer;
    }

    &:hover input { filter: brightness(0.95); }
`;

const Card = styled.div<{ $active: boolean; $dense: boolean }>`
    display: flex;
    align-items: stretch;
    /* Gęściej na desktopie (panel obok kolejki, mysz), luźniej na telefonie
       (jedna ręka, rękawica) - stąd wysokość zależna od gęstości, nie stała.
       Wartości zeszły o kilkanaście pikseli, żeby wiersz kolejki miał ten sam
       rytm co wiersz rozmowy w Poczcie: trzy linijki i nic ponad to. */
    min-height: ${p => (p.$dense ? '58px' : '70px')};
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : theme.colors.surface)};
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    transition: background ${p => p.theme.transitions.fast};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

/** Cała karta otwiera szczegóły. */
const OpenArea = styled.button<{ $dense: boolean }>`
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: ${p => (p.$dense ? '1px' : '2px')};
    padding: ${p => (p.$dense ? '9px 12px' : '11px 12px')};
    border: none;
    background: transparent;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    color: inherit;

    &:focus-visible {
        outline: 2px solid ${p => p.theme.colors.primary};
        outline-offset: -2px;
    }
`;

const Line = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
`;

const Headline = styled.span<{ $unread: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    /* Skala pisma wiersza w Poczcie: 13 / 12 / 12. Wcześniej 14,5 / 13 / 12,5
       robiło z kolejki listę nagłówków, a z listy rozmów - listę wpisów. */
    font-size: 13px;
    /*
     * Pogrubienie znaczy dokładnie to, co w poczcie znaczy „nieprzeczytane":
     * ruch jest po Twojej stronie. To jedyne pogrubienie w całym module - gdyby
     * niosło coś jeszcze, przestałoby nieść to.
     */
    font-weight: ${p => (p.$unread ? p.theme.fontWeights.bold : p.theme.fontWeights.medium)};
    letter-spacing: -0.01em;
    color: ${p => (p.$unread ? p.theme.colors.text : p.theme.colors.textSecondary)};

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/**
 * Wiek oczekiwania przy prawej krawędzi - ten sam kształt i rozmiar, co data przy
 * wierszu rozmowy w Poczcie (.when).
 *
 * Cyfry tabelaryczne, żeby „3 dni" i „31 godz." zaczynały się w tym samym miejscu:
 * kolumna liczb, która skacze w poziomie, przestaje być kolumną.
 *
 * Kolor zapala się TYLKO w sekcji „Czeka na nas" i tylko po przekroczeniu progu
 * studia. W „Ucichło" przekroczony próg ma z definicji KAŻDY wiersz - czerwień
 * pomalowałaby tam całą sekcję i wróciłby dokładnie ten pas barwy, przez który
 * zniknęły paski przy krawędzi. Wyjątek przestaje być wyjątkiem, gdy dotyczy
 * wszystkich; tam rolę „to jest stan nienormalny" pełni już nazwa sekcji.
 *
 * Czerwień to #b91c1c, nie #dc2626: ta druga daje na bieli 4,83:1, pierwsza 6,47:1,
 * a mówimy o jedenastopunktowym piśmie.
 */
const Age = styled.span<{ $alarm: boolean }>`
    flex-shrink: 0;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: ${p => (p.$alarm ? '#b91c1c' : p.theme.colors.textSecondary)};
    font-weight: ${p => (p.$alarm ? p.theme.fontWeights.semibold : p.theme.fontWeights.normal)};
`;

const Services = styled.span`
    min-width: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/*
 * textSecondary (#475569), nie textMuted (#94a3b8): ten drugi daje na bieli 2,56:1,
 * czyli poniżej progu WCAG AA nawet dla dużego pisma, a tu stoi nazwisko klienta -
 * jedyna rzecz na karcie, po której da się kogoś rozpoznać.
 */
const Who = styled.span`
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

interface LeadQueueCardProps {
    lead: Lead;
    urgency: LeadUrgency;
    active: boolean;
    /** Gęstszy układ (niższa karta, ciaśniejsze odstępy) - desktop z panelem obok. */
    dense?: boolean;
    onOpen: () => void;
    /** Tryb zaznaczania: wiersz dostaje pole wyboru, a kliknięcie zaznacza zamiast otwierać. */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
}

export function LeadQueueCard({
    lead,
    urgency,
    active,
    dense = false,
    onOpen,
    selectable = false,
    selected = false,
    onToggleSelect,
}: LeadQueueCardProps) {
    const vehicle = formatVehicle(lead);
    const person = lead.customerName ?? lead.contactIdentifier;
    /*
     * Nagłówkiem jest auto, bo detailer myśli autami („ten X5 od ceramiki").
     * Gdy auta nie rozpoznano, nazwisko awansuje na nagłówek, a w trzeciej linijce
     * zostaje sam identyfikator, żeby nie powtarzać nazwiska dwa razy.
     */
    const subtitle = vehicle ? person : lead.customerName ? lead.contactIdentifier : null;
    /*
     * Druga linijka mówi o usługach - ale przy obietnicy ważniejsze jest, CO zostało
     * do wysłania. Notatka pochodzi wprost z rozmowy („wysłać wycenę ceramiki"),
     * więc jest konkretniejsza niż lista tagów i to ona ma stać na karcie.
     */
    const second = urgency.owed
        ? `Obiecane: ${lead.owedNote ?? 'odpowiedź po rozmowie'}`
        : lead.tagLabels.length > 0
            ? lead.tagLabels.join(', ')
            : 'Bez opisu usługi';

    /*
     * W trybie zaznaczania kliknięcie w wiersz ZAZNACZA, a nie otwiera sprawę.
     * Tak działa każda skrzynka pocztowa i jest ku temu powód: zaznaczyłeś osiem
     * spraw, trafiłeś obok kwadracika i zamiast dziewiątej dostajesz otwarty panel
     * z utraconym zaznaczeniem. Celem myszy jest wtedy cały wiersz, nie 17 pikseli.
     */
    const activate = selectable && onToggleSelect ? onToggleSelect : onOpen;

    return (
        <Card $active={active || (selectable && selected)} $dense={dense}>
            {selectable && (
                <SelectCell
                    onClick={(event) => event.stopPropagation()}
                    title={selected ? 'Odznacz sprawę' : 'Zaznacz sprawę'}
                >
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect?.()}
                        aria-label={`${selected ? 'Odznacz' : 'Zaznacz'}: ${vehicle ?? person}`}
                    />
                </SelectCell>
            )}
            <OpenArea type="button" $dense={dense} onClick={activate}>
                <Line>
                    <Headline $unread={urgency.turn === 'OURS'}>
                        {lead.vehicleBrand && <CarLogoImage brand={lead.vehicleBrand} size="xs" />}
                        <span>{vehicle ?? person}</span>
                    </Headline>
                    {urgency.turn !== 'SETTLED' && (
                        <Age $alarm={urgency.turn === 'OURS' && urgency.overdue} title={urgency.title}>
                            {formatAge(urgency.waitingMs)}
                        </Age>
                    )}
                </Line>

                <Services>{second}</Services>

                {subtitle && (
                    <Who>
                        <LeadSourceIcon source={lead.source} />
                        <span>{subtitle}</span>
                    </Who>
                )}
            </OpenArea>
        </Card>
    );
}
