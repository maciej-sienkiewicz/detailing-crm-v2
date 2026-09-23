// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RolePreviewState } from '../rolePreviewApi';

const api = vi.hoisted(() => ({
    enter: vi.fn(),
    current: vi.fn(),
    updateRole: vi.fn(),
    end: vi.fn(),
}));
vi.mock('../rolePreviewApi', () => ({ rolePreviewApi: api }));

import { RolePreviewShell } from './RolePreviewShell';

const state: RolePreviewState = {
    roleName: 'Recepcja',
    permissions: [],
    trackWorkTime: false,
    initialPermissions: [],
    initialTrackWorkTime: false,
    enabledFeatures: [],
    catalog: [],
    openedByName: 'Anna',
    expiresAt: '2026-09-23T12:00:00Z',
    idleExpiresAt: '2026-09-23T11:30:00Z',
    simulatedEffects: [],
};

const code = (seed: string) => seed.padEnd(43, 'x');

describe('okno podglądu roli', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('wymienia kod raz, także gdy React uruchamia efekty dwukrotnie', async () => {
        api.enter.mockResolvedValue(undefined);
        api.current.mockResolvedValue(state);

        render(<React.StrictMode><RolePreviewShell entryCode={code('a')} /></React.StrictMode>);

        expect(await screen.findByText(/Rola „Recepcja"/)).toBeInTheDocument();
        expect(screen.getByText('To jest aplikacja podglądowa do manipulowania uprawnieniami')).toBeInTheDocument();
        expect(api.enter).toHaveBeenCalledTimes(1);
        expect(screen.getByTitle('Aplikacja CRM oczami pracownika z podglądaną rolą')).toHaveAttribute('src', '/');
    });

    it('użyty albo wygasły link mówi to wprost', async () => {
        api.enter.mockRejectedValue({ response: { status: 409 } });

        render(<RolePreviewShell entryCode={code('b')} />);

        expect(await screen.findByText('Ten link do podglądu już nie działa')).toBeInTheDocument();
        expect(api.current).not.toHaveBeenCalled();
    });

    it('nie czeka na piaskownicę, gdy okno studia zgłosiło odmowę serwera', async () => {
        const startFailure = { reason: () => 'W tym studiu jest już otwartych 5 podglądów roli.' };

        render(<RolePreviewShell entryCode={code('c')} startFailure={startFailure} />);

        expect(await screen.findByText('Nie udało się otworzyć podglądu')).toBeInTheDocument();
        expect(screen.getByText(/W tym studiu jest już otwartych 5 podglądów roli\./)).toBeInTheDocument();
        expect(api.enter).not.toHaveBeenCalled();
    });

    it('przerywa czekanie na piaskownicę, gdy odmowa przyjdzie w trakcie', async () => {
        api.enter.mockRejectedValue({ response: { status: 404 } });
        let refused: string | null = null;
        const startFailure = { reason: () => refused };

        render(<RolePreviewShell entryCode={code('d')} startFailure={startFailure} />);
        await vi.waitFor(() => expect(api.enter).toHaveBeenCalledTimes(1));
        refused = 'Nie udało się przygotować podglądu.';

        expect(await screen.findByText('Nie udało się otworzyć podglądu', {}, { timeout: 3000 })).toBeInTheDocument();
        expect(api.enter).toHaveBeenCalledTimes(1);
    });

    it('bez kodu i bez żywej sesji pokazuje, że podgląd się zakończył', async () => {
        api.current.mockRejectedValue({ response: { status: 401 } });

        render(<RolePreviewShell entryCode={null} />);

        expect(await screen.findByText('Podgląd roli się zakończył')).toBeInTheDocument();
        expect(api.enter).not.toHaveBeenCalled();
    });
});
