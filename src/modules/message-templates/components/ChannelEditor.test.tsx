// @vitest-environment jsdom
//
// Chip „Wstaw: Imię" doklejał zmienną na koniec treści niezależnie od kursora.
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ChannelEditor } from './ChannelEditor';
import { MESSAGES } from '../catalog';
import { VAR_LABELS } from '../utils/template';
import type { ChannelDraft } from '../types';

const spec = MESSAGES.find(m => m.sms && (m.sms.placeholders?.length ?? 0) > 0)!;
const firstVar = spec.sms!.placeholders![0];

function Harness({ initial, onPatch }: { initial: ChannelDraft; onPatch?: (p: Partial<ChannelDraft>) => void }) {
    const [draft, setDraft] = useState(initial);
    return (
        <ThemeProvider theme={theme}>
            <ChannelEditor
                spec={spec}
                channel="sms"
                draft={draft}
                onPatch={p => { onPatch?.(p); setDraft(d => ({ ...d, ...p })); }}
            />
        </ThemeProvider>
    );
}

describe('ChannelEditor', () => {
    it('inserts a variable at the caret position, not at the end', async () => {
        render(<Harness initial={{ enabled: true, body: 'Dzień dobry, !', offsetMinutes: spec.timing ? 60 : undefined }} />);
        const body = screen.getByLabelText('Treść wiadomości') as HTMLTextAreaElement;
        body.focus();
        body.setSelectionRange(13, 13);
        await userEvent.click(screen.getAllByRole('button', { name: VAR_LABELS[firstVar] ?? firstVar })[0]);
        expect(body.value).toBe(`Dzień dobry, {{${firstVar}}}!`);
        expect(body.selectionStart).toBe(13 + `{{${firstVar}}}`.length);
    });

    it('labels are sentence case and the on/off control is a switch', () => {
        const onPatch = vi.fn();
        render(<Harness initial={{ enabled: false, body: 'x' }} onPatch={onPatch} />);
        expect(screen.getByText('Treść wiadomości')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Wysyłaj tę wiadomość' })).not.toBeChecked();
    });
});
