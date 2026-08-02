// Public, mobile-first page for drawing a personal signature on the user's own phone.
// Opened from the SMS link sent by "Wyślij link na telefon" in Settings → Dokumenty i podpisy.
// No login required — the unguessable token in the URL is the credential.

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { apiClient } from '@/core/apiClient';
import { SignaturePad, type SignaturePadHandle } from '@/modules/public-signing/components/SignaturePad';

// ─── Palette ─────────────────────────────────────────────────────────────────

const BG = '#f1f3f6';
const CARD = '#ffffff';
const BORDER = '#e4e7ec';
const INK = '#101828';
const MUTED = '#667085';
const ACCENT = '#0ea5e9';
const ACCENT_DARK = '#0284c7';
const OK = '#067647';
const OK_BG = '#ecfdf3';
const ERR = '#b42318';
const ERR_BG = '#fef3f2';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background: ${BG};
    color: ${INK};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px 40px;
`;

const Logo = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${INK};
    letter-spacing: -0.3px;
    margin-bottom: 24px;
    align-self: flex-start;
`;

const Card = styled.div`
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
`;

const Heading = styled.h1`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: ${INK};
`;

const Sub = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${MUTED};
    line-height: 1.55;
`;

const PadLabel = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${INK};
`;

const PadWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const BtnRow = styled.div`
    display: flex;
    gap: 8px;
`;

const Btn = styled.button<{ $primary?: boolean }>`
    flex: 1;
    padding: 13px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 150ms;
    border: 1px solid;
    ${({ $primary }) => $primary ? `
        background: ${ACCENT};
        color: white;
        border-color: ${ACCENT};
        &:hover { background: ${ACCENT_DARK}; border-color: ${ACCENT_DARK}; }
        &:disabled { opacity: .5; cursor: not-allowed; }
    ` : `
        background: transparent;
        color: ${MUTED};
        border-color: ${BORDER};
        &:hover { background: #f8fafc; }
        &:disabled { opacity: .5; cursor: not-allowed; }
    `}
`;

const StatusCard = styled.div<{ $ok?: boolean }>`
    background: ${({ $ok }) => $ok ? OK_BG : ERR_BG};
    border: 1px solid ${({ $ok }) => $ok ? '#a7f3d0' : '#fecaca'};
    border-radius: 14px;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    width: 100%;
    max-width: 480px;
`;

const StatusIcon = styled.div<{ $ok?: boolean }>`
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: ${({ $ok }) => $ok ? 'rgba(6,118,71,.12)' : 'rgba(180,35,24,.10)'};
    color: ${({ $ok }) => $ok ? OK : ERR};
    display: flex;
    align-items: center;
    justify-content: center;
    svg { width: 26px; height: 26px; }
`;

const StatusTitle = styled.div<{ $ok?: boolean }>`
    font-size: 16px;
    font-weight: 700;
    color: ${({ $ok }) => $ok ? OK : ERR};
`;

const StatusDesc = styled.div`
    font-size: 13px;
    color: ${MUTED};
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'ready' | 'submitting' | 'done' | 'expired' | 'error';

export function PhoneSignatureView() {
    const { token } = useParams<{ token: string }>();
    const padRef = useRef<SignaturePadHandle>(null);

    const [pageState, setPageState] = useState<PageState>('loading');
    const [hasStrokes, setHasStrokes] = useState(false);

    useEffect(() => {
        if (!token) { setPageState('expired'); return; }
        apiClient.get<{ status: string }>(`/public/user-signature/${token}`)
            .then(res => {
                setPageState(res.data.status === 'PENDING' ? 'ready' : 'expired');
            })
            .catch(() => setPageState('error'));
    }, [token]);

    const handleSave = async () => {
        const base64 = padRef.current?.toPngBase64();
        if (!base64 || !token) return;
        setPageState('submitting');
        try {
            await apiClient.post(`/public/user-signature/${token}/submit`, { signatureImageBase64: base64 });
            setPageState('done');
        } catch {
            setPageState('error');
        }
    };

    const handleClear = () => {
        padRef.current?.clear();
        setHasStrokes(false);
    };

    if (pageState === 'loading') return null;

    if (pageState === 'done') {
        return (
            <Page>
                <Logo>AutoCRM</Logo>
                <StatusCard $ok>
                    <StatusIcon $ok><CheckIcon /></StatusIcon>
                    <StatusTitle $ok>Podpis zapisany!</StatusTitle>
                    <StatusDesc>Twój podpis został pomyślnie skonfigurowany.<br />Możesz zamknąć tę stronę.</StatusDesc>
                </StatusCard>
            </Page>
        );
    }

    if (pageState === 'expired') {
        return (
            <Page>
                <Logo>AutoCRM</Logo>
                <StatusCard>
                    <StatusIcon><XIcon /></StatusIcon>
                    <StatusTitle>Link wygasł</StatusTitle>
                    <StatusDesc>Ten link był ważny przez 30 minut. Wróć do ustawień i wyślij nowy link na telefon.</StatusDesc>
                </StatusCard>
            </Page>
        );
    }

    if (pageState === 'error') {
        return (
            <Page>
                <Logo>AutoCRM</Logo>
                <StatusCard>
                    <StatusIcon><XIcon /></StatusIcon>
                    <StatusTitle>Błąd</StatusTitle>
                    <StatusDesc>Nie udało się zapisać podpisu. Zamknij tę stronę i spróbuj ponownie.</StatusDesc>
                </StatusCard>
            </Page>
        );
    }

    return (
        <Page>
            <Logo>AutoCRM</Logo>
            <Card>
                <div>
                    <Heading>Twój podpis</Heading>
                    <Sub style={{ marginTop: 6 }}>
                        Narysuj podpis palcem w polu poniżej.
                        Zostanie on zapisany na Twoim koncie i użyty na protokołach przyjęcia pojazdów.
                    </Sub>
                </div>

                <PadWrapper>
                    <PadLabel>Narysuj podpis:</PadLabel>
                    <SignaturePad ref={padRef} onStrokeChange={setHasStrokes} />
                </PadWrapper>

                <BtnRow>
                    <Btn
                        $primary
                        onClick={handleSave}
                        disabled={!hasStrokes || pageState === 'submitting'}
                    >
                        {pageState === 'submitting' ? 'Zapisywanie…' : 'Zapisz podpis'}
                    </Btn>
                    <Btn onClick={handleClear} disabled={pageState === 'submitting'}>
                        Wyczyść
                    </Btn>
                </BtnRow>
            </Card>
        </Page>
    );
}
