// src/modules/bays/components/dialogs.tsx
//
// Okna hali. Wszystkie stoją na ModalShell (blokada scrolla w cenie, CLAUDE.md §3)
// i każde ma jeden wypełniony przycisk - otwarte okno przejmuje ekran, więc jego
// „Zatwierdź" jest krokiem następnym (wyjątek otwartego edytora, CLAUDE.md §2).
//
// Zasada, która spina te okna: system NIGDY nie nadpisuje po cichu. Auto na zajętym
// stanowisku to pytanie „co z tym, które już tam stoi?", a nie komunikat o błędzie.

import { useState } from 'react';
import styled from 'styled-components';
import { Clock, PackageSearch, ParkingSquare, UserRoundCheck, ArrowRightLeft } from 'lucide-react';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { Button, ChoiceCard, ChoiceList, Notice, Segmented, ui } from '@/common/components/ui';
import { formatClockTime } from '@/common/dateTime';
import type { Bay, BayPerson, BayStint, BaysSnapshot } from '../types';
import type { CarView } from '../utils/boardState';
import { Avatar, Plate } from './primitives';

const Body = styled(ModalContent)`
    gap: 16px;

    @media (max-width: 640px) { padding: 18px 16px; }
`;

const Footer = styled(ModalFooter)`
    @media (max-width: 640px) {
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
        > button { flex: 1 1 0; }
    }
`;

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const GroupTitle = styled.div`
    font-size: 13.5px;
    font-weight: 700;
    color: ${ui.ink};
`;

const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const PersonChip = styled.button<{ $on: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px 0 4px;
    border-radius: ${ui.radiusPill};
    border: 1px solid ${p => (p.$on ? ui.brandLine : ui.line)};
    background: ${p => (p.$on ? ui.brandTint : ui.surface)};
    color: ${p => (p.$on ? ui.brandDeep : ui.inkSoft)};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { height: 44px; }
`;

const NoteInput = styled.input`
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    font-family: inherit;
    font-size: 14px;
    color: ${ui.ink};

    &:focus { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; border-color: ${ui.brandLine}; }
`;

const SubjectLine = styled.span`
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 10px;
`;

interface ShellProps {
    titleId: string;
    title: string;
    plate: string;
    job: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
}

function Shell({ titleId, title, plate, job, onClose, children, footer }: ShellProps) {
    return (
        <ModalShell isOpen onClose={onClose} size="sm" labelledBy={titleId}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id={titleId}>{title}</ModalTitle>
                    <ModalSubtitle><SubjectLine><Plate $size="sm">{plate}</Plate><span>{job}</span></SubjectLine></ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <Body>{children}</Body>
            <Footer>{footer}</Footer>
        </ModalShell>
    );
}

export function PeoplePicker({ people, value, onChange }: { people: BayPerson[]; value: string[]; onChange: (ids: string[]) => void }) {
    return (
        <ChipRow role="group" aria-label="Kto pracuje">
            {people.map(p => {
                const on = value.includes(p.id);
                return (
                    <PersonChip
                        key={p.id}
                        type="button"
                        $on={on}
                        aria-pressed={on}
                        onClick={() => onChange(on ? value.filter(x => x !== p.id) : [...value, p.id])}
                    >
                        <Avatar person={p} size={30} />
                        {p.name}
                    </PersonChip>
                );
            })}
        </ChipRow>
    );
}

/** Kto stoi na stanowisku - zdaniem, z godziną wjazdu. */
const occupantSentence = (snap: BaysSnapshot, bay: Bay, occupants: BayStint[]): string => {
    const parts = occupants.map(o => {
        const car = snap.cars.find(c => c.id === o.carId);
        return `${car?.licensePlate ?? 'auto'} od ${formatClockTime(o.startedAt)}`;
    });
    return `Na stanowisku ${bay.name} stoi ${parts.join(' i ')}.`;
};

/*
 * Stanowiska jako kafelki, nie lista rozwijana: przy 2-8 stanowiskach jeden dotyk
 * zamiast dwóch, a od razu widać, które jest wolne - w zamkniętym selekcie tego nie
 * widać, a właśnie to decyduje o wyborze. Przy kilkunastu stanowiskach kafelki
 * nadal się mieszczą (dwie kolumny na telefonie).
 */
const Tiles = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
`;

const Tile = styled.button<{ $on: boolean; $busy: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-height: 56px;
    padding: 9px 12px;
    border-radius: ${ui.radiusRow};
    border: 1px solid ${p => (p.$on ? ui.brand : ui.line)};
    box-shadow: ${p => (p.$on ? `inset 0 0 0 1px ${ui.brand}` : 'none')};
    background: ${p => (p.$on ? ui.brandTint : ui.surface)};
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 12.5px; color: ${p => (p.$busy ? ui.warnInk : ui.textMuted)}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

interface PickerProps {
    view: CarView;
    snap: BaysSnapshot;
    /** Stanowisko z planu - zaznaczone od razu. */
    suggestedBayId?: string | null;
    /** Z przeciągnięcia: wybór już jest, okno od razu pyta o zajęte stanowisko. */
    initialBayId?: string | null;
    title?: string;
    onClose: () => void;
    onConfirm: (bayId: string, personIds: string[], evict: { carId: string; how: 'yard' | 'done' } | null) => void;
    busy?: boolean;
}

/**
 * Wjazd na stanowisko: GDZIE (plan zaznaczony od razu), a jeśli miejsce jest zajęte -
 * CO Z TYM, KTÓRE TAM STOI. „Kto pracuje" tylko w firmach, które to zapisują.
 */
export function BayPickerDialog({ view, snap, suggestedBayId, initialBayId, title = 'Wjazd na stanowisko', onClose, onConfirm, busy }: PickerProps) {
    const bays = snap.bays.filter(b => b.active);
    const occupantsOf = (bayId: string) => snap.stints.filter(s => s.bayId === bayId && s.endedAt === null && s.carId !== view.car.id);
    const firstFree = bays.find(b => occupantsOf(b.id).length < b.capacity);
    const track = snap.settings.trackPeople;

    const [bayId, setBayId] = useState<string>(initialBayId ?? suggestedBayId ?? firstFree?.id ?? bays[0]?.id ?? '');
    const bay = snap.bays.find(b => b.id === bayId);
    const [personIds, setPersonIds] = useState<string[]>(() => {
        const current = view.place.kind === 'bay' ? view.place.stint.personIds : [];
        return current.length ? current : bay?.defaultPersonId ? [bay.defaultPersonId] : [];
    });
    const [evictHow, setEvictHow] = useState<'yard' | 'done'>('yard');

    const occupants = bay ? occupantsOf(bay.id) : [];
    const full = !!bay && occupants.length >= bay.capacity;

    const pick = (id: string) => {
        setBayId(id);
        const b = snap.bays.find(x => x.id === id);
        // Osoba stanowiska podpowiada się tylko wtedy, gdy nikt jeszcze nie został wybrany.
        if (personIds.length === 0 && b?.defaultPersonId) setPersonIds([b.defaultPersonId]);
    };

    const canConfirm = !!bay && (!full || occupants.length === 1);

    return (
        <Shell
            titleId="bay-picker-title"
            title={title}
            plate={view.car.licensePlate}
            job={view.car.jobTitle}
            onClose={onClose}
            footer={(
                <>
                    <Button variant="outline" size="lg" onClick={onClose}>Anuluj</Button>
                    <Button
                        variant="primary"
                        size="lg"
                        disabled={!canConfirm || busy}
                        onClick={() => onConfirm(bayId, personIds, full ? { carId: occupants[0].carId, how: evictHow } : null)}
                    >
                        Zapisz wjazd
                    </Button>
                </>
            )}
        >
            <Tiles role="radiogroup" aria-label="Stanowisko">
                {bays.map(b => {
                    const occ = occupantsOf(b.id);
                    const isFull = occ.length >= b.capacity;
                    const plates = occ.map(o => snap.cars.find(c => c.id === o.carId)?.licensePlate).filter(Boolean).join(', ');
                    const state = isFull ? plates : occ.length ? `wolne miejsce, stoi ${plates}` : b.id === suggestedBayId ? 'wolne, w planie' : 'wolne';
                    return (
                        <Tile key={b.id} type="button" role="radio" aria-checked={b.id === bayId} $on={b.id === bayId} $busy={isFull} onClick={() => pick(b.id)}>
                            <strong>{b.name}</strong>
                            <span>{state}</span>
                        </Tile>
                    );
                })}
            </Tiles>

            {full && bay && (
                <Group>
                    <Notice tone="warn">
                        {occupantSentence(snap, bay, occupants)}
                        {occupants.length === 1 ? ' Co z nim?' : ' Zwolnij je na tablicy albo wybierz inne.'}
                    </Notice>
                    {occupants.length === 1 && (
                        <Segmented
                            label="Co z autem, które stoi na stanowisku"
                            block
                            value={evictHow}
                            onChange={setEvictHow}
                            options={[{ value: 'yard', label: 'Zjeżdża, czeka na przypisanie' }, { value: 'done', label: 'Skończone' }]}
                        />
                    )}
                </Group>
            )}

            {track && (
                <Group>
                    <GroupTitle>Kto pracuje</GroupTitle>
                    <PeoplePicker people={snap.people} value={personIds} onChange={setPersonIds} />
                </Group>
            )}
        </Shell>
    );
}

export type FinishChoice = 'ready' | 'yard' | 'move';

/** „Skończone": dokąd auto jedzie dalej. Wydanie zmienia status wizyty - mówimy to wprost. */
export function FinishDialog({ view, onClose, onConfirm, busy }: {
    view: CarView;
    onClose: () => void;
    onConfirm: (choice: FinishChoice) => void;
    busy?: boolean;
}) {
    const [choice, setChoice] = useState<FinishChoice>('ready');
    return (
        <Shell
            titleId="bay-finish-title"
            title="Praca skończona"
            plate={view.car.licensePlate}
            job={view.car.jobTitle}
            onClose={onClose}
            footer={(
                <>
                    <Button variant="outline" size="lg" onClick={onClose}>Anuluj</Button>
                    <Button variant="primary" size="lg" disabled={busy} onClick={() => onConfirm(choice)}>Zatwierdź</Button>
                </>
            )}
        >
            <ChoiceList role="radiogroup" aria-label="Co dalej z autem">
                <ChoiceCard type="radio" name="finish" checked={choice === 'ready'} onChange={() => setChoice('ready')}
                    icon={<UserRoundCheck />} title="Gotowe do wydania" detail="Wizyta przejdzie w Gotowe do odbioru" />
                <ChoiceCard type="radio" name="finish" checked={choice === 'move'} onChange={() => setChoice('move')}
                    icon={<ArrowRightLeft />} title="Na inne stanowisko" detail="Na przykład na myjnię" />
                <ChoiceCard type="radio" name="finish" checked={choice === 'yard'} onChange={() => setChoice('yard')}
                    icon={<ParkingSquare />} title="Czeka na przypisanie" detail="Zjeżdża ze stanowiska, praca będzie dalej" />
            </ChoiceList>
        </Shell>
    );
}

export type PauseReason = 'WAITING_PART' | 'WAITING_CUSTOMER';

/** „Wstrzymaj": auto zjeżdża na plac z powodem, który widać potem na tablicy. */
export function PauseDialog({ view, onClose, onConfirm, busy }: {
    view: CarView;
    onClose: () => void;
    onConfirm: (reason: PauseReason, note: string) => void;
    busy?: boolean;
}) {
    const [reason, setReason] = useState<PauseReason>('WAITING_PART');
    const [note, setNote] = useState('');
    return (
        <Shell
            titleId="bay-pause-title"
            title="Wstrzymaj pracę"
            plate={view.car.licensePlate}
            job={view.car.jobTitle}
            onClose={onClose}
            footer={(
                <>
                    <Button variant="outline" size="lg" onClick={onClose}>Anuluj</Button>
                    <Button variant="primary" size="lg" disabled={busy} onClick={() => onConfirm(reason, note.trim())}>Zjeżdża ze stanowiska</Button>
                </>
            )}
        >
            <ChoiceList role="radiogroup" aria-label="Na co czeka auto">
                <ChoiceCard type="radio" name="pause" checked={reason === 'WAITING_PART'} onChange={() => setReason('WAITING_PART')}
                    icon={<PackageSearch />} title="Czeka na część" />
                <ChoiceCard type="radio" name="pause" checked={reason === 'WAITING_CUSTOMER'} onChange={() => setReason('WAITING_CUSTOMER')}
                    icon={<Clock />} title="Czeka na decyzję klienta" />
            </ChoiceList>
            <Group>
                <GroupTitle as="label" htmlFor="bay-pause-note">Dopisek dla zespołu</GroupTitle>
                <NoteInput
                    id="bay-pause-note"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={reason === 'WAITING_PART' ? 'Na przykład: tarcze dojadą około 13:00' : 'Na przykład: dzwoniłem o 10:30'}
                />
            </Group>
        </Shell>
    );
}
