import { useState } from 'react';
import styled from 'styled-components';
import { ClearAccountModal } from './ClearAccountModal';

const Card = styled.div`
    background: #fff;
    border: 1px solid rgba(239, 68, 68, 0.35);
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
    color: #dc2626;
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
`;

const OutlineDangerBtn = styled.button`
    padding: 8px 18px;
    background: #fff;
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;

    &:hover { background: rgba(239, 68, 68, 0.05); border-color: #ef4444; }
`;

/**
 * Strefa niebezpieczna konta, widoczna wyłącznie dla ownera (gating w SecuritySection).
 * Sam przycisk niczego nie robi: pełne potwierdzenie (skutki, przepisanie nazwy firmy,
 * hasło) zbiera ClearAccountModal.
 */
export const DangerZoneCard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <Card>
            <CardTitle>Strefa niebezpieczna</CardTitle>
            <CardDesc>
                Wyczyszczenie konta usuwa bezpowrotnie wszystkich klientów, wizyty, pliki
                i dokumenty oraz przywraca ustawienia domyślne. Konto wraca do stanu
                jak po rejestracji. Zostają: Twoje konto, plan subskrypcji i saldo SMS.
            </CardDesc>
            <Row>
                <OutlineDangerBtn onClick={() => setIsModalOpen(true)}>
                    Wyczyść konto…
                </OutlineDangerBtn>
            </Row>
            <ClearAccountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </Card>
    );
};
