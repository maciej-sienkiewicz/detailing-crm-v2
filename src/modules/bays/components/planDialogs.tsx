// src/modules/bays/components/planDialogs.tsx
//
// Okna planu: „Do kiedy?" (dotyk nie zaznacza przeciągnięciem) i „Ten czas jest
// zajęty" (nałożenie planu jest dozwolone, ale nigdy ciche).

import { useState } from 'react';
import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { Button, ChoiceCard, ChoiceList, Notice, ui } from '@/common/components/ui';
import type { BaysSnapshot } from '../types';
import { cellsFrom, durationLabel, rangeText, workMinutes, type Cell } from '../utils/slots';
import type { WeekBar } from '../utils/weekLayout';
import { Plate } from './primitives';

const Body = styled(ModalContent)`
    gap: 14px;
    @media (max-width: 640px) { padding: 18px 16px; }
`;

const Footer = styled(ModalFooter)`
    @media (max-width: 640px) {
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
        > button { flex: 1 1 0; }
    }
`;

const Hits = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: ${ui.inkSoft}; }
`;

/**
 * Długość planu po dotknięciu wolnego okienka. Opcje to kolejne okienka TEGO
 * stanowiska: na myjni co półtorej godziny, na podnośniku co pół dnia.
 */
export function DurationDialog({ bayName, from, slotsPerDay, now, onClose, onConfirm }: {
    bayName: string;
    from: Cell;
    slotsPerDay: number;
    now: Date;
    onClose: () => void;
    onConfirm: (end: Date) => void;
}) {
    const max = Math.min(6, Math.max(3, slotsPerDay * 2));
    const cells = cellsFrom(from, max, slotsPerDay);
    const options = cells.map((c, i) => ({ count: i + 1, end: c.end, minutes: workMinutes(from.start, c.end) }));
    const [count, setCount] = useState(Math.min(2, options.length));
    const chosen = options.find(o => o.count === count) ?? options[0];
    return (
        <ModalShell isOpen onClose={onClose} size="sm" labelledBy="bay-duration-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="bay-duration-title">Do kiedy?</ModalTitle>
                    <ModalSubtitle>{bayName}, od {rangeText(from.start, from.end, now).split('–')[0]}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <Body>
                <ChoiceList role="radiogroup" aria-label="Długość">
                    {options.map(o => (
                        <ChoiceCard
                            key={o.count}
                            type="radio"
                            name="len"
                            checked={o.count === count}
                            onChange={() => setCount(o.count)}
                            title={durationLabel(o.minutes)}
                            detail={rangeText(from.start, o.end, now)}
                        />
                    ))}
                </ChoiceList>
            </Body>
            <Footer>
                <Button variant="outline" size="lg" onClick={onClose}>Anuluj</Button>
                <Button variant="primary" size="lg" onClick={() => onConfirm(chosen.end)}>Dalej: rezerwacja</Button>
            </Footer>
        </ModalShell>
    );
}

/**
 * Nałożenie w planie. Trzy wyjścia: wolne stanowisko w tym samym czasie (jeśli jest),
 * zostawić oba (świadomy konflikt), albo zrezygnować.
 */
export function OverlapDialog({ snap, bayId, start, end, now, hits, confirmLabel, onClose, onConfirm, onUseBay }: {
    snap: BaysSnapshot;
    bayId: string;
    start: Date;
    end: Date;
    now: Date;
    hits: WeekBar[];
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void;
    onUseBay: (bayId: string) => void;
}) {
    const bay = snap.bays.find(b => b.id === bayId);
    const s = start.toISOString();
    const e = end.toISOString();
    // Wolne w całym przedziale: żaden plan nie nachodzi, a auto stojące TERAZ liczy się
    // tylko wtedy, gdy przedział obejmuje teraz.
    const freeBay = snap.bays.find(b => b.active && b.id !== bayId
        && !snap.bookings.some(k => k.bayId === b.id && k.start < e && k.end > s)
        && !(start <= now && snap.stints.some(x => x.bayId === b.id && x.endedAt === null)));
    return (
        <ModalShell isOpen onClose={onClose} size="sm" labelledBy="bay-overlap-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="bay-overlap-title">Ten czas jest zajęty</ModalTitle>
                    <ModalSubtitle>{bay?.name}, {rangeText(start, end, now)}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <Body>
                <Hits>
                    {hits.map(h => (
                        <li key={h.id}><Plate $size="sm">{h.car.licensePlate}</Plate>{h.car.jobTitle}</li>
                    ))}
                </Hits>
                <Notice tone="warn">
                    Oba auta zostaną w planie tego stanowiska. Pasek będzie oznaczony, dopóki ktoś tego nie rozwiąże.
                </Notice>
                {freeBay && (
                    <Notice
                        tone="info"
                        title={`${freeBay.name} jest wolne w tym czasie`}
                        action={<Button variant="tinted" size="sm" onClick={() => onUseBay(freeBay.id)}>Użyj: {freeBay.name}</Button>}
                    />
                )}
            </Body>
            <Footer>
                <Button variant="outline" size="lg" onClick={onClose}>Anuluj</Button>
                <Button variant="primary" size="lg" onClick={onConfirm}>{confirmLabel}</Button>
            </Footer>
        </ModalShell>
    );
}
