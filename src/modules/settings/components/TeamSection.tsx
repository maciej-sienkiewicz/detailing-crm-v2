import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/common/components/Toast';
import {
    Container, Toolbar, SearchWrap, SearchIconWrap, SearchInput,
    AddButton, StatsRow, StatText, Card, ColLabel, Badge, Dot, EmptyWrap,
    EmptyTitle, EmptyDesc, SkeletonBox, Pager, PagerInfo, PagerControls, PagerBtn,
} from './rbacShared.styles';
import { useEmployees, useCreateEmployee } from '../hooks/useTeam';
import { useRoles } from '../hooks/useRoles';
import { EmployeeFormModal } from './team/EmployeeFormModal';
import { AttendanceSheetModal } from './team/AttendanceSheetModal';
import type { CreateEmployeeFormOutput, TeamEmployeeListItem } from '../teamTypes';

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
    /** Jumps to the roles view of the merged tab; absent when rendered standalone. */
    onGoToRoles?: () => void;
}

export function TeamSection({ onGoToRoles }: TeamSectionProps = {}) {
    const navigate = useNavigate();
    const { showSuccess } = useToast();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    const [isAddOpen, setIsAddOpen] = useState(false);

    /**
     * Zaznaczeni pracownicy trzymani w całości, a nie jako same identyfikatory:
     * wyszukiwarka i stronicowanie wymieniają wiersze pod spodem, więc lista widoczna
     * na ekranie nie wystarcza, żeby odtworzyć, kogo zaznaczono wcześniej. Bez tego
     * zaznaczenie ze strony 1 znikało z żądania po przejściu na stronę 2.
     */
    const [selected, setSelected] = useState<Map<string, TeamEmployeeListItem>>(new Map());
    const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
    const [attendanceHintOpen, setAttendanceHintOpen] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const filters = { search: debouncedSearch, page, limit: PAGE_SIZE };
    const { items, pagination, isLoading } = useEmployees(filters);

    const createEmployee = useCreateEmployee();
    const { roles } = useRoles();

    const totalItems = pagination?.totalItems ?? 0;
    const totalPages = pagination?.totalPages ?? 1;

    /**
     * Moduł Czasu pracy jest cechą ROLI (`trackWorkTime`), nie pracownika — lista
     * pracowników niesie tylko nazwę roli, więc flagę bierzemy z listy ról, którą ten
     * widok i tak już ma wczytaną.
     */
    const workTimeRoleIds = new Set(roles.filter(r => r.trackWorkTime).map(r => r.id));
    const hasWorkTime = (roleId: string | undefined) => !!roleId && workTimeRoleIds.has(roleId);

    const selectedWithWorkTime = [...selected.values()].filter(emp => hasWorkTime(emp.role?.id));
    const canGenerateAttendance = selectedWithWorkTime.length > 0;

    const toggleSelection = (employee: TeamEmployeeListItem) => {
        setAttendanceHintOpen(false);
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(employee.id)) next.delete(employee.id);
            else next.set(employee.id, employee);
            return next;
        });
    };

    // „Zaznacz wszystkich" obejmuje tylko widoczną stronę — zaznaczenie w tle ludzi,
    // których użytkownik nie widzi, byłoby zaznaczeniem w ciemno.
    const allOnPageSelected = items.length > 0 && items.every(emp => selected.has(emp.id));
    const toggleSelectAllOnPage = () => {
        setAttendanceHintOpen(false);
        setSelected(prev => {
            const next = new Map(prev);
            if (allOnPageSelected) items.forEach(emp => next.delete(emp.id));
            else items.forEach(emp => next.set(emp.id, emp));
            return next;
        });
    };

    /**
     * Przycisk zostaje klikalny mimo braku zaznaczenia: `disabled` nie wysyła zdarzeń,
     * więc kliknięcie w wyszarzony przycisk nie mogłoby powiedzieć, czego brakuje —
     * a to jest jedyny moment, w którym użytkownik o to pyta.
     */
    const handleAttendanceClick = () => {
        if (!canGenerateAttendance) {
            setAttendanceHintOpen(true);
            return;
        }
        setIsAttendanceOpen(true);
    };

    // An account with no role is the quiet failure this list never used to show: the
    // person signs in and lands on "Brak przypisanych uprawnień".
    const lockedOut = items.filter(e => e.hasAccount && !e.role);

    const openAdd = () => setIsAddOpen(true);
    const closeForm = () => setIsAddOpen(false);

    /**
     * One call, one transaction. This used to be a chain of three requests: create
     * employee, provision account, assign role, and it could stop halfway and still
     * report success, leaving a person who could not sign in. The backend already
     * accepts the whole thing at once, so a failure now leaves nothing behind.
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
                    closeForm();
                },
            },
        );
    };

    const pageNumbers = buildPageNumbers(page, totalPages);

    return (
        <Container>
            <Toolbar>
                <SearchWrap>
                    <SearchIconWrap>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </SearchIconWrap>
                    <SearchInput
                        placeholder="Szukaj po imieniu, nazwisku lub e-mailu..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchWrap>

                <AttendanceWrap>
                    <AttendanceButton
                        type="button"
                        $enabled={canGenerateAttendance}
                        aria-disabled={!canGenerateAttendance}
                        onClick={handleAttendanceClick}
                        onBlur={() => setAttendanceHintOpen(false)}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2v3M16 2v3M3.5 9h17" />
                            <rect x="3.5" y="4.5" width="17" height="17" rx="2.5" />
                            <path d="m8.5 15 2 2 4-4" />
                        </svg>
                        Wygeneruj listę obecności
                        {canGenerateAttendance && <CountPill>{selectedWithWorkTime.length}</CountPill>}
                    </AttendanceButton>

                    {attendanceHintOpen && !canGenerateAttendance && (
                        <AttendanceTooltip role="tooltip">
                            Zaznacz co najmniej jednego pracownika z modułem Czasu Pracy
                        </AttendanceTooltip>
                    )}
                </AttendanceWrap>

                <AddButton onClick={openAdd}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj pracownika
                </AddButton>
            </Toolbar>

            <StatsRow>
                {!isLoading && (
                    <StatText>
                        <strong>{totalItems}</strong> pracowników
                    </StatText>
                )}
            </StatsRow>

            {lockedOut.length > 0 && (
                <NoticeBar>
                    <NoticeIcon>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </NoticeIcon>
                    <NoticeText>
                        <strong>
                            {lockedOut.length === 1
                                ? '1 pracownik ma konto bez roli'
                                : `${lockedOut.length} pracowników ma konto bez roli`}
                        </strong>
                        {': mogą się zalogować, ale nie zobaczą żadnego modułu. '}
                        {lockedOut.slice(0, 3).map(e => e.fullName).join(', ')}
                        {lockedOut.length > 3 ? ` i ${lockedOut.length - 3} więcej.` : '.'}
                    </NoticeText>
                    {onGoToRoles && (
                        <NoticeAction onClick={onGoToRoles}>Przejdź do ról</NoticeAction>
                    )}
                </NoticeBar>
            )}

            <Card>
                <ListHeader>
                    <SelectCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={toggleSelectAllOnPage}
                            aria-label="Zaznacz wszystkich na tej stronie"
                            disabled={items.length === 0}
                        />
                    </SelectCell>
                    <ColLabel>Pracownik</ColLabel>
                    <ColLabel>Kontakt</ColLabel>
                    <ColLabel>Rola</ColLabel>
                    <ColLabel>Konto</ColLabel>
                </ListHeader>

                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonRow key={i}>
                            <SkeletonBox $w="14px" />
                            <SkeletonBox $w={`${50 + (i % 3) * 12}%`} />
                            <SkeletonBox $w="70%" />
                            <SkeletonBox $w="60%" />
                            <SkeletonBox $w="56px" />
                        </SkeletonRow>
                    ))
                ) : items.length === 0 ? (
                    <EmptyWrap>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3M8 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M18 21v-2a4 4 0 0 0-3-3.87" />
                        </svg>
                        <EmptyTitle>Brak pracowników</EmptyTitle>
                        <EmptyDesc>
                            {debouncedSearch
                                ? 'Żaden pracownik nie pasuje do wyszukiwania.'
                                : 'Dodaj pierwszego pracownika klikając „Dodaj pracownika".'}
                        </EmptyDesc>
                    </EmptyWrap>
                ) : (
                    items.map(emp => {
                        const hasAccount = emp.hasAccount;
                        const tracksWorkTime = hasWorkTime(emp.role?.id);
                        return (
                            <Row key={emp.id} onClick={() => navigate(`/team/${emp.id}`)}>
                                {/* Kliknięcie w pole wyboru nie może otwierać karty pracownika. */}
                                <SelectCell onClick={e => e.stopPropagation()}>
                                    <Checkbox
                                        type="checkbox"
                                        checked={selected.has(emp.id)}
                                        onChange={() => toggleSelection(emp)}
                                        aria-label={`Zaznacz: ${emp.fullName}`}
                                    />
                                </SelectCell>
                                <NameCell>
                                    <Avatar>{(emp.firstName[0] ?? '') + (emp.lastName[0] ?? '')}</Avatar>
                                    <strong>{emp.fullName}</strong>
                                </NameCell>
                                <ContactCell>
                                    {emp.email && <span>{emp.email}</span>}
                                    {emp.phone && <span>{emp.phone}</span>}
                                    {!emp.email && !emp.phone && <Muted>-</Muted>}
                                </ContactCell>
                                <RoleCell>
                                    {emp.role
                                        ? <Badge $variant="gray">{emp.role.name}</Badge>
                                        : hasAccount
                                            ? <Badge $variant="amber">Brak roli</Badge>
                                            : <Muted>-</Muted>}
                                    {/* Bez tego oznaczenia nie widać, kogo wolno zaznaczyć
                                        do listy obecności — moduł jest cechą roli. */}
                                    {tracksWorkTime && <Badge $variant="blue">Czas pracy</Badge>}
                                </RoleCell>
                                <div>
                                    {hasAccount
                                        ? <Badge $variant="blue"><Dot $color="#0284c7" />Ma konto</Badge>
                                        : <Badge $variant="gray">Brak konta</Badge>}
                                </div>
                            </Row>
                        );
                    })
                )}

                {!isLoading && totalPages > 1 && (
                    <Pager>
                        <PagerInfo>
                            {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalItems)} z {totalItems}
                        </PagerInfo>
                        <PagerControls>
                            <PagerBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                            </PagerBtn>
                            {pageNumbers.map((n, i) =>
                                n === '...'
                                    ? <PagerBtn key={`e${i}`} disabled style={{ cursor: 'default' }}>...</PagerBtn>
                                    : <PagerBtn key={n} $active={n === page} onClick={() => setPage(n)}>{n}</PagerBtn>,
                            )}
                            <PagerBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                            </PagerBtn>
                        </PagerControls>
                    </Pager>
                )}
            </Card>

            {isAttendanceOpen && (
                <AttendanceSheetModal
                    employeeIds={selectedWithWorkTime.map(emp => emp.id)}
                    employeeCount={selectedWithWorkTime.length}
                    onClose={() => setIsAttendanceOpen(false)}
                />
            )}

            {isAddOpen && (
                <EmployeeFormModal
                    mode="add"
                    roles={roles}
                    isSaving={createEmployee.isPending}
                    onClose={closeForm}
                    onSubmitCreate={handleCreate}
                    onSubmitUpdate={() => {}}
                />
            )}
        </Container>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const GRID = '32px 1.3fr 1.1fr 190px 130px';

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafbfc;

    /* Wiersze są na telefonie kafelkami — nagłówek kolumn nie ma czego opisywać. */
    @media (max-width: 900px) { display: none; }
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }

    @media (max-width: 900px) {
        grid-template-columns: 24px minmax(0, 1fr) 110px;
        padding: 14px;
    }
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: background 150ms;
    &:last-child { border-bottom: none; }
    &:hover { background: #fafbfc; }

    /* Cztery kolumny nie mieszczą się na telefonie: pracownik czyta się wtedy
       jako kafelka — nazwisko z rolą, pod nimi kontakt i status konta. */
    @media (max-width: 900px) {
        grid-template-columns: 24px minmax(0, 1fr) auto;
        gap: 8px 10px;
        padding: 12px 14px;
        align-items: start;

        > :nth-child(1) { grid-column: 1; grid-row: 1; }
        > :nth-child(2) { grid-column: 2; grid-row: 1; }
        > :nth-child(4) { grid-column: 3; grid-row: 1; justify-self: end; }
        > :nth-child(3) { grid-column: 2 / -1; grid-row: 2; }
        > :nth-child(5) { grid-column: 2 / -1; grid-row: 3; }
    }
`;

const SelectCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Checkbox = styled.input`
    width: 15px;
    height: 15px;
    accent-color: #0284c7;
    cursor: pointer;

    &:disabled { cursor: default; opacity: 0.4; }
`;

const RoleCell = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
`;

const AttendanceWrap = styled.div`
    position: relative;
    display: flex;
`;

const AttendanceButton = styled.button<{ $enabled: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    border-radius: 8px;
    white-space: nowrap;
    /* Nieaktywny wizualnie, ale wciąż klikalny: dopiero kliknięcie może powiedzieć,
       czego brakuje — atrybut disabled połknąłby to zdarzenie. */
    cursor: ${p => (p.$enabled ? 'pointer' : 'default')};
    color: ${p => (p.$enabled ? '#0f172a' : '#94a3b8')};
    background: ${p => (p.$enabled ? '#fff' : '#f8fafc')};
    border: 1px solid ${p => (p.$enabled ? '#cbd5e1' : '#e2e8f0')};
    transition: background 150ms, border-color 150ms, color 150ms;

    &:hover { background: ${p => (p.$enabled ? '#f8fafc' : '#f1f5f9')}; }
`;

const CountPill = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.12);
    color: #0284c7;
    font-size: 11px;
    font-weight: 700;
`;

const AttendanceTooltip = styled.div`
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    max-width: 280px;
    padding: 8px 11px;
    border-radius: 8px;
    background: #0f172a;
    color: #fff;
    font-size: 12px;
    line-height: 1.45;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);

    &::before {
        content: '';
        position: absolute;
        top: -4px;
        right: 18px;
        width: 8px;
        height: 8px;
        background: #0f172a;
        transform: rotate(45deg);
    }
`;

const NameCell = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    strong { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const Avatar = styled.div`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(14,165,233,0.1);
    color: #0284c7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
`;

const ContactCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    span { font-size: 12px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const Muted = styled.span`
    color: #cbd5e1;
`;

const NoticeBar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border: 1px solid rgba(245,158,11,0.35);
    background: rgba(245,158,11,0.08);
    border-radius: 10px;
    flex-wrap: wrap;
`;

const NoticeIcon = styled.span`
    display: flex;
    flex-shrink: 0;
    color: #d97706;
`;

const NoticeText = styled.p`
    flex: 1;
    min-width: 200px;
    margin: 0;
    font-size: 12.5px;
    color: #78350f;
    line-height: 1.5;

    strong { font-weight: 700; }
`;

const NoticeAction = styled.button`
    flex-shrink: 0;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    color: #92400e;
    background: white;
    border: 1px solid rgba(245,158,11,0.45);
    border-radius: 8px;
    cursor: pointer;
    transition: background 150ms;

    &:hover { background: rgba(245,158,11,0.12); }
`;
