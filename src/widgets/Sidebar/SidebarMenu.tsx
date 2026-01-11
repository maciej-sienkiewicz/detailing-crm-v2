import { MenuContainer, MenuSection, MenuSectionTitle } from './SidebarStyles';
import { SidebarMenuItem, MenuItem } from './SidebarMenuItem';

export interface MenuSection {
    title?: string;
    items: MenuItem[];
}

interface SidebarMenuProps {
    sections: MenuSection[];
    isCollapsed: boolean;
}

export const SidebarMenu = ({ sections, isCollapsed }: SidebarMenuProps) => {
    return (
        <MenuContainer>
            {sections.map((section, sectionIndex) => (
                <MenuSection key={sectionIndex}>
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
                        />
                    ))}
                </MenuSection>
            ))}
        </MenuContainer>
    );
};