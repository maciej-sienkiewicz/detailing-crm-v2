import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X, Star, Check, Trash2, Ban } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAuth } from '@/core/context/AuthContext';
import type { InstagramProfile } from '../types';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { useProfileActions } from '../hooks/useProfileActions';
import { SelfTag } from './MetricBits';
import { SuggestionsSection } from './SuggestionsSection';

/**
 * Panel zarządzania obserwowanymi profilami (drawer z prawej strony).
 * Tu mieszka moderacja (zatwierdź/odrzuć), oznaczanie własnego profilu
 * i usuwanie – z potwierdzeniem, bo kasuje dane analityczne.
 */

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    z-index: 90;
`;

const Panel = styled.aside`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(440px, 100vw);
    background: ${st.bg};
    box-shadow: ${st.shadowLg};
    z-index: 91;
    display: flex;
    flex-direction: column;
`;

const Head = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 22px;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};

    h2 { margin: 0; font-size: ${st.fontLg}; color: ${st.text}; }
`;

const CloseButton = styled.button`
    border: none;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusFull};
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${st.textSecondary};

    svg { width: 16px; height: 16px; }
`;

const Body = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const HintText = styled.p`
    margin: 0 0 6px;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    line-height: 1.55;
`;

const Row = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const RowTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    strong { font-size: ${st.fontMd}; color: ${st.text}; }
`;

const StatusBadge = styled.span<{ $status: InstagramProfile['status'] }>`
    margin-left: auto;
    font-size: ${st.fontXs};
    font-weight: 700;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    white-space: nowrap;
    background: ${p =>
        p.$status === 'ACTIVE' ? st.accentGreenDim : p.$status === 'PENDING_APPROVAL' ? st.accentAmberDim : st.accentRedDim};
    color: ${p =>
        p.$status === 'ACTIVE' ? st.accentGreen : p.$status === 'PENDING_APPROVAL' ? st.accentAmber : st.accentRed};
`;

const Actions = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const ActionBtn = styled.button<{ $tone?: 'green' | 'red' | 'blue' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${p => (p.$tone === 'green' ? st.accentGreen : p.$tone === 'red' ? st.accentRed : st.textSecondary)};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${p => (p.$tone === 'green' ? st.accentGreen : p.$tone === 'red' ? st.accentRed : st.accentBlue)};
    }

    svg { width: 12px; height: 12px; }
`;

const ConfirmBox = styled.div`
    background: ${st.accentRedDim};
    border-radius: ${st.radiusSm};
    padding: 10px 12px;
    font-size: ${st.fontSm};
    color: ${st.text};
    display: flex;
    flex-direction: column;
    gap: 8px;
    line-height: 1.5;
`;

const ApiErrorNote = styled.span`
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

export const ProfilesDrawer: React.FC<{
    open: boolean;
    onClose: () => void;
    onAddProfile: () => void;
}> = ({ open, onClose, onAddProfile }) => {
    const { user } = useAuth();
    const isManagerOrOwner = user?.role === 'MANAGER' || user?.role === 'OWNER';

    const { profiles, isLoading } = useInstagramProfiles();
    const { approveProfile, rejectProfile, removeProfile, markSelf } = useProfileActions();
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    if (!open) return null;

    const sorted = [...profiles].sort((a, b) => {
        const order = { PENDING_APPROVAL: 0, ACTIVE: 1, REJECTED: 2 } as const;
        return order[a.status] - order[b.status] || a.username.localeCompare(b.username);
    });

    return createPortal(
        <>
            <Overlay onClick={onClose} />
            <Panel>
                <Head>
                    <h2>Obserwowane profile</h2>
                    <CloseButton onClick={onClose} aria-label="Zamknij">
                        <X />
                    </CloseButton>
                </Head>
                <Body>
                    <HintText>
                        Dodaj 3–5 konkurentów z okolicy i oznacz gwiazdką własny profil – wtedy pokażemy
                        Twoje miejsce w rankingu.{' '}
                        <a href="#" onClick={e => { e.preventDefault(); onAddProfile(); }}>Dodaj profil</a>
                    </HintText>

                    {isLoading && <HintText>Wczytywanie…</HintText>}
                    {!isLoading && profiles.length === 0 && (
                        <HintText>Nie obserwujesz jeszcze żadnych profili.</HintText>
                    )}

                    {sorted.map(profile => (
                        <Row key={profile.id}>
                            <RowTop>
                                <strong>@{profile.username}</strong>
                                {profile.isSelf && <SelfTag><Star size={10} style={{ marginRight: 3 }} /> Ty</SelfTag>}
                                <StatusBadge $status={profile.status}>
                                    {profile.status === 'ACTIVE'
                                        ? 'Aktywny'
                                        : profile.status === 'PENDING_APPROVAL'
                                            ? 'Czeka na akceptację'
                                            : 'Odrzucony'}
                                </StatusBadge>
                            </RowTop>

                            {profile.apiError && (
                                <ApiErrorNote>
                                    Nie udało się pobrać danych tego profilu – sprawdź, czy nazwa jest poprawna.
                                </ApiErrorNote>
                            )}

                            {confirmRemoveId === profile.id ? (
                                <ConfirmBox>
                                    Usunąć @{profile.username} z obserwowanych? Zniknie z rankingów i wykresów.
                                    <Actions>
                                        <ActionBtn
                                            $tone="red"
                                            onClick={() => {
                                                removeProfile(profile.id);
                                                setConfirmRemoveId(null);
                                            }}
                                        >
                                            <Trash2 /> Tak, usuń
                                        </ActionBtn>
                                        <ActionBtn onClick={() => setConfirmRemoveId(null)}>Anuluj</ActionBtn>
                                    </Actions>
                                </ConfirmBox>
                            ) : (
                                <Actions>
                                    {profile.status === 'PENDING_APPROVAL' && isManagerOrOwner && (
                                        <>
                                            <ActionBtn $tone="green" onClick={() => approveProfile(profile.id)}>
                                                <Check /> Zatwierdź
                                            </ActionBtn>
                                            <ActionBtn $tone="red" onClick={() => rejectProfile(profile.id)}>
                                                <Ban /> Odrzuć
                                            </ActionBtn>
                                        </>
                                    )}
                                    {profile.status === 'ACTIVE' && (
                                        <ActionBtn
                                            $tone="blue"
                                            onClick={() => markSelf({ id: profile.id, isSelf: !profile.isSelf })}
                                            title="Własny profil jest punktem odniesienia rankingu"
                                        >
                                            <Star />
                                            {profile.isSelf ? 'To nie mój profil' : 'To mój profil'}
                                        </ActionBtn>
                                    )}
                                    <ActionBtn onClick={() => setConfirmRemoveId(profile.id)}>
                                        <Trash2 /> Usuń
                                    </ActionBtn>
                                </Actions>
                            )}
                        </Row>
                    ))}

                    <SuggestionsSection />
                </Body>
            </Panel>
        </>,
        document.body
    );
};
