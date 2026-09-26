// src/modules/settings/components/ShortcutsSection.tsx
//
// Ustawienia → Preferencje → Skróty klawiszowe.
//
// Jeden przełącznik i ściąga: co robi który klawisz. Ustawienie mieszka
// w localStorage tej przeglądarki - skrót to nawyk dłoni przy konkretnej
// klawiaturze, a nie polityka studia, więc nie ma powodu wozić go przez backend
// ani narzucać całemu zespołowi.
import { Fragment } from 'react';
import styled from 'styled-components';
import { ACTION_SHORTCUTS, GLOBAL_SHORTCUTS, SCOPED_SHORTCUTS, useShortcutsEnabled } from '@/common/shortcuts';
import { Card, ui } from '@/common/components/ui';
import { SettingSwitchRow } from './SettingSwitchRow';

// ─── Styled ──────────────────────────────────────────────────────────────────

// Tytuł „Skróty klawiszowe" stoi w nagłówku ramy ustawień - karta go nie powtarza.
const Body = styled(Card)`
    padding: 20px 24px 12px;

    @media (max-width: 767px) { padding: 16px 16px 8px; }
`;

const Intro = styled.p`
    margin: 0 0 4px;
    max-width: 68ch;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

/** Ściąga gaśnie, gdy skróty są wyłączone - lista zostaje, żeby było co włączać. */
const ShortcutRows = styled.div<{ $muted: boolean }>`
    border-top: 1px solid ${ui.lineFaint};
    opacity: ${p => (p.$muted ? 0.45 : 1)};
    transition: opacity 180ms ease;
`;

/**
 * Nagłówek grupy w ściądze - „Nawigacja", „Finanse", „Statystyki". Zwykłym pismem:
 * wersaliki 11 px w szarości były jedyną ramą grupy (CLAUDE.md §2, wycofane),
 * a „gdzie działa" to doprecyzowanie obok nazwy, nie jej część.
 */
const GroupLabel = styled.h3`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
    margin: 0;
    padding: 18px 0 6px;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};

    span { font-size: 12.5px; font-weight: 500; color: ${ui.textMuted}; }
`;

const ShortcutRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 0;
    font-size: 13.5px;
    color: ${p => p.theme.colors.textSecondary};

    & + & {
        border-top: 1px solid ${p => p.theme.colors.surfaceAlt};
    }
`;

const Kbd = styled.kbd`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-bottom-width: 2px;
    border-radius: 7px;
    background: ${p => p.theme.colors.surfaceHover};
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

export function ShortcutsSection() {
    const [enabled, setEnabled] = useShortcutsEnabled();

    return (
        <Body>
            <Intro>
                Litera przenosi do widoku, cyfra przełącza zakładkę w sekcji, w której
                akurat jesteś. Skróty nie działają, gdy piszesz w polu tekstowym albo masz
                otwarte okno dialogowe, i nie zjadają skrótów przeglądarki (Ctrl / Cmd).
            </Intro>

            <SettingSwitchRow
                label="Włącz skróty klawiszowe"
                hint="Po wyłączeniu klawisze z listy niżej przestają działać. Ustawienie dotyczy tylko tej przeglądarki."
                checked={enabled}
                onChange={setEnabled}
            />

            <ShortcutRows $muted={!enabled}>
                <GroupLabel>Nawigacja <span>działa wszędzie</span></GroupLabel>
                {GLOBAL_SHORTCUTS.map((shortcut) => (
                    <ShortcutRow key={shortcut.key}>
                        <Kbd>{shortcut.key.toUpperCase()}</Kbd>
                        <span>{shortcut.description}</span>
                    </ShortcutRow>
                ))}

                <GroupLabel>Akcje <span>działa wszędzie</span></GroupLabel>
                {ACTION_SHORTCUTS.map((shortcut) => (
                    <ShortcutRow key={shortcut.key}>
                        <Kbd>{shortcut.key.toUpperCase()}</Kbd>
                        <span>{shortcut.description}</span>
                    </ShortcutRow>
                ))}

                {/* Cyfry znaczą co innego w każdej sekcji, więc ściąga pokazuje je
                    pogrupowane - inaczej „1" w jednej liście byłoby nie do rozszyfrowania. */}
                {SCOPED_SHORTCUTS.map((group) => (
                    <Fragment key={group.path}>
                        <GroupLabel>{group.label} <span>tylko w tej sekcji</span></GroupLabel>
                        {group.shortcuts.map((shortcut) => (
                            <ShortcutRow key={`${group.path}-${shortcut.key}`}>
                                <Kbd>{shortcut.key.toUpperCase()}</Kbd>
                                <span>{shortcut.description}</span>
                            </ShortcutRow>
                        ))}
                    </Fragment>
                ))}
            </ShortcutRows>
        </Body>
    );
}
