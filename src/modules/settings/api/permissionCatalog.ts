import type { PermissionModuleTree, PermissionTreeNode } from '../rbacTypes';

// ─── Permission catalog normalization ────────────────────────────────────────
// The backend serves the catalog as a tree; we only guarantee the recursive
// arrays exist so the editor can traverse without null checks.

const sanitizeNode = (node: PermissionTreeNode): PermissionTreeNode => ({
    code: node.code,
    displayName: node.displayName || node.code,
    description: node.description ?? null,
    section: node.section ?? null,
    featureKey: node.featureKey ?? null,
    implies: node.implies ?? [],
    children: (node.children ?? []).map(sanitizeNode),
});

export const sanitizeCatalog = (data: PermissionModuleTree[] | null | undefined): PermissionModuleTree[] =>
    (data ?? []).map(module => ({
        ...module,
        featureKey: module.featureKey ?? null,
        nodes: (module.nodes ?? []).map(sanitizeNode),
    }));
