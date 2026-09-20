// src/modules/comms/components/LeadQueueCard.tsx
// Jedna sprawa w kolejce. Trzy fakty, żadnego przycisku.
//
// Karta zastąpiła wiersz tabeli o sześciu kolumnach, którego na telefonie nie
// dało się przeczytać bez przewijania w bok. Klik w kartę otwiera szczegóły, gdzie
// stoją wszystkie akcje razem z kontekstem (wycena, termin) - osobny przycisk na
// karcie tylko dublował jedną z nich i przyciągał wzrok na każdym wierszu.
//
// Zamiast „Czeka N dni" i szacowanej kwoty karta mówi, CZEGO wymaga: nowej
// odpowiedzi albo ponownego kontaktu. Wiek i kwota niosły mniej: wiek powtarzał
// to, co pasek pilności przy krawędzi, a kwota jest często zgadywana, więc na
// liście wprowadzała w błąd. Pilność zostaje na pasku i na kolorze - nie w liczbie.
import styled from 'styled-components';
import { CarLogoImage } from '@/modules/vehicles/components/CarLogoImage';
import { formatVehicle } from '../utils/leadFormat';
import type { LeadUrgency, ReplyTone } from '../utils/leadUrgency';
import type { Lead } from '../types';
import { LeadSourceIcon } from './LeadSourceIcon';

const Card = styled.div<{ $tone: ReplyTone; $active: boolean; $dense: boolean }>`
    position: relative;
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

    /*
     * Pasek pilności przy lewej krawędzi. Zaległość jest cechą całej sprawy,
     * a nie zawartością którejś linijki, i - co ważniejsze - pasek nie zabiera
     * ani piksela szerokości. Skanuje się go jednym spojrzeniem w dół listy.
     */
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: ${({ $tone, theme }) =>
            $tone === 'due' ? theme.colors.error
            : $tone === 'stale' ? theme.colors.warning
            : 'transparent'};
    }
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
    font-weight: ${p => (p.$unread ? p.theme.fontWeights.bold : p.theme.fontWeights.semibold)};
    letter-spacing: -0.01em;
    color: ${p => (p.$unread ? p.theme.colors.text : p.theme.colors.textSecondary)};

    > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

/**
 * Czego karta wymaga - „Nowa wiadomość" (ruch po naszej stronie) albo „Ponowny
 * kontakt" (czekamy na klienta). Ton neutralny: pilność niesie pasek przy
 * krawędzi, więc etykieta nie musi jej powtarzać kolorem.
 */
const Kind = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.medium};
    white-space: nowrap;
    color: ${p => p.theme.colors.textMuted};
`;

const Services = styled.span`
    min-width: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Who = styled.span`
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};

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
}

export function LeadQueueCard({ lead, urgency, active, dense = false, onOpen }: LeadQueueCardProps) {
    const vehicle = formatVehicle(lead);
    const person = lead.customerName ?? lead.contactIdentifier;
    /*
     * Nagłówkiem jest auto, bo detailer myśli autami („ten X5 od ceramiki").
     * Gdy auta nie rozpoznano, nazwisko awansuje na nagłówek, a w trzeciej linijce
     * zostaje sam identyfikator, żeby nie powtarzać nazwiska dwa razy.
     */
    const subtitle = vehicle ? person : lead.customerName ? lead.contactIdentifier : null;
    /*
     * Czego karta wymaga. Dług ma własną etykietę, bo wymaga czego innego niż
     * zaległa odpowiedź: przy „Nowa wiadomość" trzeba przeczytać i odpisać, przy
     * „Obiecane" - wysłać coś, co się obiecało przez telefon. Zlanie ich w jedno
     * kazałoby otwierać sprawę, żeby się dowiedzieć, o którą z dwóch rzeczy chodzi.
     */
    const kind = urgency.owed
        ? 'Obiecane'
        : urgency.turn === 'OURS'
            ? 'Nowa wiadomość'
            : 'Ponowny kontakt';

    /*
     * Druga linijka mówi o usługach - ale przy długu ważniejsze jest, CO jesteśmy
     * winni. Notatka pochodzi z rozmowy („wysłać wycenę ceramiki"), więc jest
     * konkretniejsza niż lista tagów i to ona ma stać na karcie.
     */
    const second = urgency.owed && lead.owedNote
        ? lead.owedNote
        : lead.tagLabels.length > 0
            ? lead.tagLabels.join(', ')
            : 'Bez opisu usługi';

    return (
        <Card $tone={urgency.tone} $active={active} $dense={dense}>
            <OpenArea type="button" $dense={dense} onClick={onOpen}>
                <Line>
                    <Headline $unread={urgency.turn === 'OURS'}>
                        {lead.vehicleBrand && <CarLogoImage brand={lead.vehicleBrand} size="xs" />}
                        <span>{vehicle ?? person}</span>
                    </Headline>
                    {urgency.turn !== 'SETTLED' && <Kind>{kind}</Kind>}
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
