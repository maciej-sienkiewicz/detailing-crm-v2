import { type LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { MenuItemLink, MenuItemIcon, MenuItemText, MenuItemBadge } from './SidebarStyles';

export interface MenuItem {
    path: string;
    label: string;
    icon: LucideIcon;
    badge?: string | number;
}

interface SidebarMenuItemProps {
    item: MenuItem;
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export const SidebarMenuItem = ({ item, isCollapsed, onNavigate }: SidebarMenuItemProps) => {
    const location = useLocation();
    const pathOnly = item.path.split('?')[0];
    const itemSearch = item.path.includes('?') ? item.path.slice(item.path.indexOf('?')) : null;
    const isActive = itemSearch
        ? location.pathname === pathOnly && location.search === itemSearch
        : location.pathname.startsWith(pathOnly);
    const Icon = item.icon;

    return (
        <MenuItemLink
            to={item.path}
            $isActive={isActive}
            $isCollapsed={isCollapsed}
            onClick={onNavigate}
        >
            <MenuItemIcon $isActive={isActive}>
                <Icon />
            </MenuItemIcon>
            <MenuItemText $isCollapsed={isCollapsed}>
                {item.label}
            </MenuItemText>
            {item.badge && (
                <MenuItemBadge $isCollapsed={isCollapsed} $isActive={isActive}>
                    {item.badge}
                </MenuItemBadge>
            )}
        </MenuItemLink>
    );
};
