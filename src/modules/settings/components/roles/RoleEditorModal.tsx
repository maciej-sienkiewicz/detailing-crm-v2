import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useEntitlements } from '@/modules/subscription';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, SubmitBtn, CheckRow, CheckBox, Badge, SkeletonBox,
} from '../rbacShared.styles';
import type { PermissionModuleGroup, Role, CreateRoleRequest } from '../../rbacTypes';

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

    const allCodes = useMemo(
        () => catalog.flatMap(m => (m.permissions ?? []).map(p => p.code)),
        [catalog],
    );

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

    const toggle = (code: string) => {
        console.log('[RoleEditorModal] toggle permission:', code);
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    const toggleModule = (module: PermissionModuleGroup) => {
        const codes = (module.permissions ?? []).map(p => p.code);
        const allOn = codes.length > 0 && codes.every(c => selected.has(c));
        setSelected(prev => {
            const next = new Set(prev);
            codes.forEach(c => (allOn ? next.delete(c) : next.add(c)));
            return next;
        });
    };

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
                                            return (
                                                <CheckRow key={perm.code} onClick={() => toggle(perm.code)}>
                                                    <CheckBox $checked={checked}>{checked && <TinyCheck />}</CheckBox>
                                                    <PermLabel $dim={!featureOk}>{perm.displayName}</PermLabel>
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
        </Overlay>
    );
}
