// @vitest-environment jsdom
//
// Szkic przypomnienia pisze serwer rano (LeadReminderDraftJob). Okno bierze go od razu,
// zamiast kazać czekać na asystenta - ale tylko szkic pisany pod tę samą stopkę.
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { Lead, PreparedReminderDraft } from '../types';
import { LeadReminderDialog } from './LeadReminderDialog';

const getReminderDraft = vi.fn<(leadId: string) => Promise<PreparedReminderDraft | null>>();
const draftReply = vi.fn();
let signatureByDefault = true;

vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => ({ user: { firstName: 'Jakub' } }) }));
vi.mock('../api/leadsApi', () => ({ leadsApi: { getReminderDraft: (id: string) => getReminderDraft(id) } }));
vi.mock('../api/commsApi', () => ({ commsApi: { draftReply: (...args: unknown[]) => draftReply(...args) } }));
vi.mock('../hooks/useComms', () => ({
    useMailSignature: () => ({ data: { bodyHtml: '<p>Pozdrawiam</p>', enabledByDefault: signatureByDefault } }),
}));
vi.mock('../hooks/useLeads', () => ({
    useSendLeadReminder: () => ({ mutateAsync: vi.fn() }),
    useStagnationThresholds: () => ({ ourReplyHours: 24, clientSilenceHours: 120 }),
}));
vi.mock('../hooks/useReplyDraft', () => ({
    useReplyDraftPreferences: () => ({ data: { useSentStyle: true } }),
}));
vi.mock('@/modules/subscription/hooks/useCapability', () => ({
    useCapability: () => ({ enabled: true, isLoading: false }),
}));
vi.mock('@/common/components/ModalKit', () => {
    const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    return {
        ModalShell: passthrough,
        ModalHeader: passthrough,
        ModalTitleGroup: passthrough,
        ModalTitle: passthrough,
        ModalSubtitle: passthrough,
        ModalContent: passthrough,
        ModalFooter: passthrough,
        CloseBtn: () => null,
    };
});

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const lead = {
    id: 'lead-1',
    threadId: 'thread-1',
    source: 'EMAIL',
    status: 'IN_PROGRESS',
    customerName: 'Klient',
    contactIdentifier: 'klient@example.com',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    replyState: 'AWAITING_CLIENT_REPLY',
    lastInboundAt: ago(5 * DAY),
    lastOutboundAt: ago(4 * DAY),
    waitingSince: ago(4 * DAY),
    firstResponseAt: ago(4 * DAY),
    createdAt: ago(5 * DAY),
    updatedAt: ago(4 * DAY),
    lastReminderAt: null,
    owedSince: null,
    appointmentId: null,
    serviceItems: [],
} as unknown as Lead;

const renderDialog = () =>
    render(
        <ThemeProvider theme={theme}>
            <LeadReminderDialog leads={[lead]} onClose={vi.fn()} />
        </ThemeProvider>
    );

const prepared: PreparedReminderDraft = {
    bodyText: 'Dzień dobry, czy wycena przyciemnienia szyb jest nadal aktualna dla Pana?',
    useSentStyle: true,
    signatureAppended: true,
    preparedAt: ago(2 * 3_600_000),
};

describe('LeadReminderDialog - szkic poranny', () => {
    beforeEach(() => {
        getReminderDraft.mockReset();
        draftReply.mockReset();
        draftReply.mockResolvedValue({ bodyText: 'Szkic napisany teraz' });
        signatureByDefault = true;
    });

    it('bierze szkic przygotowany rano, bez czekania na asystenta', async () => {
        getReminderDraft.mockResolvedValue(prepared);

        renderDialog();

        expect(await screen.findByDisplayValue(prepared.bodyText)).toBeTruthy();
        expect(screen.getByText(/Szkic przygotowany rano/)).toBeTruthy();
        expect(draftReply).not.toHaveBeenCalled();
    });

    it('„Napisz od nowa" prosi asystenta o świeży szkic', async () => {
        getReminderDraft.mockResolvedValue(prepared);
        renderDialog();
        await screen.findByDisplayValue(prepared.bodyText);

        fireEvent.click(screen.getByRole('button', { name: /Napisz od nowa/ }));

        expect(await screen.findByDisplayValue('Szkic napisany teraz')).toBeTruthy();
        expect(draftReply).toHaveBeenCalledTimes(1);
    });

    it('bez stopki szkic poranny dostaje imię pod spodem - bez nowego szkicu od asystenta', async () => {
        signatureByDefault = false;
        getReminderDraft.mockResolvedValue(prepared);

        renderDialog();

        expect(await screen.findByDisplayValue(/aktualna dla Pana\?\s+Jakub$/)).toBeTruthy();
        expect(draftReply).not.toHaveBeenCalled();
    });

    it('bez szkicu porannego asystent pisze jak dotąd', async () => {
        getReminderDraft.mockResolvedValue(null);

        renderDialog();

        expect(await screen.findByDisplayValue('Szkic napisany teraz')).toBeTruthy();
        expect(screen.queryByText(/Szkic przygotowany rano/)).toBeNull();
    });
});
