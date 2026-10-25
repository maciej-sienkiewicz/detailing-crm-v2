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
import { useQueryClient } from '@tanstack/react-query';
import { Button, Panel, SectionTitle, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { pluralPl } from '@/common/utils/plural';
import { SettingSwitchRow } from '@/modules/settings/components/SettingSwitchRow';
import { setBaysEnabled, useBaysEnabled } from '../featureFlag';
import { useBaysMutation, useBaysSnapshot, BAYS_KEY } from '../hooks/useBays';
import { baysApi } from '../api/baysApi';
import { formatMinutes, longestDay } from '../utils/slots';
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

export function BaysSettingsSection() {
    const enabled = useBaysEnabled();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();
    const { data: snap } = useBaysSnapshot();
    const saveSetup = useBaysMutation(baysApi.saveSetup);
    const [editing, setEditing] = useState(false);

    const toggle = (next: boolean) => {
        setBaysEnabled(next);
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
                    hint="Tablica hali (gdzie stoi każde auto) i plan tygodnia po stanowiskach. Wyłącz, jeśli nie dzielicie warsztatu na stanowiska."
                    checked={enabled}
                    onChange={toggle}
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

            {editing && snap && (
                <BaysSettingsDrawer
                    bays={snap.bays}
                    settings={snap.settings}
                    people={snap.people}
                    onClose={() => setEditing(false)}
                    onSave={async (bays, settings) => { await saveSetup.mutateAsync([bays, settings]); setEditing(false); showSuccess('Stanowiska zapisane'); }}
                    onReset={async () => { await baysApi.reset(); await queryClient.invalidateQueries({ queryKey: BAYS_KEY }); setEditing(false); }}
                />
            )}
        </Stack>
    );
}
