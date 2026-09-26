// @vitest-environment jsdom
//
// Dokumenty i podpisy - błędy z produkcji:
//  - usunięcie protokołu przez window.confirm kasowało też szablon, którego używała
//    druga reguła, a błąd usuwania reguły był połykany;
//  - błąd wczytania list wyglądał jak „Brak dokumentów";
//  - okno „Dodaj dokument" otwarte z „Wydania" startowało z etapem poprzedniego otwarcia.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { ProtocolRule, ProtocolTemplate } from '@/modules/protocols/types';
import { DocumentsSection } from './DocumentsSection';

const deleteRule = vi.fn();
const deleteTemplate = vi.fn();
const deleteDefinition = vi.fn();
const refetch = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();

const template = (id: string, name: string) =>
    ({ id, name, fileFormat: 'PDF', isDefault: false, verificationStatus: 'VERIFIED', isActive: true, createdAt: '', updatedAt: '' }) as ProtocolTemplate;
const rule = (id: string, templateId: string, stage: 'CHECK_IN' | 'CHECK_OUT') =>
    ({ id, protocolTemplateId: templateId, stage, triggerType: 'GLOBAL_ALWAYS', serviceIds: [], serviceNames: [], displayOrder: 0, createdAt: '', updatedAt: '' }) as ProtocolRule;

let templates: ProtocolTemplate[] = [];
let rules: ProtocolRule[] = [];
let rulesError = false;

vi.mock('@/modules/protocols/api/useProtocols', () => ({
    useProtocolTemplates: () => ({ data: templates, isLoading: false, isError: false, refetch }),
    useProtocolRules: () => ({ data: rulesError ? undefined : rules, isLoading: false, isError: rulesError, refetch }),
    useDeleteProtocolRule: () => ({ mutateAsync: deleteRule }),
    useDeleteProtocolTemplate: () => ({ mutateAsync: deleteTemplate, isPending: false }),
    useCreateProtocolTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateProtocolRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateProtocolTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/modules/consents/hooks/useConsents', () => ({
    useConsentDefinitions: () => ({ definitions: [], isLoading: false, isError: false, refetch }),
    useDeleteDefinition: () => ({ deleteDefinition, isDeleting: false }),
}));
vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ can: () => true, isOwner: true }),
}));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess, showError }),
}));
vi.mock('./MySignatureSection', () => ({ MySignatureSection: () => null }));
vi.mock('./DocumentLogoCard', () => ({ DocumentLogoCard: () => null }));

const renderSection = () =>
    render(
        <ThemeProvider theme={theme}>
            <DocumentsSection />
        </ThemeProvider>,
    );

const openMenuAndDelete = async (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: `Więcej akcji: ${name}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Usuń dokument' }));
    expect(screen.getByText(`Usunąć dokument „${name}"?`)).toBeTruthy();
    // Ostatni „Usuń dokument" w drzewie to przycisk okna potwierdzenia (portal na końcu body).
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń dokument' }).slice(-1)[0]!);
};

beforeEach(() => {
    vi.clearAllMocks();
    templates = [template('t1', 'Protokół przyjęcia'), template('t2', 'Protokół wydania')];
    rules = [rule('r1', 't1', 'CHECK_IN'), rule('r2', 't2', 'CHECK_OUT')];
    rulesError = false;
    deleteRule.mockResolvedValue(undefined);
    deleteTemplate.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe('DocumentsSection - usuwanie protokołu', () => {
    it('pyta oknem potwierdzenia, usuwa regułę i nieużywany szablon, mówi, że się udało', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        renderSection();
        await openMenuAndDelete('Protokół przyjęcia');

        await waitFor(() => expect(showSuccess).toHaveBeenCalledWith('Dokument usunięty', expect.stringContaining('przyjęciu')));
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(deleteRule).toHaveBeenCalledWith('r1');
        expect(deleteTemplate).toHaveBeenCalledWith('t1');
        confirmSpy.mockRestore();
    });

    it('szablonu używanego przez inną regułę nie usuwa', async () => {
        rules = [rule('r1', 't1', 'CHECK_IN'), rule('r3', 't1', 'CHECK_OUT')];
        templates = [template('t1', 'Protokół wspólny')];
        renderSection();
        fireEvent.click(screen.getAllByRole('button', { name: 'Więcej akcji: Protokół wspólny' })[0]);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Usuń dokument' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'Usuń dokument' }).slice(-1)[0]!);

        await waitFor(() => expect(showSuccess).toHaveBeenCalled());
        expect(deleteRule).toHaveBeenCalledWith('r1');
        expect(deleteTemplate).not.toHaveBeenCalled();
    });

    it('błąd usunięcia reguły nie jest połykany (5xx: dymek z sekcji) i nie rusza szablonu', async () => {
        deleteRule.mockRejectedValue({ response: { status: 500, data: {} }, config: { method: 'delete' } });
        renderSection();
        await openMenuAndDelete('Protokół przyjęcia');

        await waitFor(() => expect(showError).toHaveBeenCalledWith('Nie udało się usunąć dokumentu', expect.any(String)));
        expect(deleteTemplate).not.toHaveBeenCalled();
        expect(showSuccess).not.toHaveBeenCalled();
    });

    it('4xx ogłasza interceptor - sekcja nie dokłada drugiego dymku', async () => {
        deleteRule.mockRejectedValue({ response: { status: 409, data: { message: 'W użyciu' } }, config: { method: 'delete' } });
        renderSection();
        await openMenuAndDelete('Protokół przyjęcia');

        await waitFor(() => expect(deleteRule).toHaveBeenCalled());
        expect(showError).not.toHaveBeenCalled();
        expect(showSuccess).not.toHaveBeenCalled();
    });
});

describe('DocumentsSection - stany list', () => {
    it('błąd wczytania to komunikat z ponowieniem, a nie „brak dokumentów"', () => {
        rulesError = true;
        renderSection();
        expect(screen.getByText('Nie udało się wczytać dokumentów')).toBeTruthy();
        expect(screen.queryByText(/Klient nic tu nie podpisuje/)).toBeNull();
        fireEvent.click(screen.getAllByRole('button', { name: 'Spróbuj ponownie' })[0]);
        expect(refetch).toHaveBeenCalled();
    });

    it('meta wiersza nie skleja faktów kropką', () => {
        renderSection();
        expect(document.body.textContent).not.toMatch(/·/);
    });
});

describe('DocumentsSection - okno „Dodaj dokument"', () => {
    const pressedStage = () =>
        screen.getByRole('group', { name: 'Etap wizyty' }).querySelector('[aria-pressed="true"]')?.textContent;

    it('etap z przycisku przy „Wydaniu" dociera do okna przy PIERWSZYM otwarciu', () => {
        renderSection();
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj dokument: wydanie pojazdu' }));
        expect(pressedStage()).toBe('Przy wydaniu');

        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj dokument: przyjęcie pojazdu' }));
        expect(pressedStage()).toBe('Przy przyjęciu');
    });
});
