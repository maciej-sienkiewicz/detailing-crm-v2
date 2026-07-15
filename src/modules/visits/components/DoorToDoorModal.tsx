import { useState } from 'react';
import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { DoorToDoorInfo } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const Input = styled.input`
    padding: 8px 11px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    background: #fff;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const TextArea = styled.textarea`
    padding: 8px 11px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    resize: none;
    height: 64px;
    font-family: inherit;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    background: #fff;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #0ea5e9;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #f1f5f9;
    margin: 4px 0;
`;

const ReadonlyRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 11px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #475569;
    grid-column: 1 / -1;
`;

const ReadonlyLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    white-space: nowrap;
    flex-shrink: 0;
`;

const ReadonlyValue = styled.span`
    color: #0f172a;
    font-weight: 500;
`;

// ─── Confirm phase ────────────────────────────────────────────────────────────

const ConfirmBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const AddressCard = styled.div`
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const CardLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 5px;
    svg { width: 11px; height: 11px; }
`;

const CardValue = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const NavButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 20px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid #0ea5e9;
    background: #0ea5e9;
    color: #fff;
    transition: all 160ms ease;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    svg { width: 17px; height: 17px; }

    &:hover {
        background: #0284c7;
        border-color: #0284c7;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.38);
        transform: translateY(-1px);
    }
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

    if (!isOpen) return null;

    const update = (patch: Partial<DoorToDoorInfo>) => setData(d => ({ ...d, ...patch }));

    const handleConfirmForm = () => {
        onConfirm({ ...data, enabled: true });
        setPhase('confirm');
    };

    const pickupDisplay = [data.pickupAddress.street, data.pickupAddress.city].filter(Boolean).join(', ') || '—';

    if (phase === 'confirm') {
        return (
            <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Door to Door — dostarczenie</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>
                <ModalContent>
                    <ConfirmBody>
                        <AddressCard>
                            <CardLabel>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="10" r="3" />
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                </svg>
                                Odbiór
                            </CardLabel>
                            <CardValue>{pickupDisplay}</CardValue>
                        </AddressCard>

                        <AddressCard>
                            <CardLabel>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                Dostarczenie
                            </CardLabel>
                            <CardValue>
                                {[data.deliveryAddress.street, data.deliveryAddress.city].filter(Boolean).join(', ') || '—'}
                            </CardValue>
                        </AddressCard>

                        {data.notes && (
                            <AddressCard>
                                <CardLabel>Uwagi</CardLabel>
                                <CardValue style={{ fontWeight: 400, fontSize: 13 }}>{data.notes}</CardValue>
                            </AddressCard>
                        )}

                        <NavButton
                            onClick={() => {
                                const addr = `${data.deliveryAddress.street}, ${data.deliveryAddress.city}`;
                                window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank');
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="3 11 22 2 13 21 11 13 3 11" />
                            </svg>
                            Prowadź
                        </NavButton>
                    </ConfirmBody>
                </ModalContent>
            </ModalShell>
        );
    }

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Door to Door — dostarczenie pojazdu</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Section>
                    <div>
                        <SectionHeader>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="10" r="3" />
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            </svg>
                            Miejsce odbioru
                        </SectionHeader>
                        <TwoCol>
                            <ReadonlyRow style={{ gridColumn: '1 / -1' }}>
                                <ReadonlyLabel>Adres:</ReadonlyLabel>
                                <ReadonlyValue>{pickupDisplay}</ReadonlyValue>
                            </ReadonlyRow>
                        </TwoCol>
                    </div>

                    <Divider />

                    <div>
                        <SectionHeader>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Miejsce dostarczenia
                        </SectionHeader>
                        <TwoCol>
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
                        </TwoCol>
                    </div>

                    <FieldGroup>
                        <Label>Uwagi</Label>
                        <TextArea
                            value={data.notes}
                            onChange={e => update({ notes: e.target.value })}
                            placeholder="Dodatkowe informacje..."
                        />
                    </FieldGroup>
                </Section>
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
