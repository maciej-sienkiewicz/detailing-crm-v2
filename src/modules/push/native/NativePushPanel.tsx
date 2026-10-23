// src/modules/push/native/NativePushPanel.tsx
//
// „Powiadomienia" w Ustawieniach, otwarte w aplikacji ze sklepu.
//
// Przeglądarkowy panel prowadzi przez kod QR, dodanie do ekranu i zgodę przeglądarki -
// w aplikacji żaden z tych kroków nie istnieje: jest jedna systemowa zgoda i jeden
// przycisk. Dlatego osobny, krótki panel zamiast gałęzi w kreatorze.

import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { App } from '@capacitor/app';
import { useToast } from '@/common/components/Toast';
import { Button, Card, SectionTitle, ui } from '@/common/components/ui';
import { pushApi } from '../api/pushApi';
import { pushQueryKeys } from '../hooks/usePushDevice';
import { DeviceNotificationSettings } from '../components/DeviceNotificationSettings';
import { enableNativePush, nativePushPermission, sendNativeTestPush, type NativePushPermission } from './nativePush';

const COPY: Record<NativePushPermission, string> = {
    prompt: 'Włącz powiadomienia o nowych leadach i rezerwacjach oraz o przyjęciu i wydaniu auta.',
    granted: 'Powiadomienia są włączone. Wyślij powiadomienie próbne i sprawdź, jak wygląda.',
    denied: 'Powiadomienia są wyłączone w ustawieniach telefonu. Włącz je dla aplikacji DetailBoost i wróć do CRM.',
};

export function NativePushPanel() {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const [permission, setPermission] = useState<NativePushPermission | null>(null);
    const [busy, setBusy] = useState(false);

    const recheck = useCallback(() => {
        nativePushPermission().then(setPermission).catch(() => setPermission('prompt'));
    }, []);

    // Zgodę zmienia się w ustawieniach systemu - po powrocie do aplikacji ekran ma to zauważyć sam.
    useEffect(() => {
        recheck();
        const handle = App.addListener('resume', recheck);
        return () => { void handle.then(h => h.remove()); };
    }, [recheck]);

    const enable = async () => {
        setBusy(true);
        try {
            const granted = await enableNativePush();
            recheck();
            if (granted) {
                await queryClient.invalidateQueries({ queryKey: pushQueryKeys.devices });
                showSuccess('Powiadomienia włączone', 'Ten telefon dostaje powiadomienia z CRM.');
            }
        } catch {
            showError('Nie udało się włączyć powiadomień', 'Sprawdź połączenie z internetem i spróbuj ponownie.');
        } finally {
            setBusy(false);
        }
    };

    const sendTest = async () => {
        setBusy(true);
        try {
            await sendNativeTestPush();
            showSuccess('Powiadomienie wysłane', 'Powiadomienie przychodzi w ciągu kilku sekund.');
        } catch {
            showError('Nie udało się wysłać', 'Wyłącz powiadomienia i włącz je ponownie albo spróbuj później.');
        } finally {
            setBusy(false);
        }
    };

    const revoke = async (deviceId: string) => {
        await pushApi.revokeDevice(deviceId);
        await queryClient.invalidateQueries({ queryKey: pushQueryKeys.devices });
    };

    return (
        <Wrap>
            <ThisPhone>
                <SectionTitle as="h3">Ten telefon</SectionTitle>
                {permission && <Text>{COPY[permission]}</Text>}
                {permission === 'prompt' && (
                    <div>
                        <Button variant="primary" onClick={enable} disabled={busy}>Włącz powiadomienia</Button>
                    </div>
                )}
                {permission === 'granted' && (
                    <div>
                        <Button variant="outline" onClick={sendTest} disabled={busy}>Wyślij powiadomienie próbne</Button>
                    </div>
                )}
            </ThisPhone>

            {/* Przypomnienia, raport i podsumowania stoją pod panelem, w sekcji „Przypomnienia i podsumowania" (PhoneSetups). */}
            <DeviceNotificationSettings onRevoke={revoke} />
        </Wrap>
    );
}

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ThisPhone = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
`;

const Text = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;
