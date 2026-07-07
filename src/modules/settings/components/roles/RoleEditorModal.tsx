import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useEntitlements } from '@/modules/subscription';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, SubmitBtn, CheckRow, CheckBox, Badge, SkeletonBox,
} from '../rbacShared.styles';
import type { PermissionTreeNode, PermissionModuleTree, Role, CreateRoleRequest } from '../../rbacTypes';

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

// ─── Tree helpers ─────────────────────────────────────────────────────────────
interface TreeIndex {
    /** code → parent code (null for module roots). */
    parentOf: Map<string, string | null>;
    /** code → direct child codes. */
    childrenOf: Map<string, string[]>;
    /** All codes per module, in tree order. */
    moduleCodes: Map<string, string[]>;
}

function buildTreeIndex(catalog: PermissionModuleTree[]): TreeIndex {
    const parentOf = new Map<string, string | null>();
    const childrenOf = new Map<string, string[]>();
    const moduleCodes = new Map<string, string[]>();

    const visit = (node: PermissionTreeNode, parent: string | null, codes: string[]) => {
        parentOf.set(node.code, parent);
        childrenOf.set(node.code, node.children.map(c => c.code));
        codes.push(node.code);
        node.children.forEach(child => visit(child, node.code, codes));
    };

    catalog.forEach(module => {
        const codes: string[] = [];
        module.nodes.forEach(root => visit(root, null, codes));
        moduleCodes.set(module.module, codes);
    });

    return { parentOf, childrenOf, moduleCodes };
}

function ancestorsOf(code: string, index: TreeIndex): string[] {
    const result: string[] = [];
    let current = index.parentOf.get(code) ?? null;
    while (current) {
        result.push(current);
        current = index.parentOf.get(current) ?? null;
    }
    return result;
}

function descendantsOf(code: string, index: TreeIndex): string[] {
    const result: string[] = [];
    const queue = [...(index.childrenOf.get(code) ?? [])];
    while (queue.length > 0) {
        const next = queue.shift()!;
        result.push(next);
        queue.push(...(index.childrenOf.get(next) ?? []));
    }
    return result;
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
    const [nameError, setNameError] = useState<string | null>(null);

    const index = useMemo(() => buildTreeIndex(catalog), [catalog]);

    const allCodes = useMemo(
        () => catalog.flatMap(m => index.moduleCodes.get(m.module) ?? []),
        [catalog, index],
    );

    /**
     * The single cascade rule of the tree:
     * - checking a node also checks its whole ancestor chain (a child is
     *   meaningless without its parent),
     * - unchecking a node also unchecks its whole subtree.
     * Both directions are immediately visible in the rendered hierarchy,
     * so no confirmation dialog is needed.
     */
    const toggle = useCallback((code: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                next.delete(code);
                descendantsOf(code, index).forEach(c => next.delete(c));
            } else {
                next.add(code);
                ancestorsOf(code, index).forEach(c => next.add(c));
            }
            return next;
        });
    }, [index]);

    const toggleModule = useCallback((module: PermissionModuleTree) => {
        const codes = index.moduleCodes.get(module.module) ?? [];
        setSelected(prev => {
            const next = new Set(prev);
            const allOn = codes.length > 0 && codes.every(c => next.has(c));
            // The tree never crosses module boundaries, so a bulk module toggle
            // is self-contained: no ancestors or descendants live outside `codes`.
            codes.forEach(c => (allOn ? next.delete(c) : next.add(c)));
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
        });
    };

    const renderNodes = (nodes: PermissionTreeNode[], moduleFeatureOk: boolean) => (
        groupBySection(nodes).map(group => (
            <NodeBlock key={group.section ?? group.nodes[0].code}>
                {group.section && <SectionLabel>{group.section}</SectionLabel>}
                {group.nodes.map(node => {
                    const checked = selected.has(node.code);
                    const nodeFeatureOk = moduleFeatureOk && isFeatureEnabled(node.featureKey);
                    return (
                        <NodeBlock key={node.code}>
                            <CheckRow onClick={() => toggle(node.code)}>
                                <CheckBox $checked={checked}>{checked && <TinyCheck />}</CheckBox>
                                <PermTexts>
                                    <PermLabel $dim={!nodeFeatureOk}>{node.displayName}</PermLabel>
                                    {node.description && <PermDesc>{node.description}</PermDesc>}
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
                                : 'Nadaj nazwę i zaznacz uprawnienia w drzewie — uprawnienie niżej wymaga uprawnienia nadrzędnego.'}
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
                        {isSaving ? 'Zapisywanie…' : mode === 'add' ? 'Utwórz rolę' : 'Zapisz rolę'}
                    </SubmitBtn>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
}
