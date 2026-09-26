import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import styled from 'styled-components';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import {
    ActionMenu, Button, Card, IconButton, MenuDivider, MenuItem, Notice, StatusPill, useActionMenu,
} from '@/common/components/ui';
import { SkeletonBox } from './rbacShared.styles';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import {
    usePermissionCatalog, useRoles, useCreateRole, useUpdateRole, useDeleteRole,
} from '../hooks/useRoles';
import { RoleEditorModal } from './roles/RoleEditorModal';
import { RoleDeletionModal } from './roles/RoleDeletionModal';
import { reportMutationError } from './team/mutationError';
import { employeesCount, peopleAccusative, permissionsLabel } from './team/teamPlural';
import { useRolePreview, PreviewIcon } from '@/modules/role-preview';
import type { Role, CreateRoleRequest } from '../rbacTypes';

interface RolesSectionProps {
    /** Jumps to the employees view of the merged tab; absent when rendered standalone. */
    onGoToEmployees?: () => void;
}

export function RolesSection({ onGoToEmployees }: RolesSectionProps = {}) {
    const { showSuccess, showError } = useToast();
    const { catalog, isLoading: catalogLoading } = usePermissionCatalog();
    const { roles, isLoading, isError, refetch } = useRoles();

    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const deleteRole = useDeleteRole();

    const preview = useRolePreview();
    const menu = useActionMenu<Role>();

    const [editor, setEditor] = useState<{ mode: 'add' | 'edit'; role: Role | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

    const isSaving = createRole.isPending || updateRole.isPending;

    // Błąd zapisu zostawia edytor otwarty ze wszystkim, co zaznaczono. Wcześniej nie
    // było `onError` wcale: przy 5xx przycisk wracał do „Zapisz rolę" bez słowa.
    const handleSubmit = (payload: CreateRoleRequest) => {
        if (!editor) return;
        if (editor.mode === 'add') {
            createRole.mutate(payload, {
                onSuccess: () => { showSuccess('Rola dodana'); setEditor(null); },
                onError: error => reportMutationError(showError, 'Nie udało się dodać roli', error),
            });
        } else if (editor.role) {
            updateRole.mutate({ roleId: editor.role.id, payload }, {
                onSuccess: () => { showSuccess('Rola zapisana'); setEditor(null); },
                onError: error => reportMutationError(showError, 'Nie udało się zapisać roli', error),
            });
        }
    };

    const handleDelete = (reassignToRoleId: string | null) => {
        if (!deleteTarget) return;
        const moved = deleteTarget.assignedUserCount;
        const targetName = roles.find(r => r.id === reassignToRoleId)?.name ?? null;

        deleteRole.mutate(
            { roleId: deleteTarget.id, options: { reassignToRoleId } },
            {
                onSuccess: () => {
                    if (moved === 0) {
                        showSuccess('Rola usunięta');
                    } else if (targetName) {
                        showSuccess('Rola usunięta', `Przeniesiono ${peopleAccusative(moved)} na rolę „${targetName}".`);
                    } else {
                        showSuccess('Rola usunięta', `Bez roli zostało ${peopleAccusative(moved)}. Przypisz im nową, żeby odzyskały dostęp.`);
                    }
                    setDeleteTarget(null);
                },
                onError: error => reportMutationError(showError, 'Nie udało się usunąć roli', error),
            },
        );
    };

    const menuRole = menu.menu?.item ?? null;

    return (
        <>
            <SettingsHeaderActions>
                <Button variant="primary" size="lg" onClick={() => setEditor({ mode: 'add', role: null })}>
                    <Plus aria-hidden="true" />
                    Dodaj rolę
                </Button>
            </SettingsHeaderActions>

            <Intro>
                Rola mówi, co pracownik widzi i może zmieniać. Uprawnienie podrzędne wymaga
                nadrzędnego. Rolę przypisujesz przy zaproszeniu albo w karcie pracownika.
            </Intro>

            {isError ? (
                // Błąd wczytania to nie brak ról: „Utwórz pierwszą rolę" prowadziło do
                // dublowania ról, które już istnieją.
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać ról"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                >
                    Lista ról jest chwilowo niedostępna. Uprawnienia pracowników działają bez zmian.
                </Notice>
            ) : (
                <ListCard>
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <SkeletonRow key={i} aria-hidden="true">
                                <SkeletonBox $w="40%" />
                                <SkeletonBox $w="70%" />
                            </SkeletonRow>
                        ))
                    ) : roles.length === 0 ? (
                        <Empty>
                            <strong>Nie ma jeszcze ról</strong>
                            <span>Dodaj pierwszą rolę przyciskiem „Dodaj rolę" u góry albo wybierz gotową przy zapraszaniu pracownika.</span>
                        </Empty>
                    ) : (
                        <ul>
                            {roles.map(role => (
                                <RoleRow
                                    key={role.id}
                                    role={role}
                                    menuOpen={menu.isOpen(role.id)}
                                    onEdit={() => setEditor({ mode: 'edit', role })}
                                    onShowHolders={onGoToEmployees}
                                    onMenu={e => menu.toggle(e, role, role.id)}
                                />
                            ))}
                        </ul>
                    )}
                </ListCard>
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje roli">
                {menuRole && (
                    <>
                        <MenuItem icon={<Pencil />} onClick={() => setEditor({ mode: 'edit', role: menuRole })}>
                            Edytuj rolę
                        </MenuItem>
                        {preview.available && (
                            <MenuItem
                                icon={<PreviewIcon />}
                                disabled={preview.opening}
                                title="CRM oczami pracownika z tą rolą, na danych przykładowych"
                                onClick={() => preview.open({
                                    roleName: menuRole.name,
                                    permissions: menuRole.permissions.map(p => p.code),
                                    trackWorkTime: menuRole.trackWorkTime,
                                })}
                            >
                                Podgląd roli
                            </MenuItem>
                        )}
                        <MenuDivider />
                        <MenuItem icon={<Trash2 />} danger onClick={() => setDeleteTarget(menuRole)}>
                            Usuń rolę
                        </MenuItem>
                    </>
                )}
            </ActionMenu>

            {editor && (
                <RoleEditorModal
                    mode={editor.mode}
                    role={editor.role}
                    catalog={catalog}
                    catalogLoading={catalogLoading}
                    isSaving={isSaving}
                    onClose={() => setEditor(null)}
                    onSubmit={handleSubmit}
                />
            )}

            {deleteTarget && (
                <RoleDeletionModal
                    role={deleteTarget}
                    otherRoles={roles.filter(r => r.id !== deleteTarget.id)}
                    isDeleting={deleteRole.isPending}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                />
            )}
        </>
    );
}

// ─── Wiersz roli ────────────────────────────────────────────────────────────────

/**
 * Jedna lista zamiast siatki kart: każda rola była osobną kartą z obwódką, więc
 * trzy role to trzy równorzędne powierzchnie i żadna nie była tematem (CLAUDE.md §2).
 * Wiersz otwiera edycję jak na liście pracowników - nazwa jest przyciskiem
 * rozciągniętym na cały wiersz.
 */
function RoleRow({ role, menuOpen, onEdit, onShowHolders, onMenu }: {
    role: Role;
    menuOpen: boolean;
    onEdit: () => void;
    onShowHolders?: () => void;
    onMenu: (e: ReactMouseEvent<HTMLElement>) => void;
}) {
    const modules = useMemo(() => {
        const seen = new Map<string, string>();
        role.permissions.forEach(p => { if (!seen.has(p.module)) seen.set(p.module, p.moduleDisplayName); });
        return Array.from(seen.values());
    }, [role.permissions]);

    const usage = role.assignedUserCount === 0
        ? 'Nikt jej nie używa'
        : `Używa ${employeesCount(role.assignedUserCount)}`;

    return (
        <Row>
            <Main>
                <NameButton type="button" onClick={onEdit} aria-label={`Edytuj rolę: ${role.name}`}>
                    {role.name}
                </NameButton>
                {role.description && <Desc>{role.description}</Desc>}
                <Meta>
                    <span>{permissionsLabel(role.permissions.length)}</span>
                    {role.trackWorkTime && <span>Liczony czas pracy</span>}
                    {role.assignedUserCount > 0 && onShowHolders ? (
                        <UsageLink type="button" onClick={onShowHolders}>{usage}</UsageLink>
                    ) : (
                        <span>{usage}</span>
                    )}
                </Meta>
                {modules.length > 0 && (
                    <Chips aria-label="Moduły">
                        {modules.map(m => <StatusPill key={m} $tone="neutral">{m}</StatusPill>)}
                    </Chips>
                )}
            </Main>
            <MenuCell>
                <IconButton
                    label={`Więcej akcji: ${role.name}`}
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
const Intro = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: #475569;
    line-height: 1.6;
    max-width: 720px;
`;

const ListCard = styled(Card)`
    ul { list-style: none; margin: 0; padding: 0; }
`;

const SkeletonRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px 24px;
    border-bottom: 1px solid #f1f5f9;
    &:last-child { border-bottom: none; }
`;

const Row = styled.li`
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 150ms;
    &:last-child { border-bottom: none; }
    &:hover { background: #f8fafc; }

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const Main = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    overflow-wrap: anywhere;

    &::after { content: ''; position: absolute; inset: 0; }
    &:focus-visible { outline: none; }
    &:focus-visible::after { outline: 2px solid #38bdf8; outline-offset: -2px; border-radius: 4px; }
`;

const Desc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
`;

const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 13px;
    color: #64748b;
`;

const UsageLink = styled.button`
    position: relative;
    z-index: 1;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #0369a1;
    cursor: pointer;

    &:hover { text-decoration: underline; }
    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; border-radius: 4px; }
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
`;

const MenuCell = styled.div`
    position: relative;
    z-index: 1;
    flex-shrink: 0;
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
