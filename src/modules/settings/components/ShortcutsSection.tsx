// src/modules/settings/components/ShortcutsSection.tsx
//
// Ustawienia → Preferencje → Skróty klawiszowe.
//
// Jeden przełącznik i ściąga: która litera dokąd prowadzi. Ustawienie mieszka
// w localStorage tej przeglądarki - skrót to nawyk dłoni przy konkretnej
// klawiaturze, a nie polityka studia, więc nie ma powodu wozić go przez backend
// ani narzucać całemu zespołowi.
import styled from 'styled-components';
import { GLOBAL_SHORTCUTS, useShortcutsEnabled } from '@/common/shortcuts';

// ─── Styled (ten sam język co pozostałe sekcje ustawień) ─────────────────────

const Card = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px 28px;
`;

const CardTitle = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin: 0 0 6px;
`;

const CardDescription = styled.p`
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    margin: 0 0 20px;
    line-height: 1.5;
    max-width: 640px;
`;

const OptionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const OptionTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const OptionHint = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    margin-top: 2px;
    line-height: 1.45;
`;

const ToggleTrack = styled.button<{ $on: boolean }>`
    position: relative;
    width: 42px;
    height: 24px;
    flex-shrink: 0;
    border: none;
    border-radius: 9999px;
    background: ${p => (p.$on ? '#0ea5e9' : '#cbd5e1')};
    cursor: pointer;
    transition: background 180ms ease;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${p => (p.$on ? '21px' : '3px')};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
        transition: left 180ms ease;
    }
`;

/** Ściąga gaśnie, gdy skróty są wyłączone - lista zostaje, żeby było co włączać. */
const ShortcutRows = styled.div<{ $muted: boolean }>`
    border-top: 1px solid ${p => p.theme.colors.border};
    opacity: ${p => (p.$muted ? 0.45 : 1)};
    transition: opacity 180ms ease;
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
        <Card>
            <CardTitle>Skróty klawiszowe</CardTitle>
            <CardDescription>
                Jedna litera przenosi do widoku. Skróty nie działają, gdy piszesz w polu
                tekstowym albo masz otwarte okno dialogowe, i nie zjadają skrótów
                przeglądarki (Ctrl / Cmd). Ustawienie dotyczy tej przeglądarki.
            </CardDescription>

            <OptionRow>
                <OptionTexts>
                    <OptionLabel>Włącz skróty klawiszowe</OptionLabel>
                    <OptionHint>Po wyłączeniu litery z listy niżej przestają nawigować.</OptionHint>
                </OptionTexts>
                <ToggleTrack
                    type="button"
                    $on={enabled}
                    role="switch"
                    aria-checked={enabled}
                    aria-label="Włącz skróty klawiszowe"
                    onClick={() => setEnabled(!enabled)}
                />
            </OptionRow>

            <ShortcutRows $muted={!enabled}>
                {GLOBAL_SHORTCUTS.map((shortcut) => (
                    <ShortcutRow key={shortcut.key}>
                        <Kbd>{shortcut.key.toUpperCase()}</Kbd>
                        <span>{shortcut.description}</span>
                    </ShortcutRow>
                ))}
            </ShortcutRows>
        </Card>
    );
}
