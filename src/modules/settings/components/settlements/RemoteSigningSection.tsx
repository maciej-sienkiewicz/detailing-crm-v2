// src/modules/settings/components/settlements/RemoteSigningSection.tsx
//
// Podpis listy obecności na innym urządzeniu: na tablecie studia albo na własnym
// telefonie (link SMS-em na numer z konta). Podpisuje zatwierdzający - po podpisie
// lista zatwierdza się sama, a okno zatwierdzania dowiaduje się o tym na żywo.

import { useState } from 'react';
import styled from 'styled-components';
import { useCapability } from '@/modules/subscription';
import type { AttendanceSignatureRequest, RemoteSigningChannel } from '../../api/attendanceApi';

interface Props {
    tablets: { tabletId: string; deviceName: string }[];
    /** Numer z konta, zamaskowany; null, gdy konto nie ma numeru. */
    phone: string | null;
    /** Tablety i numer jeszcze się wczytują - brak nie znaczy jeszcze „nie ma". */
    loading: boolean;
    /** Prośba, która właśnie czeka na podpis; null, gdy żadna. */
    awaiting: AttendanceSignatureRequest | null;
    sending: boolean;
    cancelling: boolean;
    /** Komunikat pod przyciskami: powód odmowy serwera albo wynik poprzedniej prośby. */
    notice: string | null;
    onSend: (channel: RemoteSigningChannel, tabletId?: string) => void;
    onCancel: () => void;
}

export function RemoteSigningSection({ tablets, phone, loading, awaiting, sending, cancelling, notice, onSend, onCancel }: Props) {
    const tabletCapability = useCapability('SIGNATURE_LOCAL');
    const smsCapability = useCapability('SIGNATURE_REMOTE_REQUEST');
    const [pickingTablet, setPickingTablet] = useState(false);

    if (awaiting) {
        return <AwaitingSignature request={awaiting} tablets={tablets} phone={phone} cancelling={cancelling} onCancel={onCancel} />;
    }

    const checking = loading || tabletCapability.isLoading || smsCapability.isLoading;
    const tabletBlocker = checking ? CHECKING
        : !tabletCapability.enabled ? tabletCapability.lockReason ?? 'Wymaga modułu Podpisy elektroniczne'
            : tablets.length === 0 ? 'Brak sparowanego tabletu' : null;
    const smsBlocker = checking ? CHECKING
        : !smsCapability.enabled ? smsCapability.lockReason ?? 'Wymaga modułów: Podpisy elektroniczne i Automatyzacja kontaktu'
            : phone === null ? 'Brak numeru telefonu w Twoim profilu' : null;

    const handleTablet = () => {
        if (tablets.length === 1) onSend('TABLET', tablets[0].tabletId);
        else setPickingTablet(prev => !prev);
    };

    return (
        <Wrap>
            <Divider><span>albo podpisz na innym urządzeniu</span></Divider>
            <Options>
                <OptionBtn type="button" onClick={handleTablet} disabled={sending || tabletBlocker !== null}>
                    <TabletIcon />
                    <OptionTexts>
                        <OptionTitle>Wyświetl podpis na tablecie</OptionTitle>
                        <OptionSub>
                            {tabletBlocker ?? (tablets.length === 1 ? tablets[0].deviceName : `${tabletsLabel(tablets.length)} - wybierz`)}
                        </OptionSub>
                    </OptionTexts>
                </OptionBtn>
                {pickingTablet && tabletBlocker === null && tablets.length > 1 && (
                    <TabletList role="group" aria-label="Wybierz tablet">
                        {tablets.map(tablet => (
                            <TabletChoice
                                key={tablet.tabletId}
                                type="button"
                                disabled={sending}
                                onClick={() => { setPickingTablet(false); onSend('TABLET', tablet.tabletId); }}
                            >
                                {tablet.deviceName}
                            </TabletChoice>
                        ))}
                    </TabletList>
                )}
                <OptionBtn type="button" onClick={() => onSend('SMS')} disabled={sending || smsBlocker !== null}>
                    <PhoneIcon />
                    <OptionTexts>
                        <OptionTitle>Wyślij podpis na mój numer telefonu</OptionTitle>
                        <OptionSub>{smsBlocker ?? phone}</OptionSub>
                    </OptionTexts>
                </OptionBtn>
            </Options>
            {sending && <Hint>Wysyłam prośbę o podpis…</Hint>}
            {notice && !sending && <Notice role="status">{notice}</Notice>}
        </Wrap>
    );
}

const CHECKING = 'Sprawdzam…';

/** 2 tablety, 5 tabletów, 22 tablety. */
function tabletsLabel(count: number): string {
    const lastTwo = count % 100;
    const last = count % 10;
    const few = last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14);
    return `${count} ${few ? 'tablety' : 'tabletów'}`;
}

function AwaitingSignature({ request, tablets, phone, cancelling, onCancel }: {
    request: AttendanceSignatureRequest;
    tablets: { tabletId: string; deviceName: string }[];
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
                {cancelling ? 'Anuluję…' : 'Anuluj prośbę'}
            </CancelBtn>
        </Waiting>
    );
}

const TabletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 8.5h5M9.5 11.5h3" />
    </svg>
);

const Wrap = styled.div`
    margin-top: 18px;
`;

const Divider = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #64748b;

    &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e2e8f0;
    }
`;

const Options = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const OptionBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;

    svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        color: #475569;
    }

    &:hover:not(:disabled) {
        border-color: #94a3b8;
        background: #f8fafc;
    }

    &:disabled {
        cursor: default;
        opacity: 0.55;
    }
`;

const OptionTexts = styled.span`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const OptionTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const OptionSub = styled.span`
    font-size: 12px;
    color: #64748b;
`;

const TabletList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 4px 2px 44px;
`;

const TabletChoice = styled.button`
    padding: 6px 12px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #0f172a;
    cursor: pointer;

    &:hover:not(:disabled) { background: #e2e8f0; }
    &:disabled { opacity: 0.55; cursor: default; }
`;

const Hint = styled.p`
    margin: 10px 0 0;
    font-size: 12.5px;
    color: #64748b;
`;

const Notice = styled.p`
    margin: 10px 0 0;
    padding: 8px 10px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 8px;
`;

const Waiting = styled.div`
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
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
