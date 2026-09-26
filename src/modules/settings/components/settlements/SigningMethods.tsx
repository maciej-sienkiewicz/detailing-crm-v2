// src/modules/settings/components/settlements/SigningMethods.tsx
//
// Trzy sposoby podpisu listy obecności, zawsze widoczne obok siebie: na tym urządzeniu
// (kanwa w oknie zatwierdzania), na tablecie studia albo na własnym telefonie (link SMS-em
// na numer z konta). Podpisuje zatwierdzający. Podpis z tabletu lub telefonu sam zatwierdza
// listę, a okno zatwierdzania dowiaduje się o tym na żywo.

import { useId, type ReactNode } from 'react';
import styled from 'styled-components';
import type { AttendanceSignatureRequest } from '../../api/attendanceApi';
import type { RemoteSigningBlockers } from '../../hooks/useAttendanceRemoteSigning';

export type SigningMethod = 'DEVICE' | 'TABLET' | 'SMS';

export interface SigningTablet {
    tabletId: string;
    deviceName: string;
}

interface PickerProps {
    value: SigningMethod;
    onChange: (method: SigningMethod) => void;
    tablets: SigningTablet[];
    /** Numer z konta, zamaskowany; null, gdy konto nie ma numeru. */
    phone: string | null;
    blockers: RemoteSigningBlockers;
    /** Id etykiety grupy - nazwa pola wyboru dla czytników ekranu. */
    labelledBy: string;
}

/**
 * Wybór sposobu podpisu. Zablokowany sposób zostaje widoczny, z powodem zamiast opisu -
 * opcja, która znika, nie mówi, że istnieje i czego jej brakuje.
 */
export function SigningMethodPicker({ value, onChange, tablets, phone, blockers, labelledBy }: PickerProps) {
    const name = useId();
    const tabletsSummary = tablets.length === 1 ? tablets[0].deviceName : `${tabletsLabel(tablets.length)} do wyboru`;

    return (
        <Picker role="radiogroup" aria-labelledby={labelledBy}>
            <MethodTile
                name={name}
                method="DEVICE"
                selected={value === 'DEVICE'}
                onSelect={onChange}
                icon={<PenIcon />}
                title="Podpisz na tym urządzeniu"
                description="Myszą, rysikiem albo palcem"
            />
            <MethodTile
                name={name}
                method="TABLET"
                selected={value === 'TABLET'}
                onSelect={onChange}
                blocker={blockers.TABLET}
                icon={<TabletIcon />}
                title="Podpisz na tablecie"
                description={tabletsSummary}
            />
            <MethodTile
                name={name}
                method="SMS"
                selected={value === 'SMS'}
                onSelect={onChange}
                blocker={blockers.SMS}
                icon={<PhoneIcon />}
                title="Wyślij na telefon"
                description={phone ?? ''}
            />
        </Picker>
    );
}

function MethodTile({ name, method, selected, onSelect, blocker = null, icon, title, description }: {
    name: string;
    method: SigningMethod;
    selected: boolean;
    onSelect: (method: SigningMethod) => void;
    blocker?: string | null;
    icon: ReactNode;
    title: string;
    description: string;
}) {
    const disabled = blocker !== null;
    return (
        <Tile $selected={selected} $disabled={disabled}>
            <HiddenRadio
                type="radio"
                name={name}
                value={method}
                checked={selected}
                disabled={disabled}
                onChange={() => onSelect(method)}
            />
            <TileIcon $selected={selected} aria-hidden>{icon}</TileIcon>
            <TileTexts>
                <TileTitle>{title}</TileTitle>
                <TileDescription>{blocker ?? description}</TileDescription>
            </TileTexts>
            <TileCheck $selected={selected} aria-hidden />
        </Tile>
    );
}

/** Podpis na tablecie studia: przy kilku tabletach trzeba wskazać, na którym. */
export function TabletPanel({ tablets, tabletId, onTabletChange }: {
    tablets: SigningTablet[];
    /** Wybrany tablet; przy jednym tablecie zawsze on. */
    tabletId: string | null;
    onTabletChange: (tabletId: string) => void;
}) {
    const name = useId();
    const labelId = useId();
    const chosen = tablets.find(tablet => tablet.tabletId === tabletId);

    return (
        <Panel>
            {tablets.length > 1 && (
                <>
                    <PanelLabel id={labelId}>Na którym tablecie?</PanelLabel>
                    <Chips role="radiogroup" aria-labelledby={labelId}>
                        {tablets.map(tablet => (
                            <Chip key={tablet.tabletId} $selected={tablet.tabletId === tabletId}>
                                <HiddenRadio
                                    type="radio"
                                    name={name}
                                    value={tablet.tabletId}
                                    checked={tablet.tabletId === tabletId}
                                    onChange={() => onTabletChange(tablet.tabletId)}
                                />
                                {tablet.deviceName}
                            </Chip>
                        ))}
                    </Chips>
                </>
            )}
            <PanelText>
                {chosen
                    ? <>Lista wyświetli się na tablecie <strong>„{chosen.deviceName}”</strong>.</>
                    : 'Wybierz tablet, na którym wyświetlić listę.'}
                {' '}Podpisz ją tam - po podpisie lista zatwierdzi się sama.
            </PanelText>
        </Panel>
    );
}

/** Podpis na własnym telefonie: link SMS-em na numer z konta zatwierdzającego. */
export function PhonePanel({ phone }: { phone: string | null }) {
    return (
        <Panel>
            <PanelText>
                Wyślemy SMS z linkiem na Twój numer{phone && <> <strong>{phone}</strong></>}. Otwórz go
                w telefonie i podpisz listę - po podpisie lista zatwierdzi się sama.
            </PanelText>
        </Panel>
    );
}

/** 2 tablety, 5 tabletów, 22 tablety. */
function tabletsLabel(count: number): string {
    const lastTwo = count % 100;
    const last = count % 10;
    const few = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
    return `${count} ${few ? 'tablety' : 'tabletów'}`;
}

/** Prośba wysłana na tablet albo telefon, która czeka na podpis. */
export function AwaitingSignature({ request, tablets, phone, cancelling, onCancel }: {
    request: AttendanceSignatureRequest;
    tablets: SigningTablet[];
    phone: string | null;
    cancelling: boolean;
    onCancel: () => void;
}) {
    const displayed = request.status === 'DISPLAYED';
    const until = new Date(request.expiresAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const tabletName = tablets.find(t => t.tabletId === request.tabletId)?.deviceName;

    const title = request.channel === 'TABLET'
        ? `Lista czeka na podpis na tablecie${tabletName ? ` „${tabletName}”` : ''}`
        : `Lista czeka na podpis na Twoim telefonie`;
    const progress = request.channel === 'TABLET'
        ? (displayed ? 'Dokument jest wyświetlony na tablecie.' : 'Dokument jest w drodze na tablet.')
        : (displayed
            ? 'Link jest otwarty w telefonie.'
            : `Wysłaliśmy link SMS-em${phone ? ` na numer ${phone}` : ''}. Otwórz go w telefonie i podpisz listę.`);

    return (
        <Waiting role="status" aria-live="polite">
            <WaitingHead>
                <Spinner aria-hidden />
                <WaitingTitle>{title}</WaitingTitle>
            </WaitingHead>
            <WaitingText>{progress}</WaitingText>
            <WaitingText>Prośba jest ważna do {until}. Po podpisie lista zatwierdzi się sama.</WaitingText>
            <CancelBtn type="button" onClick={onCancel} disabled={cancelling}>
                {cancelling ? 'Anulowanie...' : 'Anuluj prośbę'}
            </CancelBtn>
        </Waiting>
    );
}

/** Komunikat pod wyborem: powód odmowy serwera albo wynik poprzedniej prośby. */
export const SigningNotice = styled.p.attrs({ role: 'status' })`
    margin: 0;
    padding: 8px 10px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
`;

const PenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const TabletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 8.5h5M9.5 11.5h3" />
    </svg>
);

/** Na wąskim ekranie kafelki idą jeden pod drugim - w trzech kolumnach opis łamałby się co słowo. */
const NARROW = '@media (max-width: 560px)';

/** Telefon w poziomie: brakuje wysokości, więc kafelki tracą ikonę, a pole podpisu jest bliżej. */
const SHORT = '@media (max-height: 480px)';

const Picker = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;

    ${NARROW} {
        grid-template-columns: minmax(0, 1fr);
        gap: 8px;
    }
`;

const Tile = styled.label<{ $selected: boolean; $disabled: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    padding: 12px 34px 12px 12px;
    border: 1.5px solid ${p => (p.$selected ? 'var(--brand-primary)' : '#e2e8f0')};
    border-radius: 12px;
    background: ${p => (p.$selected ? 'color-mix(in srgb, var(--brand-primary) 7%, #ffffff)' : '#ffffff')};
    cursor: ${p => (p.$disabled ? 'default' : 'pointer')};
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
    transition: border-color 0.15s, background 0.15s;

    &:hover {
        border-color: ${p => (p.$disabled ? '#e2e8f0' : p.$selected ? 'var(--brand-primary)' : '#94a3b8')};
    }

    &:has(input:focus-visible) {
        outline: 2px solid var(--brand-primary);
        outline-offset: 2px;
    }

    ${NARROW} {
        flex-direction: row;
        align-items: center;
        gap: 12px;
        padding: 10px 40px 10px 10px;
    }
`;

const HiddenRadio = styled.input`
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
    pointer-events: none;
`;

const TileIcon = styled.span<{ $selected: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 9px;
    background: ${p => (p.$selected ? 'var(--brand-primary)' : '#f1f5f9')};
    color: ${p => (p.$selected ? '#ffffff' : '#475569')};
    transition: background 0.15s, color 0.15s;

    svg {
        width: 18px;
        height: 18px;
    }

    ${SHORT} {
        display: none;
    }
`;

const TileTexts = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const TileTitle = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.3;
    color: #0f172a;
`;

const TileDescription = styled.span`
    font-size: 12px;
    line-height: 1.35;
    color: #64748b;
    overflow-wrap: anywhere;
`;

const TileCheck = styled.span<{ $selected: boolean }>`
    position: absolute;
    top: 12px;
    right: 12px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid ${p => (p.$selected ? 'var(--brand-primary)' : '#cbd5e1')};
    background: ${p => (p.$selected ? 'var(--brand-primary)' : '#ffffff')};
    box-shadow: ${p => (p.$selected ? 'inset 0 0 0 3px #ffffff' : 'none')};

    ${NARROW} {
        top: 50%;
        transform: translateY(-50%);
    }
`;

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
`;

/* Pytanie zdaniem, 13px półgrube - było 11px wersalikami w szarości (CLAUDE.md §2). */
const PanelLabel = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
`;

const PanelText = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: #334155;

    strong {
        font-weight: 600;
        color: #0f172a;
    }
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const Chip = styled.label<{ $selected: boolean }>`
    position: relative;
    padding: 6px 12px;
    border: 1.5px solid ${p => (p.$selected ? 'var(--brand-primary)' : '#e2e8f0')};
    border-radius: 999px;
    background: ${p => (p.$selected ? 'color-mix(in srgb, var(--brand-primary) 10%, #ffffff)' : '#ffffff')};
    font-size: 12.5px;
    font-weight: 600;
    color: #0f172a;
    cursor: pointer;

    &:hover { border-color: ${p => (p.$selected ? 'var(--brand-primary)' : '#94a3b8')}; }

    &:has(input:focus-visible) {
        outline: 2px solid var(--brand-primary);
        outline-offset: 2px;
    }
`;

const Waiting = styled.div`
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
`;

const WaitingHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
`;

const Spinner = styled.span`
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    border: 2px solid #cbd5e1;
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: remote-signing-spin 0.9s linear infinite;

    @keyframes remote-signing-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const WaitingTitle = styled.p`
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
`;

const WaitingText = styled.p`
    margin: 4px 0 0 24px;
    font-size: 12.5px;
    line-height: 1.55;
    color: #475569;
`;

const CancelBtn = styled.button`
    margin: 10px 0 0 24px;
    padding: 0;
    background: none;
    border: none;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #b91c1c;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: default; }
`;
