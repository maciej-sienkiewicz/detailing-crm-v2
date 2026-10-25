// src/modules/bays/components/BaysSettingsDrawer.tsx
//
// Ustawienia stanowisk - w panelu bocznym widoku, nie w zakładce Ustawień: mniej
// wpięć w resztę aplikacji, a kto ustawia stanowiska, patrzy w tej chwili na halę.
//
// Pola i przełączniki są tymi samymi klockami co w reszcie CRM (InputShell, Toggle,
// FieldLabel) - surowe <input> i pola wyboru wyglądały jak inna aplikacja.
//
// Zapis ludzi jest WYŁĄCZONY domyślnie: małe studio nie dzieli pracy na osoby.
// Gdy jest włączony, osoba przy stanowisku jest tylko PODPOWIEDZIĄ przy wjeździe -
// ludzi przypisuje się do odcinka pracy, bo przy jednym aucie pracują dwie osoby,
// a jeden mechanik chodzi między podnośnikami.

import { useState } from 'react';
import styled from 'styled-components';
import { Plus, Trash2 } from 'lucide-react';
import { Button, DrawerBody, IconButton, SectionTitle, SideDrawer, ui } from '@/common/components/ui';
import { FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { pluralPl } from '@/common/utils/plural';
import type { Bay, BayKind, BayPerson, BaysSettings } from '../types';
import { KIND_LABEL } from '../utils/labels';
import { SLOT_OPTIONS, formatMinutes, longestDay } from '../utils/slots';

/** „Co 1 h 30 min". Krótkie prace (myjnia) dziel drobniej, długie grubiej. */
const slotOptionLabel = (n: number) =>
    n === 1 ? 'Cały dzień' : n === 2 ? 'Pół dnia' : `Co ${formatMinutes(Math.round(longestDay() / n))}`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

/* Wiersz ustawienia: opis po lewej, przełącznik po prawej - jak „Ustawienia pól" w przyjęciu. */
const SettingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};

    label { font-size: 14px; font-weight: 600; color: ${ui.ink}; cursor: pointer; }
    p { margin: 2px 0 0; font-size: 12.5px; line-height: 1.45; color: ${ui.textMuted}; }
`;

const List = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
`;

const Item = styled.div<{ $off: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;

    & + & { border-top: 1px solid ${ui.lineSoft}; }

    /* Stanowisko wyłączone: zostaje na liście, ale nie udaje aktywnego. */
    > div:last-child { opacity: ${p => (p.$off ? 0.55 : 1)}; }
`;

const ItemHead = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;

    > div:first-child { flex: 1; min-width: 0; }
`;

/* Podpis przełącznika w skali pól (13 px), nie w skali Toggle'a z formularzy pełnoekranowych. */
const ActiveSwitch = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    label { font-size: 13px; font-weight: 600; color: ${ui.textSecondary}; cursor: pointer; }
`;

const Fields = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 560px) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

/* Natywny select w powłoce pola: ten sam obrys i fokus co pola tekstowe. */
const BareSelect = styled.select`
    width: 100%;
    min-width: 0;
    padding: 8px 28px 8px 10px;
    border: none;
    border-radius: 8px;
    background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
    appearance: none;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.ink};
    cursor: pointer;

    &:focus { outline: none; }
`;

const Footnote = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

interface Props {
    bays: Bay[];
    settings: BaysSettings;
    people: BayPerson[];
    onClose: () => void;
    onSave: (bays: Bay[], settings: BaysSettings) => Promise<void>;
    onReset: () => void;
}

export function BaysSettingsDrawer({ bays, settings, people, onClose, onSave, onReset }: Props) {
    const [draft, setDraft] = useState<Bay[]>(bays);
    const [trackPeople, setTrackPeople] = useState(settings.trackPeople);
    const [saving, setSaving] = useState(false);
    const patch = (id: string, change: Partial<Bay>) => setDraft(d => d.map(b => (b.id === id ? { ...b, ...change } : b)));

    const select = (id: string, label: string, value: string | number, options: { value: string | number; label: string }[], onChange: (v: string) => void) => (
        <Field>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputShell $compact>
                <BareSelect id={id} value={value} onChange={e => onChange(e.target.value)}>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </BareSelect>
            </InputShell>
        </Field>
    );

    return (
        <SideDrawer
            onClose={onClose}
            title="Stanowiska"
            titleId="bays-settings-title"
            subtitle="Miejsca, w których stoi auto, i jak dzielić ich dzień w planie"
            width={620}
            footer={(
                <>
                    <Button variant="outline" size="lg" onClick={onClose} style={{ marginLeft: 'auto' }}>Anuluj</Button>
                    <Button variant="primary" size="lg" disabled={saving || draft.some(b => !b.name.trim())}
                        onClick={async () => { setSaving(true); await onSave(draft, { trackPeople }); setSaving(false); }}>Zapisz</Button>
                </>
            )}
        >
            <DrawerBody>
                <Section>
                    <SettingRow>
                        <div>
                            <label htmlFor="bays-track-people">Zapisuj, kto pracuje przy aucie</label>
                            <p>Pytanie przy wjeździe i inicjały na kartach. Zostaw wyłączone, jeśli nie dzielicie pracy na osoby.</p>
                        </div>
                        <Toggle inputId="bays-track-people" size="sm" checked={trackPeople} onChange={setTrackPeople} ariaLabel="Zapisuj, kto pracuje przy aucie" />
                    </SettingRow>
                </Section>

                <Section>
                    <SectionTitle as="h3" count={draft.length}>Lista stanowisk</SectionTitle>
                    <List>
                        {draft.map(b => (
                            <Item key={b.id} $off={!b.active}>
                                <ItemHead>
                                    <InputShell $compact>
                                        <BareInput $compact aria-label="Nazwa stanowiska" value={b.name} onChange={e => patch(b.id, { name: e.target.value })} />
                                    </InputShell>
                                    <ActiveSwitch>
                                        <label htmlFor={`bay-active-${b.id}`}>Aktywne</label>
                                        <Toggle inputId={`bay-active-${b.id}`} size="sm" checked={b.active} onChange={v => patch(b.id, { active: v })} ariaLabel={`${b.name}: pokazuj na tablicy i w planie`} />
                                    </ActiveSwitch>
                                    <IconButton label={`Usuń ${b.name}`} variant="ghost" onClick={() => setDraft(d => d.filter(x => x.id !== b.id))}>
                                        <Trash2 />
                                    </IconButton>
                                </ItemHead>
                                <Fields>
                                    {select(`bay-kind-${b.id}`, 'Rodzaj', b.kind,
                                        Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })),
                                        v => patch(b.id, { kind: v as BayKind }))}
                                    {select(`bay-slots-${b.id}`, 'Podział dnia', b.slotsPerDay,
                                        SLOT_OPTIONS.map(n => ({ value: n, label: slotOptionLabel(n) })),
                                        v => patch(b.id, { slotsPerDay: Number(v) }))}
                                    {select(`bay-cap-${b.id}`, 'Ile aut naraz', b.capacity,
                                        [1, 2, 3, 4].map(n => ({ value: n, label: `${n} ${pluralPl(n, 'auto', 'auta', 'aut')}` })),
                                        v => patch(b.id, { capacity: Number(v) }))}
                                    {trackPeople && select(`bay-person-${b.id}`, 'Podpowiedź osoby', b.defaultPersonId ?? '',
                                        [{ value: '', label: 'Brak' }, ...people.map(p => ({ value: p.id, label: p.name }))],
                                        v => patch(b.id, { defaultPersonId: v || null }))}
                                </Fields>
                            </Item>
                        ))}
                    </List>
                    <Footnote>
                        <Button
                            variant="tinted"
                            onClick={() => setDraft(d => [...d, { id: `b-${Date.now()}`, name: `Stanowisko ${d.length + 1}`, kind: 'WORK_AREA', capacity: 1, slotsPerDay: 2, defaultPersonId: null, active: true }])}
                        >
                            <Plus aria-hidden="true" />Dodaj stanowisko
                        </Button>
                        {/* Tylko prototyp: dane przykładowe żyją w przeglądarce. */}
                        <Button variant="ghost" size="sm" onClick={onReset}>Przywróć dane przykładowe</Button>
                    </Footnote>
                </Section>
            </DrawerBody>
        </SideDrawer>
    );
}
