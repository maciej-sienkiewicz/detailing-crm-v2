import { useMemo } from 'react';
import styled from 'styled-components';
import { StatusPill } from '@/common/components/ui';
import { CheckRow, CheckBox, SkeletonBox } from '../rbacShared.styles';
import type { PermissionTreeNode, PermissionModuleTree } from '../../rbacTypes';
import {
    buildTreeIndex, featureLockedCodes, getBlocker, groupBySection, toggleCode, toggleModuleCodes,
} from './permissionGraph';

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
                            {/* Prawdziwy przycisk z rolą pola wyboru: `div` z onClick nie
                                przyjmował fokusu, więc uprawnień nie dało się nadać klawiaturą.
                                Zablokowany zostaje w kolejności Tab (aria-disabled, nie disabled),
                                żeby czytnik przeczytał, czego brakuje. */}
                            <CheckRow
                                as="button"
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                aria-disabled={disabled || undefined}
                                $disabled={disabled}
                                onClick={disabled ? undefined : () => onChange(toggleCode(selected, node.code, index))}
                            >
                                <CheckBox $checked={checked} aria-hidden="true">{checked && <TinyCheck />}</CheckBox>
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
                                    <StatusPill $tone="warn">Wymaga modułu</StatusPill>
                                )}
                                {change === 'added' && <StatusPill $tone="ok">dodane</StatusPill>}
                                {change === 'removed' && <StatusPill $tone="danger">odebrane</StatusPill>}
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
                        <ModuleHead as="div" $disabled>
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
                const locked = featureLockedCodes(module, isFeatureEnabled);
                const canSelect = (code: string) => !locked.has(code);
                const selectable = codes.filter(canSelect);
                const selectedInModule = codes.filter(c => selected.has(c)).length;
                // Komplet liczymy wśród tego, co da się zaznaczyć - inaczej moduł z jednym
                // zablokowanym wierszem nigdy nie byłby „cały" i nagłówek nie dałby się wyłączyć.
                const allOn = selectable.length > 0 && selectable.every(c => selected.has(c));
                const someOn = selectedInModule > 0;
                const featureOk = isFeatureEnabled(module.featureKey);
                // Nic do zaznaczenia i nic do odznaczenia - nagłówek nie ma czego zrobić.
                const headDisabled = selectable.length === 0 && !someOn;
                const moduleName = module.displayName || module.module;

                return (
                    <ModuleCard key={module.module}>
                        <ModuleHead
                            type="button"
                            role="checkbox"
                            aria-checked={allOn ? true : someOn ? 'mixed' : false}
                            aria-disabled={headDisabled || undefined}
                            aria-label={`Wszystkie uprawnienia: ${moduleName}`}
                            $disabled={headDisabled}
                            onClick={headDisabled
                                ? undefined
                                : () => onChange(toggleModuleCodes(selected, codes, index, canSelect))}
                        >
                            <CheckBox $checked={allOn} aria-hidden="true">{allOn && <TinyCheck />}</CheckBox>
                            <ModuleName>{moduleName}</ModuleName>
                            {!featureOk && module.featureKey && (
                                <StatusPill $tone="warn">Wymaga modułu</StatusPill>
                            )}
                            <ModuleCount>{selectedInModule} z {codes.length}</ModuleCount>
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
// Przełącznik jest przyciskiem z rolą `switch`: jako `div` nie przyjmował fokusu.
export function TrackWorkTimeToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
    return (
        <ToggleRow type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}>
            <ToggleLabel>
                <ToggleName>Liczony czas pracy</ToggleName>
                <ToggleDesc>Osoby z tą rolą widzą moduł „Czas pracy", rejestrują godziny i trafiają na listę obecności.</ToggleDesc>
            </ToggleLabel>
            <ToggleSwitch $on={value} aria-hidden="true" />
        </ToggleRow>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const ToggleRow = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    user-select: none;

    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }
`;

const ToggleLabel = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ToggleName = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const ToggleDesc = styled.span`
    font-size: 12.5px;
    color: #64748b;
    line-height: 1.4;
`;

const ToggleSwitch = styled.span<{ $on: boolean }>`
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

const ModuleHead = styled.button<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    background: #fafbfc;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: ${p => (p.$disabled ? 'not-allowed' : 'pointer')};
    user-select: none;

    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: -2px; }
`;

const ModuleName = styled.span`
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
`;

const ModuleCount = styled.span`
    margin-left: auto;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    font-variant-numeric: tabular-nums;
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

/* Nagłówek grupy zdaniem, 13px półgruby - był 10px wersalikami w szarości. */
const SectionLabel = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-top: 4px;
`;

const PermTexts = styled.span`
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
    font-size: 12px;
    color: #64748b;
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
