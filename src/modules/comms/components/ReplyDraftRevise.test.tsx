// @vitest-environment jsdom
//
// „Popraw szkic": asystent dostaje to, co jest TERAZ w edytorze (z ręcznymi zmianami),
// uwagi pracownika i ten sam tryb stylu co szkic - poprawka nie może zmienić tonu po cichu.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { ReplyDraft } from '../types';
import { ReplyDraftRevise } from './ReplyDraftRevise';

const mutate = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() }),
}));
vi.mock('../hooks/useReplyDraft', () => ({
    useDraftReply: () => ({ mutate, isPending: false }),
}));

const draft: ReplyDraft = {
    bodyText: 'Dzień dobry, zapraszamy [proponowany termin].',
    useSentStyle: true,
    styleApplied: true,
    examples: [],
    placeholders: ['[proponowany termin]'],
    unverifiedAmounts: [],
    notice: null,
};

const revised: ReplyDraft = { ...draft, bodyText: 'Dzień dobry, zapraszamy we wtorek o 10:00.', placeholders: [] };

const renderRevise = (onDraft = vi.fn()) => {
    render(
        <ThemeProvider theme={theme}>
            <ReplyDraftRevise
                threadId="thread-1"
                draft={draft}
                currentText="Dzień dobry Panie Janie, zapraszamy [proponowany termin]."
                signatureAppended={false}
                onDraft={onDraft}
            />
        </ThemeProvider>
    );
    return onDraft;
};

const open = () => fireEvent.click(screen.getByRole('button', { name: /Popraw szkic/ }));
const field = () => screen.getByLabelText('Co poprawić w szkicu') as HTMLTextAreaElement;
const submitButton = () =>
    screen.getAllByRole('button', { name: /Popraw szkic/ }).at(-1) as HTMLButtonElement;

describe('ReplyDraftRevise', () => {
    // Klamry celowo: mockReset() zwraca sam mock, a funkcję zwróconą z beforeEach vitest
    // woła jako sprzątanie po teście - bez argumentów.
    beforeEach(() => {
        mutate.mockReset();
    });

    it('bez uwag nie ma czego wysyłać', () => {
        renderRevise();
        open();

        expect(submitButton().disabled).toBe(true);
        fireEvent.click(submitButton());
        expect(mutate).not.toHaveBeenCalled();
    });

    it('wysyła bieżącą treść edytora, uwagi i tryb stylu szkicu, a wynik oddaje kompozytorowi', () => {
        mutate.mockImplementation((_payload: unknown, options: { onSuccess: (result: ReplyDraft) => void }) =>
            options.onSuccess(revised)
        );
        const onDraft = renderRevise();
        open();

        fireEvent.change(field(), { target: { value: '  Zaproponuj wtorek o 10:00  ' } });
        fireEvent.click(submitButton());

        expect(mutate.mock.calls[0][0]).toEqual({
            threadId: 'thread-1',
            useSentStyle: true,
            signatureAppended: false,
            currentDraft: 'Dzień dobry Panie Janie, zapraszamy [proponowany termin].',
            instructions: 'Zaproponuj wtorek o 10:00',
        });
        expect(onDraft).toHaveBeenCalledWith(revised);
        // Po udanej poprawce pole się zwija - kolejna poprawka zaczyna od czystej kartki.
        expect(screen.queryByLabelText('Co poprawić w szkicu')).toBeNull();
    });

    it('Enter wysyła, Shift+Enter nie', () => {
        renderRevise();
        open();
        fireEvent.change(field(), { target: { value: 'Krócej' } });

        fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true });
        expect(mutate).not.toHaveBeenCalled();

        fireEvent.keyDown(field(), { key: 'Enter' });
        expect(mutate).toHaveBeenCalledTimes(1);
    });

    it('szybkie podpowiedzi dopisują polecenie, ale nie wysyłają go same', () => {
        renderRevise();
        open();

        fireEvent.click(screen.getByRole('button', { name: 'Krócej' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cieplej w tonie' }));

        expect(field().value).toBe('Krócej, cieplej w tonie');
        expect(mutate).not.toHaveBeenCalled();
    });

    it('Anuluj zwija pole bez wysyłania', () => {
        renderRevise();
        open();
        fireEvent.change(field(), { target: { value: 'Krócej' } });

        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));

        expect(screen.queryByLabelText('Co poprawić w szkicu')).toBeNull();
        expect(mutate).not.toHaveBeenCalled();
    });
});
