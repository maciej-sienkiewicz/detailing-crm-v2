import styled, { keyframes } from 'styled-components';
import { useLocation } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';

const LayoutContainer = styled.div`
    display: flex;
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
`;

const ContentWrapper = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    /* Without min-width: 0 a flex-row item's minimum size defaults to its
       min-content width, which can be thousands of pixels when the page
       contains a wide table.  Setting it to 0 lets the sidebar + content
       share the viewport correctly and keeps wide tables from making the
       whole page horizontally scrollable. */
    min-width: 0;
    min-height: 100vh;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-left: ${props => props.$isCollapsed ? '64px' : '248px'};
        transition: margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        margin-left: 0;
        padding-top: 76px;
    }
`;

const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(6px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const PageSlot = styled.div`
    animation: ${fadeIn} 260ms cubic-bezier(0.4, 0, 0.2, 1) both;
    min-height: 100vh;
`;

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const { isCollapsed } = useSidebar();
    const { pathname } = useLocation();

    return (
        <LayoutContainer>
            <Sidebar />
            <ContentWrapper $isCollapsed={isCollapsed}>
                <PageSlot key={pathname}>
                    {children}
                </PageSlot>
            </ContentWrapper>
        </LayoutContainer>
    );
};
