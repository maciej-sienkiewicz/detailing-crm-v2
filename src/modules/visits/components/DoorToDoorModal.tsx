import { useState } from 'react';
import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { DoorToDoorInfo } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const Input = styled.input`
    padding: 9px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease;
    background: #fff;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const TextArea = styled.textarea`
    padding: 9px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    resize: vertical;
    min-height: 72px;
    font-family: inherit;
    transition: border-color 180ms ease, box-shadow 180ms ease;
    background: #fff;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const SectionLabel = styled.p`
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 700;
    color: #0ea5e9;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 6px;

    svg { width: 14px; height: 14px; }
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #f1f5f9;
    margin: 16px 0;
`;

const ConfirmContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ConfirmGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

const InfoBlock = styled.div`
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
`;

const InfoBlockLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
    svg { width: 12px; height: 12px; }
`;

const InfoBlockValue = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const ActionRow = styled.div`
    display: flex;
    gap: 12px;

    @media (max-width: 480px) {
        flex-direction: column;
    }
`;

const BigActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;
    border: 1.5px solid;

    svg { width: 18px; height: 18px; }

    ${p => p.$variant === 'primary' ? `
        background: #0ea5e9;
        color: #fff;
        border-color: #0ea5e9;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        &:hover { background: #0284c7; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); transform: translateY(-1px); }
    ` : `
        background: #fff;
        color: #0f172a;
        border-color: #e2e8f0;
        &:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
    `}
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface DoorToDoorModalProps {
    isOpen: boolean;
    initialData?: DoorToDoorInfo;
    onClose: () => void;
    onConfirm: (data: DoorToDoorInfo) => void;
}

const EMPTY: DoorToDoorInfo = {
    enabled: true,
    pickupAddress: { city: '', street: '' },
    deliveryAddress: { city: '', street: '' },
    notes: '',
};

export const DoorToDoorModal = ({ isOpen, initialData, onClose, onConfirm }: DoorToDoorModalProps) => {
    const [phase, setPhase] = useState<'form' | 'confirm'>('form');
    const [data, setData] = useState<DoorToDoorInfo>(() => initialData ?? { ...EMPTY });
    // Reset when modal opens
    if (!isOpen) return null;

    const update = (patch: Partial<DoorToDoorInfo>) => setData(d => ({ ...d, ...patch }));

    const handleConfirmForm = () => {
        onConfirm({ ...data, enabled: true });
        setPhase('confirm');
    };

    if (phase === 'confirm') {
        return (
            <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Door to Door — dalsze kroki</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>
                <ModalContent>
                    <ConfirmContent>
                        <ConfirmGrid>
                            <InfoBlock>
                                <InfoBlockLabel>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="10" r="3" />
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                    </svg>
                                    Miejsce odbioru
                                </InfoBlockLabel>
                                <InfoBlockValue>
                                    {data.pickupAddress.street || '—'}
                                    {data.pickupAddress.city && `, ${data.pickupAddress.city}`}
                                </InfoBlockValue>
                            </InfoBlock>
                            <InfoBlock>
                                <InfoBlockLabel>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    Miejsce dostarczenia
                                </InfoBlockLabel>
                                <InfoBlockValue>
                                    {data.deliveryAddress.street || '—'}
                                    {data.deliveryAddress.city && `, ${data.deliveryAddress.city}`}
                                </InfoBlockValue>
                            </InfoBlock>
                        </ConfirmGrid>
                        {data.notes && (
                            <InfoBlock>
                                <InfoBlockLabel>Uwagi</InfoBlockLabel>
                                <InfoBlockValue style={{ fontWeight: 400, fontSize: 13 }}>{data.notes}</InfoBlockValue>
                            </InfoBlock>
                        )}
                        <ActionRow>
                            <BigActionButton
                                $variant="primary"
                                onClick={() => {
                                    const addr = `${data.deliveryAddress.street}, ${data.deliveryAddress.city}`;
                                    window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank');
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                                </svg>
                                Prowadź
                            </BigActionButton>
                            <BigActionButton $variant="secondary" onClick={() => {}}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                                Podpisz
                            </BigActionButton>
                        </ActionRow>
                    </ConfirmContent>
                </ModalContent>
            </ModalShell>
        );
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Door to Door — dostarczenie pojazdu</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <SectionLabel>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="10" r="3" />
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    Miejsce odbioru
                </SectionLabel>
                <FormGrid>
                    <FieldGroup>
                        <Label>Miasto</Label>
                        <Input
                            value={data.pickupAddress.city}
                            onChange={e => update({ pickupAddress: { ...data.pickupAddress, city: e.target.value } })}
                            placeholder="np. Warszawa"
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <Label>Ulica i numer</Label>
                        <Input
                            value={data.pickupAddress.street}
                            onChange={e => update({ pickupAddress: { ...data.pickupAddress, street: e.target.value } })}
                            placeholder="np. ul. Kowalska 12"
                        />
                    </FieldGroup>
                </FormGrid>

                <Divider />

                <SectionLabel>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Miejsce dostarczenia
                </SectionLabel>
                <FormGrid>
                    <FieldGroup>
                        <Label>Miasto</Label>
                        <Input
                            value={data.deliveryAddress.city}
                            onChange={e => update({ deliveryAddress: { ...data.deliveryAddress, city: e.target.value } })}
                            placeholder="np. Warszawa"
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <Label>Ulica i numer</Label>
                        <Input
                            value={data.deliveryAddress.street}
                            onChange={e => update({ deliveryAddress: { ...data.deliveryAddress, street: e.target.value } })}
                            placeholder="np. ul. Kowalska 12"
                        />
                    </FieldGroup>
                </FormGrid>

                <Divider />

                <FieldGroup>
                    <Label>Uwagi</Label>
                    <TextArea
                        value={data.notes}
                        onChange={e => update({ notes: e.target.value })}
                        placeholder="Dodatkowe informacje dotyczące odbioru lub dostarczenia..."
                    />
                </FieldGroup>
            </ModalContent>
            <ModalFooter>
                <SharedButton $variant="secondary" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" onClick={handleConfirmForm}>
                    Potwierdź
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
