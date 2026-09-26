// src/modules/settings/components/SettingSwitchRow.tsx
//
// Wiersz ustawienia „tak / nie": nazwa, jedno zdanie o skutku, przełącznik.
//
// Karta wizyty, Leady i Skróty miały po własnej kopii `ToggleTrack` - pustego
// <button> z kółkiem w ::after. Dwie z trzech kopii nie mówiły czytnikowi ekranu,
// czy przełącznik jest włączony (brak role="switch" / aria-checked; w Leadach
// aria-pressed), a kliknięcie w nazwę ustawienia nic nie robiło. Teraz wszystkie
// stoją na wspólnym `Toggle` (checkbox z role="switch"), a nazwa jest jego <label>.
//
// Gdy stanu nie znamy (wczytywanie, błąd), wiersz NIE rysuje przełącznika: pokazanie
// „wyłączone" przed odpowiedzią serwera wyglądało jak prawdziwy stan i zapraszało
// do kliknięcia, które zapisywało odwrotność czegoś, czego nikt nie widział.

import { useId, type ReactNode } from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { ui } from '@/common/components/ui';

const Row = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid ${ui.lineFaint};
    opacity: ${p => (p.$disabled ? 0.55 : 1)};

    &:first-child { border-top: none; }
`;

const Texts = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const Name = styled.label`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    cursor: pointer;
`;

const Hint = styled.div`
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    max-width: 68ch;
`;

const Slot = styled.div`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    min-height: 44px;
`;

interface Props {
    label: string;
    hint?: ReactNode;
    /** `undefined` = stan nieznany (wczytywanie / błąd) - przełącznika nie ma. */
    checked: boolean | undefined;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    /** Wiersz wyszarzony, bo zależy od innego ustawienia. */
    inactive?: boolean;
}

export function SettingSwitchRow({ label, hint, checked, onChange, disabled, inactive }: Props) {
    const id = useId();
    return (
        <Row $disabled={inactive}>
            <Texts>
                <Name htmlFor={id}>{label}</Name>
                {hint && <Hint>{hint}</Hint>}
            </Texts>
            <Slot>
                {checked !== undefined && (
                    <Toggle inputId={id} checked={checked} onChange={onChange} disabled={disabled} />
                )}
            </Slot>
        </Row>
    );
}
