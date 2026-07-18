// src/modules/public-signing/views/PublicSigningView.tsx
//
// Public, customer-facing document signing page (route /sign/:token — no login).
// Opened from the SMS link "Wyślij prośbę na telefon klienta": shows the exact
// same document a studio tablet would display and lets the customer accept the
// declaration and sign with their finger.
//
// WYSIWYS contract (same as the tablet app):
//  1. download the EXACT PDF bytes, compute SHA-256 client-side,
//  2. verify it equals the hash announced in the session metadata,
//  3. echo that hash + the single-use challenge on submit.
//
// Design language mirrors the public Visit Card (/vc/:token): neutral light
// background, white bordered cards, one restrained accent, mobile-first.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
    publicSigningApi,
    type PublicSigningSession,
} from '../api/publicSigningApi';
import { PdfPagesViewer } from '../components/PdfPagesViewer';
import { SignaturePad, type SignaturePadHandle } from '../components/SignaturePad';

// ─── Palette (aligned with VisitCardView) ─────────────────────────────────────

const BG = '#f1f3f6';
const CARD = '#ffffff';
const BORDER = '#e4e7ec';
const INK = '#101828';
const MUTED = '#667085';
const FAINT = '#98a2b3';
const ACCENT = '#1d4ed8';
const ACCENT_DARK = '#1e40af';
const OK = '#067647';
const OK_BG = '#ecfdf3';
const ERR = '#b42318';
const ERR_BG = '#fef3f2';

// ─── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background: ${BG};
    color: ${INK};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
`;

const Shell = styled.div`
    max-width: 680px;
    margin: 0 auto;
    padding: 16px 12px 48px;

    @media (min-width: 640px) {
        padding: 28px 20px 64px;
    }
`;

const Card = styled.section`
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;

    @media (min-width: 640px) {
        padding: 20px;
    }
`;

const CardTitle = styled.h2`
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${FAINT};
`;

const DocName = styled.h1`
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.3px;
`;

const SubLine = styled.div`
    font-size: 13px;
    color: ${MUTED};
`;

const ExpiryLine = styled.div`
    margin-top: 8px;
    font-size: 12px;
    color: ${FAINT};
`;

// ─── Declaration + actions ────────────────────────────────────────────────────

const DeclarationLabel = styled.label`
    display: flex;
    gap: 10px;
    align-items: flex-start;
    cursor: pointer;
    font-size: 13px;
    color: ${INK};

    input {
        margin-top: 2px;
        width: 18px;
        height: 18px;
        accent-color: ${ACCENT};
        flex-shrink: 0;
    }
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
`;

const PrimaryBtn = styled.button`
    width: 100%;
    padding: 13px 16px;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    color: #ffffff;
    background: ${ACCENT};
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: background 180ms ease, transform 180ms ease;

    &:hover:not(:disabled) {
        background: ${ACCENT_DARK};
        transform: translateY(-1px);
    }

    &:disabled {
        background: ${FAINT};
        cursor: not-allowed;
    }
`;

const SecondaryBtn = styled.button`
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    color: ${MUTED};
    background: ${CARD};
    border: 1.5px solid ${BORDER};
    border-radius: 9999px;
    cursor: pointer;
    transition: all 180ms ease;

    &:hover:not(:disabled) {
        color: ${ERR};
        border-color: ${ERR};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ErrorNote = styled.div`
    margin-top: 12px;
    padding: 10px 12px;
    font-size: 13px;
    color: ${ERR};
    background: ${ERR_BG};
    border: 1px solid #fecdca;
    border-radius: 8px;
`;

// ─── Status screens ───────────────────────────────────────────────────────────

const StatusCard = styled(Card)`
    text-align: center;
    padding: 40px 20px;
`;

const StatusBadge = styled.div<{ $ok?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    margin-bottom: 16px;
    background: ${p => (p.$ok ? OK_BG : '#f2f4f7')};
    color: ${p => (p.$ok ? OK : MUTED)};

    svg {
        width: 28px;
        height: 28px;
    }
`;

const StatusTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 6px;
`;

const StatusText = styled.div`
    font-size: 13px;
    color: ${MUTED};
    max-width: 380px;
    margin: 0 auto;
`;

const CenterSpinner = styled.div`
    margin: 64px auto;
    width: 36px;
    height: 36px;
    border: 3px solid ${BORDER};
    border-top-color: ${ACCENT};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const CheckSvg = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="5 13 9 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const InfoSvg = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 8h.01M12 11v5" />
    </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sha256Hex = async (bytes: ArrayBuffer): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

const extractApiErrorMessage = (error: unknown): string => {
    const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    if (apiMessage) return apiMessage;
    return error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd';
};

type ViewPhase =
    | { kind: 'loading' }
    | { kind: 'invalid' }
    | { kind: 'terminal'; session: PublicSigningSession }
    | { kind: 'active'; session: PublicSigningSession; pdf: ArrayBuffer; pdfSha256: string }
    | { kind: 'integrity-error' }
    | { kind: 'submitted' }
    | { kind: 'declined' };

// ─── View ─────────────────────────────────────────────────────────────────────

export const PublicSigningView = () => {
    const { token = '' } = useParams<{ token: string }>();

    const [phase, setPhase] = useState<ViewPhase>({ kind: 'loading' });
    const [declarationAccepted, setDeclarationAccepted] = useState(false);
    const [declarationAcceptedAt, setDeclarationAcceptedAt] = useState<string | null>(null);
    const [hasStrokes, setHasStrokes] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const padRef = useRef<SignaturePadHandle>(null);

    useEffect(() => {
        document.title = 'Podpis dokumentu';
        let cancelled = false;

        const load = async () => {
            try {
                const session = await publicSigningApi.getSession(token);
                if (cancelled) return;

                const terminal = ['COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'FAILED'];
                if (terminal.includes(session.status) || !session.challenge) {
                    setPhase({ kind: 'terminal', session });
                    return;
                }

                const pdf = await publicSigningApi.getDocument(token);
                if (cancelled) return;

                // WYSIWYS: what we render must be byte-identical to what the
                // employee requested — otherwise refuse to let the customer sign.
                const pdfSha256 = await sha256Hex(pdf);
                if (pdfSha256.toLowerCase() !== session.documentSha256.toLowerCase()) {
                    setPhase({ kind: 'integrity-error' });
                    return;
                }

                setPhase({ kind: 'active', session, pdf, pdfSha256 });
            } catch (error) {
                console.error('[PublicSigningView] Failed to load signing session:', error);
                if (!cancelled) setPhase({ kind: 'invalid' });
            }
        };

        if (token) void load();
        else setPhase({ kind: 'invalid' });

        return () => {
            cancelled = true;
        };
    }, [token]);

    const handleDeclarationChange = (checked: boolean) => {
        setDeclarationAccepted(checked);
        setDeclarationAcceptedAt(checked ? new Date().toISOString() : null);
    };

    const canSubmit = declarationAccepted && hasStrokes && !submitting;

    const handleSubmit = async () => {
        if (phase.kind !== 'active' || !canSubmit) return;
        const signatureImageBase64 = padRef.current?.toPngBase64();
        if (!signatureImageBase64) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            await publicSigningApi.submit(token, {
                documentSha256: phase.pdfSha256,
                challenge: phase.session.challenge!,
                declarationAccepted: true,
                declarationAcceptedAt: declarationAcceptedAt ?? new Date().toISOString(),
                signatureImageBase64,
            });
            setPhase({ kind: 'submitted' });
        } catch (error) {
            setSubmitError(extractApiErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDecline = async () => {
        if (phase.kind !== 'active' || submitting) return;
        const confirmed = window.confirm('Czy na pewno odmawiasz podpisania tego dokumentu?');
        if (!confirmed) return;

        setSubmitting(true);
        setSubmitError(null);
        try {
            await publicSigningApi.decline(token, 'Klient odmówił podpisania na telefonie');
            setPhase({ kind: 'declined' });
        } catch (error) {
            setSubmitError(extractApiErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const terminalCopy = useMemo(() => {
        if (phase.kind !== 'terminal') return null;
        switch (phase.session.status) {
            case 'COMPLETED':
                return { ok: true, title: 'Dokument został już podpisany', text: 'Ten dokument ma już złożony podpis. Nie musisz nic więcej robić.' };
            case 'DECLINED':
                return { ok: false, title: 'Odmówiono podpisania', text: 'Podpisanie tego dokumentu zostało odrzucone. Jeśli to pomyłka, poproś pracownika o ponowne wysłanie prośby.' };
            case 'CANCELLED':
                return { ok: false, title: 'Prośba o podpis została anulowana', text: 'Pracownik wycofał prośbę o podpis. Jeśli to pomyłka, poproś o ponowne wysłanie linku.' };
            case 'FAILED':
                return { ok: false, title: 'Podpisanie nie powiodło się', text: 'Sesja podpisu została przerwana. Poproś pracownika o ponowne wysłanie prośby o podpis.' };
            case 'EXPIRED':
            default:
                return { ok: false, title: 'Link do podpisu wygasł', text: 'Ten link stracił ważność. Poproś pracownika o ponowne wysłanie prośby o podpis.' };
        }
    }, [phase]);

    // ─── Render ──────────────────────────────────────────────────────────────

    if (phase.kind === 'loading') {
        return (
            <Page>
                <Shell>
                    <CenterSpinner />
                </Shell>
            </Page>
        );
    }

    if (phase.kind === 'invalid' || phase.kind === 'integrity-error') {
        const isIntegrity = phase.kind === 'integrity-error';
        return (
            <Page>
                <Shell>
                    <StatusCard>
                        <StatusBadge><InfoSvg /></StatusBadge>
                        <StatusTitle>
                            {isIntegrity ? 'Nie można wyświetlić dokumentu' : 'Link jest nieprawidłowy lub wygasł'}
                        </StatusTitle>
                        <StatusText>
                            {isIntegrity
                                ? 'Weryfikacja integralności dokumentu nie powiodła się. Ze względów bezpieczeństwa podpis nie jest możliwy — poproś pracownika o ponowne wysłanie prośby.'
                                : 'Sprawdź, czy link z wiadomości SMS został otwarty w całości, lub poproś pracownika o ponowne wysłanie prośby o podpis.'}
                        </StatusText>
                    </StatusCard>
                </Shell>
            </Page>
        );
    }

    if (phase.kind === 'submitted') {
        return (
            <Page>
                <Shell>
                    <StatusCard>
                        <StatusBadge $ok><CheckSvg /></StatusBadge>
                        <StatusTitle>Dziękujemy, dokument został podpisany</StatusTitle>
                        <StatusText>Podpisany egzemplarz został bezpiecznie zapisany. Możesz zamknąć tę stronę.</StatusText>
                    </StatusCard>
                </Shell>
            </Page>
        );
    }

    if (phase.kind === 'declined') {
        return (
            <Page>
                <Shell>
                    <StatusCard>
                        <StatusBadge><InfoSvg /></StatusBadge>
                        <StatusTitle>Odmowa została zapisana</StatusTitle>
                        <StatusText>Poinformowaliśmy pracownika o odmowie podpisania dokumentu. Możesz zamknąć tę stronę.</StatusText>
                    </StatusCard>
                </Shell>
            </Page>
        );
    }

    if (phase.kind === 'terminal') {
        // terminalCopy is always set when phase.kind === 'terminal' (see useMemo above)
        if (!terminalCopy) return null;
        return (
            <Page>
                <Shell>
                    <StatusCard>
                        <StatusBadge $ok={terminalCopy.ok}>
                            {terminalCopy.ok ? <CheckSvg /> : <InfoSvg />}
                        </StatusBadge>
                        <StatusTitle>{terminalCopy.title}</StatusTitle>
                        <StatusText>{terminalCopy.text}</StatusText>
                    </StatusCard>
                </Shell>
            </Page>
        );
    }

    // phase.kind === 'active'
    const { session, pdf } = phase;

    return (
        <Page>
            <Shell>
                <Card>
                    <DocName>{session.documentName}</DocName>
                    <SubLine>Do podpisu przez: {session.signerName}</SubLine>
                    <ExpiryLine>Link ważny do {formatDateTime(session.expiresAt)}</ExpiryLine>
                </Card>

                <Card>
                    <CardTitle>Dokument</CardTitle>
                    <PdfPagesViewer data={pdf} />
                </Card>

                <Card>
                    <CardTitle>Oświadczenie i podpis</CardTitle>

                    <DeclarationLabel>
                        <input
                            type="checkbox"
                            checked={declarationAccepted}
                            onChange={e => handleDeclarationChange(e.target.checked)}
                        />
                        <span>{session.declarationText}</span>
                    </DeclarationLabel>

                    <div style={{ height: 16 }} />

                    <SignaturePad ref={padRef} onStrokeChange={setHasStrokes} />

                    {submitError && <ErrorNote>{submitError}</ErrorNote>}

                    <Actions>
                        <PrimaryBtn onClick={handleSubmit} disabled={!canSubmit}>
                            {submitting ? 'Przetwarzanie…' : 'Podpisz dokument'}
                        </PrimaryBtn>
                        <SecondaryBtn onClick={handleDecline} disabled={submitting}>
                            Odmawiam podpisania
                        </SecondaryBtn>
                    </Actions>
                </Card>
            </Shell>
        </Page>
    );
};

export default PublicSigningView;
