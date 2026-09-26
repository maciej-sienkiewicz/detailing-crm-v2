import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button } from '@/common/components/ui';
import { useEntitlements } from '@/modules/subscription';
import { useRolePreview, PreviewIcon } from '@/modules/role-preview';
import {
    FormField, FieldLabel, FieldInput, FieldTextarea, ErrorMsg,
} from '../rbacShared.styles';
import { useSettingsDirty } from '../shared/settingsChrome';
import type { PermissionModuleTree, Role, CreateRoleRequest } from '../../rbacTypes';
import { buildTreeIndex, orderedCodes } from './permissionGraph';
import { PermissionTreeEditor, TrackWorkTimeToggle } from './PermissionTreeEditor';
import { permissionsLabel } from '../team/teamPlural';

// ─── Styled ─────────────────────────────────────────────────────────────────────
const PermsHeader = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
`;

const PermsTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const SelectedCount = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0369a1;
`;

/* Podgląd po lewej, zapis po prawej - to dwie różne decyzje. Na telefonie podgląd
   dostaje własny wiersz, żeby żaden przycisk nie łamał się na dwie linie. */
const PreviewSlot = styled.div`
    margin-right: auto;

    @media (max-width: 480px) {
        flex-basis: 100%;
        margin-right: 0;

        & > button { width: 100%; }
    }
`;

// ─── Component ────────────────────────────────────────────────────────────────────
export interface RoleEditorModalProps {
    mode: 'add' | 'edit';
    role?: Role | null;
    catalog: PermissionModuleTree[];
    catalogLoading?: boolean;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateRoleRequest) => void;
    /**
     * Okno otwarte z innego okna (formularz pracownika): musi leżeć nad nim,
     * inaczej otwiera się pod spodem i wygląda, jakby się nie otworzyło.
     */
    nested?: boolean;
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(c => b.has(c));

export function RoleEditorModal({
    mode, role, catalog, catalogLoading, isSaving, onClose, onSubmit, nested,
}: RoleEditorModalProps) {
    const { data: entitlements } = useEntitlements();

    const initialPermissions = useMemo(
        () => new Set((role?.permissions ?? []).map(p => p.code)),
        [role],
    );
    const [name, setName] = useState(role?.name ?? '');
    const [description, setDescription] = useState(role?.description ?? '');
    const [selected, setSelected] = useState<Set<string>>(() => new Set(initialPermissions));
    const [trackWorkTime, setTrackWorkTime] = useState(role?.trackWorkTime ?? false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const index = useMemo(() => buildTreeIndex(catalog), [catalog]);
    const allCodes = useMemo(() => orderedCodes(catalog, index), [catalog, index]);
    const preview = useRolePreview();

    /**
     * Czy w oknie jest coś do stracenia. Kliknięcie w tło albo Escape zamykało okno
     * po cichu - razem z kilkudziesięcioma odhaczonymi uprawnieniami, bo drzewo jest
     * długie i przewija się pod kursorem, a tło leży tuż obok.
     */
    const dirty = name !== (role?.name ?? '')
        || description !== (role?.description ?? '')
        || trackWorkTime !== (role?.trackWorkTime ?? false)
        || !sameSet(selected, initialPermissions);

    // Przejście do innej sekcji ustawień też pyta, zamiast wyrzucić edycję.
    useSettingsDirty(dirty);

    const requestClose = () => {
        if (isSaving) return;
        if (dirty) setConfirmDiscard(true);
        else onClose();
    };

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
        <>
            <ModalShell
                isOpen
                onClose={requestClose}
                size="lg"
                zIndex={nested ? SUBMODAL_Z_INDEX : undefined}
                // Pytanie o porzucenie zmian ma własny Escape - okno pod nim nie może
                // go przechwycić i zapytać drugi raz.
                dismissible={!confirmDiscard}
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{mode === 'add' ? 'Nowa rola' : 'Edytuj rolę'}</ModalTitle>
                        <ModalSubtitle>
                            {mode === 'edit'
                                ? 'Zmiana uprawnień od razu dotyczy wszystkich osób z tą rolą.'
                                : 'Nadaj nazwę i zaznacz uprawnienia. Uprawnienie, które wymaga innego, czeka wyszarzone, aż zaznaczysz nadrzędne.'}
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={requestClose} />
                </ModalHeader>

                <ModalContent>
                    <FormField>
                        <FieldLabel htmlFor="role-editor-name">Nazwa roli<span>*</span></FieldLabel>
                        <FieldInput
                            id="role-editor-name"
                            placeholder="np. Recepcja"
                            value={name}
                            onChange={e => { setName(e.target.value); setNameError(null); }}
                            $error={!!nameError}
                            autoFocus
                        />
                        {nameError && <ErrorMsg role="alert">{nameError}</ErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel htmlFor="role-editor-description">Opis</FieldLabel>
                        <FieldTextarea
                            id="role-editor-description"
                            placeholder="Krótki opis zakresu obowiązków"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </FormField>

                    <TrackWorkTimeToggle value={trackWorkTime} onChange={setTrackWorkTime} />

                    <PermsHeader>
                        <PermsTitle>Uprawnienia</PermsTitle>
                        <SelectedCount>
                            {selected.size === 0 ? 'Nic nie zaznaczono' : `Zaznaczono ${permissionsLabel(selected.size)}`}
                        </SelectedCount>
                    </PermsHeader>

                    <PermissionTreeEditor
                        catalog={catalog}
                        catalogLoading={catalogLoading}
                        selected={selected}
                        onChange={setSelected}
                        isFeatureEnabled={isFeatureEnabled}
                    />
                </ModalContent>

                <ModalFooter>
                    {preview.available && (
                        <PreviewSlot>
                            <Button
                                variant="ghost"
                                onClick={handlePreview}
                                disabled={preview.opening || catalogLoading}
                                title="Otwiera CRM w nowym oknie oczami pracownika z tymi uprawnieniami - na danych przykładowych, bez zapisywania roli"
                            >
                                <PreviewIcon />
                                {preview.opening ? 'Otwieranie podglądu...' : 'Podgląd roli'}
                            </Button>
                        </PreviewSlot>
                    )}
                    <Button variant="outline" onClick={requestClose} disabled={isSaving}>Anuluj</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie...' : mode === 'add' ? 'Dodaj rolę' : 'Zapisz rolę'}
                    </Button>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={confirmDiscard}
                title="Odrzucić zmiany w roli?"
                message="Zaznaczone uprawnienia i wpisane dane nie zostały zapisane. Po zamknięciu okna trzeba będzie zacząć od nowa."
                variant="warning"
                confirmText="Odrzuć zmiany"
                cancelText="Wróć do edycji"
                onConfirm={() => { setConfirmDiscard(false); onClose(); }}
                onCancel={() => setConfirmDiscard(false)}
            />
        </>
    );
}
