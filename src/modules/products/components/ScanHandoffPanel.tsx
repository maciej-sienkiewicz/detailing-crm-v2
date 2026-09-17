import { useEffect } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Loader2 } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useScanHandoff } from '../hooks/useScanHandoff';

// „Skanuj telefonem" — komputer pokazuje kod QR, telefon otwiera aparat, a wykryte kody
// wracają na żywo. Dokładnie model mapy uszkodzeń (DamageMapQrPanel). Ten panel tylko
// POKAZUJE sesję i oddaje kody rodzicowi przez onCodes.

const Wrap = styled.div` display: flex; flex-direction: column; gap: 14px; `;
const Row = styled.div`
    display: flex; gap: 16px; align-items: center;
    @media (max-width: 520px) { flex-direction: column; text-align: center; }
`;
const QrBox = styled.div`
    flex-shrink: 0; width: 156px; height: 156px;
    display: flex; align-items: center; justify-content: center;
    padding: 10px; background: #fff; border: 1px solid ${st.border}; border-radius: 12px;
`;
const Texts = styled.div` min-width: 0; display: flex; flex-direction: column; gap: 6px; `;
const Title = styled.p` margin: 0; font-size: 14px; font-weight: 700; color: ${st.text}; `;
const Sub = styled.p` margin: 0; font-size: 12.5px; line-height: 1.55; color: ${st.textSecondary}; `;
const CodeList = styled.div` display: flex; flex-direction: column; gap: 6px; `;
const CodeRow = styled.div`
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    background: ${st.bgAccentGreen}; font-size: 13px; color: ${st.text};
    svg { color: ${st.accentGreen}; }
`;
const Waiting = styled.div` display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: ${st.textMuted}; svg { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } } `;

interface Props {
    onCodes: (codes: string[]) => void;
}

export function ScanHandoffPanel({ onCodes }: Props) {
    const { session, codes, starting, start, reset } = useScanHandoff();

    useEffect(() => { start(); return () => reset(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (codes.length) onCodes(codes); }, [codes, onCodes]);

    const url = session ? `${window.location.origin}${session.handoffPath}` : '';

    return (
        <Wrap>
            <Row>
                <QrBox>
                    {session
                        ? <QRCodeSVG value={url} size={136} />
                        : <Waiting><Loader2 size={18} /> Przygotowuję…</Waiting>}
                </QrBox>
                <Texts>
                    <Title>Zeskanuj telefonem</Title>
                    <Sub>
                        Zeskanuj ten kod aparatem telefonu. Na telefonie otworzy się aparat —
                        skieruj go na kod kreskowy produktu, a dane wrócą tutaj.
                    </Sub>
                    {starting && <Waiting><Loader2 size={16} /> Łączę sesję…</Waiting>}
                </Texts>
            </Row>
            {codes.length > 0 && (
                <CodeList>
                    {codes.map(c => (
                        <CodeRow key={c}><Check size={15} /> {c}</CodeRow>
                    ))}
                </CodeList>
            )}
        </Wrap>
    );
}
