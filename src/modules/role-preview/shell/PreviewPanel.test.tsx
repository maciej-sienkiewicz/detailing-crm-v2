// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionModuleTree, PermissionTreeNode } from '@/modules/settings/rbacTypes';
import type { RolePreviewState } from '../rolePreviewApi';
import { PreviewPanel } from './PreviewPanel';

const node = (code: string, displayName: string, children: PermissionTreeNode[] = []): PermissionTreeNode => ({
    code, displayName, description: null, section: null, featureKey: null, implies: [], children,
});

const catalog: PermissionModuleTree[] = [{
    module: 'VISITS', displayName: 'Wizyty', featureKey: null,
    nodes: [node('VISITS_VIEW', 'Podgląd wizyt', [node('VISITS_MANAGE', 'Zarządzanie wizytami')])],
}];

const state = (permissions: string[]): RolePreviewState => ({
    roleName: 'Recepcja',
    permissions,
    trackWorkTime: false,
    initialPermissions: ['VISITS_VIEW'],
    initialTrackWorkTime: false,
    enabledFeatures: [],
    catalog,
    openedByName: 'Anna',
    expiresAt: '2026-09-23T12:00:00Z',
    idleExpiresAt: '2026-09-23T11:30:00Z',
    simulatedEffects: [],
});

describe('panel uprawnień podglądu', () => {
    it('odświeżenie stanu z tą samą rolą nie kasuje niezastosowanych zmian', () => {
        const onApply = vi.fn();
        const { rerender } = render(
            <PreviewPanel state={state(['VISITS_VIEW'])} applying={false} applyError={null} onApply={onApply} onClose={() => {}} />,
        );

        fireEvent.click(screen.getByText('Zarządzanie wizytami'));
        expect(screen.getByText('Niezastosowane zmiany')).toBeInTheDocument();

        // Okresowe odświeżenie: nowy obiekt, ta sama rola.
        rerender(<PreviewPanel state={state(['VISITS_VIEW'])} applying={false} applyError={null} onApply={onApply} onClose={() => {}} />);
        expect(screen.getByText('Niezastosowane zmiany')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Zastosuj w podglądzie'));
        expect(onApply).toHaveBeenCalledWith(['VISITS_VIEW', 'VISITS_MANAGE'], false);
    });

    it('zmieniona rola na serwerze jest nowym punktem wyjścia, a różnica liczy się od roli z ustawień', () => {
        const { rerender } = render(
            <PreviewPanel state={state(['VISITS_VIEW'])} applying={false} applyError={null} onApply={() => {}} onClose={() => {}} />,
        );
        expect(screen.getByText(/Bez zmian/)).toBeInTheDocument();

        rerender(<PreviewPanel state={state(['VISITS_VIEW', 'VISITS_MANAGE'])} applying={false} applyError={null} onApply={() => {}} onClose={() => {}} />);

        expect(screen.getByText('Podgląd pokazuje te uprawnienia')).toBeInTheDocument();
        expect(screen.getByText('+ Zarządzanie wizytami')).toBeInTheDocument();
    });

    it('pokazuje, co system wysłałby na zewnątrz', () => {
        render(
            <PreviewPanel
                state={{ ...state(['VISITS_VIEW']), simulatedEffects: [{
                    channel: 'SMS', channelLabel: 'SMS', recipient: '+48000345678',
                    summary: 'Auto gotowe do odbioru', at: '2026-09-23T10:00:00Z',
                }] }}
                applying={false}
                applyError={null}
                onApply={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('→ +48000345678')).toBeInTheDocument();
        expect(screen.getByText('Auto gotowe do odbioru')).toBeInTheDocument();
    });
});
