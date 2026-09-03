import { MenuContainer, MenuSection, MenuSectionTitle, PinnedMenuContainer } from './SidebarStyles';
import { SidebarMenuItem, MenuItem } from './SidebarMenuItem';

export interface MenuSection {
    title?: string;
    /** Sekcja poza przewijanym obszarem, przyklejona nad profilem użytkownika. */
    pinned?: boolean;
    items: MenuItem[];
}

interface SidebarMenuProps {
    sections: MenuSection[];
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export const SidebarMenu = ({ sections, isCollapsed, onNavigate }: SidebarMenuProps) => {
    const scrolling = sections.filter(s => !s.pinned);
    const pinned = sections.filter(s => s.pinned);

    const renderSection = (section: MenuSection, key: number) => (
        <MenuSection key={key}>
            {section.title && (
                <MenuSectionTitle $isCollapsed={isCollapsed}>
                    {section.title}
                </MenuSectionTitle>
            )}
            {section.items.map((item, itemIndex) => (
                <SidebarMenuItem
                    key={itemIndex}
                    item={item}
                    isCollapsed={isCollapsed}
                    onNavigate={onNavigate}
                />
            ))}
        </MenuSection>
    );

    return (
        <>
            <MenuContainer>
                {scrolling.map(renderSection)}
            </MenuContainer>
            {pinned.length > 0 && (
                <PinnedMenuContainer>
                    {pinned.map(renderSection)}
                </PinnedMenuContainer>
            )}
        </>
    );
};
