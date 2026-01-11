import styled from 'styled-components';
import { Sidebar } from '@/widgets/Sidebar';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';

const LayoutContainer = styled.div`
    display: flex;
    min-height: 100vh;
    background-color: #fafafa;
`;

const ContentWrapper = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    min-height: 100vh;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-left: ${props => props.$isCollapsed ? '64px' : '240px'};
        transition: margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        margin-left: 0;
        padding-top: 76px;
    }
`;

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const { isCollapsed } = useSidebar();

    return (
        <LayoutContainer>
            <Sidebar />
            <ContentWrapper $isCollapsed={isCollapsed}>
                {children}
            </ContentWrapper>
        </LayoutContainer>
    );
};