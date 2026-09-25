// src/common/components/ui/Notice.tsx
//
// Komunikat w treści okna albo sekcji: co jest nie tak (albo co warto wiedzieć)
// i - jeśli się da - przycisk, który to naprawia. Stoi przy polu, którego dotyczy,
// nie w banerze na górze okna.
//
// Odcień to ZNACZENIE (CLAUDE.md §2): info = podpowiedź, warn = przeczytaj zanim
// klikniesz dalej, danger = to zablokuje zapis, ok = potwierdzenie. Wypełnienia
// nie ma żaden - komunikat nie jest krokiem następnym.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { ui } from './tokens';
import type { PillTone } from './StatusPill';

type NoticeTone = Exclude<PillTone, 'neutral'>;

const TONES: Record<NoticeTone, { line: string; bg: string; ink: string; icon: string }> = {
    info: { line: ui.brandLineSoft, bg: ui.brandTint, ink: ui.brandDeep, icon: ui.brandInk },
    ok: { line: ui.okLine, bg: ui.okTint, ink: '#14532d', icon: ui.okInk },
    warn: { line: ui.warnLine, bg: ui.warnTint, ink: '#78350f', icon: '#b45309' },
    danger: { line: ui.dangerLine, bg: ui.dangerTint, ink: '#7f1d1d', icon: ui.dangerInk },
};

const Box = styled.div<{ $tone: NoticeTone }>`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: ${ui.radiusStrip};
    border: 1px solid ${p => TONES[p.$tone].line};
    background: ${p => TONES[p.$tone].bg};
    color: ${p => TONES[p.$tone].ink};
    font-size: 13px;
    line-height: 1.5;

    > svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; color: ${p => TONES[p.$tone].icon}; }
    strong { font-weight: 700; }

    @media (max-width: 480px) { flex-wrap: wrap; }
`;

const Text = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-wrap: anywhere;
`;

const Action = styled.div`
    flex-shrink: 0;
    align-self: center;

    @media (max-width: 480px) { flex: 1 1 100%; > * { width: 100%; } }
`;

const ICONS: Record<NoticeTone, typeof Info> = { info: Info, ok: CheckCircle2, warn: AlertTriangle, danger: XCircle };

interface Props {
    tone?: NoticeTone;
    title?: ReactNode;
    children?: ReactNode;
    /** Przycisk naprawiający - zwykle <Button size="sm">. */
    action?: ReactNode;
    role?: 'alert' | 'status';
    className?: string;
}

export function Notice({ tone = 'info', title, children, action, role, className }: Props) {
    const Icon = ICONS[tone];
    return (
        <Box $tone={tone} role={role} className={className}>
            <Icon aria-hidden="true" />
            <Text>
                {title && <strong>{title}</strong>}
                {children}
            </Text>
            {action && <Action>{action}</Action>}
        </Box>
    );
}
