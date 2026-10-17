import React, { useState } from 'react';
import styled from 'styled-components';
import { Star, Check, Trash2, Ban, Plus } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { Button, DrawerBody, Segmented, SideDrawer, StatusPill, ui } from '@/common/components/ui';
import type { InstagramProfile, ProfileRole } from '../types';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useProfileActions } from '../hooks/useProfileActions';
import { SuggestionsSection } from './SuggestionsSection';

/**
 * Obserwowane profile w trzech grupach: Twój profil, Konkurenci z okolicy, Wzorce.
 *
 * Grupa to nie porządek, tylko ROLA: z lokalnymi studio się porównuje (mediana, ranking),
 * wzorce są wyłącznie źródłem pomysłów. Zanim rola istniała, jedno konto ogólnopolskie
 * w koszyku przesuwało wszystkie oceny lokalnego studia na „mniej niż typowo".
 */

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const GroupHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;

    h3 { margin: 0; font-size: 15px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 12px; color: ${ui.textMuted}; }
`;

const Row = styled.div`
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const RowTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    strong { font-size: 14px; color: ${ui.ink}; overflow-wrap: anywhere; }
`;

const Spacer = styled.span` margin-left: auto; `;

const Actions = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
`;

const Confirm = styled.div`
    border: 1px solid ${ui.dangerLine};
    background: ${ui.dangerTint};
    border-radius: ${ui.radiusRow};
    padding: 10px 12px;
    font-size: 13px;
    color: ${ui.ink};
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Note = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${ui.textMuted};
`;

const ErrorNote = styled.span`
    font-size: 12px;
    color: ${ui.dangerInk};
`;

const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
    { value: 'LOCAL', label: 'Z okolicy' },
    { value: 'INSPIRATION', label: 'Wzorzec' },
];

const roleOf = (profile: { role?: ProfileRole | null }): ProfileRole => profile.role ?? 'LOCAL';

export const ProfilesDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    onAddProfile: (role?: ProfileRole) => void;
}> = ({ open, onClose, onAddProfile }) => {
    const { user } = useAuth();
    const isManagerOrOwner = user?.role === 'MANAGER' || user?.role === 'OWNER';

    const { profiles, isLoading } = useInstagramProfiles();
    const { approveProfile, rejectProfile, removeProfile, markSelf, setRole } = useProfileActions();
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    if (!open) return null;

    const byName = (a: InstagramProfile, b: InstagramProfile) => a.username.localeCompare(b.username);
    const active = profiles.filter(p => p.status === 'ACTIVE');
    const self = active.filter(p => p.isSelf);
    const locals = active.filter(p => !p.isSelf && roleOf(p) === 'LOCAL').sort(byName);
    const inspirations = active.filter(p => !p.isSelf && roleOf(p) === 'INSPIRATION').sort(byName);
    const pending = profiles.filter(p => p.status === 'PENDING_APPROVAL').sort(byName);
    const rejected = profiles.filter(p => p.status === 'REJECTED').sort(byName);

    const renderRow = (profile: InstagramProfile) => (
        <Row key={profile.id}>
            <RowTop>
                <strong>@{profile.username}</strong>
                {profile.isSelf && <StatusPill $tone="info" $size="sm">Ty</StatusPill>}
                {profile.status === 'PENDING_APPROVAL' && <StatusPill $tone="warn" $size="sm">Czeka na akceptację</StatusPill>}
                {profile.status === 'REJECTED' && <StatusPill $tone="danger" $size="sm">Odrzucony</StatusPill>}
                <Spacer />
                {profile.status === 'ACTIVE' && !profile.isSelf && (
                    <Segmented
                        label={`Rola @${profile.username}`}
                        options={ROLE_OPTIONS}
                        value={roleOf(profile)}
                        onChange={role => setRole({ id: profile.id, role })}
                        size="sm"
                    />
                )}
            </RowTop>

            {profile.apiError && (
                <ErrorNote>Nie udało się pobrać danych. Sprawdź, czy nazwa profilu jest poprawna.</ErrorNote>
            )}

            {confirmRemoveId === profile.id ? (
                <Confirm>
                    Usunąć @{profile.username} z obserwowanych? Zniknie z porównań i kalendarzy.
                    <Actions>
                        <Button
                            size="sm"
                            variant="tintedDanger"
                            onClick={() => {
                                removeProfile(profile.id);
                                setConfirmRemoveId(null);
                            }}
                        >
                            <Trash2 size={14} /> Tak, usuń
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveId(null)}>Anuluj</Button>
                    </Actions>
                </Confirm>
            ) : (
                <Actions>
                    {profile.status === 'PENDING_APPROVAL' && isManagerOrOwner && (
                        <>
                            <Button size="sm" variant="tintedSuccess" onClick={() => approveProfile(profile.id)}>
                                <Check size={14} /> Zatwierdź
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => rejectProfile(profile.id)}>
                                <Ban size={14} /> Odrzuć
                            </Button>
                        </>
                    )}
                    {profile.status === 'ACTIVE' && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markSelf({ id: profile.id, isSelf: !profile.isSelf })}
                            title="Z Twoim profilem porównujemy lokalnych konkurentów"
                        >
                            <Star size={14} /> {profile.isSelf ? 'To nie mój profil' : 'To mój profil'}
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConfirmRemoveId(profile.id)}>
                        <Trash2 size={14} /> Usuń
                    </Button>
                </Actions>
            )}
        </Row>
    );

    return (
        <SideDrawer
            onClose={onClose}
            title="Obserwowane profile"
            titleId="instagram-profiles-drawer"
            width={480}
        >
            <DrawerBody>
                {isLoading && <Note>Wczytywanie…</Note>}

                {pending.length > 0 && (
                    <Group>
                        <GroupHead><h3>Czekają na akceptację</h3><span>{pending.length}</span></GroupHead>
                        {pending.map(renderRow)}
                    </Group>
                )}

                <Group>
                    <GroupHead><h3>Twój profil</h3></GroupHead>
                    {self.length > 0
                        ? self.map(renderRow)
                        : <Note>Oznacz gwiazdką swój profil, a porównamy go z lokalnymi konkurentami.</Note>}
                </Group>

                <Group>
                    <GroupHead>
                        <h3>Konkurenci z okolicy</h3>
                        <span>liczą się do mediany</span>
                    </GroupHead>
                    {locals.map(renderRow)}
                    {locals.length === 0 && !isLoading && <Note>Dodaj 3-5 studiów z Twojego miasta.</Note>}
                    <Actions>
                        <Button size="sm" variant="outline" onClick={() => onAddProfile('LOCAL')}>
                            <Plus size={14} /> Dodaj konkurenta
                        </Button>
                    </Actions>
                </Group>

                <Group>
                    <GroupHead>
                        <h3>Wzorce</h3>
                        <span>tylko do Inspiracji</span>
                    </GroupHead>
                    {inspirations.map(renderRow)}
                    {inspirations.length === 0 && !isLoading && (
                        <Note>Konta z innych miast, od których warto się uczyć. Nie wpływają na porównania.</Note>
                    )}
                    <Actions>
                        <Button size="sm" variant="outline" onClick={() => onAddProfile('INSPIRATION')}>
                            <Plus size={14} /> Dodaj wzorzec
                        </Button>
                    </Actions>
                </Group>

                {rejected.length > 0 && (
                    <Group>
                        <GroupHead><h3>Odrzucone</h3></GroupHead>
                        {rejected.map(renderRow)}
                    </Group>
                )}

                <SuggestionsSection />
            </DrawerBody>
        </SideDrawer>
    );
};
