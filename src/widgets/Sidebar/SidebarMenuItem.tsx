import { type LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { MenuItemLink, MenuItemButton, MenuItemIcon, MenuItemText, MenuItemBadge } from './SidebarStyles';

export interface MenuItem {
    label: string;
    icon: LucideIcon;
    badge?: string | number;
    alert?: boolean;
    /** Navigation entry. Mutually exclusive with `onClick`. */
    path?: string;
    /** Standalone action entry (e.g. opens a modal) instead of navigating. */
    onClick?: () => void;
}

interface SidebarMenuItemProps {
    item: MenuItem;
    isCollapsed: boolean;
    onNavigate?: () => void;
}

export const SidebarMenuItem = ({ item, isCollapsed, onNavigate }: SidebarMenuItemProps) => {
    const location = useLocation();
    const Icon = item.icon;

    if (item.onClick) {
        return (
            <MenuItemButton type="button" $isCollapsed={isCollapsed} onClick={item.onClick}>
                <MenuItemIcon $isActive={false}>
                    <Icon />
                </MenuItemIcon>
                <MenuItemText $isCollapsed={isCollapsed}>
                    {item.label}
                </MenuItemText>
            </MenuItemButton>
        );
    }

    const path = item.path ?? '';
    const pathOnly = path.split('?')[0];
    const itemSearch = path.includes('?') ? path.slice(path.indexOf('?')) : null;
    const isActive = itemSearch
        ? location.pathname === pathOnly && location.search === itemSearch
        : location.pathname.startsWith(pathOnly);

    const hasAlert = item.alert && !isActive;

    return (
        <MenuItemLink
            to={path}
            $isActive={isActive}
            $isCollapsed={isCollapsed}
            $hasAlert={hasAlert}
            onClick={onNavigate}
        >
            <MenuItemIcon $isActive={isActive}>
                <Icon />
            </MenuItemIcon>
            <MenuItemText $isCollapsed={isCollapsed}>
                {item.label}
            </MenuItemText>
            {item.badge && (
                <MenuItemBadge $isCollapsed={isCollapsed} $isActive={isActive} $hasAlert={hasAlert}>
                    {item.badge}
                </MenuItemBadge>
            )}
        </MenuItemLink>
    );
};
