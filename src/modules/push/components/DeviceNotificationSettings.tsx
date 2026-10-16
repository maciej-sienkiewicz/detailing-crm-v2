// src/modules/push/components/DeviceNotificationSettings.tsx
//
// Ustawienia → Tablety, telefon, kontakty → Powiadomienia: który telefon dostaje
// które powiadomienia.
//
// W studiu jedni chcą wiedzieć o wszystkim, inni tylko o nowych leadach, jeszcze inni
// tylko o przychodach. Ustawienie należy do URZĄDZENIA, nie do osoby - ten sam człowiek
// może chcieć leadów w kieszeni, a przychodów tylko na tablecie w biurze. Właściciel
// widzi wszystkie urządzenia studia (to on ustawia telefon recepcji), reszta - swoje.
//
// Zastępuje w ustawieniach dawną listę „Sparowane urządzenia": nazwa urządzenia,
// odłączanie i to, co do niego idzie, to jedna rzecz, a dwie listy tych samych
// telefonów jedna pod drugą kazały je sobie dopasowywać wzrokiem.
//
// Kategorie, których posiadacz urządzenia i tak nie dostanie (brak uprawnienia w roli),
// nie mają przełącznika - przełącznik, który niczego nie zmienia, kłamie. Zostaje po
// nich jedno zdanie, żeby nikt nie szukał „przychodów" na telefonie detailera.
//
// Płasko, bez wyniesienia: jedyna karta w tej kolumnie to „To urządzenie" nad spodem
// (CLAUDE.md §2), a przełączniki są stanem, nie krokiem następnym.

import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, Panel, SectionTitle, ui } from '@/common/components/ui';
import { SettingSwitchRow } from '@/modules/settings/components/SettingSwitchRow';
import { pushApi } from '../api/pushApi';
import { pushQueryKeys } from '../hooks/usePushDevice';
import { copyOf, GROUPS, summaryOf } from '../utils/notificationCategories';
import type {
    PushCategorySetting,
    PushDeviceNotifications,
    PushNotificationCategory,
    PushNotificationSettings,
} from '../types';

const PLATFORM_LABEL: Record<PushDeviceNotifications['platform'], string> = {
    IOS: 'iPhone',
    ANDROID: 'Android',
    DESKTOP: 'Komputer',
    UNKNOWN: 'Urządzenie',
};

const channelLabel = (device: PushDeviceNotifications): string =>
    device.transport === 'WEB_PUSH' ? 'przeglądarka' : 'aplikacja';

const toastedGlobally = (error: unknown): boolean => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return status !== undefined && status >= 400 && status < 500;
};

interface Props {
    /** Odłączenie własnego urządzenia; cudzych nie odłącza się stąd (tylko na nich samych). */
    onRevoke: (deviceId: string) => Promise<void>;
}

export function DeviceNotificationSettings({ onRevoke }: Props) {
    const settings = useQuery({
        queryKey: pushQueryKeys.notificationSettings,
        queryFn: pushApi.getNotificationSettings,
        staleTime: 30_000,
    });

    const devices = settings.data?.devices ?? [];
    if (devices.length === 0) return null;

    const title = settings.data?.manageAll ? 'Urządzenia w studiu' : 'Twoje urządzenia';

    return (
        <Section>
            <Head>
                <SectionTitle as="h3" count={String(devices.length)}>{title}</SectionTitle>
                <Lead>
                    {settings.data?.manageAll
                        ? 'Wybierz, o czym ma dawać znać każdy telefon. Nowe rodzaje powiadomień włączają się same.'
                        : 'Wybierz, o czym ma dawać znać każdy z Twoich telefonów.'}
                </Lead>
            </Head>
            <List>
                {devices.map(device => (
                    <DeviceRow
                        key={device.id}
                        device={device}
                        showOwner={settings.data?.manageAll ?? false}
                        defaultOpen={devices.length <= 2}
                        onRevoke={onRevoke}
                    />
                ))}
            </List>
        </Section>
    );
}

interface DeviceRowProps {
    device: PushDeviceNotifications;
    showOwner: boolean;
    defaultOpen: boolean;
    onRevoke: (deviceId: string) => Promise<void>;
}

function DeviceRow({ device, showOwner, defaultOpen, onRevoke }: DeviceRowProps) {
    const queryClient = useQueryClient();
    const { showError, showSuccess } = useToast();
    const [open, setOpen] = useState(defaultOpen);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const bodyId = `push-device-${device.id}`;

    const update = useMutation({
        mutationFn: (enabled: PushNotificationCategory[]) => pushApi.updateDeviceNotifications(device.id, enabled),
        // Od razu na ekranie: przełącznik, który czeka na serwer, wygląda na zepsuty.
        onMutate: async enabled => {
            await queryClient.cancelQueries({ queryKey: pushQueryKeys.notificationSettings });
            const previous = queryClient.getQueryData<PushNotificationSettings>(pushQueryKeys.notificationSettings);
            queryClient.setQueryData<PushNotificationSettings>(pushQueryKeys.notificationSettings, old => old && {
                ...old,
                devices: old.devices.map(d => d.id !== device.id ? d : {
                    ...d,
                    categories: d.categories.map(c => ({ ...c, enabled: enabled.includes(c.category) })),
                }),
            });
            return { previous };
        },
        onError: (error, _enabled, context) => {
            if (context?.previous) queryClient.setQueryData(pushQueryKeys.notificationSettings, context.previous);
            if (!toastedGlobally(error)) showError('Nie udało się zapisać', 'Sprawdź internet i spróbuj jeszcze raz.');
        },
        onSuccess: saved => {
            queryClient.setQueryData<PushNotificationSettings>(pushQueryKeys.notificationSettings, old => old && {
                ...old,
                devices: old.devices.map(d => (d.id === saved.id ? saved : d)),
            });
        },
    });

    const enabledNow = device.categories.filter(c => c.enabled).map(c => c.category);
    const toggle = (category: PushNotificationCategory, next: boolean) => {
        const enabled = next
            ? [...enabledNow.filter(c => c !== category), category]
            : enabledNow.filter(c => c !== category);
        update.mutate(enabled);
    };

    const setAll = (next: boolean) => {
        // Kategorie niedostępne dla roli zostają, jak są - nikt ich tu nie widzi.
        const hidden = device.categories.filter(c => !c.available && c.enabled).map(c => c.category);
        const visible = device.categories.filter(c => c.available).map(c => c.category);
        update.mutate(next ? [...hidden, ...visible] : hidden);
    };

    const handleRevoke = async () => {
        setConfirmRevoke(false);
        setRevoking(true);
        try {
            await onRevoke(device.id);
            showSuccess('Urządzenie odłączone', `„${device.deviceName}" nie będzie już dostawać powiadomień.`);
        } catch (error) {
            if (!toastedGlobally(error)) showError('Nie udało się odłączyć', 'Spróbuj ponownie.');
        } finally {
            setRevoking(false);
        }
    };

    const available = device.categories.filter(c => c.available);
    const unavailableCount = device.categories.length - available.length;
    const allOn = available.length > 0 && available.every(c => c.enabled);
    const allOff = available.every(c => !c.enabled);
    const grouped = groupCategories(available);

    return (
        <DevicePanel>
            <DeviceHead
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => setOpen(o => !o)}
            >
                <DeviceTexts>
                    <DeviceName>{device.deviceName || PLATFORM_LABEL[device.platform]}</DeviceName>
                    <Meta>
                        {showOwner && <Owner>{device.mine ? 'Ty' : device.userName}</Owner>}
                        <span>{PLATFORM_LABEL[device.platform]}, {channelLabel(device)}</span>
                        <Summary $muted={allOff && available.length > 0}>{summaryOf(device.categories)}</Summary>
                    </Meta>
                </DeviceTexts>
                <Chevron $open={open} aria-hidden="true" />
            </DeviceHead>

            {open && (
                <Body id={bodyId}>
                    {available.length > 0 && (
                        <Bulk>
                            <Button variant="ghost" size="sm" disabled={allOn} onClick={() => setAll(true)}>
                                Włącz wszystkie
                            </Button>
                            <Button variant="ghost" size="sm" disabled={allOff} onClick={() => setAll(false)}>
                                Wyłącz wszystkie
                            </Button>
                        </Bulk>
                    )}

                    {grouped.map(group => (
                        <Group key={group.title} aria-label={group.title}>
                            <GroupTitle>{group.title}</GroupTitle>
                            {group.categories.map(c => (
                                <SettingSwitchRow
                                    key={c.category}
                                    label={copyOf(c.category).label}
                                    hint={copyOf(c.category).hint || undefined}
                                    checked={c.enabled}
                                    onChange={next => toggle(c.category, next)}
                                />
                            ))}
                        </Group>
                    ))}

                    {unavailableCount > 0 && (
                        <Note>
                            {device.mine
                                ? 'Pozostałe powiadomienia wymagają uprawnień, których Twoja rola nie ma.'
                                : 'Pozostałe powiadomienia wymagają uprawnień, których rola tej osoby nie ma. Zmienisz to w Ustawieniach, w Rolach.'}
                        </Note>
                    )}

                    {device.mine && (
                        <RevokeRow>
                            <Button
                                variant="tintedDanger"
                                size="sm"
                                onClick={() => setConfirmRevoke(true)}
                                disabled={revoking}
                            >
                                {revoking ? 'Odłączam…' : 'Odłącz urządzenie'}
                            </Button>
                        </RevokeRow>
                    )}
                </Body>
            )}

            <ConfirmationModal
                isOpen={confirmRevoke}
                title="Odłączyć urządzenie?"
                message={`„${device.deviceName}" przestanie dostawać powiadomienia z CRM. Żeby je przywrócić, trzeba je włączyć od nowa na tym urządzeniu.`}
                variant="danger"
                confirmText="Odłącz"
                cancelText="Anuluj"
                onConfirm={() => { void handleRevoke(); }}
                onCancel={() => setConfirmRevoke(false)}
            />
        </DevicePanel>
    );
}

function groupCategories(categories: PushCategorySetting[]) {
    const known = new Set(GROUPS.flatMap(g => g.categories));
    const groups = GROUPS
        .map(g => ({
            title: g.title,
            categories: g.categories
                .map(key => categories.find(c => c.category === key))
                .filter((c): c is PushCategorySetting => c !== undefined),
        }))
        .filter(g => g.categories.length > 0);
    const rest = categories.filter(c => !known.has(c.category));
    return rest.length > 0 ? [...groups, { title: 'Inne', categories: rest }] : groups;
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const Head = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Lead = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: ${ui.textMuted};
    max-width: 68ch;
`;

const List = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DevicePanel = styled(Panel)`
    overflow: hidden;
`;

const DeviceHead = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 12px 20px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;

    &:hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }

    @media (max-width: 767px) { padding: 12px 16px; }
`;

const DeviceTexts = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const DeviceName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Meta = styled.span`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 12px;
    color: ${ui.textMuted};
`;

const Owner = styled.span`
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const Summary = styled.span<{ $muted?: boolean }>`
    color: ${p => (p.$muted ? ui.warnInk : ui.brandInk)};
    font-weight: 500;
`;

const Chevron = styled(ChevronDown)<{ $open: boolean }>`
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    color: ${ui.textFaint};
    transform: rotate(${p => (p.$open ? '180deg' : '0deg')});
    transition: transform 0.15s ease;
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 20px 16px;
    border-top: 1px solid ${ui.lineFaint};

    @media (max-width: 767px) { padding: 0 16px 14px; }
`;

const Bulk = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 10px;
`;

const Group = styled.section`
    display: flex;
    flex-direction: column;
    padding-top: 8px;
`;

const GroupTitle = styled.h4`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: ${ui.inkSoft};
`;

const Note = styled.p`
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
    max-width: 68ch;
`;

const RevokeRow = styled.div`
    padding-top: 10px;
`;
