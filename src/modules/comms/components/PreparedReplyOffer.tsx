// src/modules/comms/components/PreparedReplyOffer.tsx
//
// Gotowa odpowiedź jako PROPOZYCJA pod rozmową, nie treść wpisana za człowieka.
//
// Pierwsza wersja (28.10.2026) wstawiała szkic do edytora sama i rozsuwała kompozytor:
// nad treścią stało pięć linii podpowiedzi (notka, „Uzupełnij: [proponowany termin]",
// cztery rodzaje odpowiedzi, pięć dni z kalendarza), na rozmowę zostawało kilka
// centymetrów, a otwierający podgląd zastawał w polu tekst, którego nie pisał.
// Właściciel: „to jest nieczytelne i łatwo jest zostać przytłoczonym".
//
// Teraz rozmowa jest pierwsza, a pod nią jedna karta: co przygotowaliśmy (rodzaj i kwota),
// dwie linijki podglądu i dwie decyzje. „Otwórz odpowiedź" jest krokiem następnym, więc
// jako jedyny jest wypełniony (CLAUDE.md §2); reszta wyborów (inny rodzaj odpowiedzi,
// pisanie od zera) czeka w jednym menu, zamiast stać rzędem pigułek.

import styled from 'styled-components';
import { ChevronDown, Sparkle } from 'lucide-react';
import { ActionMenu, MenuDivider, MenuItem, useActionMenu } from '@/common/components/ui';
import type { PreparedReply } from '../types';
import { preparedReplyPreview, preparedReplyTitle } from '../utils/preparedReply';
import { QUICK_REPLIES, type QuickReply } from '../utils/quickReplies';
import { PillPrimary } from '../inbox/primitives';
import { ix } from '../inbox/tokens';

/**
 * Szybka odpowiedź, która jest tym samym rodzajem co przygotowana - przygotowana mówi to
 * samo, tylko konkretnie o tym zapytaniu, więc dwóch „próśb o zdjęcia" nie pokazujemy.
 */
const SAME_KIND: Partial<Record<QuickReply['id'], PreparedReply['kind'][]>> = {
    photos: ['PHOTOS'],
    inspection: ['INSPECTION'],
};

interface Props {
    prepared: PreparedReply;
    /** Treść już dopasowana do stopki odpisującego (preparedTextFor). */
    text: string;
    /** Stały klient albo duża wycena - zdanie o telefonie po wysłaniu. */
    hint?: string | null;
    /** Telefon: podgląd w jednej linii, karta na całą szerokość. */
    compact?: boolean;
    onOpen: () => void;
    onQuickReply: (reply: QuickReply) => void;
    onWriteOwn: () => void;
}

export function PreparedReplyOffer({ prepared, text, hint, compact = false, onOpen, onQuickReply, onWriteOwn }: Props) {
    const menu = useActionMenu();
    const others = QUICK_REPLIES.filter((reply) => !SAME_KIND[reply.id]?.includes(prepared.kind));

    return (
        <Card aria-label="Gotowa odpowiedź" $compact={compact}>
            <Tile aria-hidden="true"><Sparkle /></Tile>
            <Body>
                <Title>{preparedReplyTitle(prepared)}</Title>
                <Preview $lines={compact ? 1 : 2}>{preparedReplyPreview(text)}</Preview>
                {hint && <Hint>{hint}</Hint>}
                <Actions>
                    <PillPrimary onClick={onOpen}>Otwórz odpowiedź</PillPrimary>
                    <More
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={menu.isOpen()}
                        onClick={(event) => menu.toggle(event, null)}
                    >
                        Inna odpowiedź <ChevronDown />
                    </More>
                </Actions>
            </Body>
            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Inna odpowiedź">
                {others.map((reply) => (
                    <MenuItem key={reply.id} onClick={() => { menu.close(); onQuickReply(reply); }}>
                        {reply.label}
                    </MenuItem>
                ))}
                <MenuDivider />
                <MenuItem onClick={() => { menu.close(); onWriteOwn(); }}>Napiszę od zera</MenuItem>
            </ActionMenu>
        </Card>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

/* Płasko, w odcieniu akcentu: to propozycja w kolumnie rozmowy, a nie druga wyniesiona
   karta obok wyceny w szynie (CLAUDE.md §2, wyniesienie niesie temat okna). */
const Card = styled.section<{ $compact: boolean }>`
    display: flex;
    gap: 12px;
    padding: ${p => (p.$compact ? '12px' : '14px 16px')};
    border: 1px solid ${ix.accentLine};
    border-radius: 14px;
    background: ${ix.accentTint};
`;

const Tile = styled.span`
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: #ffffff;
    color: ${ix.accentInk};

    svg { width: 16px; height: 16px; }
`;

const Body = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Title = styled.p`
    margin: 0;
    font-size: 14.5px;
    font-weight: 650;
    line-height: 1.35;
    color: ${ix.ink};
`;

const Preview = styled.p<{ $lines: number }>`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.45;
    color: ${ix.text2};
    display: -webkit-box;
    -webkit-line-clamp: ${p => p.$lines};
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: #b45309;
`;

const Actions = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    margin-top: 8px;
`;

const More = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: ${ix.accentInk};
    cursor: pointer;

    svg { width: 14px; height: 14px; }
    &:hover { text-decoration: underline; }
`;
