// src/modules/push/components/PushDeviceList.tsx
//
// Lista urządzeń sparowanych z kontem, wspólna dla /call-device i Ustawień.
//
// „Odłącz" działało od jednego kliknięcia, bez pytania - obok tabletów i kontaktów
// jedyna nieodwracalna akcja w tej sekcji bez potwierdzenia (odłączone urządzenie
// trzeba parować od nowa, na nim samym). Teraz pyta ConfirmationModal.

import { useState } from 'react';
import styled from 'styled-components';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, ui } from '@/common/components/ui';
import type { PushDeviceDto } from '../types';

/*
 * 4xx pokazuje już globalny interceptor (src/core/apiClient.ts) z powodem od serwera -
 * drugi dymek o tym samym to szum. 5xx i brak sieci przechodzą bez słowa, więc te
 * zgłaszamy sami.
 */
const toastedGlobally = (error: unknown): boolean => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return status !== undefined && status >= 400 && status < 500;
};

interface Props {
    devices: PushDeviceDto[];
    onRevoke: (deviceId: string) => Promise<void>;
}

const formatWhen = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'jeszcze nie użyto';

export function PushDeviceList({ devices, onRevoke }: Props) {
    const { showError, showSuccess } = useToast();
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [toRevoke, setToRevoke] = useState<PushDeviceDto | null>(null);

    if (devices.length === 0) return null;

    const handleRevoke = async (device: PushDeviceDto) => {
        setRevokingId(device.id);
        try {
            await onRevoke(device.id);
            showSuccess('Urządzenie odłączone', `„${device.deviceName}” nie będzie już dostawać powiadomień.`);
        } catch (error) {
            if (!toastedGlobally(error)) showError('Nie udało się odłączyć', 'Spróbuj ponownie.');
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <>
            <Card>
                {devices.map(device => (
                    <Row key={device.id} $revoked={!device.active}>
                        <Info>
                            <p>{device.deviceName}{!device.active && ' (odłączone)'}</p>
                            <p>Ostatnio: {formatWhen(device.lastUsedAt)}</p>
                        </Info>
                        {device.active && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setToRevoke(device)}
                                disabled={revokingId === device.id}
                            >
                                {revokingId === device.id ? 'Odłączam…' : 'Odłącz'}
                            </Button>
                        )}
                    </Row>
                ))}
            </Card>

            <ConfirmationModal
                isOpen={toRevoke !== null}
                title="Odłączyć urządzenie?"
                message={toRevoke
                    ? `„${toRevoke.deviceName}” przestanie dostawać powiadomienia z CRM. Żeby je przywrócić, trzeba je włączyć od nowa na tym urządzeniu.`
                    : ''}
                variant="danger"
                confirmText="Odłącz"
                cancelText="Anuluj"
                onConfirm={() => { if (toRevoke) void handleRevoke(toRevoke); }}
                onCancel={() => setToRevoke(null)}
            />
        </>
    );
}

const Card = styled.div`
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
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

    @media (max-width: 767px) { padding: 12px 16px; }
`;

const Info = styled.div`
    flex: 1;
    min-width: 0;

    p { margin: 0; }
    p:first-child { font-size: 13px; font-weight: 600; color: #0f172a; }
    p:last-child { font-size: 12px; color: #94a3b8; }
`;
