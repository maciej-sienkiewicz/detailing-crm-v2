import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    Container, Toolbar, AddButton, StatsRow, StatText, EmptyWrap, EmptyTitle,
    EmptyDesc, SkeletonBox, Badge,
} from './rbacShared.styles';
import {
    usePermissionCatalog, useRoles, useCreateRole, useUpdateRole, useDeleteRole,
} from '../hooks/useRoles';
import { RoleEditorModal } from './roles/RoleEditorModal';
import type { Role, CreateRoleRequest } from '../rbacTypes';

export function RolesSection() {
    const { showSuccess } = useToast();
    const { catalog, isLoading: catalogLoading } = usePermissionCatalog();
    const { roles, isLoading } = useRoles();

    const createRole = useCreateRole();
    const updateRole = useUpdateRole();
    const deleteRole = useDeleteRole();

    const [editor, setEditor] = useState<{ mode: 'add' | 'edit'; role: Role | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

    const isSaving = createRole.isPending || updateRole.isPending;

    const handleSubmit = (payload: CreateRoleRequest) => {
        if (!editor) return;
        if (editor.mode === 'add') {
            createRole.mutate(payload, {
                onSuccess: () => { showSuccess('Rola utworzona'); setEditor(null); },
            });
        } else if (editor.role) {
            updateRole.mutate({ roleId: editor.role.id, payload }, {
                onSuccess: () => { showSuccess('Rola zaktualizowana'); setEditor(null); },
            });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteRole.mutate(deleteTarget.id, {
            onSuccess: () => showSuccess('Rola usunięta'),
            // 422 (przypisana do użytkowników) — komunikat pokazuje globalny handler
        });
    };

    return (
        <Container>
            <Toolbar>
                <Intro>
                    Twórz role i przypisuj im uprawnienia w poszczególnych modułach. Role nadajesz
                    użytkownikom w profilu pracownika.
                </Intro>
                <AddButton onClick={() => setEditor({ mode: 'add', role: null })}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Dodaj rolę
                </AddButton>
            </Toolbar>

            <StatsRow>
                {!isLoading && (
                    <StatText><strong>{roles.length}</strong> {roles.length === 1 ? 'rola' : 'ról'} w firmie</StatText>
                )}
            </StatsRow>

            {isLoading ? (
                <Grid>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <RoleCard key={i}>
                            <SkeletonBox $w="50%" />
                            <SkeletonBox $w="80%" />
                            <SkeletonBox $w="40%" />
                        </RoleCard>
                    ))}
                </Grid>
            ) : roles.length === 0 ? (
                <EmptyCard>
                    <EmptyWrap>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <EmptyTitle>Brak ról</EmptyTitle>
                        <EmptyDesc>Utwórz pierwszą rolę, aby zarządzać uprawnieniami pracowników.</EmptyDesc>
                    </EmptyWrap>
                </EmptyCard>
            ) : (
                <Grid>
                    {roles.map(role => (
                        <RoleCardItem key={role.id} role={role} onEdit={() => setEditor({ mode: 'edit', role })} onDelete={() => setDeleteTarget(role)} />
                    ))}
                </Grid>
            )}

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

            <ConfirmationModal
                isOpen={!!deleteTarget}
                title="Usunąć rolę?"
                message={deleteTarget
                    ? `Rola „${deleteTarget.name}" zostanie usunięta. Jeśli jest przypisana do użytkowników, operacja zostanie odrzucona.`
                    : ''}
                variant="danger"
                confirmText="Usuń rolę"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </Container>
    );
}

// ─── Role card ──────────────────────────────────────────────────────────────────
function RoleCardItem({ role, onEdit, onDelete }: { role: Role; onEdit: () => void; onDelete: () => void }) {
    const moduleChips = useMemo(() => {
        const seen = new Map<string, string>();
        role.permissions.forEach(p => { if (!seen.has(p.module)) seen.set(p.module, p.moduleDisplayName); });
        return Array.from(seen.values());
    }, [role.permissions]);

    return (
        <RoleCard>
            <RoleHead>
                <div>
                    <RoleName>{role.name}</RoleName>
                    {role.description && <RoleDesc>{role.description}</RoleDesc>}
                </div>
                <Actions>
                    <IconBtn title="Edytuj" onClick={onEdit}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </IconBtn>
                    <IconBtn $danger title="Usuń" onClick={onDelete}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </IconBtn>
                </Actions>
            </RoleHead>

            <PermCount>{role.permissions.length} uprawnień</PermCount>

            {moduleChips.length > 0 && (
                <Chips>
                    {moduleChips.map(m => <Badge key={m} $variant="blue">{m}</Badge>)}
                </Chips>
            )}
        </RoleCard>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const Intro = styled.p`
    flex: 1;
    min-width: 220px;
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
`;

const RoleCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 18px;
`;

const EmptyCard = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
`;

const RoleHead = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
`;

const RoleName = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const RoleDesc = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 3px;
    line-height: 1.5;
`;

const Actions = styled.div`
    display: flex;
    gap: 4px;
    flex-shrink: 0;
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: ${p => (p.$danger ? '#ef4444' : '#94a3b8')};
    cursor: pointer;
    transition: all 150ms;

    &:hover {
        background: ${p => (p.$danger ? 'rgba(239,68,68,0.08)' : '#f1f5f9')};
        border-color: ${p => (p.$danger ? 'rgba(239,68,68,0.2)' : '#e2e8f0')};
        color: ${p => (p.$danger ? '#ef4444' : '#334155')};
    }
`;

const PermCount = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #0284c7;
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;
