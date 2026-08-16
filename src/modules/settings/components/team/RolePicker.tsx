import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { HintText, ErrorMsg } from '../rbacShared.styles';
import { useCreateRole } from '../../hooks/useRoles';
import { ROLE_TEMPLATES, toCreateRoleRequest } from '../../roleTemplates';
import type { RoleTemplate } from '../../roleTemplates';
import type { Role } from '../../rbacTypes';

/**
 * Role field that can produce the role it needs.
 *
 * A studio adding its first employee has no roles yet, and the old form answered
 * that with an empty dropdown — the person had to abandon the form, go to another
 * tab, build a role and come back. Here the missing role is one row further down
 * the same list: a template creates it in place and selects it, and the full
 * permission editor stays one link away for anything the templates don't cover.
 */
interface RolePickerProps {
    roles: Role[];
    value: string;
    onChange: (roleId: string) => void;
    /** Opens the full permission editor; the picker selects whatever it creates. */
    onOpenFullEditor: () => void;
    disabled?: boolean;
    error?: string;
}

export function RolePicker({ roles, value, onChange, onOpenFullEditor, disabled, error }: RolePickerProps) {
    const [open, setOpen] = useState(false);
    const [creatingId, setCreatingId] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    const createRole = useCreateRole();

    const selected = useMemo(() => roles.find(r => r.id === value) ?? null, [roles, value]);

    // Templates already present by name are offered as a plain pick, not a duplicate
    // create — the backend enforces unique role names per studio.
    const templates = useMemo(() => ROLE_TEMPLATES.map(t => ({
        template: t,
        existing: roles.find(r => r.name.toLowerCase() === t.name.toLowerCase()) ?? null,
    })), [roles]);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const pick = (roleId: string) => {
        onChange(roleId);
        setCreateError(null);
        setOpen(false);
    };

    const createFromTemplate = async (entry: { template: RoleTemplate; existing: Role | null }) => {
        if (entry.existing) { pick(entry.existing.id); return; }

        setCreateError(null);
        setCreatingId(entry.template.id);
        try {
            const { roleId } = await createRole.mutateAsync(toCreateRoleRequest(entry.template));
            pick(roleId);
        } catch (err) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Nie udało się utworzyć roli. Spróbuj ponownie.';
            setCreateError(message);
        } finally {
            setCreatingId(null);
        }
    };

    const moduleChips = useMemo(() => {
        if (!selected) return [];
        const seen = new Map<string, string>();
        selected.permissions.forEach(p => { if (!seen.has(p.module)) seen.set(p.module, p.moduleDisplayName); });
        return Array.from(seen.values());
    }, [selected]);

    return (
        <Wrap ref={wrapRef}>
            <Trigger
                type="button"
                $open={open}
                $error={!!error}
                $placeholder={!selected}
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{selected ? selected.name : 'Wybierz rolę…'}</span>
                <Caret $open={open} aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </Caret>
            </Trigger>

            {open && (
                <Menu role="listbox">
                    {roles.length > 0 && (
                        <MenuGroup>
                            {roles.map(role => (
                                <MenuRow
                                    key={role.id}
                                    type="button"
                                    role="option"
                                    aria-selected={role.id === value}
                                    $selected={role.id === value}
                                    onClick={() => pick(role.id)}
                                >
                                    <RowMain>
                                        <RowName>{role.name}</RowName>
                                        {role.description && <RowDesc>{role.description}</RowDesc>}
                                    </RowMain>
                                    <RowMeta>{role.permissions.length} uprawnień</RowMeta>
                                </MenuRow>
                            ))}
                        </MenuGroup>
                    )}

                    <MenuGroup>
                        <GroupLabel>
                            {roles.length > 0 ? 'Utwórz nową rolę' : 'Zacznij od gotowej roli'}
                        </GroupLabel>
                        {templates.map(entry => (
                            <MenuRow
                                key={entry.template.id}
                                type="button"
                                $create
                                disabled={creatingId !== null}
                                onClick={() => createFromTemplate(entry)}
                            >
                                <RowMain>
                                    <RowName>
                                        {entry.existing ? entry.template.name : `＋ ${entry.template.name}`}
                                    </RowName>
                                    <RowDesc>{entry.template.summary}</RowDesc>
                                </RowMain>
                                <RowMeta>
                                    {creatingId === entry.template.id
                                        ? 'Tworzenie…'
                                        : entry.existing ? 'już istnieje' : 'utwórz'}
                                </RowMeta>
                            </MenuRow>
                        ))}
                    </MenuGroup>

                    <MenuFooter>
                        <LinkBtn
                            type="button"
                            onClick={() => { setOpen(false); onOpenFullEditor(); }}
                        >
                            Zbuduj rolę od zera — pełny edytor uprawnień
                        </LinkBtn>
                    </MenuFooter>
                </Menu>
            )}

            {createError && <ErrorMsg>{createError}</ErrorMsg>}
            {error && !createError && <ErrorMsg>{error}</ErrorMsg>}

            {selected ? (
                <Preview>
                    {moduleChips.length > 0
                        ? <>Dostęp: {moduleChips.join(' · ')}</>
                        : <>Rola bez uprawnień — pracownik zaloguje się, ale nic nie zobaczy.</>}
                </Preview>
            ) : (
                <HintText>
                    Bez roli pracownik może się zalogować, ale nie zobaczy żadnego modułu.
                </HintText>
            )}
        </Wrap>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const Wrap = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Trigger = styled.button<{ $open: boolean; $error: boolean; $placeholder: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
    font-family: inherit;
    text-align: left;
    border: 1.5px solid ${p => (p.$error ? '#ef4444' : p.$open ? '#0ea5e9' : '#e2e8f0')};
    border-radius: 9px;
    background: white;
    color: ${p => (p.$placeholder ? '#94a3b8' : '#0f172a')};
    cursor: pointer;
    outline: none;
    transition: border-color 180ms, box-shadow 180ms;

    ${p => p.$open && 'box-shadow: 0 0 0 3px rgba(14,165,233,0.14);'}
    &:hover:not(:disabled) { border-color: ${p => (p.$error ? '#ef4444' : '#cbd5e1')}; }
    &:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
`;

const Caret = styled.span<{ $open: boolean }>`
    display: flex;
    flex-shrink: 0;
    color: #94a3b8;
    transition: transform 180ms;
    transform: rotate(${p => (p.$open ? '180deg' : '0deg')});
`;

const Menu = styled.div`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 40;
    max-height: 320px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08);
`;

const MenuGroup = styled.div`
    display: flex;
    flex-direction: column;
    & + & { border-top: 1px solid #f1f5f9; }
`;

const GroupLabel = styled.div`
    padding: 8px 14px 4px;
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

const MenuRow = styled.button<{ $selected?: boolean; $create?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 9px 14px;
    border: none;
    background: ${p => (p.$selected ? 'rgba(14,165,233,0.08)' : 'transparent')};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 120ms;

    &:hover:not(:disabled) { background: ${p => (p.$create ? 'rgba(14,165,233,0.06)' : '#f8fafc')}; }
    &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const RowMain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const RowName = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const RowDesc = styled.span`
    font-size: 11px;
    color: #64748b;
    line-height: 1.45;
`;

const RowMeta = styled.span`
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    white-space: nowrap;
`;

const MenuFooter = styled.div`
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;
    padding: 8px 14px;
`;

const LinkBtn = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #0284c7;
    cursor: pointer;

    &:hover { text-decoration: underline; }
`;

const Preview = styled.span`
    font-size: 11px;
    color: #475569;
    line-height: 1.5;
`;
