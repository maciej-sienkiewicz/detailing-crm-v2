import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Mail, MoreVertical, Pencil, Plus, UserPlus } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { formatDateTime } from '@/common/utils';
import {
    ActionMenu, Button, Card, IconButton, MenuItem, Notice, StatusPill, useActionMenu,
} from '@/common/components/ui';
import {
    ColLabel, SkeletonBox, Pager, PagerInfo, PagerControls, PagerBtn,
} from './rbacShared.styles';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import {
    useEmployees, useCreateEmployee, useUpdateEmployee, useCreateAccount, useResendInvitation,
} from '../hooks/useTeam';
import { useRoles } from '../hooks/useRoles';
import { rolesApi } from '../api/rolesApi';
import { EmployeeFormModal, type AccountInvite } from './team/EmployeeFormModal';
import { reportMutationError } from './team/mutationError';
import type {
    CreateEmployeeFormOutput, TeamEmployeeListItem, UpdateEmployeeRequest,
} from '../teamTypes';

/** Also the page size the merged tab reads to label its segment. */
export const TEAM_PAGE_SIZE = 20;

const PAGE_SIZE = TEAM_PAGE_SIZE;

function buildPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

interface TeamSectionProps {
    /** Fraza z pola „Szukaj osoby" nad listą (stoi obok przełącznika widoków). */
    search?: string;
    /** Jumps to the roles view of the merged tab; absent when rendered standalone. */
    onGoToRoles?: () => void;
    /** Otwiera okno listy obecności - to samo co w Rozliczeniach. */
    onOpenAttendance?: () => void;
}

type Editing = { employee: TeamEmployeeListItem; focusAccount: boolean };

export function TeamSection({ search = '', onGoToRoles, onOpenAttendance }: TeamSectionProps = {}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [page, setPage] = useState(1);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editing, setEditing] = useState<Editing | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const menu = useActionMenu<TeamEmployeeListItem>();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const filters = { search: debouncedSearch, page, limit: PAGE_SIZE };
    const { items, pagination, isLoading, isError, refetch } = useEmployees(filters);

    const createEmployee = useCreateEmployee();
    const updateEmployee = useUpdateEmployee();
    const createAccount = useCreateAccount();
    const resendInvitation = useResendInvitation();
    const { roles } = useRoles();

    const totalItems = pagination?.totalItems ?? 0;
    const totalPages = pagination?.totalPages ?? 1;

    /**
     * Moduł Czasu pracy jest cechą ROLI (`trackWorkTime`), nie pracownika - lista
     * pracowników niesie tylko nazwę roli, więc flagę bierzemy z listy ról, którą ten
     * widok i tak już ma wczytaną.
     */
    const workTimeRoleIds = new Set(roles.filter(r => r.trackWorkTime).map(r => r.id));
    const hasWorkTime = (roleId: string | undefined) => !!roleId && workTimeRoleIds.has(roleId);

    // An account with no role is the quiet failure this list never used to show: the
    // person signs in and lands on "Brak przypisanych uprawnień".
    const lockedOut = items.filter(e => e.hasAccount && !e.role);

    /**
     * One call, one transaction. This used to be a chain of three requests: create
     * employee, provision account, assign role, and it could stop halfway and still
     * report success, leaving a person who could not sign in. The backend already
     * accepts the whole thing at once, so a failure now leaves nothing behind.
     *
     * Błąd zostawia okno otwarte z wpisanymi danymi i mówi, co się stało - wcześniej
     * przy 5xx albo braku sieci przycisk wracał do „Dodaj pracownika" bez słowa.
     */
    const handleCreate = (data: CreateEmployeeFormOutput) => {
        createEmployee.mutate(
            {
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                email: data.email,
                createAccount: data.createAccount,
                roleId: data.roleId || null,
            },
            {
                onSuccess: () => {
                    if (!data.createAccount) {
                        showSuccess('Pracownik dodany');
                    } else if (data.roleId) {
                        showSuccess('Pracownik dodany', 'Zaproszenie do założenia konta zostało wysłane.');
                    } else {
                        showSuccess(
                            'Pracownik dodany',
                            'Konto powstało bez roli, przypisz ją, żeby pracownik zobaczył jakikolwiek moduł.',
                        );
                    }
                    setIsAddOpen(false);
                },
                onError: error => reportMutationError(showError, 'Nie udało się dodać pracownika', error),
            },
        );
    };

    /**
     * Zapis z okna edycji: dane osobowe, a u osoby bez konta - zaproszenie do systemu.
     * To trzy kroki (dane, konto, rola), bo backend zakłada konto osobnym wywołaniem;
     * każdy krok zgłasza własny błąd, żeby było wiadomo, na którym stanęło.
     */
    const handleUpdate = async (payload: UpdateEmployeeRequest | null, invite: AccountInvite | null) => {
        if (!editing) return;
        const employeeId = editing.employee.id;
        setSavingEdit(true);
        try {
            if (payload) {
                try {
                    await updateEmployee.mutateAsync({ employeeId, payload });
                } catch (error) {
                    reportMutationError(showError, 'Nie udało się zapisać zmian', error);
                    return;
                }
            }
            if (!invite) {
                showSuccess('Zmiany zapisane');
                setEditing(null);
                return;
            }

            let userId: string;
            try {
                ({ userId } = await createAccount.mutateAsync({ employeeId, payload: { email: invite.email } }));
            } catch (error) {
                // Dane (jeśli były zmiany) już się zapisały - okno zostaje, można ponowić samo zaproszenie.
                reportMutationError(showError, 'Nie udało się wysłać zaproszenia', error);
                return;
            }

            if (invite.roleId) {
                try {
                    await rolesApi.assignRole(userId, invite.roleId);
                } catch (error) {
                    reportMutationError(showError, 'Zaproszenie wysłane, ale bez roli', error);
                }
            }
            // Przypisanie roli zmienia i listę, i licznik „używa N pracowników" przy roli.
            void queryClient.invalidateQueries({ queryKey: ['settings', 'team'] });
            void queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
            showSuccess('Zaproszenie wysłane', `Link do ustawienia hasła trafił na ${invite.email}.`);
            setEditing(null);
        } finally {
            setSavingEdit(false);
        }
    };

    const handleResend = (employee: TeamEmployeeListItem) => {
        resendInvitation.mutate(employee.id, {
            onSuccess: ({ expiresAt }) => showSuccess(
                'Zaproszenie wysłane ponownie',
                `Nowy link działa do ${formatDateTime(expiresAt)}.`,
            ),
            onError: error => reportMutationError(showError, 'Nie udało się wysłać zaproszenia', error),
        });
    };

    const openEdit = (employee: TeamEmployeeListItem, focusAccount = false) =>
        setEditing({ employee, focusAccount });

    const pageNumbers = buildPageNumbers(page, totalPages);
    const menuEmployee = menu.menu?.item ?? null;

    return (
        <>
            <SettingsHeaderActions>
                {onOpenAttendance && (
                    <Button variant="outline" size="lg" onClick={onOpenAttendance}>Lista obecności</Button>
                )}
                <Button variant="primary" size="lg" onClick={() => setIsAddOpen(true)}>
                    <Plus aria-hidden="true" />
                    Dodaj pracownika
                </Button>
            </SettingsHeaderActions>

            {lockedOut.length > 0 && (
                <Notice
                    tone="warn"
                    title={lockedOut.length === 1
                        ? '1 pracownik ma konto bez roli'
                        : `${lockedOut.length} pracowników ma konto bez roli`}
                    action={onGoToRoles && (
                        <Button variant="outline" size="sm" onClick={onGoToRoles}>Przejdź do ról</Button>
                    )}
                >
                    {'Mogą się zalogować, ale nie zobaczą żadnego modułu: '}
                    {lockedOut.slice(0, 3).map(e => e.fullName).join(', ')}
                    {lockedOut.length > 3 ? ` i ${lockedOut.length - 3} więcej.` : '.'}
                </Notice>
            )}

            {isError ? (
                // Błąd wczytania to nie pusta lista: „Brak pracowników" kazało dodawać
                // ludzi, którzy już są w systemie.
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać pracowników"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                >
                    Lista jest chwilowo niedostępna. Twoje dane są bezpieczne.
                </Notice>
            ) : (
                <ListCard>
                    <ListHeader>
                        <ColLabel>Osoba</ColLabel>
                        <ColLabel>Rola</ColLabel>
                        <ColLabel>Konto</ColLabel>
                        <span />
                    </ListHeader>

                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonRow key={i} aria-hidden="true">
                                <SkeletonBox $w={`${40 + (i % 3) * 12}%`} />
                                <SkeletonBox $w="70px" />
                                <SkeletonBox $w="80px" />
                            </SkeletonRow>
                        ))
                    ) : items.length === 0 ? (
                        <Empty>
                            <strong>{debouncedSearch ? 'Nikt nie pasuje do wyszukiwania' : 'Nie ma jeszcze pracowników'}</strong>
                            <span>
                                {debouncedSearch
                                    ? `Sprawdź pisownię albo szukaj po nazwisku lub adresie e-mail zamiast „${debouncedSearch}".`
                                    : 'Dodaj pierwszą osobę przyciskiem „Dodaj pracownika" u góry.'}
                            </span>
                        </Empty>
                    ) : (
                        <ul>
                            {items.map(emp => (
                                <EmployeeRow
                                    key={emp.id}
                                    employee={emp}
                                    tracksWorkTime={hasWorkTime(emp.role?.id)}
                                    menuOpen={menu.isOpen(emp.id)}
                                    onEdit={() => openEdit(emp)}
                                    onInvite={() => openEdit(emp, true)}
                                    onMenu={e => menu.toggle(e, emp, emp.id)}
                                />
                            ))}
                        </ul>
                    )}

                    {!isLoading && totalPages > 1 && (
                        <Pager>
                            <PagerInfo>
                                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalItems)} z {totalItems}
                            </PagerInfo>
                            <PagerControls>
                                <PagerBtn aria-label="Poprzednia strona" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                                </PagerBtn>
                                {pageNumbers.map((n, i) =>
                                    n === '...'
                                        ? <PagerBtn key={`e${i}`} disabled style={{ cursor: 'default' }}>...</PagerBtn>
                                        : <PagerBtn key={n} $active={n === page} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</PagerBtn>,
                                )}
                                <PagerBtn aria-label="Następna strona" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                                </PagerBtn>
                            </PagerControls>
                        </Pager>
                    )}
                </ListCard>
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje pracownika">
                {menuEmployee && (
                    <>
                        <MenuItem icon={<Pencil />} onClick={() => openEdit(menuEmployee)}>Edytuj dane</MenuItem>
                        <MenuItem icon={<ExternalLink />} onClick={() => navigate(`/team/${menuEmployee.id}`)}>
                            Karta pracownika
                        </MenuItem>
                        {menuEmployee.accountPending && (
                            <MenuItem
                                icon={<Mail />}
                                disabled={resendInvitation.isPending}
                                onClick={() => handleResend(menuEmployee)}
                            >
                                Wyślij zaproszenie ponownie
                            </MenuItem>
                        )}
                        {!menuEmployee.hasAccount && (
                            <MenuItem icon={<UserPlus />} onClick={() => openEdit(menuEmployee, true)}>
                                Zaproś do systemu
                            </MenuItem>
                        )}
                    </>
                )}
            </ActionMenu>

            {isAddOpen && (
                <EmployeeFormModal
                    mode="add"
                    roles={roles}
                    isSaving={createEmployee.isPending}
                    onClose={() => setIsAddOpen(false)}
                    onSubmitCreate={handleCreate}
                />
            )}

            {editing && (
                <EmployeeFormModal
                    // Nowy klucz na każde otwarcie: formularz startuje z danych tej osoby.
                    key={`${editing.employee.id}-${editing.focusAccount}`}
                    mode="edit"
                    employee={editing.employee}
                    focusAccount={editing.focusAccount}
                    roles={roles}
                    isSaving={savingEdit}
                    onClose={() => setEditing(null)}
                    onSubmitUpdate={(payload, invite) => { void handleUpdate(payload, invite); }}
                />
            )}
        </>
    );
}

// ─── Wiersz ─────────────────────────────────────────────────────────────────────

interface EmployeeRowProps {
    employee: TeamEmployeeListItem;
    tracksWorkTime: boolean;
    menuOpen: boolean;
    onEdit: () => void;
    onInvite: () => void;
    onMenu: (e: ReactMouseEvent<HTMLElement>) => void;
}

/**
 * Cały wiersz otwiera edycję, ale nie jest `div`-em z onClick: nazwisko jest
 * przyciskiem, a jego `::after` rozciąga się na wiersz. Dzięki temu wiersz osiąga
 * się Tabem i Enterem, a przyciski w środku (⋮, „Zaproś do systemu") pozostają
 * osobnymi celami - przycisk w przycisku byłby niepoprawnym HTML-em.
 */
function EmployeeRow({ employee: emp, tracksWorkTime, menuOpen, onEdit, onInvite, onMenu }: EmployeeRowProps) {
    const contact = [emp.email, emp.phone].filter((v): v is string => !!v);
    return (
        <Row>
            <NameCell>
                <NameButton type="button" onClick={onEdit} aria-label={`Edytuj: ${emp.fullName}`}>
                    {emp.fullName}
                </NameButton>
                <Meta>
                    {contact.map(c => <span key={c}>{c}</span>)}
                    {contact.length === 0 && <span>Brak kontaktu</span>}
                    {/* Bez tego oznaczenia nie widać, kto trafi na listę obecności -
                        moduł jest cechą roli. */}
                    {tracksWorkTime && <span>Liczony czas pracy</span>}
                </Meta>
            </NameCell>

            <RoleCell>
                {emp.role
                    ? <StatusPill $tone="neutral">{emp.role.name}</StatusPill>
                    : emp.hasAccount
                        ? <StatusPill $tone="warn">Brak roli</StatusPill>
                        : <MutedText>bez roli</MutedText>}
            </RoleCell>

            <AccountCell>
                {/* Konto z niewykorzystanym zaproszeniem to jeszcze nie „Aktywne": pracownik
                    nie ustawił hasła ani nie wszedł do aplikacji. */}
                {emp.accountPending
                    ? <StatusPill $tone="warn">Nie aktywował konta</StatusPill>
                    : emp.hasAccount
                        ? <StatusPill $tone="ok">Aktywne</StatusPill>
                        // Odcień, nie wypełnienie: przy kilku osobach bez konta byłoby kilka
                        // wypełnionych przycisków przeciw jednemu „Dodaj pracownika" (CLAUDE.md §2).
                        : <RaisedButton variant="tinted" size="sm" onClick={onInvite}>Zaproś do systemu</RaisedButton>}
            </AccountCell>

            <MenuCell>
                <IconButton
                    label={`Więcej akcji: ${emp.fullName}`}
                    variant="ghost"
                    size="sm"
                    shape="square"
                    aria-haspopup="menu"
                    active={menuOpen}
                    onClick={onMenu}
                >
                    <MoreVertical />
                </IconButton>
            </MenuCell>
        </Row>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

/**
 * Układ zależy od szerokości listy, nie ekranu: obok stoją menu aplikacji i spis
 * sekcji ustawień, więc ten sam ekran daje liście raz 1100, a raz 600 pikseli.
 */
const ListCard = styled(Card)`
    container-type: inline-size;
    container-name: team-list;

    ul { list-style: none; margin: 0; padding: 0; }
`;

const GRID = 'minmax(0, 1fr) 170px 200px 36px';
const NARROW = '(max-width: 620px)';

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 16px;
    padding: 14px 24px 10px;
    border-bottom: 1px solid #f1f5f9;

    /* Wiersze są w wąskiej liście kafelkami - nagłówek kolumn nie ma czego opisywać. */
    @container team-list ${NARROW} { display: none; }
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 16px;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }

    @container team-list ${NARROW} { grid-template-columns: minmax(0, 1fr) 70px; padding: 16px; }
`;

const Row = styled.li`
    position: relative;
    display: grid;
    grid-template-columns: ${GRID};
    grid-template-areas: 'name role account menu';
    gap: 16px;
    align-items: center;
    padding: 14px 24px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 150ms;
    &:last-child { border-bottom: none; }
    &:hover { background: #f8fafc; }
    &:has(button:first-of-type:focus-visible) { background: #f0f9ff; }

    /* Wąska lista: nazwisko i ⋮ w pierwszej linii, pod nimi kontakt, a na dole
       rola i stan konta obok siebie. Cztery kolumny się tu nie mieszczą. */
    @container team-list ${NARROW} {
        grid-template-columns: auto minmax(0, 1fr) 44px;
        grid-template-areas:
            'name name menu'
            'role account account';
        gap: 10px 10px;
        padding: 14px 16px;
        align-items: start;
    }
`;

const NameCell = styled.div`
    grid-area: name;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

const NameButton = styled.button`
    align-self: flex-start;
    max-width: 100%;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Rozciągnięty cel kliknięcia: cały wiersz otwiera edycję. */
    &::after { content: ''; position: absolute; inset: 0; }
    &:focus-visible { outline: none; }
    &:focus-visible::after { outline: 2px solid #38bdf8; outline-offset: -2px; border-radius: 4px; }
`;

const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 13px;
    line-height: 1.45;
    color: #64748b;
    min-width: 0;

    span { overflow-wrap: anywhere; }
`;

const RoleCell = styled.div`
    grid-area: role;
    min-width: 0;
`;

const AccountCell = styled.div`
    grid-area: account;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
`;

/** Wszystko, co klikalne, leży nad rozciągniętym celem nazwiska - reszta wiersza otwiera edycję. */
const RaisedButton = styled(Button)`
    position: relative;
    z-index: 1;
`;

const MenuCell = styled.div`
    grid-area: menu;
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: flex-end;
`;

const MutedText = styled.span`
    font-size: 13px;
    color: #64748b;
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 40px 24px;
    text-align: center;

    strong { font-size: 15px; font-weight: 700; color: #0f172a; }
    span { max-width: 420px; font-size: 13px; line-height: 1.55; color: #64748b; }
`;
