import React, { useState } from 'react';
import styled from 'styled-components';
import { Star, Check, Trash2, Ban, Plus, UserRound } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { Button, DrawerBody, SideDrawer, StatusPill, ui } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import type { InstagramProfile } from '../types';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useProfileActions } from '../hooks/useProfileActions';
import { SuggestionsSection } from './SuggestionsSection';
import { PHONE } from '../utils/phone';

/**
 * Obserwowane profile: Twój profil i konkurenci. Wszyscy konkurenci liczą się tak samo -
 * do mediany, rankingu i Inspiracji (decyzja biznesu: bez podziału na „z okolicy" i „wzorce").
 *
 * Twój profil stoi na górze i, dopóki go nie ma, jest jedynym wypełnionym przyciskiem w oknie:
 * bez niego Przegląd nie policzy planu ani przyrostu. Wcześniej trzeba było dodać własne konto
 * jak konkurenta i znaleźć przy nim gwiazdkę - nikt nie wiedział, że tak to działa.
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

    /* Ten sam promień co wiersze sugestii pod spodem - na telefonie stoją jedne pod drugimi. */
    ${PHONE} { border-radius: ${ui.radiusStrip}; }
`;

const RowTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    strong { font-size: 14px; color: ${ui.ink}; overflow-wrap: anywhere; }
`;


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

const SelfPrompt = styled.div`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px;
    border: 1px solid ${ui.brandLineSoft};
    border-radius: ${ui.radiusRow};
    background: ${ui.brandTint};

    > svg { width: 20px; height: 20px; color: ${ui.brandInk}; flex-shrink: 0; margin-top: 2px; }

    > div { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    strong { font-size: 14px; color: ${ui.ink}; }
    p { margin: 0; font-size: 13px; line-height: 1.45; color: ${ui.textSecondary}; }
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

export const ProfilesDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    onAddProfile: () => void;
    onAddSelf: () => void;
}> = ({ open, onClose, onAddProfile, onAddSelf }) => {
    const { user } = useAuth();
    const isManagerOrOwner = user?.role === 'MANAGER' || user?.role === 'OWNER';
    const isDesktop = useBreakpoint('md');

    const { profiles, isLoading } = useInstagramProfiles();
    const { approveProfile, rejectProfile, removeProfile, markSelf } = useProfileActions();
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    if (!open) return null;

    const byName = (a: InstagramProfile, b: InstagramProfile) => a.username.localeCompare(b.username);
    const active = profiles.filter(p => p.status === 'ACTIVE');
    const self = active.filter(p => p.isSelf);
    const competitors = active.filter(p => !p.isSelf).sort(byName);
    const pending = profiles.filter(p => p.status === 'PENDING_APPROVAL').sort(byName);
    const rejected = profiles.filter(p => p.status === 'REJECTED').sort(byName);

    const renderRow = (profile: InstagramProfile) => (
        <Row key={profile.id}>
            <RowTop>
                <strong>@{profile.username}</strong>
                {profile.isSelf && <StatusPill $tone="info" $size="sm">Ty</StatusPill>}
                {profile.status === 'PENDING_APPROVAL' && <StatusPill $tone="warn" $size="sm">Czeka na akceptację</StatusPill>}
                {profile.status === 'REJECTED' && <StatusPill $tone="danger" $size="sm">Odrzucony</StatusPill>}
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
                            title={profile.isSelf
                                ? 'Przenieś do konkurentów'
                                : 'To konto Twojego studia - porównamy z nim konkurentów'}
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

                <Group>
                    <GroupHead><h3>Twój profil</h3></GroupHead>
                    {self.length > 0 ? self.map(renderRow) : !isLoading && (
                        <SelfPrompt>
                            <UserRound aria-hidden="true" />
                            <div>
                                <strong>Dodaj konto swojego studia</strong>
                                <p>
                                    Wpisz nazwę swojego profilu na Instagramie. Porównamy go z konkurentami
                                    i policzymy plan publikacji w Przeglądzie.
                                </p>
                                {competitors.length > 0 && (
                                    <p>
                                        Twój profil jest już niżej, wśród konkurentów?{' '}
                                        {isDesktop ? 'Kliknij' : 'Dotknij'} przy nim „To mój profil”.
                                    </p>
                                )}
                                <Actions>
                                    <Button size="sm" variant="primary" onClick={onAddSelf}>
                                        <UserRound size={14} /> Dodaj swój profil
                                    </Button>
                                </Actions>
                            </div>
                        </SelfPrompt>
                    )}
                </Group>

                {pending.length > 0 && (
                    <Group>
                        <GroupHead><h3>Czekają na akceptację</h3><span>{pending.length}</span></GroupHead>
                        {pending.map(renderRow)}
                    </Group>
                )}

                <Group>
                    <GroupHead>
                        <h3>Konkurenci</h3>
                        {competitors.length > 0 && <span>{competitors.length}</span>}
                    </GroupHead>
                    {competitors.map(renderRow)}
                    {competitors.length === 0 && !isLoading && (
                        <Note>Dodaj 3-5 studiów, z którymi chcesz się porównywać.</Note>
                    )}
                    <Actions>
                        <Button size="sm" variant="outline" onClick={onAddProfile}>
                            <Plus size={14} /> Dodaj konkurenta
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
