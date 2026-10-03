// src/modules/employees/components/employee-modal/EmployeeModal.tsx
//
// Okno pracownika nad listą „Zespół" (`/employees?person={id}`). Zastępuje stronę
// `/employees/:id`, która rozciągała kilka sekcji na całą szerokość ekranu, a każde
// wejście i powrót były nawigacją poza listę.
//
// Układ z zatwierdzonej makiety:
// - nagłówek stały na każdej zakładce: nazwisko, rola (przycisk do zmiany), ostatnia
//   aktywność i kontakt - to, po co otwiera się okno najczęściej;
// - zakładki zamiast zwoju sekcji: dojdą Dokumenty i Zarobki, a okno się nie rozrośnie,
//   przybędzie tylko pozycja na pasku;
// - stała wysokość (`stableHeight`): zmiana zakładki nie zmienia rozmiaru okna,
//   przewija się tylko treść zakładki;
// - rzeczy rzadkie i nieodwracalne (reset hasła, blokada, usuwanie) w „Ustawieniach",
//   a nie w nagłówku ani w osobnej „strefie niebezpiecznej".
//
// Bez awatara z inicjałami - decyzja właściciela przy makiecie.

import { useId, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { Copy, Mail, Pencil, Phone } from 'lucide-react';
import { CloseBtn, ModalContent, ModalShell, ModalTitle } from '@/common/components/ModalKit';
import { useToast } from '@/common/components/Toast';
import { Button, Notice, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions';
import { useEmployee } from '../../hooks/useEmployees';
import { useLeaveRequestQueue } from '../../hooks/useLeaveRequests';
import { useTeamWorkTimePeriods } from '../../hooks/useWorkTime';
import { accountStatusOf } from '../../utils/accountStatus';
import { lastSeenShort, seenRecently } from '../../utils/presence';
import type { EmployeeDetail } from '../../types';
import { AddEmployeeModal } from '../AddEmployeeModal';
import { EmployeeWorkTimeSection } from '../EmployeeWorkTimeSection';
import { AccountSettingsPanel } from './AccountSettingsPanel';
import { FuturePanel } from './FuturePanel';
import { LeavesPanel } from './LeavesPanel';
import { RoleControl } from './RoleControl';

export type EmployeeModalTab = 'leaves' | 'worktime' | 'docs' | 'pay' | 'settings';

interface Props {
    employeeId: string;
    onClose: () => void;
}

export function EmployeeModal({ employeeId, onClose }: Props) {
    const titleId = useId();
    const { employee, isLoading, isError, refetch } = useEmployee(employeeId);
    const [tab, setTab] = useState<EmployeeModalTab>('leaves');
    const [editing, setEditing] = useState(false);

    return (
        <>
            <ModalShell isOpen onClose={onClose} size="lg" stableHeight labelledBy={titleId}>
                {isError ? (
                    <ErrorBox>
                        <Head>
                            <ModalTitle id={titleId}>Pracownik</ModalTitle>
                            <CloseBtn onClick={onClose} />
                        </Head>
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać pracownika"
                            action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                        />
                    </ErrorBox>
                ) : isLoading || !employee ? (
                    <>
                        <Head>
                            <ModalTitle id={titleId}>Wczytuję…</ModalTitle>
                            <CloseBtn onClick={onClose} />
                        </Head>
                        <Skeleton aria-busy="true" aria-label="Wczytuję pracownika"><span /><span /><span /></Skeleton>
                    </>
                ) : (
                    <Loaded
                        employee={employee}
                        titleId={titleId}
                        tab={tab}
                        onTab={setTab}
                        onEdit={() => setEditing(true)}
                        onClose={onClose}
                    />
                )}
            </ModalShell>

            {editing && employee && (
                <AddEmployeeModal
                    isOpen
                    employee={employee}
                    onClose={() => setEditing(false)}
                    onSuccess={() => { setEditing(false); void refetch(); }}
                />
            )}
        </>
    );
}

interface LoadedProps {
    employee: EmployeeDetail;
    titleId: string;
    tab: EmployeeModalTab;
    onTab: (tab: EmployeeModalTab) => void;
    onEdit: () => void;
    onClose: () => void;
}

function Loaded({ employee, titleId, tab, onTab, onEdit, onClose }: LoadedProps) {
    const { can } = usePermissions();
    const canApprove = can('EMPLOYEES_LEAVES_APPROVE');
    const queue = useLeaveRequestQueue('PENDING', { enabled: canApprove });
    const { periods } = useTeamWorkTimePeriods(employee.userId ?? '');

    const pendingLeaves = (queue.data?.items ?? []).filter(r => r.employeeId === employee.id).length;
    const pendingCards = employee.userId ? periods.filter(p => p.status === 'SUBMITTED').length : 0;

    const tabs: { key: EmployeeModalTab; label: string; count?: number; future?: boolean }[] = [
        { key: 'leaves', label: 'Urlopy', count: pendingLeaves },
        { key: 'worktime', label: 'Czas pracy', count: pendingCards },
        { key: 'docs', label: 'Dokumenty', future: true },
        { key: 'pay', label: 'Zarobki', future: true },
        { key: 'settings', label: 'Ustawienia' },
    ];

    return (
        <>
            <Head>
                <Who>
                    <ModalTitle id={titleId}>{employee.fullName}</ModalTitle>
                    <MetaLine>
                        <RoleControl employee={employee} />
                        <Presence employee={employee} />
                    </MetaLine>
                </Who>
                <CloseBtn onClick={onClose} />
            </Head>

            <Contacts>
                <Contact icon={<Phone />} value={employee.phone} label="telefon" />
                <Contact icon={<Mail />} value={employee.email} label="e-mail" />
                <EditLink type="button" onClick={onEdit}><Pencil aria-hidden="true" /> Edytuj dane</EditLink>
            </Contacts>

            <Tabs role="tablist" aria-label="Sekcje pracownika">
                {tabs.map(t => (
                    <Tab
                        key={t.key}
                        type="button"
                        role="tab"
                        id={`employee-tab-${t.key}`}
                        aria-selected={tab === t.key}
                        aria-controls="employee-tabpanel"
                        $active={tab === t.key}
                        $future={!!t.future}
                        onClick={() => onTab(t.key)}
                    >
                        {t.label}
                        {!!t.count && <TabCount $active={tab === t.key}>{t.count}</TabCount>}
                    </Tab>
                ))}
            </Tabs>

            <ModalContent id="employee-tabpanel" role="tabpanel" aria-labelledby={`employee-tab-${tab}`}>
                {tab === 'leaves' && <LeavesPanel employeeId={employee.id} />}
                {tab === 'worktime' && (employee.userId
                    ? <EmployeeWorkTimeSection userId={employee.userId} />
                    : <FuturePanel kind="no-account-worktime" firstName={employee.firstName} />)}
                {tab === 'docs' && <FuturePanel kind="docs" firstName={employee.firstName} />}
                {tab === 'pay' && <FuturePanel kind="pay" firstName={employee.firstName} />}
                {tab === 'settings' && <AccountSettingsPanel employee={employee} onEmployeeDeleted={onClose} />}
            </ModalContent>
        </>
    );
}

/**
 * Jedno zdanie zależne od stanu konta. Zielona kropka tylko przy aktywności z ostatniej
 * godziny - dokładniej backend nie wie (zapisuje aktywność raz na godzinę).
 */
function Presence({ employee }: { employee: EmployeeDetail }) {
    const account = employee.account;
    const status = accountStatusOf(account);
    if (status === 'none') return <PresenceText><Dot />Nie loguje się do aplikacji</PresenceText>;
    if (status === 'blocked') return <PresenceText><Dot $tone="danger" />Konto zablokowane</PresenceText>;
    if (status === 'pending') return <PresenceText><Dot $tone="warn" />Jeszcze nie aktywował konta</PresenceText>;
    const seen = account?.lastSeenAt ?? account?.lastLoginAt;
    if (!seen) return <PresenceText><Dot />Brak danych o ostatniej aktywności</PresenceText>;
    return (
        <PresenceText>
            <Dot $tone={seenRecently(seen) ? 'ok' : undefined} />
            Ostatnio w aplikacji: {lastSeenShort(seen)}
        </PresenceText>
    );
}

function Contact({ icon, value, label }: { icon: ReactNode; value: string | null; label: string }) {
    const { showSuccess, showError } = useToast();
    if (!value) return <ContactItem $empty>{icon}<span>Brak: {label}</span></ContactItem>;
    const copy = () => {
        navigator.clipboard?.writeText(value)
            .then(() => showSuccess('Skopiowano', value))
            .catch(() => showError('Nie udało się skopiować', 'Zaznacz tekst i skopiuj go ręcznie.'));
    };
    return (
        <ContactItem>
            {icon}
            <span>{value}</span>
            <CopyBtn type="button" onClick={copy} aria-label={`Kopiuj ${label}`}><Copy /></CopyBtn>
        </ContactItem>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Head = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 22px 24px 0;
    flex-shrink: 0;

    @media (max-width: 640px) { padding: 18px 16px 0; }
`;

const Who = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

const MetaLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
`;

const PresenceText = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: ${ui.textSecondary};
`;

const DOT: Record<'ok' | 'warn' | 'danger', string> = { ok: '#16a34a', warn: '#f59e0b', danger: '#dc2626' };

const Dot = styled.i<{ $tone?: 'ok' | 'warn' | 'danger' }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$tone ? DOT[p.$tone] : ui.textFaint};
    box-shadow: ${p => p.$tone === 'ok' ? `0 0 0 3px ${ui.okTint}` : 'none'};
`;

const Contacts = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 22px;
    padding: 12px 24px 0;
    flex-shrink: 0;

    @media (max-width: 640px) { padding: 12px 16px 0; }
`;

const ContactItem = styled.span<{ $empty?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
    font-size: 14px;
    color: ${p => p.$empty ? ui.textFaint : ui.inkSoft};

    > svg { width: 15px; height: 15px; color: ${ui.textMuted}; flex-shrink: 0; }
    > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; user-select: all; }
`;

const CopyBtn = styled.button`
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: ${ui.textFaint};
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:hover { background: ${ui.surfaceAlt}; color: ${ui.ink}; }
`;

const EditLink = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;

    svg { width: 14px; height: 14px; }
    &:hover { color: ${ui.brandStrong}; text-decoration: underline; text-underline-offset: 3px; }
`;

/* Zakładki i licznik jak TabBar na stronie „Pracownicy" - ten sam język w oknie i pod nim. */
const Tabs = styled.div`
    display: flex;
    gap: 2px;
    margin-top: 14px;
    padding: 0 24px;
    border-bottom: 1px solid ${ui.line};
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;

    &::-webkit-scrollbar { display: none; }
    @media (max-width: 640px) { padding: 0 12px; }
`;

const Tab = styled.button<{ $active: boolean; $future: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: -1px;
    padding: 10px 14px;
    border: 0;
    border-bottom: 2px solid ${p => p.$active ? '#0ea5e9' : 'transparent'};
    background: transparent;
    font: inherit;
    font-size: 15px;
    font-weight: ${p => p.$active ? 700 : 500};
    color: ${p => p.$active ? '#0ea5e9' : p.$future ? ui.textFaint : ui.textSecondary};
    white-space: nowrap;
    cursor: pointer;

    &:hover { color: ${p => p.$active ? '#0ea5e9' : ui.ink}; }
`;

const TabCount = styled.span<{ $active: boolean }>`
    min-width: 20px;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.12)' : '#f1f5f9'};
    color: ${p => p.$active ? '#0ea5e9' : '#94a3b8'};
`;

const ErrorBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;

    > div:last-child { margin: 0 24px; }
`;

const Skeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 24px;

    span { display: block; height: 18px; border-radius: 6px; background: ${ui.surfaceAlt}; }
    span:first-child { width: 40%; }
    span:nth-child(2) { width: 65%; }
    span:nth-child(3) { width: 100%; height: 220px; }
`;
