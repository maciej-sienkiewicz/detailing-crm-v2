import { useMemo } from 'react';
import styled from 'styled-components';
import { CheckRow, CheckBox, Badge, SkeletonBox } from '../rbacShared.styles';
import type { PermissionTreeNode, PermissionModuleTree } from '../../rbacTypes';
import { buildTreeIndex, getBlocker, groupBySection, toggleCode, toggleModuleCodes } from './permissionGraph';

// ─── Drzewo uprawnień ─────────────────────────────────────────────────────────────
// Wspólne dla edytora roli i panelu podglądu roli: ta sama reguła zależności, ten sam
// wygląd. Stan zaznaczenia trzyma rodzic - komponent tylko zgłasza nowy zbiór.

export interface PermissionChanges {
    /** Zaznaczone, a w zbiorze odniesienia nie było. */
    added: Set<string>;
    /** Odznaczone, a w zbiorze odniesienia było. */
    removed: Set<string>;
}

export interface PermissionTreeEditorProps {
    catalog: PermissionModuleTree[];
    catalogLoading?: boolean;
    selected: Set<string>;
    onChange: (next: Set<string>) => void;
    /** Czy moduł/funkcja jest wykupiona - bez niej uprawnienie jest wyszarzone. */
    isFeatureEnabled: (featureKey: string | null) => boolean;
    /** Różnice względem zbioru odniesienia, oznaczane przy pozycjach (podgląd roli). */
    changes?: PermissionChanges;
}

export function PermissionTreeEditor({
    catalog, catalogLoading, selected, onChange, isFeatureEnabled, changes,
}: PermissionTreeEditorProps) {
    const index = useMemo(() => buildTreeIndex(catalog), [catalog]);

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
                    const change = changes?.added.has(node.code)
                        ? 'added'
                        : changes?.removed.has(node.code) ? 'removed' : null;
                    return (
                        <NodeBlock key={node.code}>
                            <CheckRow
                                $disabled={disabled}
                                onClick={disabled ? undefined : () => onChange(toggleCode(selected, node.code, index))}
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
                                {change === 'added' && <Badge $variant="green">dodane</Badge>}
                                {change === 'removed' && <Badge $variant="red">odebrane</Badge>}
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

    if (catalogLoading) {
        return (
            <>
                {Array.from({ length: 4 }).map((_, i) => (
                    <ModuleCard key={i}>
                        <ModuleHead as="div" style={{ cursor: 'default' }}>
                            <SkeletonBox $w="140px" />
                        </ModuleHead>
                        <TreeWrap>
                            <SkeletonBox $w="60%" />
                            <SkeletonBox $w="50%" />
                        </TreeWrap>
                    </ModuleCard>
                ))}
            </>
        );
    }

    if (catalog.length === 0) {
        return <EmptyPerms>Nie udało się załadować katalogu uprawnień.</EmptyPerms>;
    }

    return (
        <>
            {catalog.map(module => {
                const codes = index.moduleCodes.get(module.module) ?? [];
                const selectedInModule = codes.filter(c => selected.has(c)).length;
                const allOn = selectedInModule === codes.length && codes.length > 0;
                const featureOk = isFeatureEnabled(module.featureKey);

                return (
                    <ModuleCard key={module.module}>
                        <ModuleHead onClick={() => onChange(toggleModuleCodes(selected, codes, index))}>
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
            })}
        </>
    );
}

// ─── Śledzenie czasu pracy ────────────────────────────────────────────────────────
export function TrackWorkTimeToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
    return (
        <ToggleRow onClick={() => onChange(!value)}>
            <ToggleLabel>
                <ToggleName>Śledź czas pracy</ToggleName>
                <ToggleDesc>Użytkownicy z tą rolą widzą moduł „Czas pracy" i mogą rejestrować godziny</ToggleDesc>
            </ToggleLabel>
            <ToggleSwitch $on={value} />
        </ToggleRow>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
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

const ModuleCard = styled.div`
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    /* Flex child of a (column) scroll container: without this, 'overflow: hidden'
       gives the card an implicit min-height of 0, so once enough modules
       overflow the container the flex layout shrinks every card toward zero height
       (collapsing into blank gray bars) instead of letting the container scroll. */
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

const TinyCheck = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
