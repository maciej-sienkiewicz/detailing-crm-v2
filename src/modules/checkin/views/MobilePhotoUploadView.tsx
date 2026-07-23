// src/modules/checkin/views/MobilePhotoUploadView.tsx

import { useState } from 'react';
import {
    MobileContainer,
    Header,
    Logo,
    Title,
    Subtitle,
    TabBar,
    Tab,
    TabBadge,
    ExpiredScreen,
    ExpiredIcon,
    ExpiredTitle,
    ExpiredText,
    LoadingWrap,
    Spinner,
    DoneScreen,
    DoneIcon,
    DoneTitle,
    DoneText,
    DoneActions,
    LockedScreen,
    LockedIcon,
    LockedTitle,
    LockedText,
    GotowFooter,
    GotowBtn,
    CofnijBtn,
} from './mobile/MobilePhotoUpload.styles';
import { useMobilePhotoUploadLogic } from './mobile/useMobilePhotoUploadLogic';
import { useMobileDamageLogic } from './mobile/useMobileDamageLogic';
import { MobilePhotoSection } from './mobile/MobilePhotoSection';
import { MobileDamageSection } from './mobile/MobileDamageSection';

type ActiveTab = 'photos' | 'damage';

interface Props {
    token: string;
}

export const MobilePhotoUploadView = ({ token }: Props) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('photos');

    const photoLogic = useMobilePhotoUploadLogic(token);
    const damageLogic = useMobileDamageLogic(
        token,
        photoLogic.isOnline,
        photoLogic.sessionState === 'active',
    );

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (photoLogic.sessionState === 'loading') {
        return (
            <MobileContainer>
                <LoadingWrap>
                    <Spinner />
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>Weryfikacja sesji…</p>
                </LoadingWrap>
            </MobileContainer>
        );
    }

    // ─── Expired ──────────────────────────────────────────────────────────────

    if (photoLogic.sessionState === 'expired') {
        return (
            <MobileContainer>
                <ExpiredScreen>
                    <ExpiredIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </ExpiredIcon>
                    <ExpiredTitle>Sesja wygasła</ExpiredTitle>
                    <ExpiredText>
                        Link do przesyłania wygasł lub jest nieprawidłowy.
                        Wygeneruj nowy kod QR na stanowisku obsługi.
                    </ExpiredText>
                </ExpiredScreen>
            </MobileContainer>
        );
    }

    // ─── Visit already created on desktop ─────────────────────────────────────

    if (photoLogic.sessionState === 'visit_created') {
        return (
            <MobileContainer>
                <LockedScreen>
                    <LockedIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </LockedIcon>
                    <LockedTitle>Wizyta utworzona</LockedTitle>
                    <LockedText>
                        Wizyta została już utworzona i edycja danych nie jest możliwa.
                    </LockedText>
                </LockedScreen>
            </MobileContainer>
        );
    }

    // ─── User clicked "Gotowe" ────────────────────────────────────────────────

    if (photoLogic.sessionState === 'done') {
        return (
            <MobileContainer>
                <DoneScreen>
                    <DoneIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </DoneIcon>
                    <DoneTitle>Gotowe!</DoneTitle>
                    <DoneText>
                        Dane zostały przekazane. Możesz zamknąć tę stronę lub wrócić i wprowadzić zmiany.
                    </DoneText>
                    <DoneActions>
                        <CofnijBtn onClick={photoLogic.handleUndoDone}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Cofnij i edytuj
                        </CofnijBtn>
                    </DoneActions>
                </DoneScreen>
            </MobileContainer>
        );
    }

    // ─── Active session ───────────────────────────────────────────────────────

    const { context, totalCount, hasPending } = photoLogic;
    const { damagePoints } = damageLogic;

    return (
        <MobileContainer>
            <Header>
                <Logo>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Dokumentacja pojazdu
                </Logo>
                <Title>Dokumentacja pojazdu</Title>
                {context && (
                    <Subtitle>Sesja: {context.checkinId.slice(0, 8)}…</Subtitle>
                )}
            </Header>

            {/* Tab navigation */}
            <TabBar>
                <Tab $active={activeTab === 'photos'} onClick={() => setActiveTab('photos')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Zdjęcia
                    {totalCount > 0 && <TabBadge>{totalCount}</TabBadge>}
                </Tab>
                <Tab $active={activeTab === 'damage'} onClick={() => setActiveTab('damage')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Uszkodzenia
                    {damagePoints.length > 0 && <TabBadge>{damagePoints.length}</TabBadge>}
                </Tab>
            </TabBar>

            {/* Tab content */}
            {activeTab === 'photos' && <MobilePhotoSection logic={photoLogic} />}
            {activeTab === 'damage' && <MobileDamageSection logic={damageLogic} />}

            {/* Gotowe button */}
            <GotowFooter>
                <GotowBtn onClick={photoLogic.handleMarkDone} disabled={hasPending}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {hasPending ? 'Przesyłanie w toku…' : 'Gotowe'}
                </GotowBtn>
            </GotowFooter>
        </MobileContainer>
    );
};
