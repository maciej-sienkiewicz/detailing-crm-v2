import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/modules/profile/api/profileApi';
import { SignatureConfigCard } from '@/modules/employees/components/SignatureConfigCard';
import styled from 'styled-components';

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

export function MySignatureSection() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['profile', 'signature'],
        queryFn: () => profileApi.getSignature(),
        staleTime: 30_000,
    });

    if (isLoading) return <Spinner />;

    return (
        <SignatureConfigCard
            hasSignature={data?.hasSignature ?? false}
            initialPreviewUrl={data?.url ?? null}
            onSave={(base64) => profileApi.saveSignature(base64)}
            onDelete={() => profileApi.deleteSignature()}
            onChanged={() => refetch()}
        />
    );
}
