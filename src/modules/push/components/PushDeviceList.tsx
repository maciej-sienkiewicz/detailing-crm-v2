// src/modules/push/components/PushDeviceList.tsx
//
// Lista urządzeń sparowanych z kontem, wspólna dla /call-device i Ustawień.

import { useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import type { PushDeviceDto } from '../types';

interface Props {
    devices: PushDeviceDto[];
    onRevoke: (deviceId: string) => Promise<void>;
}

const formatWhen = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'jeszcze nie użyto';

export function PushDeviceList({ devices, onRevoke }: Props) {
    const { showError, showSuccess } = useToast();
    const [revokingId, setRevokingId] = useState<string | null>(null);

    if (devices.length === 0) return null;

    const handleRevoke = async (deviceId: string) => {
        setRevokingId(deviceId);
        try {
            await onRevoke(deviceId);
            showSuccess('Urządzenie odłączone', 'Nie będzie już dostawać powiadomień.');
        } catch {
            showError('Nie udało się odłączyć', 'Spróbuj ponownie.');
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <Card>
            {devices.map(device => (
                <Row key={device.id} $revoked={!device.active}>
                    <Info>
                        <p>{device.deviceName}{!device.active && ' (odłączone)'}</p>
                        <p>ostatnio: {formatWhen(device.lastUsedAt)}</p>
                    </Info>
                    {device.active && (
                        <RevokeBtn
                            type="button"
                            onClick={() => handleRevoke(device.id)}
                            disabled={revokingId === device.id}
                        >
                            {revokingId === device.id ? 'Odłączam…' : 'Odłącz'}
                        </RevokeBtn>
                    )}
                </Row>
            ))}
        </Card>
    );
}

const Card = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
`;

const Row = styled.div<{ $revoked?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid #f1f5f9;
    opacity: ${p => (p.$revoked ? 0.5 : 1)};

    &:last-child { border-bottom: none; }

    @media (max-width: 600px) { padding: 12px 14px; }
`;

const Info = styled.div`
    flex: 1;
    min-width: 0;

    p { margin: 0; }
    p:first-child { font-size: 13px; font-weight: 600; color: #0f172a; }
    p:last-child { font-size: 12px; color: #94a3b8; }
`;

const RevokeBtn = styled.button`
    padding: 5px 11px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.3); color: #dc2626; }
    &:disabled { opacity: 0.5; cursor: default; }
`;
