import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/common/components/Toast';
import {
    Container, Toolbar, SearchWrap, SearchIconWrap, SearchInput,
    AddButton, StatsRow, StatText, Card, ColLabel, Badge, Dot, EmptyWrap,
    EmptyTitle, EmptyDesc, SkeletonBox, Pager, PagerInfo, PagerControls, PagerBtn,
} from './rbacShared.styles';
import { useEmployees, useCreateEmployee, useCreateAccount } from '../hooks/useTeam';
import { useRoles } from '../hooks/useRoles';
import { rolesApi } from '../api/rolesApi';
import { EmployeeFormModal } from './team/EmployeeFormModal';
import type { CreateEmployeeFormOutput } from '../teamTypes';

const PAGE_SIZE = 20;

function buildPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
}

export function TeamSection() {
    const navigate = useNavigate();
    const { showSuccess } = useToast();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    const [isAddOpen, setIsAddOpen] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const filters = { search: debouncedSearch, page, limit: PAGE_SIZE };
    const { items, pagination, isLoading } = useEmployees(filters);

    const createEmployee = useCreateEmployee();
    const createAccount = useCreateAccount();
    const { roles } = useRoles();

    const totalItems = pagination?.totalItems ?? 0;
    const totalPages = pagination?.totalPages ?? 1;

    const openAdd = () => setIsAddOpen(true);
    const closeForm = () => setIsAddOpen(false);

    const handleCreate = (data: CreateEmployeeFormOutput) => {
        createEmployee.mutate(
            { firstName: data.firstName, lastName: data.lastName, phone: data.phone, email: data.email, roleId: data.roleId || null },
            {
                onSuccess: async (employee) => {
                    if (!data.createAccount) {
                        showSuccess('Pracownik dodany');
                        closeForm();
                        return;
                    }
                    try {
                        const { userId } = await createAccount.mutateAsync({
                            employeeId: employee.id,
                            payload: { email: data.email! },
                        });
                        if (data.roleId) {
                            await rolesApi.assignRole(userId, data.roleId);
                        }
                        showSuccess('Pracownik dodany', 'Zaproszenie do założenia konta zostało wysłane.');
                    } catch {
                        showSuccess('Pracownik dodany', 'Nie udało się utworzyć konta — dodaj je ręcznie w szczegółach pracownika.');
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
                        placeholder="Szukaj po imieniu, nazwisku lub e-mailu…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchWrap>

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

            <Card>
                <ListHeader>
                    <ColLabel>Pracownik</ColLabel>
                    <ColLabel>Kontakt</ColLabel>
                    <ColLabel>Konto</ColLabel>
                </ListHeader>

                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonRow key={i}>
                            <SkeletonBox $w={`${50 + (i % 3) * 12}%`} />
                            <SkeletonBox $w="70%" />
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
                        return (
                            <Row key={emp.id} onClick={() => navigate(`/team/${emp.id}`)}>
                                <NameCell>
                                    <Avatar>{(emp.firstName[0] ?? '') + (emp.lastName[0] ?? '')}</Avatar>
                                    <strong>{emp.fullName}</strong>
                                </NameCell>
                                <ContactCell>
                                    {emp.email && <span>{emp.email}</span>}
                                    {emp.phone && <span>{emp.phone}</span>}
                                    {!emp.email && !emp.phone && <Muted>—</Muted>}
                                </ContactCell>
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
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)} z {totalItems}
                        </PagerInfo>
                        <PagerControls>
                            <PagerBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                            </PagerBtn>
                            {pageNumbers.map((n, i) =>
                                n === '…'
                                    ? <PagerBtn key={`e${i}`} disabled style={{ cursor: 'default' }}>…</PagerBtn>
                                    : <PagerBtn key={n} $active={n === page} onClick={() => setPage(n)}>{n}</PagerBtn>,
                            )}
                            <PagerBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                            </PagerBtn>
                        </PagerControls>
                    </Pager>
                )}
            </Card>

            {isAddOpen && (
                <EmployeeFormModal
                    mode="add"
                    roles={roles}
                    isSaving={createEmployee.isPending || createAccount.isPending}
                    onClose={closeForm}
                    onSubmitCreate={handleCreate}
                    onSubmitUpdate={() => {}}
                />
            )}
        </Container>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const GRID = '1fr 1fr 130px';

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid #f1f5f9;
    background: #fafbfc;
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }
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
