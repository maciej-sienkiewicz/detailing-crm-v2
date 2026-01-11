import { useLocation } from 'react-router-dom';
import { MenuItemLink, MenuItemIcon, MenuItemText, MenuItemBadge } from './SidebarStyles';

export interface MenuItem {
    path: string;
    label: string;
    icon: string;
    badge?: string | number;
}

interface SidebarMenuItemProps {
    item: MenuItem;
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export const SidebarMenuItem = ({ item, isCollapsed, onNavigate }: SidebarMenuItemProps) => {
    const location = useLocation();
    const isActive = location.pathname.startsWith(item.path);

    const handleClick = () => {
        onNavigate?.();
    };

    return (
        <MenuItemLink
            to={item.path}
            $isActive={isActive}
            $isCollapsed={isCollapsed}
            onClick={handleClick}
        >
            <MenuItemIcon $isActive={isActive}>
                {item.icon}
            </MenuItemIcon>
            <MenuItemText $isCollapsed={isCollapsed}>
                {item.label}
            </MenuItemText>
            {item.badge && (
                <MenuItemBadge $isCollapsed={isCollapsed}>
                    {item.badge}
                </MenuItemBadge>
            )}
        </MenuItemLink>
    );
};