// src/modules/settings/views/SettingsView.tsx
//
// Rama ustawień: menu sekcji z lewej, nagłówek sekcji i jej treść z prawej.
//
// Przed przebudową nad wszystkim stał ciemny blok „Ustawienia" (125 px na
// komputerze, ~200 px na telefonie), który powtarzał nazwę sekcji w okruszku,
// a sama sekcja nie miała tytułu. Grupy menu były wersalikami 10 px, a na telefonie
// wybór sekcji chował się w rozwijanej liście „Cennik usług · Studio".
//
// Teraz:
//   - tytuł strony i wyszukiwarka stoją nad menu, grupy zwykłym pismem, a liczniki
//     mówią, gdzie coś czeka (listy obecności do zatwierdzenia, saldo kredytów);
//   - każda sekcja ma nagłówek z tytułem, jednym zdaniem „do czego to służy",
//     „Jak to działa" i swoją akcją główną (SettingsHeaderActions);
//   - niezapisane zmiany sekcji (useSettingsDirty) blokują wyjście z sekcji
//     i z ustawień oknem potwierdzenia, a zamknięcie karty - pytaniem przeglądarki;
//   - telefon otwiera spis sekcji, a sekcja ma „‹ Ustawienia" do powrotu.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
    Building2, ChevronLeft, ChevronRight, Crown, FileSignature, Filter, HelpCircle, IdCard, Keyboard,
    ListChecks, MessageSquare, Receipt, Search, ShieldCheck, TabletSmartphone, Tag, Users, Wallet,
} from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, ui } from '@/common/components/ui';
import { useMediaQuery } from '@/common/hooks';
import { usePermissions } from '@/core/permissions';
import type { AccessRequirement } from '@/core/permissions';
import { CompanySection } from '../components/CompanySection';
import { LabelsSection, type LabelsSubView } from '../components/LabelsSection';
import { ServicesAndCareSection, type ServicesSubView } from '../components/ServicesAndCareSection';
import { DocumentsSection } from '../components/DocumentsSection';
import { TeamAndRolesSection } from '../components/TeamAndRolesSection';
import type { TeamSubView } from '../components/TeamAndRolesSection';
import { SubscriptionSettingsPage } from '@/modules/subscription';
import { MessageTemplatesSection } from '@/modules/message-templates';
import { SmsCreditSection } from '../components/SmsCreditSection';
import { InvoicesSection } from '../components/InvoicesSection';
import { MobileDevicesSection, type MobileDevicesSubView } from '../components/MobileDevicesSection';
import { VisitCardSection } from '../components/VisitCardSection';
import { LeadsSettingsSection } from '../components/LeadsSettingsSection';
import { ShortcutsSection } from '../components/ShortcutsSection';
import { SecuritySection } from '../components/SecuritySection';
import { HelpModal } from '../components/shared/SettingsLayout';
import type { HelpContent } from '../components/shared/SettingsLayout';
import { SettingsChromeContext, type SettingsChromeValue } from '../components/shared/settingsChrome';
import { pendingCount } from '../components/settlements/settlementFormat';
import { useAttendanceSheets } from '../hooks/useAttendanceSheets';
import { useSmsCreditBalance } from '../hooks/useSmsCredits';
import {
    COMPANY_HELP,
    SERVICES_HELP,
    DOCUMENTS_HELP,
    MESSAGE_TEMPLATES_HELP,
    CREDITS_HELP,
    INVOICES_HELP,
} from '../helpContent';

// ─── Sekcje ──────────────────────────────────────────────────────────────────

type SectionId =
    | 'company' | 'labels' | 'services' | 'team'
    | 'templates' | 'documents'
    | 'mobile-devices' | 'visit-card' | 'leads'
    | 'shortcuts'
    | 'plan' | 'credits' | 'invoices' | 'security';

interface SectionDef {
    id: SectionId;
    label: string;
    /** Jedno zdanie pod tytułem sekcji. */
    description: string;
    /** Kilka słów w spisie sekcji na telefonie - pełne zdanie łamało się tam na trzy linie. */
    summary: string;
    icon: ReactNode;
    /** Dodatkowe słowa dla wyszukiwarki - użytkownik szuka „NIP", nie „Dane firmy". */
    keywords?: string;
    help?: HelpContent;
}

interface SectionGroup {
    group: string;
    items: SectionDef[];
}

const GROUPS: SectionGroup[] = [
    {
        group: 'Studio',
        items: [
            {
                id: 'company', label: 'Dane firmy', summary: 'NIP, adres i logo', icon: <Building2 />, help: COMPANY_HELP,
                description: 'Pojawiają się na fakturach, protokołach przyjęcia i wydania oraz w stopce wiadomości do klientów.',
                keywords: 'nip regon adres logo konto bankowe telefon email firma',
            },
            {
                id: 'services', label: 'Cennik usług', summary: 'Usługi, pakiety i instrukcje pielęgnacji', icon: <ListChecks />, help: SERVICES_HELP,
                description: 'Cenę wpisujesz w brutto albo w netto, druga kwota liczy się sama.',
                keywords: 'ceny usługi pakiety vat instrukcje pielęgnacji',
            },
            {
                id: 'labels', label: 'Oznaczenia', summary: 'Numeracja wizyt i kolory w kalendarzu', icon: <Tag />,
                description: 'Numeracja wizyt i kolory, którymi oznaczasz rezerwacje w kalendarzu.',
                keywords: 'numeracja numer wizyty kolory kalendarz',
            },
            {
                id: 'documents', label: 'Dokumenty i podpisy', summary: 'Protokoły i zgody do podpisu', icon: <FileSignature />, help: DOCUMENTS_HELP,
                description: 'Protokoły i zgody, które klient podpisuje przy przyjęciu i wydaniu pojazdu.',
                keywords: 'protokół zgody rodo podpis logo dokumentu',
            },
        ],
    },
    {
        // Pracownicy i role były osobnymi zakładkami; każda sprawa dotykająca jednych
        // wymagała drugich, więc to jedna sekcja z trzema widokami.
        group: 'Zespół',
        items: [
            {
                id: 'team', label: 'Pracownicy i role', summary: 'Dostęp, role i czas pracy', icon: <Users />,
                description: 'Kto ma dostęp do systemu, co może w nim robić i czy liczymy mu czas pracy.',
                keywords: 'pracownik rola uprawnienia konto lista obecności rozliczenia czas pracy',
            },
        ],
    },
    {
        group: 'Komunikacja z klientem',
        items: [
            {
                id: 'templates', label: 'Wiadomości automatyczne', summary: 'Potwierdzenia, przypomnienia, gotowość do odbioru', icon: <MessageSquare />, help: MESSAGE_TEMPLATES_HELP,
                description: 'SMS-y i e-maile, które system wysyła sam: potwierdzenia, przypomnienia, gotowość do odbioru.',
                keywords: 'szablony sms email przypomnienie nadawca',
            },
            {
                id: 'visit-card', label: 'Karta wizyty', summary: 'Strona śledzenia wizyty dla klienta', icon: <IdCard />,
                description: 'Strona, na której klient śledzi swoją wizytę z linku w SMS-ie.',
                keywords: 'link klient śledzenie',
            },
            {
                id: 'leads', label: 'Leady', summary: 'Automat i przypomnienia o zapytaniach', icon: <Filter />,
                description: 'Kiedy system zakłada lead sam i kiedy przypomina o nieodpisanym zapytaniu.',
                keywords: 'zapytania automat alert',
            },
        ],
    },
    {
        group: 'Urządzenia',
        items: [
            {
                id: 'mobile-devices', label: 'Tablety, telefon, kontakty', summary: 'Podpis na tablecie, powiadomienia, kontakty', icon: <TabletSmartphone />,
                description: 'Tablety do podpisu, powiadomienia na telefon i synchronizacja kontaktów.',
                keywords: 'tablet parowanie powiadomienia push carddav kontakty telefon',
            },
            {
                id: 'shortcuts', label: 'Skróty klawiszowe', summary: 'Tylko w tej przeglądarce', icon: <Keyboard />,
                description: 'Skróty w tej przeglądarce. Nie zmieniają niczego innym osobom w studiu.',
                keywords: 'klawiatura',
            },
        ],
    },
    {
        group: 'Konto i płatności',
        items: [
            {
                id: 'plan', label: 'Abonament', summary: 'Plan, dodatki i płatności', icon: <Crown />,
                description: 'Twój plan, dodatki i historia płatności.',
                keywords: 'plan płatność subskrypcja dodatki faktura',
            },
            {
                // Kredyty schodzą i przy SMS-ach, i przy funkcjach AI - stąd nazwa z obu.
                id: 'credits', label: 'Kredyty SMS i AI', summary: 'Saldo i dokupowanie pakietów', icon: <Wallet />, help: CREDITS_HELP,
                description: 'Saldo kredytów i dokupowanie pakietów. Kredyty schodzą przy SMS-ach i funkcjach AI.',
                keywords: 'sms kredyty pakiet zakup ai',
            },
            {
                // Sekcja pokazuje tylko połączenie z KSeF; historia płatności jest w „Abonamencie".
                id: 'invoices', label: 'KSeF', summary: 'Pobieranie faktur kosztowych', icon: <Receipt />, help: INVOICES_HELP,
                description: 'Połączenie z Krajowym Systemem e-Faktur do pobierania faktur kosztowych.',
                keywords: 'faktury e-faktury ksef',
            },
            {
                id: 'security', label: 'Bezpieczeństwo', summary: 'PIN, hasło, blokada ekranu', icon: <ShieldCheck />,
                description: 'PIN, hasło i automatyczna blokada ekranu.',
                keywords: 'pin hasło blokada wyczyść konto',
            },
        ],
    },
];

const ALL_SECTIONS = GROUPS.flatMap(g => g.items);
const VALID_SECTIONS = new Set<SectionId>(ALL_SECTIONS.map(s => s.id));

/**
 * Stare wartości `?tab=`, które muszą dalej działać. Linki siedzą w toastach, mailach
 * i zakładkach przeglądarki, więc przemianowana sekcja przekierowuje, zamiast
 * po cichu wrzucać na domyślną.
 */
const SECTION_ALIASES: Record<string, { section: SectionId; view?: SubView }> = {
    'email-templates': { section: 'templates' },
    'roles': { section: 'team', view: 'roles' },
    'sms-credits': { section: 'credits' },
    // Numeracja wizyt przestała być osobną sekcją i jest widokiem „Oznaczeń".
    'visit-numbering': { section: 'labels', view: 'numbering' },
    'tablets': { section: 'mobile-devices', view: 'tablets' },
};

/** Sekcje z widokami wewnętrznymi trzymają je w tym samym parametrze URL. */
type SubView = TeamSubView | LabelsSubView | MobileDevicesSubView | ServicesSubView;

const VIEW_PARAM = 'view';
const SECTIONS_WITH_SUBVIEWS = new Set<SectionId>(['team', 'labels', 'mobile-devices', 'services']);

// Wymagania dostępu per sekcja. Sekcje bez wpisu widzi każdy. Ukryte znikają z menu
// i nie da się do nich wejść przez ?tab= - widok spada na pierwszą widoczną.
const SECTION_REQUIREMENTS: Partial<Record<SectionId, AccessRequirement>> = {
    // Dane firmy (NIP, adres, logo) to konfiguracja studia - decyzja właściciela.
    company: 'OWNER_ONLY',
    // Kolory są ustawieniem operacyjnym (kto tworzy wizyty, ten je oznacza);
    // numeracja zostaje decyzją właściciela i chowa się w środku sekcji.
    labels: 'VISITS_CREATE',
    services: 'VISITS_CREATE',
    team: 'EMPLOYEES_MANAGE',
    templates: 'COMMUNICATION_SEND',
    documents: 'VISITS_CREATE',
    'mobile-devices': 'VISITS_CREATE',
    'visit-card': 'VISITS_CREATE',
    // Automat zakłada leady w imieniu studia i kosztuje - jak każde ustawienie, które
    // zmienia zawartość CRM-a bez udziału człowieka, zostaje przy właścicielu.
    // Backend pilnuje tego samego: PATCH /company/auto-lead-config jest @RequiresOwner.
    leads: 'OWNER_ONLY',
    // Rozliczenia z operatorem to domena właściciela: nie ma na nie kodu uprawnienia.
    plan: 'OWNER_ONLY',
    credits: 'OWNER_ONLY',
    invoices: 'OWNER_ONLY',
};

/** Poniżej tej szerokości menu i treść nie mieszczą się obok siebie. */
const PHONE_QUERY = '(max-width: 900px)';

// ─── Style ───────────────────────────────────────────────────────────────────

const Page = styled(PageContainer)`
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
    gap: 28px;
    align-items: start;
    min-width: 0;
    padding-block: 28px 120px;

    @media ${PHONE_QUERY} {
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
        padding-block: 16px 160px;
    }
`;

const Nav = styled.nav`
    position: sticky;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;

    @media ${PHONE_QUERY} { position: static; }
`;

const PageTitle = styled.h1`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};

    @media ${PHONE_QUERY} { font-size: 26px; }
`;

const SearchBox = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
    color: ${ui.textFaint};

    &:focus-within { border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
    svg { width: 15px; height: 15px; flex-shrink: 0; }
    input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 16px; color: ${ui.ink}; }
    @media (min-width: 768px) { input { font-size: 13.5px; } }
    @media ${PHONE_QUERY} { height: 44px; }
`;

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const GroupTitle = styled.h2`
    margin: 0;
    padding: 0 10px 6px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};

    @media ${PHONE_QUERY} { padding: 0 4px 8px; }
`;

const NavItem = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 10px;
    background: ${p => p.$active ? ui.surface : 'transparent'};
    box-shadow: ${p => p.$active ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'};
    font-family: inherit;
    font-size: 14px;
    font-weight: ${p => p.$active ? 600 : 500};
    color: ${p => p.$active ? ui.brandInk : ui.inkSoft};
    text-align: left;
    cursor: pointer;

    > svg { width: 16px; height: 16px; flex-shrink: 0; color: ${p => p.$active ? ui.brandInk : ui.textMuted}; }
    > span { flex: 1; min-width: 0; }
    &:hover { background: ${ui.surface}; color: ${ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }
`;

const Counter = styled.em<{ $warn?: boolean }>`
    font-style: normal;
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.$warn ? ui.warnInk : ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

/* Spis sekcji na telefonie: lista na białej powierzchni, wiersz 60 px pod palec. */
const IndexList = styled.div`
    display: flex;
    flex-direction: column;
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: 16px;
    overflow: hidden;
`;

const IndexItem = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-top: 1px solid ${ui.lineFaint};
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:first-child { border-top: none; }
    &:active { background: ${ui.surfaceSoft}; }
    > svg { width: 16px; height: 16px; color: ${ui.textFaint}; flex-shrink: 0; }
`;

const IndexIcon = styled.span`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: ${ui.brandTint};
    color: ${ui.brandInk};

    svg { width: 17px; height: 17px; }
`;

const IndexText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    strong { font-size: 15px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 12.5px; line-height: 1.4; color: ${ui.textMuted}; }
    span.warn { color: ${ui.warnInk}; }
`;

const Main = styled.main`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
`;

const Back = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: -4px;
    padding: 4px;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;

    svg { width: 18px; height: 18px; }
`;

const Head = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px 20px;
    flex-wrap: wrap;
`;

const HeadText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    flex: 1 1 360px;

    h2 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.015em; color: ${ui.ink}; }
    p { margin: 0; max-width: 680px; font-size: 14px; line-height: 1.5; color: ${ui.textSecondary}; }
    @media ${PHONE_QUERY} { h2 { font-size: 24px; } }
`;

const HeadActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    &:empty { display: none; }
    @media ${PHONE_QUERY} { width: 100%; > * { flex: 1 1 auto; } }
`;

const HeadSide = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;

    @media ${PHONE_QUERY} { width: 100%; justify-content: flex-start; }
`;

const Empty = styled.p`
    margin: 0;
    padding: 0 10px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

function sheetsWord(n: number): string {
    if (n === 1) return '1 lista obecności do zatwierdzenia';
    const u = n % 10;
    const t = n % 100;
    return `${n} ${u >= 2 && u <= 4 && (t < 12 || t > 14) ? 'listy obecności' : 'list obecności'} do zatwierdzenia`;
}

// ─── Widok ───────────────────────────────────────────────────────────────────

export function SettingsView() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { can, isOwner } = usePermissions();
    const isPhone = useMediaQuery(PHONE_QUERY);

    const canSee = useCallback((id: SectionId) => {
        const requirement = SECTION_REQUIREMENTS[id];
        if (!requirement) return true;
        if (requirement === 'OWNER_ONLY') return isOwner;
        return can(requirement);
    }, [can, isOwner]);

    const visibleGroups = useMemo(() => GROUPS
        .map(g => ({ ...g, items: g.items.filter(it => canSee(it.id)) }))
        .filter(g => g.items.length > 0), [canSee]);

    // Właściciel i kierownik lądują na pierwszej widocznej sekcji. Zwykły pracownik -
    // na bezpieczeństwie (ustawienie PIN-u), żeby pierwszy render nie pytał API
    // o sekcje, do których backend go nie wpuści.
    const firstVisible: SectionId = (isOwner || can('EMPLOYEES_MANAGE'))
        ? (visibleGroups[0]?.items[0]?.id ?? 'security')
        : 'security';

    // Adres jest stanem sekcji, a nie jednorazowym ziarnem - dzięki temu działają
    // linki, wstecz/dalej i „wyślij mi ten ekran".
    const rawTab = searchParams.get('tab') ?? '';
    const alias = SECTION_ALIASES[rawTab];
    const tabParam = (alias?.section ?? rawTab) as SectionId;
    const hasSection = VALID_SECTIONS.has(tabParam) && canSee(tabParam);
    const section: SectionId = hasSection ? tabParam : firstVisible;
    // Telefon bez wybranej sekcji pokazuje spis zamiast pierwszej sekcji z brzegu.
    const showIndex = isPhone && !hasSection;

    const viewParam = alias?.view ?? searchParams.get(VIEW_PARAM);
    const teamSubView: TeamSubView = viewParam === 'roles' || viewParam === 'settlements' ? viewParam : 'employees';
    const labelsSubView: LabelsSubView = viewParam === 'colors' ? 'colors' : 'numbering';
    const servicesSubView: ServicesSubView = viewParam === 'care' ? 'care' : 'pricing';
    const mobileDevicesSubView: MobileDevicesSubView =
        viewParam === 'notifications' || viewParam === 'contacts' ? viewParam : 'tablets';

    // ── Liczniki w menu: tylko dla tych, którzy widzą daną sekcję ──
    const { sheets } = useAttendanceSheets({ enabled: canSee('team') });
    const toApprove = pendingCount(sheets);
    const { data: balance } = useSmsCreditBalance({ enabled: canSee('credits') });

    const counterFor = (id: SectionId): { text: string; warn?: boolean; long?: string } | null => {
        if (id === 'team' && toApprove > 0) return { text: String(toApprove), warn: true, long: sheetsWord(toApprove) };
        if (id === 'credits' && typeof balance?.availableCredits === 'number') {
            const n = balance.availableCredits.toLocaleString('pl-PL');
            return { text: n, long: `${n} na koncie` };
        }
        return null;
    };

    // ── Niezapisane zmiany ──
    const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(() => new Set());
    const setDirty = useCallback((id: string, dirty: boolean) => {
        setDirtyIds(prev => {
            if (prev.has(id) === dirty) return prev;
            const next = new Set(prev);
            if (dirty) next.add(id); else next.delete(id);
            return next;
        });
    }, [setDirtyIds]);
    const isDirty = dirtyIds.size > 0;

    // Wyjście z sekcji (inna sekcja, inny widok, inna strona aplikacji) przy niezapisanych
    // zmianach czeka na decyzję. Zmiana samego `?view=` w tej samej sekcji też, bo
    // odmontowuje widok z edycją.
    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        if (!isDirty) return false;
        if (currentLocation.pathname !== nextLocation.pathname) return true;
        const cur = new URLSearchParams(currentLocation.search);
        const next = new URLSearchParams(nextLocation.search);
        return cur.get('tab') !== next.get('tab') || cur.get(VIEW_PARAM) !== next.get(VIEW_PARAM);
    });

    useEffect(() => {
        if (!isDirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    const [headerActions, setHeaderActions] = useState<HTMLElement | null>(null);
    const chrome = useMemo<SettingsChromeValue>(() => ({ setDirty, headerActions }), [setDirty, headerActions]);

    const [helpOpen, setHelpOpen] = useState(false);
    const [query, setQuery] = useState('');

    const goToSection = useCallback((next: SectionId, view?: SubView) => {
        setSearchParams(prev => {
            const params = new URLSearchParams(prev);
            params.set('tab', next);
            if (view && SECTIONS_WITH_SUBVIEWS.has(next)) params.set(VIEW_PARAM, view);
            else params.delete(VIEW_PARAM);
            return params;
        });
    }, [setSearchParams]);

    const backToIndex = () => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.delete('tab');
        params.delete(VIEW_PARAM);
        return params;
    });

    const q = normalize(query.trim());
    const filteredGroups = q
        ? visibleGroups
            .map(g => ({ ...g, items: g.items.filter(it => normalize(`${it.label} ${g.group} ${it.keywords ?? ''}`).includes(q)) }))
            .filter(g => g.items.length > 0)
        : visibleGroups;

    const active = ALL_SECTIONS.find(s => s.id === section)!;

    let content: ReactNode;
    if (section === 'company') {
        content = <CompanySection />;
    } else if (section === 'labels') {
        content = (
            <LabelsSection
                subView={labelsSubView}
                onSubViewChange={view => goToSection('labels', view)}
                canSeeNumbering={isOwner}
            />
        );
    } else if (section === 'documents') {
        content = <DocumentsSection />;
    } else if (section === 'templates') {
        content = <MessageTemplatesSection />;
    } else if (section === 'services') {
        content = (
            <ServicesAndCareSection
                subView={servicesSubView}
                onSubViewChange={view => goToSection('services', view)}
            />
        );
    } else if (section === 'team') {
        content = (
            <TeamAndRolesSection
                subView={teamSubView}
                onSubViewChange={view => goToSection('team', view)}
            />
        );
    } else if (section === 'plan') {
        content = <SubscriptionSettingsPage />;
    } else if (section === 'credits') {
        content = <SmsCreditSection />;
    } else if (section === 'mobile-devices') {
        // Tablety do podpisu, powiadomienia na telefon i synchronizacja kontaktów -
        // trzy osobne widoki jednego tematu.
        content = (
            <MobileDevicesSection
                subView={mobileDevicesSubView}
                onSubViewChange={view => goToSection('mobile-devices', view)}
            />
        );
    } else if (section === 'visit-card') {
        content = <VisitCardSection />;
    } else if (section === 'leads') {
        content = <LeadsSettingsSection />;
    } else if (section === 'shortcuts') {
        content = <ShortcutsSection />;
    } else if (section === 'invoices') {
        content = <InvoicesSection />;
    } else {
        content = <SecuritySection />;
    }

    const search = (
        <SearchBox>
            <Search aria-hidden="true" />
            <input
                type="search"
                aria-label="Szukaj ustawienia"
                placeholder="Szukaj ustawienia"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
        </SearchBox>
    );

    // ── Telefon: spis sekcji ──
    if (showIndex) {
        return (
            <Page as="div">
                <Main>
                    <PageTitle>Ustawienia</PageTitle>
                    {search}
                    {filteredGroups.length === 0 && <Empty>Nic nie pasuje do „{query.trim()}".</Empty>}
                    {filteredGroups.map(g => (
                        <Group key={g.group}>
                            <GroupTitle>{g.group}</GroupTitle>
                            <IndexList>
                                {g.items.map(it => {
                                    const counter = counterFor(it.id);
                                    return (
                                        <IndexItem key={it.id} type="button" onClick={() => goToSection(it.id)}>
                                            <IndexIcon aria-hidden="true">{it.icon}</IndexIcon>
                                            <IndexText>
                                                <strong>{it.label}</strong>
                                                {counter?.long
                                                    ? <span className={counter.warn ? 'warn' : undefined}>{counter.long}</span>
                                                    : <span>{it.summary}</span>}
                                            </IndexText>
                                            <ChevronRight aria-hidden="true" />
                                        </IndexItem>
                                    );
                                })}
                            </IndexList>
                        </Group>
                    ))}
                </Main>
            </Page>
        );
    }

    return (
        <SettingsChromeContext.Provider value={chrome}>
            <Page as="div">
                {!isPhone && (
                    <Nav aria-label="Sekcje ustawień">
                        <PageTitle>Ustawienia</PageTitle>
                        {search}
                        {filteredGroups.length === 0 && <Empty>Nic nie pasuje do „{query.trim()}".</Empty>}
                        {filteredGroups.map(g => (
                            <Group key={g.group}>
                                <GroupTitle>{g.group}</GroupTitle>
                                {g.items.map(it => {
                                    const counter = counterFor(it.id);
                                    return (
                                        <NavItem
                                            key={it.id}
                                            type="button"
                                            $active={section === it.id}
                                            aria-current={section === it.id ? 'page' : undefined}
                                            onClick={() => goToSection(it.id)}
                                        >
                                            {it.icon}
                                            <span>{it.label}</span>
                                            {counter && <Counter $warn={counter.warn} title={counter.long}>{counter.text}</Counter>}
                                        </NavItem>
                                    );
                                })}
                            </Group>
                        ))}
                    </Nav>
                )}

                <Main>
                    {isPhone && (
                        <Back type="button" onClick={backToIndex}><ChevronLeft aria-hidden="true" />Ustawienia</Back>
                    )}
                    <Head>
                        <HeadText>
                            <h2>{active.label}</h2>
                            <p>{active.description}</p>
                        </HeadText>
                        <HeadSide>
                            {active.help && (
                                <Button variant="ghost" onClick={() => setHelpOpen(true)}>
                                    <HelpCircle />Jak to działa
                                </Button>
                            )}
                            <HeadActions ref={setHeaderActions} />
                        </HeadSide>
                    </Head>
                    {content}
                </Main>
            </Page>

            {helpOpen && active.help && <HelpModal content={active.help} onClose={() => setHelpOpen(false)} />}

            <ConfirmationModal
                isOpen={blocker.state === 'blocked'}
                title="Porzucić niezapisane zmiany?"
                message="W tej sekcji są zmiany, których nie zapisano. Jeśli teraz wyjdziesz, przepadną."
                variant="danger"
                confirmText="Porzuć zmiany"
                cancelText="Wróć do edycji"
                onConfirm={() => {
                    setDirtyIds(new Set());
                    blocker.proceed?.();
                }}
                onCancel={() => blocker.reset?.()}
            />
        </SettingsChromeContext.Provider>
    );
}
