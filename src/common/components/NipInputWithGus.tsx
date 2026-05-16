import { useState } from 'react';
import styled from 'styled-components';
import { Building2 } from 'lucide-react';
import { gusApi, type CompanyInfoResponse } from '@/modules/gus/api/gusApi';
import { InputShell, BareInput, FormErrorMsg } from '@/common/components/Form';

export type { CompanyInfoResponse };

const GusBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    height: 100%;
    border: none;
    border-left: 1px solid #e2e8f0;
    background: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--brand-primary);
    cursor: pointer;
    white-space: nowrap;
    border-radius: 0 10px 10px 0;
    transition: background 0.15s ease;
    flex-shrink: 0;

    &:hover:not(:disabled) {
        background: #f0f9ff;
    }

    &:disabled {
        color: #94a3b8;
        cursor: not-allowed;
    }
`;

interface NipInputWithGusProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    onFetch: (data: CompanyInfoResponse) => void;
    hasError?: boolean;
    placeholder?: string;
}

export const NipInputWithGus = ({
    id,
    value,
    onChange,
    onFetch,
    hasError,
    placeholder,
}: NipInputWithGusProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [gusError, setGusError] = useState<string | null>(null);

    const handleFetch = async () => {
        const nip = value.replace(/[\s-]/g, '');
        if (!nip) return;

        setIsLoading(true);
        setGusError(null);

        try {
            const data = await gusApi.getCompanyByNip(nip);
            onFetch(data);
        } catch {
            setGusError('Nie udało się pobrać danych z GUS. Sprawdź NIP i spróbuj ponownie.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <InputShell $hasError={hasError}>
                <BareInput
                    id={id}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="new-password"
                />
                <GusBtn
                    type="button"
                    onClick={handleFetch}
                    disabled={isLoading}
                    title="Pobierz dane firmy z GUS"
                >
                    <Building2 size={13} />
                    {isLoading ? 'Pobieranie…' : 'Pobierz z GUS'}
                </GusBtn>
            </InputShell>
            {gusError && <FormErrorMsg>{gusError}</FormErrorMsg>}
        </>
    );
};
