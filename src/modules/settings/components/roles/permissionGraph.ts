import type { PermissionModuleTree, PermissionTreeNode } from '../../rbacTypes';

// ─── Dependency-graph helpers ─────────────────────────────────────────────────
// The catalog is a tree (parent/children) plus explicit implications (`implies`),
// which may cross branches and modules. Both are dependency edges: a permission
// requires its whole ancestor chain AND everything it implies.
//
// Shared by the role editor and the role preview panel: both edit a permission set
// under the same rules, and the backend closes the saved set over the same graph.
export interface TreeIndex {
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

export function buildTreeIndex(catalog: PermissionModuleTree[]): TreeIndex {
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

/** Every code of the catalog, in module and tree order. */
export function orderedCodes(catalog: PermissionModuleTree[], index: TreeIndex): string[] {
    return catalog.flatMap(m => index.moduleCodes.get(m.module) ?? []);
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
export function requirementsOf(code: string, index: TreeIndex): string[] {
    return expandFrom(code, c => {
        const parent = index.parentOf.get(c);
        return parent ? [parent, ...(index.impliesOf.get(c) ?? [])] : (index.impliesOf.get(c) ?? []);
    });
}

/** Everything that requires `code`: its subtree and permissions implying it, transitively. */
export function dependentsOf(code: string, index: TreeIndex): string[] {
    return expandFrom(code, c => [
        ...(index.childrenOf.get(c) ?? []),
        ...(index.impliedBy.get(c) ?? []),
    ]);
}

/**
 * The first direct prerequisite of `code` that is not yet selected, or null if all are met.
 * A permission is disabled in the editor when this returns non-null.
 */
export function getBlocker(code: string, selected: Set<string>, index: TreeIndex): string | null {
    const parent = index.parentOf.get(code) ?? null;
    if (parent !== null && !selected.has(parent)) return parent;
    for (const implied of (index.impliesOf.get(code) ?? [])) {
        if (!selected.has(implied)) return implied;
    }
    return null;
}

/**
 * The cascade rule of the dependency graph:
 * - checking a node adds only that node: the editor keeps it disabled until its direct
 *   requirements are met, so the user enables prerequisites explicitly,
 * - unchecking a node also unchecks everything that requires it: its subtree and the
 *   permissions implying it, transitively.
 */
export function toggleCode(selected: Set<string>, code: string, index: TreeIndex): Set<string> {
    const next = new Set(selected);
    if (next.has(code)) {
        next.delete(code);
        dependentsOf(code, index).forEach(c => next.delete(c));
    } else {
        next.add(code);
    }
    return next;
}

/** Module header click: all off when all are on, otherwise on for everything whose prerequisites are met. */
export function toggleModuleCodes(selected: Set<string>, codes: string[], index: TreeIndex): Set<string> {
    const next = new Set(selected);
    const allOn = codes.length > 0 && codes.every(c => next.has(c));
    if (allOn) {
        codes.forEach(c => {
            next.delete(c);
            dependentsOf(c, index).forEach(d => next.delete(d));
        });
    } else {
        codes.forEach(c => {
            if (getBlocker(c, next, index) === null) next.add(c);
        });
    }
    return next;
}

/** Groups sibling nodes by their section label, preserving declaration order. */
export function groupBySection(nodes: PermissionTreeNode[]): Array<{ section: string | null; nodes: PermissionTreeNode[] }> {
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
