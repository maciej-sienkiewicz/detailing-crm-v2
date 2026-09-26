// src/modules/settings/components/TabletsSection.tsx
//
// Ustawienia → Tablety, telefon, kontakty → Tablety do podpisu.
//
// Co się zmieniło i dlaczego:
//   - „Dodaj tablet" stał w pasku nad listą obok pustego licznika; akcja główna
//     widoku idzie teraz do nagłówka ramy („Sparuj tablet") - jedyne wypełnienie.
//   - Licznik pisał „2 tablety/ów" - teraz odmiana po polsku.
//   - Usunięcie pytało wklejonym w wiersz „Na pewno? Usuń / Anuluj" (czerwone
//     wypełnienie w liście), a błąd kończył się ciszą. Teraz ConfirmationModal
//     i dymek przy błędzie.
//   - Błąd wczytania listy wyglądał jak „Brak sparowanych tabletów".

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, TabletSmartphone } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, Notice, SectionTitle, StatusPill } from '@/common/components/ui';
import { RequireCapability, useCapability } from '@/modules/subscription';
import { useTablets, useDeleteTablet, TABLETS_KEY } from '../hooks/useTablets';
import { useTabletsSocket } from '../hooks/useTabletsSocket';
import { TabletPairingModal } from './tablets/TabletPairingModal';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import { serverMessage, toastedGlobally } from './errorToast';
import {
    DeviceMain, DeviceRow, DeviceSide, DeviceText, EmptyState, Intro, ListCard, ListHead, ListNotice,
    SkeletonLine, View, formatDate, tabletsWord,
} from './devicesLayout';
import type { Tablet } from '../tabletTypes';

/**
 * Parowanie nie wygasa - kończy je dopiero odłączenie urządzenia. Zamiast daty
 * ważności pokazujemy więc to, co realnie mówi o stanie sprzętu: kiedy tablet
 * ostatnio się odezwał. Cisza dłuższa niż doba zwykle znaczy, że urządzenie jest
 * wyłączone albo poza siecią - i o tym warto wiedzieć przed wizytą klienta.
 */
function lastSeenLabel(lastSeenAt: string | null): { text: string; stale: boolean } {
    if (!lastSeenAt) return { text: 'Jeszcze się nie połączył', stale: true };

    const minutes = (Date.now() - new Date(lastSeenAt).getTime()) / 60_000;
    if (minutes < 60) return { text: 'Aktywny', stale: false };
    if (minutes < 60 * 24) return { text: `Widziany ${Math.floor(minutes / 60)} godz. temu`, stale: false };
    return { text: `Widziany ${formatDate(lastSeenAt)}`, stale: true };
}

export function TabletsSection() {
    const signatures = useCapability('SIGNATURE_LOCAL');
    const [pairingOpen, setPairingOpen] = useState(false);

    return (
        <View>
            <Intro>
                Tablet, na którym klient podpisuje protokoły przyjęcia i wydania pojazdu.
                Parowanie nie wygasa: tablet działa, dopóki go nie odłączysz.
            </Intro>

            {/* Bez modułu podpisów panel niżej jest tylko zachętą do zakupu -
                przycisk parowania w nagłówku obiecywałby coś, czego serwer odmówi (402). */}
            {signatures.enabled && (
                <SettingsHeaderActions>
                    <Button variant="primary" size="lg" onClick={() => setPairingOpen(true)}>
                        <Plus aria-hidden="true" />Sparuj tablet
                    </Button>
                </SettingsHeaderActions>
            )}

            <RequireCapability
                capability="SIGNATURE_LOCAL"
                mode="upsell"
                message="Tablety do podpisu wymagają modułu Podpisy elektroniczne."
            >
                <TabletList
                    pairingOpen={pairingOpen}
                    onPairingClose={() => setPairingOpen(false)}
                    enabled={signatures.enabled}
                />
            </RequireCapability>
        </View>
    );
}

function TabletList({ pairingOpen, onPairingClose, enabled }: {
    pairingOpen: boolean;
    onPairingClose: () => void;
    enabled: boolean;
}) {
    const { tablets, isLoading, isError, refetch, loaded } = useTablets({ enabled });
    const deleteTablet = useDeleteTablet();
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const [toDelete, setToDelete] = useState<Tablet | null>(null);

    useTabletsSocket({
        onPaired: () => {
            onPairingClose();
            queryClient.invalidateQueries({ queryKey: TABLETS_KEY });
        },
        onRevoked: () => {
            queryClient.invalidateQueries({ queryKey: TABLETS_KEY });
        },
    });

    const handleDelete = (tablet: Tablet) => {
        deleteTablet.mutate(tablet.tabletId, {
            onSuccess: () => showSuccess('Tablet odłączony', `„${tablet.deviceName}” nie przyjmie już podpisów.`),
            onError: (error) => {
                if (toastedGlobally(error)) return;
                showError('Nie udało się odłączyć tabletu', serverMessage(error) ?? 'Spróbuj ponownie.');
            },
        });
    };

    return (
        <>
            <ListCard aria-label="Sparowane tablety">
                <ListHead>
                    <SectionTitle
                        as="h3"
                        count={loaded ? `${tablets.length} ${tabletsWord(tablets.length)}` : undefined}
                    >
                        Sparowane tablety
                    </SectionTitle>
                </ListHead>

                {isError && !loaded ? (
                    <ListNotice>
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać tabletów"
                            action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
                        />
                    </ListNotice>
                ) : isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <DeviceRow key={i} aria-hidden="true">
                            <DeviceMain><SkeletonLine $w={`${45 + i * 15}%`} /></DeviceMain>
                            <DeviceSide><SkeletonLine $w="90px" /></DeviceSide>
                        </DeviceRow>
                    ))
                ) : tablets.length === 0 ? (
                    <EmptyState>
                        <strong>Brak sparowanych tabletów</strong>
                        <p>„Sparuj tablet" w nagłówku da kod, który wpiszesz na tablecie.</p>
                    </EmptyState>
                ) : (
                    tablets.map(tablet => {
                        const lastSeen = lastSeenLabel(tablet.lastSeenAt);
                        const deleting = deleteTablet.isPending && deleteTablet.variables === tablet.tabletId;
                        return (
                            <DeviceRow key={tablet.tabletId}>
                                <DeviceMain>
                                    <TabletSmartphone aria-hidden="true" />
                                    <DeviceText>
                                        <strong>{tablet.deviceName}</strong>
                                        <span>Sparowano {formatDate(tablet.pairedAt)}</span>
                                    </DeviceText>
                                </DeviceMain>
                                <DeviceSide>
                                    <StatusPill $tone={lastSeen.stale ? 'warn' : 'ok'}>{lastSeen.text}</StatusPill>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        disabled={deleting}
                                        onClick={() => setToDelete(tablet)}
                                    >
                                        {deleting ? 'Odłączanie…' : 'Odłącz'}
                                    </Button>
                                </DeviceSide>
                            </DeviceRow>
                        );
                    })
                )}
            </ListCard>

            {pairingOpen && <TabletPairingModal onClose={onPairingClose} />}

            <ConfirmationModal
                isOpen={toDelete !== null}
                title="Odłączyć tablet?"
                message={toDelete
                    ? `„${toDelete.deviceName}” przestanie przyjmować podpisy klientów. Żeby znowu go użyć, trzeba go sparować od nowa kodem.`
                    : ''}
                variant="danger"
                confirmText="Odłącz tablet"
                cancelText="Anuluj"
                onConfirm={() => { if (toDelete) handleDelete(toDelete); }}
                onCancel={() => setToDelete(null)}
            />
        </>
    );
}
