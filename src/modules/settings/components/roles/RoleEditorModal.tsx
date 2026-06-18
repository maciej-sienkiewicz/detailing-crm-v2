import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useEntitlements } from '@/modules/subscription';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, SubmitBtn, CheckRow, CheckBox, Badge, SkeletonBox,
} from '../rbacShared.styles';
import type { PermissionCatalogItem, PermissionModuleGroup, Role, CreateRoleRequest } from '../../rbacTypes';

// ─── Styled ─────────────────────────────────────────────────────────────────────
const PermsHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
`;

const SelectedCount = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #0284c7;
`;

const ModuleCard = styled.div`
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    /* Flex child of the (column) ModalBody: without this, 'overflow: hidden'
       gives the card an implicit min-height of 0, so once enough modules
       overflow the modal the flex layout shrinks every card toward zero height
       (collapsing into blank gray bars) instead of letting ModalBody scroll. */
    flex-shrink: 0;
`;

const ModuleHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    background: #fafbfc;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    user-select: none;
`;

const ModuleName = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
`;

const ModuleCount = styled.span`
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    flex-shrink: 0;
`;

const PermsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    padding: 14px;
`;

const PermLabel = styled.span<{ $dim?: boolean }>`
    font-size: 13px;
    color: ${p => (p.$dim ? '#94a3b8' : '#334155')};
    line-height: 1.4;
`;

const EmptyPerms = styled.div`
    padding: 28px 16px;
    text-align: center;
    font-size: 13px;
    color: #94a3b8;
    border: 1px dashed #e2e8f0;
    border-radius: 10px;
`;

const RequiredBadge = styled.span`
    margin-left: auto;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 1px 5px;
    display: flex;
    align-items: center;
    gap: 3px;
`;

const LockedCheckBox = styled(CheckBox)`
    border-color: #94a3b8;
    background: #e2e8f0;
    color: #64748b;
    cursor: default;
`;

// ─── Dependency confirmation dialog ──────────────────────────────────────────
const ConfirmOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
`;

const ConfirmCard = styled.div`
    background: white;
    border-radius: 14px;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
    padding: 28px 28px 24px;
    width: 420px;
    max-width: calc(100vw - 32px);
`;

const ConfirmTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
`;

const ConfirmSubtitle = styled.p`
    margin: 0 0 16px;
    font-size: 13px;
    color: #475569;
    line-height: 1.5;
`;

const DepList = styled.ul`
    margin: 0 0 20px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const DepItem = styled.li`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    padding: 8px 12px;
`;

const DepModuleTag = styled.span`
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    background: #e2e8f0;
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
`;

const ConfirmFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;

const ConfirmNote = styled.p`
    font-size: 11px;
    color: #94a3b8;
    margin: 0 0 20px;
    line-height: 1.5;
`;

interface DepConfirmState {
    triggerCode: string;
    triggerName: string;
    missingDeps: Array<{ code: string; displayName: string; moduleDisplayName: string }>;
    allDepsToAdd: Set<string>;
}

// ─── Icons ───────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const TinyCheck = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const LockIcon = () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
);

// ─── Dependency graph helpers ─────────────────────────────────────────────────
function getTransitiveDeps(code: string, map: Map<string, PermissionCatalogItem>): Set<string> {
    const result = new Set<string>();
    const visit = (c: string) => {
        const perm = map.get(c);
        (perm?.requires ?? []).forEach(dep => {
            if (!result.has(dep)) {
                result.add(dep);
                visit(dep);
            }
        });
    };
    visit(code);
    return result;
}

// ─── Component ────────────────────────────────────────────────────────────────────
export interface RoleEditorModalProps {
    mode: 'add' | 'edit';
    role?: Role | null;
    catalog: PermissionModuleGroup[];
    catalogLoading?: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateRoleRequest) => void;
}

export function RoleEditorModal({
    mode, role, catalog, catalogLoading, isSaving, onClose, onSubmit,
}: RoleEditorModalProps) {
    const { data: entitlements } = useEntitlements();

    const [name, setName] = useState(role?.name ?? '');
    const [description, setDescription] = useState(role?.description ?? '');
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set((role?.permissions ?? []).map(p => p.code)),
    );
    const [nameError, setNameError] = useState<string | null>(null);
    const [depConfirm, setDepConfirm] = useState<DepConfirmState | null>(null);

    const allCodes = useMemo(
        () => catalog.flatMap(m => (m.permissions ?? []).map(p => p.code)),
        [catalog],
    );

    // Flat map of code → permission for graph traversal
    const allPermsMap = useMemo(() => {
        const map = new Map<string, PermissionCatalogItem>();
        catalog.forEach(m => (m.permissions ?? []).forEach(p => map.set(p.code, p)));
        return map;
    }, [catalog]);

    // Map code → module display name (for the confirmation dialog)
    const codeToModule = useMemo(() => {
        const map = new Map<string, string>();
        catalog.forEach(m => (m.permissions ?? []).forEach(p => map.set(p.code, m.displayName || m.module)));
        return map;
    }, [catalog]);

    // Set of permission codes that are auto-required by at least one selected permission.
    // These cannot be deselected as long as their "dependant" remains selected.
    const lockedCodes = useMemo(() => {
        const locked = new Set<string>();
        selected.forEach(code => {
            getTransitiveDeps(code, allPermsMap).forEach(dep => locked.add(dep));
        });
        return locked;
    }, [selected, allPermsMap]);

    // ── Diagnostics: what did the modal actually receive to render? ──────────────
    useEffect(() => {
        console.log('[RoleEditorModal] catalog received:', {
            catalogLoading,
            moduleCount: catalog.length,
            totalPermissions: catalog.reduce((n, m) => n + (m.permissions?.length ?? 0), 0),
            sample: catalog.slice(0, 2).map(m => ({
                module: m.module,
                displayName: m.displayName,
                permissionCount: m.permissions?.length ?? 0,
                firstPermission: m.permissions?.[0],
            })),
        });
    }, [catalog, catalogLoading]);

    // Apply a confirmed cascade: add the trigger code + all deps
    const applyAdd = useCallback((code: string, allDepsToAdd: Set<string>) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.add(code);
            allDepsToAdd.forEach(dep => next.add(dep));
            return next;
        });
        setDepConfirm(null);
    }, []);

    const toggle = useCallback((code: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                // Blocked if another selected permission requires this one
                const currentLocked = new Set<string>();
                next.forEach(c => { if (c !== code) getTransitiveDeps(c, allPermsMap).forEach(d => currentLocked.add(d)); });
                if (currentLocked.has(code)) return prev;
                next.delete(code);
                return next;
            }

            // Enabling: check which transitive deps are not yet selected
            const allDepsToAdd = getTransitiveDeps(code, allPermsMap);
            const missingDeps = [...allDepsToAdd].filter(dep => !prev.has(dep));

            if (missingDeps.length > 0) {
                // Show confirmation dialog — do NOT mutate state here
                const perm = allPermsMap.get(code);
                setDepConfirm({
                    triggerCode: code,
                    triggerName: perm?.displayName ?? code,
                    missingDeps: missingDeps.map(dep => ({
                        code: dep,
                        displayName: allPermsMap.get(dep)?.displayName ?? dep,
                        moduleDisplayName: codeToModule.get(dep) ?? '',
                    })),
                    allDepsToAdd,
                });
                return prev; // no change yet
            }

            // No missing deps — apply immediately
            next.add(code);
            allDepsToAdd.forEach(dep => next.add(dep));
            return next;
        });
    }, [allPermsMap, codeToModule]);

    const toggleModule = useCallback((module: PermissionModuleGroup) => {
        const codes = (module.permissions ?? []).map(p => p.code);
        const allOn = codes.length > 0 && codes.every(c => selected.has(c));
        setSelected(prev => {
            const next = new Set(prev);
            if (allOn) {
                // Turn off: skip codes that are required by permissions outside this module
                const moduleSet = new Set(codes);
                codes.forEach(c => {
                    let requiredByOutside = false;
                    next.forEach(sel => {
                        if (!moduleSet.has(sel) && getTransitiveDeps(sel, allPermsMap).has(c)) {
                            requiredByOutside = true;
                        }
                    });
                    if (!requiredByOutside) next.delete(c);
                });
            } else {
                // Turn on: cascade deps for every permission in the module
                codes.forEach(c => {
                    next.add(c);
                    getTransitiveDeps(c, allPermsMap).forEach(dep => next.add(dep));
                });
            }
            return next;
        });
    }, [allPermsMap, selected]);

    const isFeatureEnabled = (featureKey: string | null): boolean => {
        if (!featureKey) return true;
        if (!entitlements) return true;
        const features = entitlements.features as Record<string, { enabled: boolean } | undefined>;
        return features[featureKey]?.enabled ?? false;
    };

    const handleSubmit = () => {
        if (!name.trim()) { setNameError('Nazwa roli jest wymagana'); return; }
        onSubmit({
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
            permissions: allCodes.filter(c => selected.has(c)),
        });
    };

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard $maxWidth={680}>
                <ModalHead>
                    <div>
                        <ModalTitle>{mode === 'add' ? 'Nowa rola' : 'Edytuj rolę'}</ModalTitle>
                        <ModalSubtitle>
                            {mode === 'edit'
                                ? 'Zmiana uprawnień natychmiast dotyczy wszystkich użytkowników z tą rolą.'
                                : 'Nadaj nazwę i zaznacz uprawnienia w poszczególnych modułach.'}
                        </ModalSubtitle>
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <CloseIcon />
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    <FormField>
                        <FieldLabel>Nazwa roli<span>*</span></FieldLabel>
                        <FieldInput
                            placeholder="np. Recepcjonista"
                            value={name}
                            onChange={e => { setName(e.target.value); setNameError(null); }}
                            $error={!!nameError}
                            autoFocus
                        />
                        {nameError && <ErrorMsg>{nameError}</ErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel>Opis</FieldLabel>
                        <FieldTextarea
                            placeholder="Krótki opis zakresu obowiązków roli"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </FormField>

                    <PermsHeader>
                        <FieldLabel>Uprawnienia</FieldLabel>
                        <SelectedCount>{selected.size} zaznaczonych</SelectedCount>
                    </PermsHeader>

                    {catalogLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <ModuleCard key={i}>
                                <ModuleHead as="div" style={{ cursor: 'default' }}>
                                    <SkeletonBox $w="140px" />
                                </ModuleHead>
                                <PermsGrid>
                                    <SkeletonBox $w="80%" />
                                    <SkeletonBox $w="70%" />
                                </PermsGrid>
                            </ModuleCard>
                        ))
                    ) : catalog.length === 0 ? (
                        <EmptyPerms>Nie udało się załadować katalogu uprawnień.</EmptyPerms>
                    ) : (
                        catalog.map(module => {
                            const perms = module.permissions ?? [];
                            const codes = perms.map(p => p.code);
                            const selectedInModule = codes.filter(c => selected.has(c)).length;
                            const allOn = selectedInModule === codes.length && codes.length > 0;
                            const featureOk = isFeatureEnabled(module.featureKey);

                            return (
                                <ModuleCard key={module.module}>
                                    <ModuleHead onClick={() => toggleModule(module)}>
                                        <CheckBox $checked={allOn}>{allOn && <TinyCheck />}</CheckBox>
                                        <ModuleName>{module.displayName || module.module}</ModuleName>
                                        {!featureOk && module.featureKey && (
                                            <Badge $variant="amber">⚠ Wymaga modułu</Badge>
                                        )}
                                        <ModuleCount>{selectedInModule}/{codes.length}</ModuleCount>
                                    </ModuleHead>

                                    <PermsGrid>
                                        {perms.map(perm => {
                                            const checked = selected.has(perm.code);
                                            const locked = lockedCodes.has(perm.code);
                                            return (
                                                <CheckRow
                                                    key={perm.code}
                                                    onClick={() => toggle(perm.code)}
                                                    $disabled={locked}
                                                    title={locked ? 'Wymagane przez inne zaznaczone uprawnienie' : undefined}
                                                >
                                                    {locked ? (
                                                        <LockedCheckBox $checked={true}><TinyCheck /></LockedCheckBox>
                                                    ) : (
                                                        <CheckBox $checked={checked}>{checked && <TinyCheck />}</CheckBox>
                                                    )}
                                                    <PermLabel $dim={!featureOk}>{perm.displayName}</PermLabel>
                                                    {locked && (
                                                        <RequiredBadge><LockIcon />wymagane</RequiredBadge>
                                                    )}
                                                </CheckRow>
                                            );
                                        })}
                                    </PermsGrid>
                                </ModuleCard>
                            );
                        })
                    )}
                </ModalBody>

                <ModalFooter>
                    <CancelBtn onClick={onClose} disabled={isSaving}>Anuluj</CancelBtn>
                    <SubmitBtn onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie…' : mode === 'add' ? 'Utwórz rolę' : 'Zapisz rolę'}
                    </SubmitBtn>
                </ModalFooter>
            </ModalCard>

            {depConfirm && (
                <ConfirmOverlay onClick={e => e.target === e.currentTarget && setDepConfirm(null)}>
                    <ConfirmCard>
                        <ConfirmTitle>Wymagane dodatkowe uprawnienia</ConfirmTitle>
                        <ConfirmSubtitle>
                            Zaznaczenie uprawnienia <strong>„{depConfirm.triggerName}"</strong> wymaga
                            również nadania poniższych uprawnień. Nie można zrobić wyjątku.
                        </ConfirmSubtitle>

                        <DepList>
                            {depConfirm.missingDeps.map(dep => (
                                <DepItem key={dep.code}>
                                    <TinyCheck />
                                    {dep.displayName}
                                    {dep.moduleDisplayName && (
                                        <DepModuleTag>{dep.moduleDisplayName}</DepModuleTag>
                                    )}
                                </DepItem>
                            ))}
                        </DepList>

                        <ConfirmNote>
                            Uprawnienia te zostaną zaznaczone automatycznie i będą aktywne
                            dopóki nie usuniesz uprawnienia „{depConfirm.triggerName}".
                        </ConfirmNote>

                        <ConfirmFooter>
                            <CancelBtn onClick={() => setDepConfirm(null)}>Anuluj</CancelBtn>
                            <SubmitBtn onClick={() => applyAdd(depConfirm.triggerCode, depConfirm.allDepsToAdd)}>
                                Tak, kontynuuj
                            </SubmitBtn>
                        </ConfirmFooter>
                    </ConfirmCard>
                </ConfirmOverlay>
            )}
        </Overlay>
    );
}
