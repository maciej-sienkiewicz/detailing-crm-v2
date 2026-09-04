import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useEntitlements } from '@/modules/subscription';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, SubmitBtn, CheckRow, CheckBox, Badge, SkeletonBox,
} from '../rbacShared.styles';
import type { PermissionTreeNode, PermissionModuleTree, Role, CreateRoleRequest } from '../../rbacTypes';

// ─── Toggle switch ───────────────────────────────────────────────────────────────
const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    user-select: none;
`;

const ToggleLabel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ToggleName = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const ToggleDesc = styled.span`
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
`;

const ToggleSwitch = styled.div<{ $on: boolean }>`
    position: relative;
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: ${p => (p.$on ? '#0284c7' : '#cbd5e1')};
    transition: background 200ms;
    flex-shrink: 0;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => (p.$on ? '21px' : '3px')};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        transition: left 200ms;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
`;

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

const TreeWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
`;

/* Children of a node: indented, with a vertical guide line visualizing that
   everything below requires the parent above. */
const TreeChildren = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-left: 8px;
    padding-left: 18px;
    border-left: 1.5px solid #e2e8f0;
`;

const NodeBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SectionLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-top: 4px;
`;

const PermTexts = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
`;

const PermLabel = styled.span<{ $dim?: boolean }>`
    font-size: 13px;
    color: ${p => (p.$dim ? '#94a3b8' : '#334155')};
    line-height: 1.4;
`;

const PermDesc = styled.span`
    font-size: 11px;
    color: #94a3b8;
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

// ─── Dependency-graph helpers ─────────────────────────────────────────────────
// The catalog is a tree (parent/children) plus explicit implications (`implies`),
// which may cross branches and modules. Both are dependency edges: a permission
// requires its whole ancestor chain AND everything it implies.
interface TreeIndex {
    /** code → parent code (null for module roots). */
    parentOf: Map<string, string | null>;
    /** code → direct child codes. */
    childrenOf: Map<string, string[]>;
    /** code → codes it additionally requires beyond its parent (may cross modules). */
    impliesOf: Map<string, string[]>;
    /** code → codes that imply it (reverse of impliesOf). */
    impliedBy: Map<string, string[]>;
    /** code → displayName, for rendering implication hints. */
    labelOf: Map<string, string>;
    /** All codes per module, in tree order. */
    moduleCodes: Map<string, string[]>;
}

function buildTreeIndex(catalog: PermissionModuleTree[]): TreeIndex {
    const parentOf = new Map<string, string | null>();
    const childrenOf = new Map<string, string[]>();
    const impliesOf = new Map<string, string[]>();
    const impliedBy = new Map<string, string[]>();
    const labelOf = new Map<string, string>();
    const moduleCodes = new Map<string, string[]>();

    const visit = (node: PermissionTreeNode, parent: string | null, codes: string[]) => {
        parentOf.set(node.code, parent);
        childrenOf.set(node.code, node.children.map(c => c.code));
        impliesOf.set(node.code, node.implies);
        labelOf.set(node.code, node.displayName);
        node.implies.forEach(target => {
            impliedBy.set(target, [...(impliedBy.get(target) ?? []), node.code]);
        });
        codes.push(node.code);
        node.children.forEach(child => visit(child, node.code, codes));
    };

    catalog.forEach(module => {
        const codes: string[] = [];
        module.nodes.forEach(root => visit(root, null, codes));
        moduleCodes.set(module.module, codes);
    });

    return { parentOf, childrenOf, impliesOf, impliedBy, labelOf, moduleCodes };
}

/** BFS over dependency edges, excluding the start code itself. */
function expandFrom(code: string, step: (c: string) => string[]): string[] {
    const seen = new Set([code]);
    const result: string[] = [];
    const queue = step(code);
    while (queue.length > 0) {
        const next = queue.shift()!;
        if (seen.has(next)) continue;
        seen.add(next);
        result.push(next);
        queue.push(...step(next));
    }
    return result;
}

/** Everything `code` requires: its ancestor chain and implied permissions, transitively. */
function requirementsOf(code: string, index: TreeIndex): string[] {
    return expandFrom(code, c => {
        const parent = index.parentOf.get(c);
        return parent ? [parent, ...(index.impliesOf.get(c) ?? [])] : (index.impliesOf.get(c) ?? []);
    });
}

/** Everything that requires `code`: its subtree and permissions implying it, transitively. */
function dependentsOf(code: string, index: TreeIndex): string[] {
    return expandFrom(code, c => [
        ...(index.childrenOf.get(c) ?? []),
        ...(index.impliedBy.get(c) ?? []),
    ]);
}

/**
 * The first direct prerequisite of `code` that is not yet selected, or null if all are met.
 * A permission is disabled in the editor when this returns non-null.
 */
function getBlocker(code: string, selected: Set<string>, index: TreeIndex): string | null {
    const parent = index.parentOf.get(code) ?? null;
    if (parent !== null && !selected.has(parent)) return parent;
    for (const implied of (index.impliesOf.get(code) ?? [])) {
        if (!selected.has(implied)) return implied;
    }
    return null;
}

/** Groups sibling nodes by their section label, preserving declaration order. */
function groupBySection(nodes: PermissionTreeNode[]): Array<{ section: string | null; nodes: PermissionTreeNode[] }> {
    const groups: Array<{ section: string | null; nodes: PermissionTreeNode[] }> = [];
    nodes.forEach(node => {
        const last = groups[groups.length - 1];
        if (last && last.section === (node.section ?? null)) {
            last.nodes.push(node);
        } else {
            groups.push({ section: node.section ?? null, nodes: [node] });
        }
    });
    return groups;
}

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

    const allCodes = useMemo(
        () => catalog.flatMap(m => index.moduleCodes.get(m.module) ?? []),
        [catalog, index],
    );

    /**
     * The cascade rule of the dependency graph:
     * - checking a node also checks everything it requires: its whole ancestor
     *   chain and its implications, transitively (possibly in other modules),
     * - unchecking a node also unchecks everything that requires it: its subtree
     *   and the permissions implying it, transitively.
     * The backend closes the persisted set over the same graph, so what is shown
     * checked is exactly what gets saved and enforced.
     */
    const toggle = useCallback((code: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
                dependentsOf(code, index).forEach(c => next.delete(c));
            } else {
                // No auto-cascade: the user must explicitly enable prerequisites.
                // The UI disables this row until all direct requirements are met.
                next.add(code);
            }
            return next;
        });
    }, [index]);

    const toggleModule = useCallback((module: PermissionModuleTree) => {
        const codes = index.moduleCodes.get(module.module) ?? [];
        setSelected(prev => {
            const next = new Set(prev);
            const allOn = codes.length > 0 && codes.every(c => next.has(c));
            if (allOn) {
                codes.forEach(c => {
                    next.delete(c);
                    dependentsOf(c, index).forEach(d => next.delete(d));
                });
            } else {
                // Only enable permissions whose direct prerequisites are already met.
                codes.forEach(c => {
                    if (getBlocker(c, next, index) === null) next.add(c);
                });
            }
            return next;
        });
    }, [index]);

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
            trackWorkTime,
        });
    };

    const renderNodes = (nodes: PermissionTreeNode[], moduleFeatureOk: boolean) => (
        groupBySection(nodes).map(group => (
            <NodeBlock key={group.section ?? group.nodes[0].code}>
                {/* Nagłówek sekcji. Grupowanie liczyło się od dawna, ale etykieta
                    nigdy nie trafiała na ekran - przez co „Zlecenia zbiorcze" czy
                    „Klienci i pojazdy" wyglądały jak kolejne pozycje na jednej liście,
                    a nie jak osobne obszary uprawnień. */}
                {group.section && <SectionLabel>{group.section}</SectionLabel>}
                {group.nodes.map(node => {
                    const checked = selected.has(node.code);
                    const nodeFeatureOk = moduleFeatureOk && isFeatureEnabled(node.featureKey);
                    const blocker = getBlocker(node.code, selected, index);
                    const disabled = !nodeFeatureOk || blocker !== null;
                    return (
                        <NodeBlock key={node.code}>
                            <CheckRow
                                $disabled={disabled}
                                onClick={disabled ? undefined : () => toggle(node.code)}
                            >
                                <CheckBox $checked={checked}>{checked && <TinyCheck />}</CheckBox>
                                <PermTexts>
                                    <PermLabel $dim={disabled}>{node.displayName}</PermLabel>
                                    {node.description && !blocker && <PermDesc>{node.description}</PermDesc>}
                                    {blocker && (
                                        <PermDesc>
                                            Najpierw zaznacz: {index.labelOf.get(blocker) ?? blocker}
                                        </PermDesc>
                                    )}
                                </PermTexts>
                                {!nodeFeatureOk && node.featureKey && (
                                    <Badge $variant="amber">⚠ Wymaga modułu</Badge>
                                )}
                            </CheckRow>
                            {node.children.length > 0 && (
                                <TreeChildren>
                                    {renderNodes(node.children, nodeFeatureOk)}
                                </TreeChildren>
                            )}
                        </NodeBlock>
                    );
                })}
            </NodeBlock>
        ))
    );

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

                    <ToggleRow onClick={() => setTrackWorkTime(v => !v)}>
                        <ToggleLabel>
                            <ToggleName>Śledź czas pracy</ToggleName>
                            <ToggleDesc>Użytkownicy z tą rolą widzą moduł „Czas pracy" i mogą rejestrować godziny</ToggleDesc>
                        </ToggleLabel>
                        <ToggleSwitch $on={trackWorkTime} />
                    </ToggleRow>

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
                                <TreeWrap>
                                    <SkeletonBox $w="60%" />
                                    <SkeletonBox $w="50%" />
                                </TreeWrap>
                            </ModuleCard>
                        ))
                    ) : catalog.length === 0 ? (
                        <EmptyPerms>Nie udało się załadować katalogu uprawnień.</EmptyPerms>
                    ) : (
                        catalog.map(module => {
                            const codes = index.moduleCodes.get(module.module) ?? [];
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

                                    <TreeWrap>
                                        {renderNodes(module.nodes, featureOk)}
                                    </TreeWrap>
                                </ModuleCard>
                            );
                        })
                    )}
                </ModalBody>

                <ModalFooter>
                    <CancelBtn onClick={onClose} disabled={isSaving}>Anuluj</CancelBtn>
                    <SubmitBtn onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie...' : mode === 'add' ? 'Utwórz rolę' : 'Zapisz rolę'}
                    </SubmitBtn>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
}
