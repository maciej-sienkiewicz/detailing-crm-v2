import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useEntitlements } from '@/modules/subscription';
import { useRolePreview, PreviewIcon } from '@/modules/role-preview';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, SubmitBtn, SecondaryBtn,
} from '../rbacShared.styles';
import type { PermissionModuleTree, Role, CreateRoleRequest } from '../../rbacTypes';
import { buildTreeIndex, orderedCodes } from './permissionGraph';
import { PermissionTreeEditor, TrackWorkTimeToggle } from './PermissionTreeEditor';

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

/* Podgląd po lewej, zapis po prawej - to dwie różne decyzje. Na telefonie podgląd
   dostaje własny wiersz, żeby żaden przycisk nie łamał się na dwie linie. */
const EditorFooter = styled(ModalFooter)`
    flex-wrap: wrap;
`;

const PreviewSlot = styled.div`
    margin-right: auto;

    @media (max-width: 480px) {
        flex-basis: 100%;
        margin-right: 0;

        & > button { width: 100%; justify-content: center; }
    }
`;

// ─── Icons ───────────────────────────────────────────────────────────────────────
const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────────
export interface RoleEditorModalProps {
    mode: 'add' | 'edit';
    role?: Role | null;
    catalog: PermissionModuleTree[];
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
    const [trackWorkTime, setTrackWorkTime] = useState(role?.trackWorkTime ?? false);
    const [nameError, setNameError] = useState<string | null>(null);

    const index = useMemo(() => buildTreeIndex(catalog), [catalog]);
    const allCodes = useMemo(() => orderedCodes(catalog, index), [catalog, index]);
    const preview = useRolePreview();

    const isFeatureEnabled = (featureKey: string | null): boolean => {
        if (!featureKey) return true;
        if (!entitlements) return true;
        const features = entitlements.features as Record<string, { enabled: boolean } | undefined>;
        return features[featureKey]?.enabled ?? false;
    };

    /** Podgląd tego, co jest teraz w edytorze - także przed zapisem roli. */
    const handlePreview = () => {
        preview.open({
            roleName: name.trim() || role?.name || 'Nowa rola',
            permissions: allCodes.filter(c => selected.has(c)),
            trackWorkTime,
        });
    };

    const handleSubmit = () => {
        if (!name.trim()) { setNameError('Nazwa roli jest wymagana'); return; }
        onSubmit({
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
            permissions: allCodes.filter(c => selected.has(c)),
            trackWorkTime,
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
                                : 'Nadaj nazwę i zaznacz uprawnienia w drzewie: opcje wymagające innego uprawnienia są wyszarzone, dopóki uprawnienie nadrzędne nie jest zaznaczone.'}
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

                    <TrackWorkTimeToggle value={trackWorkTime} onChange={setTrackWorkTime} />

                    <PermsHeader>
                        <FieldLabel>Uprawnienia</FieldLabel>
                        <SelectedCount>{selected.size} zaznaczonych</SelectedCount>
                    </PermsHeader>

                    <PermissionTreeEditor
                        catalog={catalog}
                        catalogLoading={catalogLoading}
                        selected={selected}
                        onChange={setSelected}
                        isFeatureEnabled={isFeatureEnabled}
                    />
                </ModalBody>

                <EditorFooter>
                    {preview.available && (
                        <PreviewSlot>
                            <SecondaryBtn
                                type="button"
                                onClick={handlePreview}
                                disabled={preview.opening || catalogLoading}
                                title="Otwiera CRM w nowym oknie oczami pracownika z tymi uprawnieniami - na danych przykładowych, bez zapisywania roli"
                            >
                                <PreviewIcon />
                                {preview.opening ? 'Otwieranie podglądu...' : 'Przejdź do podglądu roli'}
                            </SecondaryBtn>
                        </PreviewSlot>
                    )}
                    <CancelBtn onClick={onClose} disabled={isSaving}>Anuluj</CancelBtn>
                    <SubmitBtn onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie...' : mode === 'add' ? 'Utwórz rolę' : 'Zapisz rolę'}
                    </SubmitBtn>
                </EditorFooter>
            </ModalCard>
        </Overlay>
    );
}
