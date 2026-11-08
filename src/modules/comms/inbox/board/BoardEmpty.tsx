// src/modules/comms/inbox/board/BoardEmpty.tsx
// Tablica bez ani jednej karty.
//
// Dawniej pusta tablica była czterema pustymi kolumnami: wąskie (pusta kolumna ma 200 px),
// wysokie na całą kartę, przyklejone do lewej, z pustym polem po prawej - i każda mówiła
// „nic tu nie ma" innymi słowami. Nic na ekranie nie było przedmiotem. Teraz przedmiotem
// jest jedno zdanie o stanie i przepływ, który tablica pokaże, gdy przyjdzie pierwszy lead.
//
// Szukanie bez wyników to inny stan niż brak leadów: kolumny mówiły wtedy „Nikt nie czeka
// na naszą odpowiedź", choć leady są, a nie pasują tylko do wpisanego tekstu.
//
// Nic tu nie jest wypełnione (CLAUDE.md §2): pusta tablica nie ma kroku następnego,
// a „Wyczyść szukanie" i „Pokaż listę" to wyjścia, nie praca.
import styled, { css } from 'styled-components';
import { ArrowDown, ArrowRight, CalendarCheck, Inbox, SearchX } from 'lucide-react';
import { Button } from '@/common/components/ui';
import { BOARD_COLUMNS, type BoardEmptyKind } from '../../utils/leadBoard';
import { ix } from '../tokens';

const Wrap = styled.div<{ $phone: boolean }>`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* margin: auto na treści, nie justify-content: center - wysoka treść na niskim
       ekranie nie ucieka wtedy nad górną krawędź przewijania. */
    padding: ${p => (p.$phone ? '12px 16px 24px' : '24px 24px 48px')};
`;

const Body = styled.div`
    margin: auto 0;
    width: 100%;
    max-width: 920px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
`;

const IconTile = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
    border-radius: 18px;
    background: ${ix.accentTint};
    box-shadow: inset 0 0 0 1px ${ix.accentLine};
    color: ${ix.accentInk};

    svg { width: 26px; height: 26px; }
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${ix.ink};
`;

const Lead = styled.p`
    max-width: 460px;
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${ix.muted};
`;

const Actions = styled.div`
    margin-top: 18px;
`;

const Flow = styled.ol<{ $phone: boolean }>`
    width: 100%;
    margin: 32px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    align-items: stretch;
    gap: 8px;
    ${p => p.$phone && css`flex-direction: column;`}
`;

const Step = styled.li<{ $dot: string; $tint: string }>`
    flex: 1 1 0;
    min-width: 0;
    padding: 14px 16px 16px;
    border-radius: 16px;
    background: ${p => p.$tint};
    box-shadow: inset 0 0 0 1px ${p => `${p.$dot}38`};
    text-align: left;

    strong {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 650;
        letter-spacing: -0.01em;
        color: ${ix.ink};
    }
    strong::before {
        content: '';
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: ${p => p.$dot};
    }
    p {
        margin: 6px 0 0 16px;
        font-size: 13px;
        line-height: 1.45;
        color: ${ix.text2};
    }
`;

const Arrow = styled.li`
    flex: none;
    align-self: center;
    display: inline-flex;
    color: ${ix.faint};

    svg { width: 16px; height: 16px; }
`;

interface BoardEmptyProps {
    kind: BoardEmptyKind;
    phone: boolean;
    query: string;
    onClearQuery: () => void;
    onList: () => void;
}

export function BoardEmpty({ kind, phone, query, onClearQuery, onList }: BoardEmptyProps) {
    if (kind === 'search') {
        return (
            <Wrap $phone={phone} role="status">
                <Body>
                    <IconTile aria-hidden="true"><SearchX /></IconTile>
                    <Title>Nic nie pasuje do „{query.trim()}”</Title>
                    <Lead>Szukanie obejmuje klienta, kontakt, auto i tagi leada.</Lead>
                    <Actions>
                        <Button variant="outline" onClick={onClearQuery}>Wyczyść szukanie</Button>
                    </Actions>
                </Body>
            </Wrap>
        );
    }

    if (kind === 'booked') {
        return (
            <Wrap $phone={phone} role="status">
                <Body>
                    <IconTile aria-hidden="true"><CalendarCheck /></IconTile>
                    <Title>Wszystkie otwarte leady mają rezerwację</Title>
                    <Lead>Lead z rezerwacją stoi tylko na liście. Wraca na tablicę, gdy klient napisze.</Lead>
                    <Actions>
                        <Button variant="outline" onClick={onList}>Pokaż listę</Button>
                    </Actions>
                </Body>
            </Wrap>
        );
    }

    const Next = phone ? ArrowDown : ArrowRight;
    return (
        <Wrap $phone={phone} role="status">
            <Body>
                <IconTile aria-hidden="true"><Inbox /></IconTile>
                <Title>Nie ma otwartych zapytań</Title>
                <Lead>Nowe zapytanie staje w kolumnie „{BOARD_COLUMNS[0].title}”. Dalej kolumnę wyznacza to, kto ma odpisać.</Lead>
                <Flow $phone={phone} aria-label="Kolumny tablicy">
                    {BOARD_COLUMNS.flatMap((column, index) => [
                        index > 0 && (
                            <Arrow key={`${column.key}-arrow`} aria-hidden="true"><Next /></Arrow>
                        ),
                        <Step key={column.key} $dot={column.tone.dot} $tint={column.tone.tint}>
                            <strong>{column.title}</strong>
                            <p>{column.flow}</p>
                        </Step>,
                    ])}
                </Flow>
            </Body>
        </Wrap>
    );
}
