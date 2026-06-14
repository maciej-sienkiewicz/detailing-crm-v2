import { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { CalendarNavigationProvider } from '@/common/context/CalendarNavigationContext';
import { CalendarNavigationOverlay } from '@/common/components/CalendarNavigationOverlay';
import { hexBackdrop } from '@/common/styles/hexBackdrop';

const LayoutContainer = styled.div`
    display: flex;
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
`;

const ContentWrapper = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 100vh;
    position: relative;
    ${hexBackdrop}

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-left: ${props => props.$isCollapsed ? '64px' : '248px'};
        transition: margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        margin-left: 0;
        padding-top: 76px;
    }
`;

// Sibling overlay that fades out — the content itself is never animated,
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
    const keyRef = useRef(0);
    keyRef.current += 1;
    const flashKey = keyRef.current;

    return (
        <CalendarNavigationProvider>
            <LayoutContainer>
                <Sidebar />
                <ContentWrapper $isCollapsed={isCollapsed}>
                    {children}
                    <RouteFlash key={`${pathname}-${flashKey}`} />
                </ContentWrapper>
            </LayoutContainer>
            <CalendarNavigationOverlay />
        </CalendarNavigationProvider>
    );
};
