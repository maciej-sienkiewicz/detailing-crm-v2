// Public, mobile-first page for drawing a personal signature on the user's own phone.
// Opened from the SMS link sent by "Wyślij link na telefon" in Settings → Dokumenty i podpisy.
// No login required: the unguessable token in the URL is the credential.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { apiClient } from '@/core/apiClient';

// ─── Canvas (ported from the tablet app: DPI-aware, velocity width, ResizeObserver) ──

const MIN_INK_PX = 60;
const STROKE_COLOR = '#1a1a2e';
const MAX_W = 3.4;
const MIN_W = 1.4;

interface StrokePoint { x: number; y: number; t: number }

interface CanvasHandle {
    clear: () => void;
    exportPngBase64: () => string | null;
}

const PhoneCanvas = forwardRef<CanvasHandle, { onInkChange: (px: number) => void }>(
    function PhoneCanvas({ onInkChange }, ref) {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const inkRef = useRef(0);
        const hasInkRef = useRef(false);
        const strokesRef = useRef<StrokePoint[][]>([]);
        const onInkChangeRef = useRef(onInkChange);
        onInkChangeRef.current = onInkChange;

        useImperativeHandle(ref, () => ({
            clear() {
                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                strokesRef.current = [];
                inkRef.current = 0;
                hasInkRef.current = false;
                onInkChangeRef.current(0);
            },
            exportPngBase64() {
                const canvas = canvasRef.current;
                if (!canvas || !hasInkRef.current) return null;
                const dataUrl = canvas.toDataURL('image/png');
                return dataUrl.slice(dataUrl.indexOf(',') + 1);
            },
        }));

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            let activeId: number | null = null;
            let prev: StrokePoint | null = null;
            let prevMid: { x: number; y: number } | null = null;
            let width = MAX_W;

            const dot = (p: StrokePoint) => {
                ctx.beginPath();
                ctx.fillStyle = STROKE_COLOR;
                ctx.arc(p.x, p.y, MAX_W / 2, 0, Math.PI * 2);
                ctx.fill();
            };

            const nextWidth = (a: StrokePoint, b: StrokePoint, cur: number) => {
                const dt = Math.max(b.t - a.t, 1);
                const v = Math.hypot(b.x - a.x, b.y - a.y) / dt;
                const t = Math.min(MAX_W, Math.max(MIN_W, MAX_W / (1 + v * 1.6)));
                return cur * 0.7 + t * 0.3;
            };

            const segment = (
                from: StrokePoint,
                fromMid: { x: number; y: number } | null,
                to: StrokePoint,
                lw: number,
            ) => {
                const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
                ctx.beginPath();
                ctx.lineWidth = lw;
                if (fromMid) {
                    ctx.moveTo(fromMid.x, fromMid.y);
                    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
                } else {
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(mid.x, mid.y);
                }
                ctx.stroke();
                return mid;
            };

            const replay = () => {
                for (const stroke of strokesRef.current) {
                    if (!stroke.length) continue;
                    dot(stroke[0]);
                    let rp = stroke[0];
                    let rm: { x: number; y: number } | null = null;
                    let rw = MAX_W;
                    for (let i = 1; i < stroke.length; i++) {
                        rw = nextWidth(rp, stroke[i], rw);
                        rm = segment(rp, rm, stroke[i], rw);
                        rp = stroke[i];
                    }
                }
            };

            let lastW = 0, lastH = 0;
            const applySize = () => {
                const rect = canvas.getBoundingClientRect();
                if (rect.width === lastW && rect.height === lastH) return;
                lastW = rect.width; lastH = rect.height;
                const dpr = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = Math.max(1, Math.round(rect.width * dpr));
                canvas.height = Math.max(1, Math.round(rect.height * dpr));
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = STROKE_COLOR;
                replay();
            };
            applySize();
            const ro = new ResizeObserver(applySize);
            ro.observe(canvas);

            const pt = (e: PointerEvent): StrokePoint => {
                const b = canvas.getBoundingClientRect();
                return { x: e.clientX - b.left, y: e.clientY - b.top, t: e.timeStamp };
            };

            const draw = (p: StrokePoint) => {
                if (!prev) return;
                const d = Math.hypot(p.x - prev.x, p.y - prev.y);
                if (d === 0) return;
                width = nextWidth(prev, p, width);
                prevMid = segment(prev, prevMid, p, width);
                prev = p;
                strokesRef.current[strokesRef.current.length - 1]?.push(p);
                inkRef.current += d;
                hasInkRef.current = true;
                onInkChangeRef.current(inkRef.current);
            };

            const onDown = (e: PointerEvent) => {
                if (activeId !== null) return;
                activeId = e.pointerId;
                canvas.setPointerCapture(e.pointerId);
                prev = pt(e);
                prevMid = null;
                width = MAX_W;
                strokesRef.current.push([prev]);
                dot(prev);
                hasInkRef.current = true;
            };
            const onMove = (e: PointerEvent) => {
                if (e.pointerId !== activeId) return;
                const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
                if (coalesced.length) coalesced.forEach(s => draw(pt(s)));
                else draw(pt(e));
            };
            const onEnd = (e: PointerEvent) => {
                if (e.pointerId !== activeId) return;
                activeId = null; prev = null; prevMid = null;
                onInkChangeRef.current(inkRef.current);
            };

            const block = (e: TouchEvent) => e.preventDefault();

            canvas.addEventListener('pointerdown', onDown);
            canvas.addEventListener('pointermove', onMove);
            canvas.addEventListener('pointerup', onEnd);
            canvas.addEventListener('pointercancel', onEnd);
            canvas.addEventListener('touchstart', block, { passive: false });
            canvas.addEventListener('touchmove', block, { passive: false });

            return () => {
                ro.disconnect();
                canvas.removeEventListener('pointerdown', onDown);
                canvas.removeEventListener('pointermove', onMove);
                canvas.removeEventListener('pointerup', onEnd);
                canvas.removeEventListener('pointercancel', onEnd);
                canvas.removeEventListener('touchstart', block);
                canvas.removeEventListener('touchmove', block);
                strokesRef.current = [];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = 1;
                canvas.height = 1;
            };
        }, []);

        return (
            <StyledCanvas
                ref={canvasRef}
                aria-label="Pole podpisu"
            />
        );
    },
);

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
    height: 100vh;
    height: 100dvh;
    background: ${BG};
    color: ${INK};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    touch-action: none;
`;

const TopBar = styled.div`
    padding: 16px 20px 12px;
    flex-shrink: 0;
`;

const Logo = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${INK};
    letter-spacing: -0.3px;
`;

const Content = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 16px 20px;
    gap: 14px;
`;

const Info = styled.div`
    flex-shrink: 0;
`;

const Heading = styled.h1`
    margin: 0 0 4px;
    font-size: 17px;
    font-weight: 700;
    color: ${INK};
`;

const Sub = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${MUTED};
    line-height: 1.5;
`;

const PadFrame = styled.div`
    flex: 1;
    min-height: 0;
    position: relative;
    border-radius: 16px;
    background: ${CARD};
    border: 2px dashed #b9bfcc;
    overflow: hidden;
    touch-action: none;
`;

const StyledCanvas = styled.canvas`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    touch-action: none;
    cursor: crosshair;
`;

const Baseline = styled.div`
    position: absolute;
    left: 8%;
    right: 8%;
    bottom: 18%;
    border-bottom: 1.5px solid #c6ccd8;
    pointer-events: none;
`;

const PadHint = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    bottom: 6%;
    text-align: center;
    color: #9aa1b0;
    font-size: 13px;
    pointer-events: none;
`;

const BtnRow = styled.div`
    display: flex;
    gap: 10px;
    flex-shrink: 0;
`;

const Btn = styled.button<{ $primary?: boolean }>`
    flex: 1;
    padding: 14px 16px;
    border-radius: 12px;
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
        background: ${CARD};
        color: ${MUTED};
        border-color: ${BORDER};
        &:hover { background: #f8fafc; }
        &:disabled { opacity: .5; cursor: not-allowed; }
    `}
`;

const CenteredPage = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background: ${BG};
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px 40px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const CenteredLogo = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${INK};
    letter-spacing: -0.3px;
    margin-bottom: 24px;
    align-self: flex-start;
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
    const canvasRef = useRef<CanvasHandle>(null);

    const [pageState, setPageState] = useState<PageState>('loading');
    const [inkPx, setInkPx] = useState(0);

    // Block scroll gestures while drawing: palm resting outside the canvas
    // must not pan the page (mirrors the tablet app's global touchmove guard)
    useEffect(() => {
        const block = (e: TouchEvent) => e.preventDefault();
        document.addEventListener('touchmove', block, { passive: false });
        return () => document.removeEventListener('touchmove', block);
    }, []);

    useEffect(() => {
        if (!token) { setPageState('expired'); return; }
        apiClient.get<{ status: string }>(`/public/user-signature/${token}`)
            .then(res => {
                setPageState(res.data.status === 'PENDING' ? 'ready' : 'expired');
            })
            .catch(() => setPageState('error'));
    }, [token]);

    const handleSave = async () => {
        const base64 = canvasRef.current?.exportPngBase64();
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
        canvasRef.current?.clear();
        setInkPx(0);
    };

    if (pageState === 'loading') return null;

    if (pageState === 'done') {
        return (
            <CenteredPage>
                <CenteredLogo>AutoCRM</CenteredLogo>
                <StatusCard $ok>
                    <StatusIcon $ok><CheckIcon /></StatusIcon>
                    <StatusTitle $ok>Podpis zapisany!</StatusTitle>
                    <StatusDesc>Twój podpis został pomyślnie skonfigurowany.<br />Możesz zamknąć tę stronę.</StatusDesc>
                </StatusCard>
            </CenteredPage>
        );
    }

    if (pageState === 'expired') {
        return (
            <CenteredPage>
                <CenteredLogo>AutoCRM</CenteredLogo>
                <StatusCard>
                    <StatusIcon><XIcon /></StatusIcon>
                    <StatusTitle>Link wygasł</StatusTitle>
                    <StatusDesc>Ten link był ważny przez 30 minut. Wróć do ustawień i wyślij nowy link na telefon.</StatusDesc>
                </StatusCard>
            </CenteredPage>
        );
    }

    if (pageState === 'error') {
        return (
            <CenteredPage>
                <CenteredLogo>AutoCRM</CenteredLogo>
                <StatusCard>
                    <StatusIcon><XIcon /></StatusIcon>
                    <StatusTitle>Błąd</StatusTitle>
                    <StatusDesc>Nie udało się zapisać podpisu. Zamknij tę stronę i spróbuj ponownie.</StatusDesc>
                </StatusCard>
            </CenteredPage>
        );
    }

    return (
        <Page>
            <TopBar>
                <Logo>AutoCRM</Logo>
            </TopBar>

            <Content>
                <Info>
                    <Heading>Twój podpis</Heading>
                    <Sub>
                        Narysuj podpis palcem lub rysikiem w polu poniżej.
                        Zostanie on przypisany do Twojego konta i nakładany na protokoły przyjęcia pojazdu.
                    </Sub>
                </Info>

                <PadFrame>
                    <PhoneCanvas ref={canvasRef} onInkChange={setInkPx} />
                    <Baseline />
                    {inkPx === 0 && <PadHint>Podpisz się palcem lub rysikiem</PadHint>}
                </PadFrame>

                <BtnRow>
                    <Btn
                        $primary
                        onClick={handleSave}
                        disabled={inkPx < MIN_INK_PX || pageState === 'submitting'}
                    >
                        {pageState === 'submitting' ? 'Zapisywanie...' : 'Zapisz podpis'}
                    </Btn>
                    <Btn onClick={handleClear} disabled={pageState === 'submitting'}>
                        Wyczyść
                    </Btn>
                </BtnRow>
            </Content>
        </Page>
    );
}
