import { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SignaturePad, type SignaturePadHandle } from '@/modules/public-signing/components/SignaturePad';
import { employeeApi } from '../api/employeeApi';
import { useToast } from '@/common/components/Toast';

// ─── Styled ──────────────────────────────────────────────────────────────────

const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid ${st.border};
`;

const Title = styled.h3`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: ${st.text};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const TitleIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: rgba(14, 165, 233, 0.1);
    color: #0284c7;
    svg { width: 14px; height: 14px; }
`;

const Body = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const StatusBadge = styled.div<{ $hasSignature: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    background: ${({ $hasSignature }) => $hasSignature ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)'};
    color: ${({ $hasSignature }) => $hasSignature ? '#059669' : st.textMuted};
`;

const Dot = styled.span<{ $color: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
`;

const SignaturePreview = styled.div`
    border: 1px solid ${st.border};
    border-radius: 10px;
    overflow: hidden;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
`;

const SignatureImage = styled.img`
    max-width: 100%;
    max-height: 140px;
    object-fit: contain;
    padding: 12px;
`;

const Description = styled.p`
    margin: 0;
    font-size: 12px;
    color: ${st.textMuted};
    line-height: 1.5;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;
    white-space: nowrap;
    border: 1px solid;

    ${({ $variant = 'ghost' }) => {
        if ($variant === 'primary') return `
            background: #0ea5e9;
            color: white;
            border-color: #0ea5e9;
            &:hover { background: #0284c7; border-color: #0284c7; }
            &:disabled { opacity: 0.5; cursor: not-allowed; }
        `;
        if ($variant === 'danger') return `
            background: transparent;
            color: #ef4444;
            border-color: #fecaca;
            &:hover { background: #fef2f2; }
            &:disabled { opacity: 0.5; cursor: not-allowed; }
        `;
        return `
            background: transparent;
            color: ${st.textSecondary};
            border-color: ${st.border};
            &:hover { background: ${st.bgCardAlt}; }
            &:disabled { opacity: 0.5; cursor: not-allowed; }
        `;
    }}
`;

const PadSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: ${st.bgCardAlt};
    border-radius: 10px;
    border: 1px solid ${st.border};
`;

const PadLabel = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${st.text};
`;

// ─── Icons ───────────────────────────────────────────────────────────────────

const PenIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

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

// ─── Component ───────────────────────────────────────────────────────────────

interface SignatureConfigCardProps {
    employeeId: string;
    hasSignature: boolean;
    onChanged: () => void;
}

export function SignatureConfigCard({ employeeId, hasSignature, onChanged }: SignatureConfigCardProps) {
    const { showSuccess, showError } = useToast();
    const padRef = useRef<SignaturePadHandle>(null);

    const [mode, setMode] = useState<'view' | 'draw'>('view');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasStrokes, setHasStrokes] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        if (hasSignature && mode === 'view') {
            setPreviewLoading(true);
            employeeApi.getSignatureUrl(employeeId)
                .then(url => setPreviewUrl(url))
                .catch(() => setPreviewUrl(null))
                .finally(() => setPreviewLoading(false));
        }
    }, [employeeId, hasSignature, mode]);

    const handleSave = async () => {
        const base64 = padRef.current?.toPngBase64();
        if (!base64) {
            showError('Podpis jest pusty', 'Narysuj podpis przed zapisaniem.');
            return;
        }
        setIsSaving(true);
        try {
            await employeeApi.saveSignature(employeeId, base64);
            showSuccess('Podpis zapisany', 'Podpis pracownika został zaktualizowany.');
            setMode('view');
            padRef.current?.clear();
            onChanged();
        } catch {
            showError('Błąd', 'Nie udało się zapisać podpisu. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await employeeApi.deleteSignature(employeeId);
            showSuccess('Podpis usunięty');
            setPreviewUrl(null);
            onChanged();
        } catch {
            showError('Błąd', 'Nie udało się usunąć podpisu.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancel = () => {
        setMode('view');
        padRef.current?.clear();
        setHasStrokes(false);
    };

    return (
        <Card>
            <Header>
                <Title>
                    <TitleIcon><PenIcon /></TitleIcon>
                    Podpis pracownika
                </Title>
                <StatusBadge $hasSignature={hasSignature}>
                    <Dot $color={hasSignature ? '#10b981' : '#94a3b8'} />
                    {hasSignature ? 'Skonfigurowany' : 'Brak podpisu'}
                </StatusBadge>
            </Header>

            <Body>
                <Description>
                    Podpis pracownika nakładany jest na protokoły generowane podczas wizyty.
                    Narysuj podpis palcem lub rysikiem na poniższym polu.
                </Description>

                {mode === 'view' && (
                    <>
                        {hasSignature && (
                            <SignaturePreview>
                                {previewLoading ? (
                                    <Description>Ładowanie…</Description>
                                ) : previewUrl ? (
                                    <SignatureImage
                                        src={previewUrl}
                                        alt="Podgląd podpisu pracownika"
                                        onError={() => setPreviewUrl(null)}
                                    />
                                ) : (
                                    <Description>Nie można załadować podglądu.</Description>
                                )}
                            </SignaturePreview>
                        )}

                        <ButtonRow>
                            <Btn $variant="primary" onClick={() => setMode('draw')}>
                                <PenIcon />
                                {hasSignature ? 'Zmień podpis' : 'Dodaj podpis'}
                            </Btn>
                            {hasSignature && (
                                <Btn
                                    $variant="danger"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <TrashIcon />
                                    {isDeleting ? 'Usuwanie…' : 'Usuń podpis'}
                                </Btn>
                            )}
                        </ButtonRow>
                    </>
                )}

                {mode === 'draw' && (
                    <PadSection>
                        <PadLabel>Narysuj podpis:</PadLabel>
                        <SignaturePad ref={padRef} onStrokeChange={setHasStrokes} />
                        <ButtonRow>
                            <Btn
                                $variant="primary"
                                onClick={handleSave}
                                disabled={isSaving || !hasStrokes}
                            >
                                <CheckIcon />
                                {isSaving ? 'Zapisywanie…' : 'Zapisz podpis'}
                            </Btn>
                            <Btn $variant="ghost" onClick={handleCancel} disabled={isSaving}>
                                <XIcon />
                                Anuluj
                            </Btn>
                        </ButtonRow>
                    </PadSection>
                )}
            </Body>
        </Card>
    );
}
