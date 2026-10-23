import { useEffect } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { vehicleMetadataQuery } from '@/modules/vehicles/hooks/useVehicleMetadata';
import { Sidebar } from '@/widgets/Sidebar';
import { BottomNav, BOTTOM_NAV_SPACE } from '@/widgets/BottomNav';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { CalendarNavigationProvider } from '@/common/context/CalendarNavigationContext';
import { MobileChromeProvider } from '@/common/context/MobileChromeContext';
import { CalendarNavigationOverlay } from '@/common/components/CalendarNavigationOverlay';
import { IdleTimeoutProvider } from '@/core/context/IdleTimeoutProvider';
import { GlobalShortcuts } from '@/common/shortcuts';
import { QuickNoteProvider } from '@/modules/dashboard/components/QuickNoteProvider';
import { PushOnboardingPrompt } from '@/modules/push/components/PushOnboardingPrompt';
import { NativePushBridge } from '@/modules/push/native/NativePushBridge';
import { viewKeyOf } from './viewKey';
import { FRAME_COLOR, FRAME_GAP, FRAME_RADIUS } from './frame';

const LayoutContainer = styled.div`
    display: flex;
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
    overflow-x: hidden;

    /* Rama (frame.ts): na komputerze tło okna ma kolor menu, treść leży w panelu. */
    @media (min-width: ${props => props.theme.breakpoints.md}) {
        background-color: ${FRAME_COLOR};
    }
`;

/*
 * Rama stoi w miejscu. Gładzik (macOS) przy dociągnięciu strony za górną albo dolną
 * krawędź odbijał cały dokument: rama zjeżdżała razem z treścią, a w szczelinie
 * wychodziło jasne tło body. overscroll-behavior-y na html wyłącza to odbicie dla
 * przewijania okna (oś x zostaje - dwa palce w bok dalej cofają stronę). Tło html
 * w kolorze ramy to siatka dla przeglądarek, które odbicia nie wyłączą: szczelina
 * ma wtedy kolor ramy, a nie biały. Styl globalny żyje tylko z Layoutem, więc
 * logowanie i strony publiczne go nie dostają.
 */
const FrameViewport = createGlobalStyle`
    @media (min-width: ${props => props.theme.breakpoints.md}) {
        html {
            background-color: ${FRAME_COLOR};
            overscroll-behavior-y: none;
        }
    }
`;

const ContentWrapper = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 100vh;
    min-height: 100dvh;
    position: relative;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin: ${FRAME_GAP}px ${FRAME_GAP}px ${FRAME_GAP}px ${props => props.$isCollapsed ? '64px' : '248px'};
        min-height: calc(100vh - ${2 * FRAME_GAP}px);
        min-height: calc(100dvh - ${2 * FRAME_GAP}px);
        background-color: ${props => props.theme.colors.background};
        border-radius: ${FRAME_RADIUS}px;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 1px 3px rgba(0, 0, 0, 0.3);
        /* clip, nie hidden: przycina treść do zaokrąglonych rogów, ale nie robi
           z panelu kontenera przewijania - position: sticky w widokach działa dalej. */
        overflow: clip;
        transition: margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        margin-left: 0;
        /* Treść kończy się nad dolnym paskiem nawigacji – razem z safe-area iOS,
           żeby po doscrollowaniu na sam dół pasek niczego nie zasłaniał. */
        padding-bottom: ${BOTTOM_NAV_SPACE};
    }
`;

// Sibling overlay that fades out: the content itself is never animated,
// so no compositing layer is created and backdrop-filter works everywhere.
const fadeOut = keyframes`
    from { opacity: 1; }
    to   { opacity: 0; }
`;

const RouteFlash = styled.div`
    position: absolute;
    inset: 0;
    z-index: 500;
    background: ${props => props.theme.colors.background};
    border-radius: inherit;
    animation: ${fadeOut} 240ms cubic-bezier(0.4, 0, 0.2, 1) both;
    pointer-events: none;
`;

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const { isCollapsed } = useSidebar();
    const { pathname } = useLocation();
    // Zakładki jednego widoku dzielą klucz - patrz viewKey.ts.
    const viewKey = viewKeyOf(pathname);

    // Wejście na inny widok zaczyna się od jego góry. Bez tego przeglądarka
    // zostawia pozycję przewinięcia z poprzedniej strony i np. karta klienta
    // otwierała się w połowie - użytkownik musiał najpierw scrollować w górę,
    // żeby zobaczyć, na co w ogóle patrzy. Zależność tylko od widoku, więc
    // zmiana parametrów (wątek poczty) ani zakładki-ścieżki niczego nie przewija.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [viewKey]);

    // Katalog marek dla formularzy pojazdu - dopiero w zalogowanej aplikacji, nie na każdej
    // stronie (dawniej App.tsx pobierał 70 KB także na logowaniu i stronach z linku klienta).
    const queryClient = useQueryClient();
    useEffect(() => {
        void queryClient.prefetchQuery(vehicleMetadataQuery('CAR'));
    }, [queryClient]);

    return (
        <IdleTimeoutProvider>
            <CalendarNavigationProvider>
                <MobileChromeProvider>
                    {/* Globalne skróty klawiszowe (W/R/K/L/P/F/S/G/I/U) - nasłuch
                        klawiatury dla całej zalogowanej aplikacji, wyłączalny
                        w Ustawieniach → Urządzenia w studiu → Ten komputer. */}
                    <GlobalShortcuts />
                    {/* Okno „Nowe zadanie” (skrót Z) dostępne z każdego widoku. */}
                    <QuickNoteProvider>
                    <FrameViewport />
                    <LayoutContainer>
                        <Sidebar />
                        <ContentWrapper $isCollapsed={isCollapsed}>
                            {children}
                            {/*
                              * Przebitka gra przy WEJŚCIU NA INNY WIDOK i tylko wtedy —
                              * stąd klucz widoku (ścieżka, a dla zakładek-ścieżek jednego
                              * widoku jego wspólna baza - viewKey.ts). Wcześniej stał w nim licznik
                              * podbijany w trakcie renderu, więc nakładka dostawała nowy
                              * klucz przy KAŻDYM renderze Layoutu i odgrywała się od nowa:
                              * otwarcie leada (zmiana parametru `?lead=` w adresie) gasiło
                              * na 240 ms całą treść i wyglądało jak przeładowanie widoku.
                              * Podbijanie refa w renderze było przy okazji efektem ubocznym
                              * w miejscu, w którym React go nie dopuszcza.
                              */}
                            <RouteFlash key={viewKey} />
                        </ContentWrapper>
                    </LayoutContainer>
                    </QuickNoteProvider>
                    <BottomNav />
                    {/* Zachęta do powiadomień - tylko na telefonie i tylko gdy jest co zrobić. */}
                    <PushOnboardingPrompt />
                    <NativePushBridge />
                </MobileChromeProvider>
                <CalendarNavigationOverlay />
            </CalendarNavigationProvider>
        </IdleTimeoutProvider>
    );
};
