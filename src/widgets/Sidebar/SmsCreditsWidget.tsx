import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useSmsCredits } from '@/modules/settings/hooks/useSmsCredits';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Widget = styled.button<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: calc(100% - 16px);
    margin: 0 8px 8px;
    padding: ${p => p.$isCollapsed ? '10px' : '10px 12px'};
    justify-content: ${p => p.$isCollapsed ? 'center' : 'flex-start'};
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    cursor: pointer;
    transition: background 160ms, border-color 160ms;
    font-family: inherit;
    text-align: left;
    flex-shrink: 0;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.13);
    }
`;

const IconWrap = styled.div<{ $empty: boolean }>`
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: ${p => p.$empty ? 'rgba(239,68,68,0.15)' : 'rgba(14,165,233,0.15)'};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${p => p.$empty ? '#f87171' : '#38bdf8'};
`;

const TextWrap = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    min-width: 0;
    overflow: hidden;

    @media (min-width: 768px) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '160px'};
        transition: opacity 200ms ease, max-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

const Label = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    white-space: nowrap;
`;

const Value = styled.div<{ $empty: boolean }>`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.$empty ? '#f87171' : '#f1f5f9'};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
`;

// ─── Icon ─────────────────────────────────────────────────────────────────────

const SmsIcon = () => (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    isCollapsed: boolean;
}

export const SmsCreditsWidget = ({ isCollapsed }: Props) => {
    const navigate = useNavigate();
    const { balance } = useSmsCredits();

    if (balance === undefined) return null;

    const isEmpty = balance.smsCredits === 0;

    return (
        <Widget
            $isCollapsed={isCollapsed}
            onClick={() => navigate('/settings?tab=credits')}
            title="Przejdź do zarządzania kredytami SMS"
        >
            <IconWrap $empty={isEmpty}>
                <SmsIcon />
            </IconWrap>
            <TextWrap $isCollapsed={isCollapsed}>
                <Label>Kredyty SMS</Label>
                <Value $empty={isEmpty}>
                    {isEmpty ? 'Uzupełnij pakiet' : `${balance.smsCredits.toLocaleString('pl-PL')} szt.`}
                </Value>
            </TextWrap>
        </Widget>
    );
};
