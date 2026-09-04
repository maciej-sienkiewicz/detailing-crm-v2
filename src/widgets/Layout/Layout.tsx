import { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar';
import { BottomNav, BOTTOM_NAV_SPACE } from '@/widgets/BottomNav';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { CalendarNavigationProvider } from '@/common/context/CalendarNavigationContext';
import { MobileChromeProvider } from '@/common/context/MobileChromeContext';
import { CalendarNavigationOverlay } from '@/common/components/CalendarNavigationOverlay';
import { IdleTimeoutProvider } from '@/core/context/IdleTimeoutProvider';
import { hexBackdrop } from '@/common/styles/hexBackdrop';

const LayoutContainer = styled.div`
    display: flex;
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
    overflow-x: hidden;
`;

const ContentWrapper = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 100vh;
    min-height: 100dvh;
    position: relative;
    ${hexBackdrop}

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-left: ${props => props.$isCollapsed ? '64px' : '248px'};
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
    animation: ${fadeOut} 240ms cubic-bezier(0.4, 0, 0.2, 1) both;
    pointer-events: none;
`;

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const { isCollapsed } = useSidebar();
    const { pathname } = useLocation();

    // Wejście na inny widok zaczyna się od jego góry. Bez tego przeglądarka
    // zostawia pozycję przewinięcia z poprzedniej strony i np. karta klienta
    // otwierała się w połowie - użytkownik musiał najpierw scrollować w górę,
    // żeby zobaczyć, na co w ogóle patrzy. Zależność tylko od ścieżki, więc
    // zmiana parametrów (zakładki, wątek poczty) niczego nie przewija.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <IdleTimeoutProvider>
            <CalendarNavigationProvider>
                <MobileChromeProvider>
                    <LayoutContainer>
                        <Sidebar />
                        <ContentWrapper $isCollapsed={isCollapsed}>
                            {children}
                            {/*
                              * Przebitka gra przy WEJŚCIU NA INNY WIDOK i tylko wtedy —
                              * stąd klucz z samej ścieżki. Wcześniej stał w nim licznik
                              * podbijany w trakcie renderu, więc nakładka dostawała nowy
                              * klucz przy KAŻDYM renderze Layoutu i odgrywała się od nowa:
                              * otwarcie leada (zmiana parametru `?lead=` w adresie) gasiło
                              * na 240 ms całą treść i wyglądało jak przeładowanie widoku.
                              * Podbijanie refa w renderze było przy okazji efektem ubocznym
                              * w miejscu, w którym React go nie dopuszcza.
                              */}
                            <RouteFlash key={pathname} />
                        </ContentWrapper>
                    </LayoutContainer>
                    <BottomNav />
                </MobileChromeProvider>
                <CalendarNavigationOverlay />
            </CalendarNavigationProvider>
        </IdleTimeoutProvider>
    );
};
