import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { usePermissions } from '@/core/permissions';
import type { PermissionRequirement } from '@/core/permissions';
import { CompanySection } from '../components/CompanySection';
import { DocumentsSection } from '../components/DocumentsSection';
import { ServicesSection } from '../components/ServicesSection';
import { TeamSection } from '../components/TeamSection';
import { RolesSection } from '../components/RolesSection';
import { SubscriptionSettingsPage } from '@/modules/subscription';
import { AutomationSettings } from '@/modules/sms-campaigns/components/AutomationSettings';
import { EmailAutomationSettings } from '@/modules/email-campaigns/components/EmailAutomationSettings';
import { SmsCreditSection } from '../components/SmsCreditSection';
import { InvoicesSection } from '../components/InvoicesSection';
import { TabletsSection } from '../components/TabletsSection';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { HelpModal } from '../components/shared/SettingsLayout';
import type { HelpContent } from '../components/shared/SettingsLayout';
import {
    COMPANY_HELP,
    SERVICES_HELP,
    DOCUMENTS_HELP,
    SMS_TEMPLATES_HELP,
    EMAIL_TEMPLATES_HELP,
    CREDITS_HELP,
    INVOICES_HELP,
} from '../helpContent';

// ─── Nav definition ──────────────────────────────────────────────────────────

type SectionId =
    | 'company' | 'services' | 'team' | 'roles' | 'opening'
    | 'templates' | 'email-templates' | 'reminders' | 'documents'
    | 'tablets'
    | 'plan' | 'credits' | 'invoices' | 'security'
    | 'integrations' | 'api';

interface NavItem {
    id: SectionId;
    label: string;
    icon: React.ReactNode;
    badge?: string;
}

interface NavGroup {
    group: string;
    items: NavItem[];
}

// SVG icon helpers
const Icon = ({ d, size = 15 }: { d: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const BuildingIcon   = () => <Icon d="M3 21h18M9 21V5l7-2v18M3 7l6-2" />;
const ListChecksIcon = () => <Icon d="M3 5h6M3 10h6M3 15h6M13 5l2 2 4-4M13 10l2 2 4-4M13 15l2 2 4-4" />;
const UsersIcon      = () => <Icon d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3M8 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M18 21v-2a4 4 0 0 0-3-3.87" />;
const ClockIcon      = () => <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 3" />;
const MessageIcon    = () => <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />;
const MailIcon       = () => <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />;
const BellIcon       = () => <Icon d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />;
const FileSignIcon   = () => <Icon d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v5h5M9 18c.8-.8 1-1.5.8-2.3-.3-1-1.2-1.7-1-2.7.2-.8.9-1.5 1.2-2" />;
const CrownIcon      = () => <Icon d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />;
const WalletIcon     = () => <Icon d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M20 12h-6a2 2 0 0 0 0 4h6" />;
const ReceiptIcon    = () => <Icon d="M4 2h16v20l-2-1-2 1-2-1-2 1-2-1-2 1-2-1V2zM8 10h8M8 14h4" />;
const ShieldIcon     = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const PlugIcon       = () => <Icon d="M7 16.9A7 7 0 1 1 16.9 7M7 16.9l9-9M9 9l6 6" />;
const TerminalIcon   = () => <Icon d="M4 17l6-6-6-6M12 19h8" />;
const TabletIcon     = () => <Icon d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 15h.01" />;
const QuestionIcon   = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const NAV_GROUPS: NavGroup[] = [
    {
        group: 'Studio',
        items: [
            { id: 'company',  label: 'Dane firmy',      icon: <BuildingIcon /> },
            { id: 'services', label: 'Cennik usług',     icon: <ListChecksIcon /> },
        ],
    },
    {
        group: 'Zespół',
        items: [
            { id: 'team',  label: 'Pracownicy',          icon: <UsersIcon /> },
            { id: 'roles', label: 'Role i uprawnienia',  icon: <ShieldIcon /> },
        ],
    },
    {
        group: 'Komunikacja',
        items: [
            { id: 'templates',       label: 'Szablony SMS',          icon: <MessageIcon /> },
            { id: 'email-templates', label: 'Szablony email',        icon: <MailIcon /> },
            { id: 'documents',       label: 'Dokumenty i podpisy',   icon: <FileSignIcon /> },
            { id: 'tablets',         label: 'Tablety',               icon: <TabletIcon /> },
        ],
    },
    {
        group: 'Konto i rozliczenia',
        items: [
            { id: 'plan',     label: 'Abonament',             icon: <CrownIcon /> },
            { id: 'credits',  label: 'Kredyty SMS i AI',       icon: <WalletIcon /> },
            { id: 'invoices', label: 'Faktury i płatności',    icon: <ReceiptIcon /> },
            { id: 'security', label: 'Bezpieczeństwo',         icon: <ShieldIcon /> },
        ],
    },
];

// ─── Help content map ─────────────────────────────────────────────────────────

const SECTION_HELP: Partial<Record<SectionId, HelpContent>> = {
    company:         COMPANY_HELP,
    services:        SERVICES_HELP,
    documents:       DOCUMENTS_HELP,
    templates:       SMS_TEMPLATES_HELP,
    'email-templates': EMAIL_TEMPLATES_HELP,
    credits:         CREDITS_HELP,
    invoices:        INVOICES_HELP,
};

// ─── Styled components ───────────────────────────────────────────────────────

const Page = styled.div`
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 22px 28px 80px;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
`;

const GridMain = styled.div`
    display: grid;
    grid-template-columns: 232px 1fr;
    gap: 22px;
    align-items: flex-start;
`;

const Nav = styled.nav`
    position: sticky;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const NavGroupEl = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const NavTitle = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0 12px 6px;
`;

const NavItemBtn = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 9px;
    border: none;
    background: ${props => props.$active ? '#fff' : 'transparent'};
    font-family: ${props => props.theme.fonts?.sans ?? 'Inter, system-ui, sans-serif'};
    font-size: 13px;
    font-weight: ${props => props.$active ? 600 : 500};
    color: ${props => props.$active ? '#0ea5e9' : '#334155'};
    cursor: pointer;
    transition: all 180ms;
    text-align: left;
    width: 100%;
    box-shadow: ${props => props.$active ? '0 1px 3px rgba(15,23,42,0.06)' : 'none'};

    &:hover {
        background: #fff;
        color: #0f172a;
    }

    svg { flex-shrink: 0; }
    span { flex: 1; }
`;

const NavBadge = styled.span<{ $active: boolean }>`
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 9999px;
    background: ${props => props.$active ? 'rgba(14,165,233,0.14)' : '#f1f5f9'};
    color: ${props => props.$active ? '#0284c7' : '#64748b'};
`;

const Content = styled.main`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

// ─── Coming-soon placeholder ─────────────────────────────────────────────────

const ComingSoonWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 360px;
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    text-align: center;
    gap: 12px;
    padding: 40px;
`;

const ComingSoonTitle = styled.h3`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const ComingSoonDesc = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    max-width: 360px;
    line-height: 1.6;
`;

const HeaderActionWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
`;

const SectionBreadcrumb = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
    letter-spacing: 0.01em;
`;

const BreadcrumbSep = styled.span`
    font-size: 12px;
    opacity: 0.4;
`;

const ConstructionIcon = () => (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3h16v2H4zM4 8l8 13 8-13H4z" />
    </svg>
);

function ComingSoonSection({ label }: { label: string }) {
    return (
        <ComingSoonWrap>
            <ConstructionIcon />
            <ComingSoonTitle>W przygotowaniu</ComingSoonTitle>
            <ComingSoonDesc>Sekcja „{label}" zostanie udostępniona w jednej z kolejnych aktualizacji.</ComingSoonDesc>
        </ComingSoonWrap>
    );
}

// ─── Main view ───────────────────────────────────────────────────────────────

const VALID_SECTIONS = new Set<SectionId>([
    'company', 'services', 'team', 'roles', 'opening',
    'templates', 'email-templates', 'reminders', 'documents',
    'tablets',
    'plan', 'credits', 'invoices', 'security',
    'integrations', 'api',
]);

// Permission (or owner-only) requirements per settings tab. Tabs without an
// entry are visible to everyone. Hidden tabs disappear from the nav and cannot
// be reached via ?tab= — the view falls back to the first visible tab.
const SECTION_REQUIREMENTS: Partial<Record<SectionId, PermissionRequirement | 'OWNER_ONLY'>> = {
    // Company data (NIP, address, branding) is studio configuration — owner's call.
    company: 'OWNER_ONLY',
    services: 'SERVICES_VIEW',
    team: 'EMPLOYEES_MANAGE',
    roles: 'EMPLOYEES_MANAGE',
    templates: 'COMMUNICATION_SEND',
    'email-templates': 'COMMUNICATION_SEND',
    reminders: 'COMMUNICATION_SEND',
    documents: 'VISITS_DOCUMENTS_MANAGE',
    tablets: 'VISITS_DOCUMENTS_MANAGE',
    // Billing is the owner's domain — no permission code exists for it.
    plan: 'OWNER_ONLY',
    credits: 'OWNER_ONLY',
    invoices: 'OWNER_ONLY',
};

export function SettingsView() {
    const [searchParams] = useSearchParams();
    const { can, isOwner } = usePermissions();

    const canSee = useMemo(() => (id: SectionId) => {
        const requirement = SECTION_REQUIREMENTS[id];
        if (!requirement) return true;
        if (requirement === 'OWNER_ONLY') return isOwner;
        return can(requirement);
    }, [can, isOwner]);

    const visibleNavGroups = useMemo(() => NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(it => canSee(it.id)),
    })).filter(g => g.items.length > 0), [canSee]);

    const firstVisibleSection: SectionId =
        visibleNavGroups[0]?.items[0]?.id ?? 'security';

    const tabParam = searchParams.get('tab') as SectionId | null;
    const initialSection: SectionId =
        tabParam && VALID_SECTIONS.has(tabParam) && canSee(tabParam)
            ? tabParam
            : firstVisibleSection;
    const [section, setSection] = useState<SectionId>(initialSection);
    const [helpOpen, setHelpOpen] = useState(false);

    const activeGroup = visibleNavGroups.find(g => g.items.some(i => i.id === section))?.group ?? '';
    const activeLabel = visibleNavGroups.flatMap(g => g.items).find(i => i.id === section)?.label ?? '';
    const activeHelp  = SECTION_HELP[section] ?? null;

    let content: React.ReactNode;
    if (section === 'company') {
        content = <CompanySection />;
    } else if (section === 'documents') {
        content = <DocumentsSection />;
    } else if (section === 'templates') {
        content = <AutomationSettings />;
    } else if (section === 'email-templates') {
        content = <EmailAutomationSettings />;
    } else if (section === 'services') {
        content = <ServicesSection />;
    } else if (section === 'team') {
        content = <TeamSection />;
    } else if (section === 'roles') {
        content = <RolesSection />;
    } else if (section === 'plan') {
        content = <SubscriptionSettingsPage />;
    } else if (section === 'credits') {
        content = <SmsCreditSection />;
    } else if (section === 'tablets') {
        content = <TabletsSection />;
    } else if (section === 'invoices') {
        content = <InvoicesSection />;
    } else {
        content = <ComingSoonSection label={activeLabel} />;
    }

    return (
        <Page>
            <PageHeader
                title="Ustawienia"
                subtitle="Konfiguracja studia, automatyzacji i konta."
                actions={
                    <HeaderActionWrap>
                        <SectionBreadcrumb>
                            {activeGroup}
                            <BreadcrumbSep>/</BreadcrumbSep>
                            {activeLabel}
                        </SectionBreadcrumb>
                        {activeHelp && (
                            <PageHeaderGhostButton onClick={() => setHelpOpen(true)}>
                                <QuestionIcon />
                                Dowiedz się więcej
                            </PageHeaderGhostButton>
                        )}
                    </HeaderActionWrap>
                }
            />

            <GridMain>
                <Nav>
                    {visibleNavGroups.map(g => (
                        <NavGroupEl key={g.group}>
                            <NavTitle>{g.group}</NavTitle>
                            {g.items.map(it => (
                                <NavItemBtn
                                    key={it.id}
                                    $active={section === it.id}
                                    onClick={() => setSection(it.id)}
                                >
                                    {it.icon}
                                    <span>{it.label}</span>
                                    {it.badge && (
                                        <NavBadge $active={section === it.id}>{it.badge}</NavBadge>
                                    )}
                                </NavItemBtn>
                            ))}
                        </NavGroupEl>
                    ))}
                </Nav>

                <Content>{content}</Content>
            </GridMain>

            {helpOpen && activeHelp && (
                <HelpModal content={activeHelp} onClose={() => setHelpOpen(false)} />
            )}
        </Page>
    );
}
