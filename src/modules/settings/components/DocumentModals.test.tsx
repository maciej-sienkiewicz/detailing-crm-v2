// @vitest-environment jsdom
//
// Okna sekcji „Dokumenty i podpisy":
//  - „Dodaj zgodę" to trzy wywołania (definicja → wersja → PDF do S3). Błąd po
//    pierwszym zostawiał definicję bez pliku, a ponowna próba tworzyła duplikat;
//    odrzucony upload do S3 uchodził za sukces; błąd brzmiał „Request failed with
//    status code 400";
//  - „Zmień nazwę dokumentu": za krótka nazwa nie zapisywała się bez słowa, a odrzucony
//    zapis zostawiał okno w stanie „nic się nie stało".
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { ProtocolTemplate } from '@/modules/protocols/types';
import { consentsApi, uploadFileToS3 } from '@/modules/consents/api/consentsApi';
import { AddConsentDocumentModal } from './AddConsentDocumentModal';
import { AddDocumentModal } from './AddDocumentModal';
import { EditTemplateModal } from './EditTemplateModal';

const showSuccess = vi.fn();
const showError = vi.fn();
const updateTemplate = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess, showError }),
}));
vi.mock('@/modules/protocols/api/useProtocols', () => ({
    useUpdateProtocolTemplate: () => ({ mutateAsync: updateTemplate, isPending: false }),
    useCreateProtocolTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteProtocolTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateProtocolRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const withTheme = (ui: React.ReactNode) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const pdf = () => new File(['%PDF-1.4'], 'zgoda.pdf', { type: 'application/pdf' });

const fillConsentForm = () => {
    fireEvent.change(screen.getByTestId('file-drop-input'), { target: { files: [pdf()] } });
    fireEvent.change(screen.getByLabelText('Nazwa zgody'), { target: { value: 'Zgoda marketingowa' } });
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});
afterEach(() => cleanup());

describe('AddConsentDocumentModal', () => {
    it('upload do S3 odrzucony: definicja jest wycofywana, a okno mówi zdaniem, nie kodem HTTP', async () => {
        vi.spyOn(consentsApi, 'createConsentDefinition').mockResolvedValue({ id: 'def-1' } as never);
        vi.spyOn(consentsApi, 'addConsentVersion').mockResolvedValue({ pdfUrl: 'https://s3/upload' } as never);
        vi.spyOn(consentsApi, 'uploadFileToS3').mockRejectedValue(new Error('Serwer plików odrzucił PDF (błąd 403). Spróbuj ponownie.'));
        const remove = vi.spyOn(consentsApi, 'deleteConsentDefinition').mockResolvedValue();
        const onSuccess = vi.fn();

        withTheme(<AddConsentDocumentModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
        fillConsentForm();
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj zgodę' }));

        await waitFor(() => expect(remove).toHaveBeenCalledWith('def-1'));
        expect(await screen.findByText(/Serwer plików odrzucił PDF/)).toBeTruthy();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(showSuccess).not.toHaveBeenCalled();
    });

    it('odmowa backendu przy wersji: pokazuje `message` z odpowiedzi i wycofuje definicję', async () => {
        vi.spyOn(consentsApi, 'createConsentDefinition').mockResolvedValue({ id: 'def-2' } as never);
        vi.spyOn(consentsApi, 'addConsentVersion').mockRejectedValue(
            Object.assign(new Error('Request failed with status code 400'), {
                response: { status: 400, data: { message: 'Plik PDF jest wymagany' } },
            }),
        );
        const remove = vi.spyOn(consentsApi, 'deleteConsentDefinition').mockResolvedValue();

        withTheme(<AddConsentDocumentModal isOpen onClose={vi.fn()} />);
        fillConsentForm();
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj zgodę' }));

        expect(await screen.findByText('Plik PDF jest wymagany')).toBeTruthy();
        expect(screen.queryByText(/Request failed/)).toBeNull();
        expect(remove).toHaveBeenCalledWith('def-2');
    });

    it('wszystkie trzy kroki udane: dymek sukcesu i odświeżenie listy', async () => {
        vi.spyOn(consentsApi, 'createConsentDefinition').mockResolvedValue({ id: 'def-3' } as never);
        vi.spyOn(consentsApi, 'addConsentVersion').mockResolvedValue({ pdfUrl: 'https://s3/upload' } as never);
        vi.spyOn(consentsApi, 'uploadFileToS3').mockResolvedValue();
        const remove = vi.spyOn(consentsApi, 'deleteConsentDefinition').mockResolvedValue();
        const onSuccess = vi.fn();
        const onClose = vi.fn();

        withTheme(<AddConsentDocumentModal isOpen onClose={onClose} onSuccess={onSuccess} />);
        fillConsentForm();
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj zgodę' }));

        await waitFor(() => expect(onSuccess).toHaveBeenCalled());
        expect(onClose).toHaveBeenCalled();
        expect(showSuccess).toHaveBeenCalledWith('Zgoda dodana', expect.any(String));
        expect(remove).not.toHaveBeenCalled();
    });
});

describe('uploadFileToS3', () => {
    it('rzuca, gdy S3 odrzuci plik (fetch sam nie rzuca przy 4xx/5xx)', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('denied', { status: 403 }));
        await expect(uploadFileToS3('https://s3/upload', pdf())).rejects.toThrow(/błąd 403/);
    });

    it('przy sukcesie nie rzuca', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
        await expect(uploadFileToS3('https://s3/upload', pdf())).resolves.toBeUndefined();
    });
});

describe('AddDocumentModal', () => {
    const pressedStage = () =>
        screen.getByRole('group', { name: 'Etap wizyty' }).querySelector('[aria-pressed="true"]')?.textContent;

    it('zmiana etapu przy zamkniętym oknie dociera do okna przy najbliższym otwarciu', () => {
        const { rerender } = withTheme(<AddDocumentModal isOpen={false} onClose={vi.fn()} initialStage="CHECK_IN" />);
        rerender(<ThemeProvider theme={theme}><AddDocumentModal isOpen={false} onClose={vi.fn()} initialStage="CHECK_OUT" /></ThemeProvider>);
        rerender(<ThemeProvider theme={theme}><AddDocumentModal isOpen onClose={vi.fn()} initialStage="CHECK_OUT" /></ThemeProvider>);
        expect(pressedStage()).toBe('Przy wydaniu');
    });
});

describe('EditTemplateModal', () => {
    const tpl = { id: 't1', name: 'Protokół przyjęcia', description: '' } as ProtocolTemplate;

    it('za krótka nazwa: komunikat przy polu zamiast cichego braku zapisu', () => {
        withTheme(<EditTemplateModal template={tpl} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Nazwa dokumentu'), { target: { value: 'ab' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
        expect(screen.getByText(/co najmniej 3 znaki/)).toBeTruthy();
        expect(updateTemplate).not.toHaveBeenCalled();
    });

    it('odrzucony zapis (5xx) kończy się dymkiem, a okno zostaje otwarte', async () => {
        updateTemplate.mockRejectedValue({ response: { status: 500, data: {} }, config: { method: 'put' } });
        const onClose = vi.fn();
        withTheme(<EditTemplateModal template={tpl} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(showError).toHaveBeenCalledWith('Nie udało się zapisać dokumentu', expect.any(String)));
        expect(onClose).not.toHaveBeenCalled();
    });
});
