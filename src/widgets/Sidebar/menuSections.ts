// src/widgets/Sidebar/menuSections.ts
//
// Pozycje panelu bocznego - osobno od komponentu, żeby dało się je sprawdzić bez
// renderowania całego panelu (profil, przełącznik użytkowników, gniazdo WebSocket).

import {
    Bell,
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    CalendarOff,
    Users,
    Car,
    TrendingUp,
    MessageSquare,
    FileText,
    Settings,
    Inbox,
    Mail,
    Layers,
    Clock,
    Images,
    Activity,
    CircleAlert,
    Package,
    IdCard,
    Camera,
} from 'lucide-react';
import { ANY_FINANCE, ANY_DASHBOARD, ANY_EMPLOYEES } from '@/core/permissions/catalog';
import type { PermissionRequirement } from '@/core/permissions/catalog';
import { firstEmployeesTabPath } from '@/modules/employees/employeesTabs';
import type { MenuSection } from './SidebarMenu';
import type { MenuItem } from './SidebarMenuItem';

// Each menu entry may declare a permission requirement (single code or ANY-OF
// list). Entries the user cannot access are removed entirely: inaccessible
// modules simply do not exist in the UI. Sections left empty are dropped.
type GuardedMenuItem = MenuItem & { requires?: PermissionRequirement; showWhen?: boolean };
type GuardedMenuSection = { title?: string; pinned?: boolean; items: GuardedMenuItem[] };

/** Pozycja bez pól strażnika - SidebarMenu dostaje czyste MenuItem. */
const stripGuards = (guarded: GuardedMenuItem): MenuItem => {
    const item = { ...guarded };
    delete item.requires;
    delete item.showWhen;
    return item;
};

export interface MenuSectionsInput {
    newLeadsCount: number;
    unreadMailCount: number;
    unreadNotifications: number;
    /** Wnioski urlopowe, które bieżący użytkownik może rozpatrzyć (licznik przy „Pracownicy"). */
    pendingLeaveRequests: number;
    /**
     * Karty czasu pracy czekające na decyzję plus listy obecności do podpisu (tylko
     * EMPLOYEES_MANAGE). Dodawane do wniosków: „Pracownicy" ma jeden licznik spraw
     * czekających na tę osobę, bez względu na to, w której zakładce leżą.
     */
    pendingWorkTime?: number;
    can: (required: PermissionRequirement) => boolean;
    trackWorkTime: boolean;
    /** Konto ma rekord pracownika (`/auth/me.employeeId`) - tylko wtedy jest „Urlop". */
    hasEmployeeRecord: boolean;
    onReportProblem: () => void;
}

export const buildMenuSections = ({
    newLeadsCount,
    unreadMailCount,
    unreadNotifications,
    pendingLeaveRequests,
    pendingWorkTime = 0,
    can,
    trackWorkTime,
    hasEmployeeRecord,
    onReportProblem,
}: MenuSectionsInput): MenuSection[] => {
    const canSeeDashboard = can(ANY_DASHBOARD);
    const sections: GuardedMenuSection[] = [
        // Grupy mówią, CZYM się zajmuje dana część pracy. Wcześniej było ich pięć
        // (Główne, Baza klientów, Studio, Administracja, Portal): „Studio" miało jedną
        // pozycję, „Portal" nic nie znaczył, a w „Głównych" siedziało siedem rzeczy
        // naraz, od kalendarza po pocztę. Tablica stoi nad grupami bez nagłówka,
        // tak samo jak Ustawienia na dole.
        {
            items: [
                { path: '/dashboard',     label: 'Tablica',           icon: LayoutDashboard, requires: ANY_DASHBOARD },
                // Task inbox replacing the dashboard's "Do zrobienia" for roles without Tablica.
                { path: '/notifications', label: 'Powiadomienia',     icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined, alert: unreadNotifications > 0, showWhen: !canSeeDashboard },
                { path: '/worktime',      label: 'Czas pracy',        icon: Clock,          showWhen: trackWorkTime },
                // Samoobsługa urlopowa - bez uprawnienia, ale tylko dla konta z rekordem
                // pracownika: bez niego nie ma kogo pokazać ani za kogo złożyć wniosku.
                { path: '/me/leave',      label: 'Urlop',             icon: CalendarOff,    showWhen: hasEmployeeRecord },
            ],
        },
        {
            title: 'Praca',
            items: [
                { path: '/operations',    label: 'Wizyty',            icon: CalendarCheck, requires: 'VISITS_VIEW',
                    match: ['/visits', '/appointments', '/checkin', '/reservations'] },
                { path: '/calendar',      label: 'Kalendarz',         icon: Calendar,      requires: 'VISITS_VIEW' },
                { path: '/batch-orders',  label: 'Zlecenia zbiorcze', icon: Layers, requires: 'BATCH_ORDERS' },
                { path: '/gallery',       label: 'Galeria',           icon: Images, requires: 'VISITS_VIEW' },
            ],
        },
        {
            title: 'Klienci i zapytania',
            items: [
                // Bez czerwonego alertu: leada tworzy świadome kliknięcie użytkownika,
                // więc nie ma czego zgłaszać jako nowość. Licznik zostaje - mówi, ile
                // zapytań czeka na ruch - ale nie krzyczy jak nieprzeczytana poczta.
                { path: '/leads', label: 'Leady', icon: Inbox, badge: newLeadsCount > 0 ? newLeadsCount : undefined, requires: 'LEADS_MANAGE' },
                { path: '/communication', label: 'Poczta', icon: Mail, badge: unreadMailCount > 0 ? unreadMailCount : undefined, alert: unreadMailCount > 0, requires: 'LEADS_MANAGE' },
                { path: '/customers', label: 'Klienci',   icon: Users, requires: 'CUSTOMERS_VIEW' },
                { path: '/vehicles',  label: 'Samochody', icon: Car,   requires: 'CUSTOMERS_VIEW' },
            ],
        },
        {
            title: 'Firma',
            items: [
                // Ścieżka to pierwsza zakładka, do której użytkownik ma dostęp - kierownik
                // zmiany bez EMPLOYEES_MANAGE nie może trafić na /employees i przekierowanie.
                // `Users` jest zajęte przez Klientów, stąd IdCard.
                { path: firstEmployeesTabPath(can) ?? '/employees', label: 'Pracownicy', icon: IdCard,
                    requires: ANY_EMPLOYEES, match: ['/employees'],
                    badge: pendingLeaveRequests + pendingWorkTime > 0 ? pendingLeaveRequests + pendingWorkTime : undefined },
                { path: '/finances',   label: 'Finanse',    icon: FileText,   requires: ANY_FINANCE, match: ['/finance'] },
                { path: '/statistics', label: 'Statystyki', icon: TrendingUp, requires: 'STATISTICS_VIEW', match: ['/reports'] },
                { path: '/products',   label: 'Produkty',   icon: Package,    requires: 'PRODUCTS_VIEW' },
                { path: '/activity',   label: 'Aktywność',  icon: Activity,   requires: 'AUDIT_VIEW' }
            ],
        },
        {
            title: 'Marketing',
            items: [
                { path: '/campaigns',      label: 'Kampanie',       icon: MessageSquare, requires: 'COMMUNICATION_SEND', match: ['/sms-campaigns'] },
                { path: '/instagram',      label: 'Instagram',      icon: Camera, requires: 'MARKETING_MANAGE' }
            ],
        },
        {
            // Przyklejona do dołu menu: Ustawienia i zgłoszenie problemu mają być
            // widoczne bez przewijania, niezależnie od liczby modułów wyżej.
            pinned: true,
            items: [
                // Parowanie telefonu do Click-to-Call przeniosło się stąd do
                // Ustawień → Urządzenia mobilne, obok tabletów do podpisu:
                // jedno miejsce na wszystkie urządzenia zamiast pozycji w menu,
                // którą klikało się raz w życiu.
                { path: '/settings',   label: 'Ustawienia', icon: Settings },
                { label: 'Zgłoś problem', icon: CircleAlert, onClick: onReportProblem },
            ],
        },
    ];

    return sections
        .map(({ title, pinned, items }) => ({
            title,
            pinned,
            items: items
                .filter(({ requires, showWhen }) =>
                    (showWhen ?? true) && (!requires || can(requires)))
                .map(stripGuards),
        }))
        .filter(section => section.items.length > 0);
};
