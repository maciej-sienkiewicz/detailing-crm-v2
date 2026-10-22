// src/modules/checkin/views/MobilePhotoUploadView.tsx
//
// Strona telefonu otwierana z kodu QR: zdjęcia przyjęcia, mapa uszkodzeń, pliki wizyty,
// VIN. Każda kończy się jasnym ekranem: „Gotowe" na telefonie, koniec ustalony na
// komputerze (wizyta zapisana, zakończono, przerwano, nowy kod) albo nieważny link.

import { useState, type ReactNode } from 'react';
import {
    MobileContainer,
    Header,
    Logo,
    Title,
    Subject,
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
    GotowHint,
    CofnijBtn,
} from './mobile/MobilePhotoUpload.styles';
import { useMobilePhotoUploadLogic, type DesktopEndReason } from './mobile/useMobilePhotoUploadLogic';
import { useMobileDamageLogic } from './mobile/useMobileDamageLogic';
import { MobilePhotoSection } from './mobile/MobilePhotoSection';
import { MobileDamageSection } from './mobile/MobileDamageSection';
import { MobileVinScanSection } from './mobile/MobileVinScanSection';
import { pluralPl } from '@/common/utils/plural';
import type { MobileCheckinContext } from '../types';

type ActiveTab = 'photos' | 'damage';

interface Props {
    token: string;
}

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const StopIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

const AlertIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

/** Ekran końcowy ustalony na komputerze. */
const ENDINGS: Record<DesktopEndReason, { tone: 'ok' | 'neutral'; title: string; text: string }> = {
    FINISHED: {
        tone: 'ok',
        title: 'Zakończono na komputerze',
        text: 'Wszystko, co zdążyło się wysłać, jest już w CRM. Możesz zamknąć tę stronę.',
    },
    CANCELLED: {
        tone: 'neutral',
        title: 'Przyjęcie przerwane',
        text: 'Przyjęcie pojazdu zostało przerwane na komputerze. Tu nic więcej nie zrobisz - możesz zamknąć tę stronę.',
    },
    REPLACED: {
        tone: 'neutral',
        title: 'Ten kod został zastąpiony',
        text: 'Na komputerze wygenerowano nowy kod QR. Zeskanuj go, żeby wysyłać dalej.',
    },
};

const titleFor = (purpose: MobileCheckinContext['purpose']) => {
    switch (purpose) {
        case 'DAMAGE_MAP': return 'Mapa uszkodzeń';
        case 'VISIT_FILES': return 'Zdjęcia do wizyty';
        case 'VIN_SCAN': return 'Numer VIN';
        default: return 'Dokumentacja pojazdu';
    }
};

/** Studio, tytuł i auto: od pierwszego spojrzenia wiadomo, do czego trafią zdjęcia. */
const PageHeader = ({ context, title }: { context: MobileCheckinContext | null; title: string }) => (
    <Header>
        <Logo>{context?.studioName || 'DetailBoost'}</Logo>
        <Title>{title}</Title>
        {context?.subject && <Subject>{context.subject}</Subject>}
    </Header>
);

const EndScreen = ({ children }: { children: ReactNode }) => <MobileContainer>{children}</MobileContainer>;

export const MobilePhotoUploadView = ({ token }: Props) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('photos');
    // Sesja VIN nie ma kolejki zdjęć, więc jej wygaśnięcie wychodzi przy samym odczycie.
    const [vinSessionGone, setVinSessionGone] = useState(false);

    const photoLogic = useMobilePhotoUploadLogic(token);
    const damageLogic = useMobileDamageLogic(
        token,
        photoLogic.isOnline,
        // Sesje plików wizyty i odczytu VIN nie mają mapy uszkodzeń - nie pytamy o nią serwera.
        photoLogic.sessionState === 'active'
            && photoLogic.context?.purpose !== 'VISIT_FILES'
            && photoLogic.context?.purpose !== 'VIN_SCAN',
    );

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (photoLogic.sessionState === 'loading') {
        return (
            <EndScreen>
                <LoadingWrap role="status">
                    <Spinner />
                    Sprawdzanie linku…
                </LoadingWrap>
            </EndScreen>
        );
    }

    // ─── Ended on the desktop ─────────────────────────────────────────────────

    if (photoLogic.sessionState === 'ended' && photoLogic.endReason) {
        const ending = ENDINGS[photoLogic.endReason];
        return (
            <EndScreen>
                <LockedScreen role="status">
                    <LockedIcon $tone={ending.tone}>{ending.tone === 'ok' ? <CheckIcon /> : <StopIcon />}</LockedIcon>
                    <LockedTitle>{ending.title}</LockedTitle>
                    <LockedText>{ending.text}</LockedText>
                </LockedScreen>
            </EndScreen>
        );
    }

    // ─── Expired ──────────────────────────────────────────────────────────────

    if (photoLogic.sessionState === 'expired' || vinSessionGone) {
        return (
            <EndScreen>
                <ExpiredScreen role="status">
                    <ExpiredIcon><AlertIcon /></ExpiredIcon>
                    <ExpiredTitle>Link wygasł</ExpiredTitle>
                    <ExpiredText>
                        Poproś o nowy kod QR na komputerze w studiu.
                    </ExpiredText>
                </ExpiredScreen>
            </EndScreen>
        );
    }

    // ─── Visit already created on desktop ─────────────────────────────────────

    if (photoLogic.sessionState === 'visit_created') {
        return (
            <EndScreen>
                <LockedScreen role="status">
                    <LockedIcon $tone="ok"><CheckIcon /></LockedIcon>
                    <LockedTitle>Wizyta utworzona</LockedTitle>
                    <LockedText>
                        Zdjęcia i oznaczenia są już w wizycie. Możesz zamknąć tę stronę.
                    </LockedText>
                </LockedScreen>
            </EndScreen>
        );
    }

    // ─── User clicked "Gotowe" ────────────────────────────────────────────────

    if (photoLogic.sessionState === 'done') {
        const sent = photoLogic.doneCount;
        return (
            <EndScreen>
                <DoneScreen role="status">
                    <DoneIcon><CheckIcon /></DoneIcon>
                    <DoneTitle>Gotowe</DoneTitle>
                    <DoneText>
                        {sent > 0
                            ? `Wysłano ${sent} ${pluralPl(sent, 'zdjęcie', 'zdjęcia', 'zdjęć')}. `
                            : 'Wysłane. '}
                        Komputer w studiu już to widzi. Możesz zamknąć tę stronę albo wrócić i coś poprawić.
                    </DoneText>
                    <DoneActions>
                        <CofnijBtn onClick={photoLogic.handleUndoDone}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Cofnij i edytuj
                        </CofnijBtn>
                    </DoneActions>
                </DoneScreen>
            </EndScreen>
        );
    }

    // ─── Active session ───────────────────────────────────────────────────────

    const { context, totalCount, doneCount, hasPending } = photoLogic;
    const title = titleFor(context?.purpose);

    // „VIN telefonem": samo zdjęcie VIN, bez zakładek i bez „Gotowe" - wynik od razu
    // trafia do okna na komputerze, a sesja służy kolejnym autom.
    if (context?.purpose === 'VIN_SCAN') {
        return (
            <MobileContainer>
                <PageHeader context={context} title={title} />
                <MobileVinScanSection
                    token={token}
                    paused={photoLogic.paused}
                    onSessionGone={() => setVinSessionGone(true)}
                />
            </MobileContainer>
        );
    }
    const { damagePoints } = damageLogic;

    /*
     * Sesja otwarta z karty wizyty („Zaktualizuj uszkodzenia") służy wyłącznie mapie
     * uszkodzeń: zdjęcie ma tam sens tylko przypięte do konkretnego punktu, a osobna
     * zakładka „Zdjęcia" prowadziłaby do wysyłki, której okno na komputerze nie
     * wiąże z żadnym uszkodzeniem. Przy przyjęciu pojazdu obie zakładki zostają.
     *
     * Brak `purpose` (starszy token wydany przed wprowadzeniem tego pola) znaczy
     * przyjęcie — czyli zachowanie dotychczasowe.
     */
    const damageOnly = context?.purpose === 'DAMAGE_MAP';
    /*
     * Kod z „Dodaj plik" na otwartej wizycie: wyłącznie zdjęcia, które od razu trafiają
     * do galerii wizyty. Mapa uszkodzeń ma tam własny kod QR i własne okno.
     */
    const photosOnly = context?.purpose === 'VISIT_FILES';
    const currentTab: ActiveTab = damageOnly ? 'damage' : photosOnly ? 'photos' : activeTab;
    // Przy plikach wizyty „Gotowe" bez żadnego zdjęcia nic by nie znaczyło.
    const nothingSent = photosOnly && doneCount === 0;

    return (
        <MobileContainer>
            <PageHeader context={context} title={title} />

            {/* Tab navigation */}
            {!damageOnly && !photosOnly && <TabBar role="tablist">
                <Tab
                    role="tab"
                    aria-selected={activeTab === 'photos'}
                    $active={activeTab === 'photos'}
                    onClick={() => setActiveTab('photos')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                    Zdjęcia
                    {totalCount > 0 && <TabBadge>{totalCount}</TabBadge>}
                </Tab>
                <Tab
                    role="tab"
                    aria-selected={activeTab === 'damage'}
                    $active={activeTab === 'damage'}
                    onClick={() => setActiveTab('damage')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Uszkodzenia
                    {damagePoints.length > 0 && <TabBadge>{damagePoints.length}</TabBadge>}
                </Tab>
            </TabBar>}

            {/* Tab content */}
            {currentTab === 'photos' && <MobilePhotoSection logic={photoLogic} />}
            {currentTab === 'damage' && <MobileDamageSection logic={damageLogic} />}

            {/* Gotowe button */}
            <GotowFooter>
                <GotowBtn onClick={photoLogic.handleMarkDone} disabled={hasPending || nothingSent}>
                    <CheckIcon />
                    {hasPending ? 'Wysyłanie…' : 'Gotowe'}
                </GotowBtn>
                {nothingSent && !hasPending && <GotowHint>Dodaj przynajmniej jedno zdjęcie.</GotowHint>}
            </GotowFooter>
        </MobileContainer>
    );
};
