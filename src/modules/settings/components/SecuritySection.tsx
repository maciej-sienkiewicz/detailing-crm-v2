import { useState } from 'react';
import styled from 'styled-components';
import { PinSetupSection } from '@/modules/pin-switcher';
import { useAuth } from '@/core/context/AuthContext';
import { useIdleTimeoutSetting, useSetIdleTimeout } from '../hooks/useIdleTimeout';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const SectionHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
`;

const SectionDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
`;

const Card = styled.div`
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const CardDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const Select = styled.select`
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    background: #fff;
    cursor: pointer;
    min-width: 160px;

    &:focus { outline: none; border-color: #6366f1; }
`;

const SaveBtn = styled.button<{ $loading?: boolean }>`
    padding: 8px 18px;
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    opacity: ${({ $loading }) => ($loading ? 0.7 : 1)};
    transition: opacity 150ms, background 150ms;

    &:hover:not(:disabled) { background: #4f46e5; }
    &:disabled { cursor: not-allowed; }
`;

const SavedMsg = styled.span`
    font-size: 13px;
    color: #16a34a;
    font-weight: 500;
`;

const TIMEOUT_OPTIONS = [
    { label: 'Wyłączone', value: 0 },
    { label: '5 minut', value: 5 },
    { label: '10 minut', value: 10 },
    { label: '15 minut', value: 15 },
    { label: '30 minut', value: 30 },
    { label: '60 minut', value: 60 },
];

const IdleTimeoutCard = () => {
    const { data, isLoading } = useIdleTimeoutSetting();
    const { mutate, isPending } = useSetIdleTimeout();
    const [value, setValue] = useState<number | null>(null);
    const [saved, setSaved] = useState(false);

    const current = value ?? data?.idleTimeoutMinutes ?? 0;

    const handleSave = () => {
        mutate(current, {
            onSuccess: () => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            },
        });
    };

    if (isLoading) return null;

    return (
        <Card>
            <CardTitle>Automatyczne blokowanie sesji</CardTitle>
            <CardDesc>
                Jeśli użytkownik nie wykona żadnej akcji przez wybrany czas, aplikacja wyświetli ekran
                blokady i zażąda kodu PIN lub hasła przed wznowieniem. Ustawienie dotyczy wszystkich
                kont w ramach Twojego studia.
            </CardDesc>
            <Row>
                <Select
                    value={current}
                    onChange={e => { setValue(Number(e.target.value)); setSaved(false); }}
                >
                    {TIMEOUT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </Select>
                <SaveBtn onClick={handleSave} disabled={isPending} $loading={isPending}>
                    {isPending ? 'Zapisywanie…' : 'Zapisz'}
                </SaveBtn>
                {saved && <SavedMsg>Zapisano</SavedMsg>}
            </Row>
        </Card>
    );
};

export const SecuritySection = () => {
    const { user } = useAuth();
    const isOwner = user?.role?.toLowerCase() === 'owner';

    return (
        <Wrap>
            <SectionHeader>
                <SectionTitle>Bezpieczeństwo</SectionTitle>
                <SectionDesc>Zarządzaj ustawieniami bezpieczeństwa konta.</SectionDesc>
            </SectionHeader>
            <PinSetupSection />
            {isOwner && <IdleTimeoutCard />}
        </Wrap>
    );
};
