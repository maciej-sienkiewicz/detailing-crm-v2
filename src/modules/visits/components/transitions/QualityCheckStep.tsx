import { useState } from 'react';
import styled from 'styled-components';
import { XCircle, Check, CheckCircle2 } from 'lucide-react';
import type { QualityCheckItem } from '../../hooks/useStateTransition';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ModalSectionTitle } from '@/common/components/ModalKit';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ChecklistItems = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ChecklistItem = styled.label<{ $checked: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${p => p.$checked ? st.accentGreenDim : st.bgCard};
    border: 1px solid ${p => p.$checked ? 'rgba(16,185,129,0.3)' : st.border};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    transition: all 140ms ease;

    &:hover {
        border-color: ${p => p.$checked ? 'rgba(16,185,129,0.5)' : st.accentBlue};
        background: ${p => p.$checked ? st.accentGreenDim : st.accentBlueDim};
    }
`;

const Checkbox = styled.input`
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    cursor: pointer;
    accent-color: ${st.accentGreen};
`;

const CheckLabel = styled.span<{ $checked: boolean }>`
    font-size: ${st.fontSm};
    color: ${p => p.$checked ? st.accentGreen : st.text};
    font-weight: ${p => p.$checked ? '600' : '400'};
    flex: 1;
    transition: color 140ms ease;
`;

const CheckMark = styled(Check)<{ $visible: boolean }>`
    width: 14px;
    height: 14px;
    color: ${st.accentGreen};
    opacity: ${p => p.$visible ? 1 : 0};
    transition: opacity 140ms ease;
    flex-shrink: 0;
`;

const Divider = styled.div`
    height: 1px;
    background: ${st.border};
`;

const ActionRow = styled.div`
    display: flex;
    gap: 8px;
`;

const RejectBtn = styled.button`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    background: transparent;
    color: ${st.accentRed};
    border: 1px solid ${st.accentRed}66;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: rgba(220,38,38,0.06);
        border-color: ${st.accentRed};
    }

    svg { width: 14px; height: 14px; }
`;

const ApproveBtn = styled.button`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    background: ${st.accentGreen};
    color: white;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: ${st.shadowXs};

    &:hover:not(:disabled) {
        background: #059669;
        box-shadow: ${st.shadowSm};
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }

    svg { width: 14px; height: 14px; }
`;

interface QualityCheckStepProps {
    onApprove: () => void;
    onReject: () => void;
}

const defaultChecks: QualityCheckItem[] = [
    { id: 'scope',     label: 'Zgodność z zakresem zlecenia', checked: true },
    { id: 'quality',   label: 'Jakość wykonania usług',       checked: true },
    { id: 'condition', label: 'Stan techniczny pojazdu',      checked: true },
];

export const QualityCheckStep = ({ onApprove, onReject }: QualityCheckStepProps) => {
    const [checks, setChecks] = useState<QualityCheckItem[]>(defaultChecks);

    const toggle = (id: string) =>
        setChecks(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));

    const allChecked = checks.every(c => c.checked);

    return (
        <Container>
            <ModalSectionTitle>Lista kontrolna</ModalSectionTitle>

            <ChecklistItems>
                {checks.map(check => (
                    <ChecklistItem key={check.id} $checked={check.checked}>
                        <Checkbox
                            type="checkbox"
                            checked={check.checked}
                            onChange={() => toggle(check.id)}
                        />
                        <CheckLabel $checked={check.checked}>{check.label}</CheckLabel>
                        <CheckMark $visible={check.checked} size={14} strokeWidth={2.5} />
                    </ChecklistItem>
                ))}
            </ChecklistItems>

            <Divider />

            <ActionRow>
                <RejectBtn onClick={onReject}>
                    <XCircle size={14} />
                    Wymaga poprawek
                </RejectBtn>
                <ApproveBtn onClick={onApprove} disabled={!allChecked}>
                    <CheckCircle2 size={14} />
                    Zatwierdź jakość
                </ApproveBtn>
            </ActionRow>
        </Container>
    );
};
