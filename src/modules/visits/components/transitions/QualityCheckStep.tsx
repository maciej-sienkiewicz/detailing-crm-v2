import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Check } from 'lucide-react';
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

interface QualityCheckStepProps {
    onAllCheckedChange: (allChecked: boolean) => void;
}

const defaultChecks: QualityCheckItem[] = [
    { id: 'scope',     label: 'Zgodność z zakresem zlecenia', checked: true },
    { id: 'quality',   label: 'Jakość wykonania usług',       checked: true },
    { id: 'condition', label: 'Stan techniczny pojazdu',      checked: true },
];

export const QualityCheckStep = ({ onAllCheckedChange }: QualityCheckStepProps) => {
    const [checks, setChecks] = useState<QualityCheckItem[]>(defaultChecks);

    const toggle = (id: string) =>
        setChecks(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));

    const allChecked = checks.every(c => c.checked);

    useEffect(() => {
        onAllCheckedChange(allChecked);
    }, [allChecked, onAllCheckedChange]);

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
        </Container>
    );
};
