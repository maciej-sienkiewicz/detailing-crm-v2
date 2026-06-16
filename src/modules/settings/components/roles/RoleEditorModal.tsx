import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useEntitlements } from '@/modules/subscription';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, SubmitBtn, CheckRow, CheckBox, Badge,
} from '../rbacShared.styles';
import type { PermissionModuleGroup, Role, CreateRoleRequest } from '../../rbacTypes';

export interface RoleEditorModalProps {
    mode: 'add' | 'edit';
    role?: Role | null;
    catalog: PermissionModuleGroup[];
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateRoleRequest) => void;
}

export function RoleEditorModal({ mode, role, catalog, isSaving, onClose, onSubmit }: RoleEditorModalProps) {
    const { data: entitlements } = useEntitlements();

    const [name, setName] = useState(role?.name ?? '');
    const [description, setDescription] = useState(role?.description ?? '');
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set((role?.permissions ?? []).map(p => p.code)),
    );
    const [nameError, setNameError] = useState<string | null>(null);

    const allCodes = useMemo(
        () => catalog.flatMap(m => m.permissions.map(p => p.code)),
        [catalog],
    );
    const totalSelected = selected.size;

    const toggle = (code: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    const toggleModule = (module: PermissionModuleGroup) => {
        const codes = module.permissions.map(p => p.code);
        const allOn = codes.every(c => selected.has(c));
        setSelected(prev => {
            const next = new Set(prev);
            codes.forEach(c => allOn ? next.delete(c) : next.add(c));
            return next;
        });
    };

    const isFeatureEnabled = (featureKey: string | null): boolean => {
        if (!featureKey) return true;
        if (!entitlements) return true; // don't block UI before entitlements load
        return entitlements.features[featureKey as keyof typeof entitlements.features]?.enabled ?? false;
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
                        <SelectedCount>{totalSelected} zaznaczonych</SelectedCount>
                    </PermsHeader>

                    {catalog.map(module => {
                        const codes = module.permissions.map(p => p.code);
                        const selectedInModule = codes.filter(c => selected.has(c)).length;
                        const allOn = selectedInModule === codes.length && codes.length > 0;
                        const featureOk = isFeatureEnabled(module.featureKey);

                        return (
                            <ModuleCard key={module.module}>
                                <ModuleHead onClick={() => toggleModule(module)}>
                                    <CheckBox $checked={allOn}>{allOn && <TinyCheck />}</CheckBox>
                                    <ModuleName>{module.displayName}</ModuleName>
                                    {!featureOk && module.featureKey && (
                                        <Badge $variant="amber">⚠ Wymaga modułu „{module.displayName}"</Badge>
                                    )}
                                    <ModuleCount>{selectedInModule}/{codes.length}</ModuleCount>
                                </ModuleHead>

                                <PermsGrid>
                                    {module.permissions.map(perm => {
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
                    })}
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
`;

const PermsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
    padding: 14px;
`;

const PermLabel = styled.span<{ $dim?: boolean }>`
    font-size: 13px;
    color: ${p => (p.$dim ? '#94a3b8' : '#334155')};
    line-height: 1.4;
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
