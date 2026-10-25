// src/widgets/Sidebar/menuSections.ts
//
// Pozycje panelu bocznego - osobno od komponentu, żeby dało się je sprawdzić bez
// renderowania całego panelu (profil, przełącznik użytkowników, gniazdo WebSocket).

import {
    ActivityIcon,
    BatchOrdersIcon,
    BaysIcon,
    CalendarIcon,
    CampaignsIcon,
    CustomersIcon,
    DashboardIcon,
    EmployeesIcon,
    FinancesIcon,
    GalleryIcon,
    InquiriesIcon,
    InstagramIcon,
    LeaveIcon,
    MailIcon,
    NotificationsIcon,
    ProductsIcon,
    ReportProblemIcon,
    ScheduledContentIcon,
    SettingsIcon,
    StatisticsIcon,
    VehiclesIcon,
    VisitsIcon,
    WorkTimeIcon,
} from './menuIcons';
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
    /** Prototyp stanowisk włączony (`isBaysEnabled()`); bez niego pozycji nie ma. */
    showBays?: boolean;
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
    showBays = false,
    onReportProblem,
}: MenuSectionsInput): MenuSection[] => {
    const canSeeDashboard = can(ANY_DASHBOARD);
    const sections: GuardedMenuSection[] = [
        // Grupy mówią, CZYM się zajmuje dana część pracy (układ z 21.10.2026):
        // na górze sprawy „moje na dziś”, potem praca w warsztacie, klienci razem
        // z zapytaniami (zapytanie to przyszły klient), komunikacja wychodząca,
        // a na końcu liczby i zasoby studia, potrzebne głównie właścicielowi.
        {
            items: [
                { path: '/dashboard',     label: 'Tablica',       icon: DashboardIcon, requires: ANY_DASHBOARD },
                // Task inbox replacing the dashboard's "Do zrobienia" for roles without Tablica.
                { path: '/notifications', label: 'Powiadomienia', icon: NotificationsIcon, badge: unreadNotifications > 0 ? unreadNotifications : undefined, alert: unreadNotifications > 0, showWhen: !canSeeDashboard },
                { path: '/activity',      label: 'Aktywność',     icon: ActivityIcon, requires: 'AUDIT_VIEW' },
                { path: '/worktime',      label: 'Czas pracy',    icon: WorkTimeIcon, showWhen: trackWorkTime },
                // Samoobsługa urlopowa - bez uprawnienia, ale tylko dla konta z rekordem
                // pracownika: bez niego nie ma kogo pokazać ani za kogo złożyć wniosku.
                { path: '/me/leave',      label: 'Urlop',         icon: LeaveIcon, showWhen: hasEmployeeRecord },
            ],
        },
        {
            title: 'Praca',
            items: [
                { path: '/operations',   label: 'Wizyty',            icon: VisitsIcon, requires: 'VISITS_VIEW',
                    match: ['/visits', '/appointments', '/checkin', '/reservations'] },
                { path: '/calendar',     label: 'Kalendarz',         icon: CalendarIcon, requires: 'VISITS_VIEW' },
                { path: '/bays',         label: 'Stanowiska',        icon: BaysIcon, requires: 'VISITS_VIEW', showWhen: showBays },
                { path: '/batch-orders', label: 'Zlecenia zbiorcze', icon: BatchOrdersIcon, requires: 'BATCH_ORDERS' },
            ],
        },
        {
            title: 'Klienci',
            items: [
                // Zapytania (sprawy) i Poczta to osobne pozycje (decyzja z 23.10.2026) -
                // dawniej jedna skrzynka, w której licznik poczty podszywał się pod sprawy.
                // Czerwień (poświata i licznik) tylko przy nowym leadzie - to ktoś, kto
                // czeka na odpowiedź. Nieprzeczytana poczta ma biały licznik bez poświaty
                // (decyzja z 21.10.2026). Stare adresy są w `match`, żeby pozycja świeciła
                // także w trakcie przekierowania; /communication/mailboxes to skrzynki poczty.
                { path: '/inbox', label: 'Zapytania', icon: InquiriesIcon,
                    badge: newLeadsCount > 0 ? newLeadsCount : undefined,
                    alert: newLeadsCount > 0, requires: 'LEADS_MANAGE', match: ['/leads'] },
                { path: '/mail', label: 'Poczta', icon: MailIcon,
                    badge: unreadMailCount > 0 ? unreadMailCount : undefined, badgeTone: 'neutral',
                    requires: 'LEADS_MANAGE', match: ['/communication'] },
                { path: '/customers', label: 'Klienci',   icon: CustomersIcon, requires: 'CUSTOMERS_VIEW' },
                { path: '/vehicles',  label: 'Pojazdy',   icon: VehiclesIcon, requires: 'CUSTOMERS_VIEW' },
                // Zdjęcia aut z wizyt i zleceń - stoją przy Pojazdach, nie przy pracy.
                { path: '/gallery',   label: 'Galeria',   icon: GalleryIcon, requires: 'VISITS_VIEW' },
            ],
        },
        {
            title: 'Marketing',
            items: [
                { path: '/campaigns', label: 'Kampanie', icon: CampaignsIcon, requires: 'COMMUNICATION_SEND' },
                // Komu, co i kiedy wyjdzie SMS-em albo e-mailem: przypomnienia, potwierdzenia,
                // kampanie. Stary adres (/scheduled-sms) przekierowuje - jest w `match`.
                { path: '/scheduled-communication', label: 'Zaplanowane treści', icon: ScheduledContentIcon,
                    requires: 'COMMUNICATION_SEND', match: ['/scheduled-sms'] },
                { path: '/instagram', label: 'Instagram', icon: InstagramIcon, requires: 'MARKETING_MANAGE' },
            ],
        },
        {
            title: 'Firma',
            items: [
                { path: '/finances',   label: 'Finanse',    icon: FinancesIcon, requires: ANY_FINANCE },
                { path: '/statistics', label: 'Statystyki', icon: StatisticsIcon, requires: 'STATISTICS_VIEW' },
                // Ścieżka to pierwsza zakładka, do której użytkownik ma dostęp - kierownik
                // zmiany bez EMPLOYEES_MANAGE nie może trafić na /employees i przekierowanie.
                { path: firstEmployeesTabPath(can) ?? '/employees', label: 'Pracownicy', icon: EmployeesIcon,
                    requires: ANY_EMPLOYEES, match: ['/employees'],
                    badge: pendingLeaveRequests + pendingWorkTime > 0 ? pendingLeaveRequests + pendingWorkTime : undefined },
                { path: '/products',   label: 'Produkty',   icon: ProductsIcon, requires: 'PRODUCTS_VIEW' },
            ],
        },
        {
            // Na końcu listy, bez przypinania do dołu (decyzja z 21.10.2026): przy pełnych
            // uprawnieniach na niskim ekranie trzeba do nich przewinąć menu.
            // Parowanie telefonu do Click-to-Call jest w Ustawienia → Telefon.
            items: [
                { path: '/settings', label: 'Ustawienia', icon: SettingsIcon },
                { label: 'Zgłoś problem', icon: ReportProblemIcon, onClick: onReportProblem },
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
