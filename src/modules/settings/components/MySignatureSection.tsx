import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { employeeApi } from '@/modules/employees/api/employeeApi';
import { SignatureConfigCard } from '@/modules/employees/components/SignatureConfigCard';

// ─── Styled ──────────────────────────────────────────────────────────────────

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 32px auto;

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const NoEmployeeCard = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 28px 24px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
`;

const InfoIconWrap = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: #f1f5f9;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 18px; height: 18px; }
`;

const InfoBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const InfoTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #334155;
`;

const InfoDesc = styled.div`
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.5;
`;

const InfoCircleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

// ─── Component ───────────────────────────────────────────────────────────────

export function MySignatureSection() {
    const { data: employee, isLoading, refetch } = useQuery({
        queryKey: ['employees', 'me'],
        queryFn: () => employeeApi.getMyEmployee(),
        staleTime: 30_000,
    });

    if (isLoading) return <Spinner />;

    if (!employee) {
        return (
            <NoEmployeeCard>
                <InfoIconWrap><InfoCircleIcon /></InfoIconWrap>
                <InfoBody>
                    <InfoTitle>Brak karty pracownika</InfoTitle>
                    <InfoDesc>
                        Twoje konto nie jest powiązane z kartą pracownika.
                        Skontaktuj się z administratorem, aby ustawić podpis.
                    </InfoDesc>
                </InfoBody>
            </NoEmployeeCard>
        );
    }

    return (
        <SignatureConfigCard
            employeeId={employee.id}
            hasSignature={employee.hasSignature}
            onChanged={() => refetch()}
        />
    );
}
