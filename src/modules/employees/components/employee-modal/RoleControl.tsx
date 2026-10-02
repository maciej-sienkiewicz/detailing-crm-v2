// src/modules/employees/components/employee-modal/RoleControl.tsx
//
// Rola w nagłówku okna pracownika: przycisk z nazwą roli otwiera listę ról z krótkim
// opisem, wybór działa od razu. Wcześniej rola była selectem schowanym w środku karty
// konta - nie widać jej było na pierwszy rzut oka, a to pierwsze pytanie o pracownika
// („co on widzi w aplikacji?").
//
// Bez konta nie ma roli (rola jest cechą konta) - zamiast przycisku stoi szara plakietka.

import styled from 'styled-components';
import { Check, ChevronDown } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { ActionMenu, MenuDivider, MenuItem, StatusPill, ui, useActionMenu } from '@/common/components/ui';
import { useRoles } from '@/modules/settings/hooks/useRoles';
import { rolesApi } from '@/modules/settings/api/rolesApi';
import { useInvalidateEmployees } from '../../hooks/useEmployees';
import type { EmployeeDetail } from '../../types';

export function RoleControl({ employee }: { employee: EmployeeDetail }) {
    const { showSuccess } = useToast();
    const { roles } = useRoles();
    const { menu, toggle, close } = useActionMenu();
    const invalidate = useInvalidateEmployees();
    const account = employee.account;

    if (!account) return <StatusPill $tone="neutral" $size="md">Bez konta</StatusPill>;

    const current = roles.find(r => r.id === account.roleId) ?? null;

    const pick = (roleId: string | null) => {
        if (roleId === (account.roleId ?? null)) return;
        rolesApi.assignRole(account.userId, roleId)
            .then(() => {
                const name = roles.find(r => r.id === roleId)?.name;
                showSuccess(
                    name ? 'Rola zmieniona' : 'Rola usunięta',
                    name
                        ? `${employee.fullName}: ${name}. Uprawnienia działają od razu.`
                        : `${employee.fullName} nie ma dostępu do modułów, dopóki nie dostanie roli.`,
                );
                // Rola idzie przez API ról, które o karcie pracownika nic nie wie.
                invalidate(employee.id);
            })
            .catch(() => { /* globalny handler pokazuje toast błędu */ });
    };

    return (
        <>
            <RoleButton
                type="button"
                aria-haspopup="menu"
                aria-expanded={!!menu}
                $missing={!current}
                onClick={e => toggle(e, null, 'role')}
            >
                {current?.name ?? 'Brak roli'}
                <ChevronDown aria-hidden="true" />
            </RoleButton>
            <ActionMenu anchor={menu?.anchor ?? null} onClose={close} label="Rola pracownika">
                <MenuHint>Rola decyduje, co {employee.firstName} widzi w aplikacji</MenuHint>
                {roles.map(r => (
                    <MenuItem
                        key={r.id}
                        icon={r.id === account.roleId ? <Check /> : <Spacer />}
                        aria-checked={r.id === account.roleId}
                        onClick={() => pick(r.id)}
                    >
                        <RoleLine>
                            <strong>{r.name}</strong>
                            {r.description && <span>{r.description}</span>}
                        </RoleLine>
                    </MenuItem>
                ))}
                <MenuDivider />
                <MenuItem icon={!account.roleId ? <Check /> : <Spacer />} aria-checked={!account.roleId} onClick={() => pick(null)}>
                    <RoleLine>
                        <strong>Brak roli</strong>
                        <span>Zaloguje się, ale nie zobaczy żadnego modułu.</span>
                    </RoleLine>
                </MenuItem>
            </ActionMenu>
        </>
    );
}

/* Kształt StatusPill w wersji klikalnej: neutralna, ze strzałką; „Brak roli" w odcieniu ostrzeżenia. */
const RoleButton = styled.button<{ $missing: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px 5px 12px;
    border: 1px solid ${p => p.$missing ? ui.warnLine : ui.line};
    border-radius: ${ui.radiusControl};
    background: ${p => p.$missing ? ui.warnTint : ui.surfaceSoft};
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: ${p => p.$missing ? ui.warnInk : ui.textSecondary};
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:hover { border-color: ${ui.lineStrong}; color: ${ui.ink}; }
`;

const MenuHint = styled.p`
    margin: 0;
    padding: 8px 10px 4px;
    font-size: 12.5px;
    color: ${ui.textMuted};
    max-width: 280px;
`;

const RoleLine = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 7px 0;
    max-width: 260px;

    strong { font-weight: 600; }
    span { font-size: 12.5px; color: ${ui.textMuted}; line-height: 1.4; white-space: normal; }
`;

const Spacer = styled.span`
    display: inline-block;
    width: 15px;
`;
