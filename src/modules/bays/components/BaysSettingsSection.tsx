// src/modules/bays/components/BaysSettingsSection.tsx
//
// Ustawienia → Stanowiska. Najpierw decyzja „czy w ogóle korzystamy ze stanowisk",
// potem - dopiero gdy tak - lista stanowisk i ich podział dnia. Ten sam układ co
// „Karta wizyty": panel, tytuł sekcji, wiersz z przełącznikiem.
//
// Wyłączenie niczego nie kasuje: stanowiska, plan i historia czekają, a znikają tylko
// pozycja w menu i pasek „Na hali" w wizycie.

import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Button, Panel, SectionTitle, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { pluralPl } from '@/common/utils/plural';
import { SettingSwitchRow } from '@/modules/settings/components/SettingSwitchRow';
import { useBaysSettings, useStudioHours } from '../featureFlag';
import { useBaysMutation, useBaysSnapshot } from '../hooks/useBays';
import { baysApi } from '../api/baysApi';
import { formatMinutes, longestDay, type StudioHours } from '../utils/slots';
import { BaysSettingsDrawer } from './BaysSettingsDrawer';

const Body = styled(Panel)`
    padding: 18px 20px 4px;

    @media (max-width: 767px) { padding: 16px 16px 2px; }
`;

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const PanelHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

const List = styled.ul`
    margin: 12px 0 16px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
`;

const Row = styled.li<{ $off: boolean }>`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    border-top: 1px solid ${ui.lineFaint};
    opacity: ${p => (p.$off ? 0.55 : 1)};

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 13px; color: ${ui.textSecondary}; text-align: right; }
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

/** „Pół dnia" / „Co 1 h 30 min, 2 auta naraz". Rodzaj zwykle powtarza nazwę - jest w edycji. */
const describe = (n: number, capacity: number, active: boolean) => {
    const slots = n === 1 ? 'Cały dzień' : n === 2 ? 'Pół dnia' : `Co ${formatMinutes(Math.round(longestDay() / n))}`;
    const parts = [slots, capacity > 1 ? `${capacity} ${pluralPl(capacity, 'auto', 'auta', 'aut')} naraz` : null, active ? null : 'wyłączone'];
    return parts.filter(Boolean).join(', ');
};

const clock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

/** „6:00–20:00" dla dni roboczych i soboty, osobne wiersze - dwa niezależne fakty. */
const hoursRows = (h: StudioHours) => [
    { day: 'Poniedziałek–piątek', text: `${clock(h.dayOpens)}–${clock(h.dayCloses)}` },
    { day: 'Sobota', text: h.saturdayOpens != null && h.saturdayCloses != null ? `${clock(h.saturdayOpens)}–${clock(h.saturdayCloses)}` : 'zamknięte' },
    { day: 'Niedziela', text: h.sundayOpens != null && h.sundayCloses != null ? `${clock(h.sundayOpens)}–${clock(h.sundayCloses)}` : 'zamknięte' },
];

export function BaysSettingsSection() {
    const { data: settings } = useBaysSettings();
    useStudioHours();
    // Stan nieznany (wczytywanie) - przełącznika nie ma, zamiast udawanego „wyłączone".
    const enabled = settings?.enabled;
    const navigate = useNavigate();
    const { showSuccess } = useToast();
    const { data: snap } = useBaysSnapshot(undefined, enabled === true);
    const saveSetup = useBaysMutation(baysApi.saveSetup);
    const [editing, setEditing] = useState(false);

    const toggle = async (next: boolean) => {
        await saveSetup.mutateAsync([{ enabled: next }]);
        showSuccess(
            next ? 'Stanowiska włączone' : 'Stanowiska wyłączone',
            next ? 'Pozycja „Stanowiska” jest w menu, a w wizycie pasek „Na hali”.' : 'Plan i historia zostają zapisane.',
        );
    };

    return (
        <Stack>
            {/* Bez tytułu panelu: nad nim stoi już nagłówek sekcji „Stanowiska”. */}
            <Body aria-label="Korzystanie ze stanowisk">
                <SettingSwitchRow
                    label="Korzystaj ze stanowisk"
                    hint="Plan tygodnia po stanowiskach i pasek „Na hali” w wizycie. Wyłącz, jeśli nie dzielicie warsztatu na stanowiska."
                    checked={enabled}
                    disabled={saveSetup.isPending}
                    onChange={next => void toggle(next)}
                />
            </Body>

            {enabled && snap && (
                <Body aria-labelledby="bays-list-title">
                    <PanelHead>
                        <SectionTitle as="h3" id="bays-list-title" count={snap.bays.length}>Lista stanowisk</SectionTitle>
                        <Actions>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/bays')}>Otwórz stanowiska</Button>
                            <Button variant="tinted" size="sm" onClick={() => setEditing(true)}>Zmień</Button>
                        </Actions>
                    </PanelHead>
                    <List>
                        {snap.bays.map(b => (
                            <Row key={b.id} $off={!b.active}>
                                <strong>{b.name}</strong>
                                <span>{describe(b.slotsPerDay, b.capacity, b.active)}</span>
                            </Row>
                        ))}
                    </List>
                </Body>
            )}

            {enabled && snap && typeof snap.settings.dayOpens === 'number' && (
                <Body aria-labelledby="bays-hours-title">
                    <PanelHead>
                        <SectionTitle as="h3" id="bays-hours-title">Godziny hali</SectionTitle>
                        <Actions>
                            <Button variant="tinted" size="sm" onClick={() => setEditing(true)}>Zmień</Button>
                        </Actions>
                    </PanelHead>
                    <List>
                        {hoursRows(snap.settings).map(r => (
                            <Row key={r.day} $off={false}>
                                <strong>{r.day}</strong>
                                <span>{r.text}</span>
                            </Row>
                        ))}
                    </List>
                </Body>
            )}

            {editing && snap && (
                <BaysSettingsDrawer
                    bays={snap.bays}
                    settings={snap.settings}
                    people={snap.people}
                    onClose={() => setEditing(false)}
                    onSave={async (bays, next) => { await saveSetup.mutateAsync([next, bays]); setEditing(false); }}
                />
            )}
        </Stack>
    );
}
