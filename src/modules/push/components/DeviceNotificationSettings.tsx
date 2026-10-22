// src/modules/push/components/DeviceNotificationSettings.tsx
//
// Ustawienia → Telefon → Powiadomienia: „Rodzaje powiadomień" - które urządzenie
// dostaje które powiadomienia.
//
// W studiu jedni chcą wiedzieć o wszystkim, inni tylko o nowych leadach, jeszcze inni
// tylko o przychodach. Ustawienie należy do URZĄDZENIA, nie do osoby - ten sam człowiek
// może chcieć leadów w kieszeni, a przychodów tylko na tablecie w biurze. Właściciel
// widzi wszystkie urządzenia studia (to on ustawia telefon recepcji), reszta - swoje.
//
// Tabela: rodzaje w wierszach (pogrupowane jak w GROUPS), urządzenia w kolumnach.
// Poprzednio każde urządzenie było zwijanym wierszem z własną listą przełączników -
// przy dwóch urządzeniach albo wszystko było rozwinięte (kilkanaście przełączników
// jeden pod drugim), albo zwinięte, i wtedy ustawienia „znikały" z ekranu: właściciel
// pytał, gdzie się podziały leady i zakończone wizyty. W tabeli wszystko jest widać
// naraz, a porównanie „co idzie na telefon, a co na komputer" jest jednym spojrzeniem.
// Gdy kolumny się nie mieszczą (telefon, dużo urządzeń), zostaje jedna kolumna i wybór
// urządzenia nad nią.
//
// Kategorie, których posiadacz urządzenia i tak nie dostanie (brak uprawnienia w roli),
// nie mają przełącznika - przełącznik, który niczego nie zmienia, kłamie. Zostaje po
// nich kreska i jedno zdanie pod tabelą.
//
// Płasko, bez wyniesienia: jedyna karta w tej kolumnie to karta parowania nad spodem
// (CLAUDE.md §2), a przełączniki są stanem, nie krokiem następnym.

import { Fragment, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, BellRing, MoreHorizontal, Unlink } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Toggle } from '@/common/components/Toggle';
import {
    ActionMenu, Button, IconButton, MenuDivider, MenuItem, Notice, Panel, SectionTitle, ui, useActionMenu,
} from '@/common/components/ui';
import { useContainerWidth } from '@/common/hooks';
import { problemStatus } from '@/core/problem';
import { pushApi } from '../api/pushApi';
import { pushQueryKeys } from '../hooks/usePushDevice';
import { copyOf, GROUPS, summaryOf } from '../utils/notificationCategories';
import type {
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

/** Kolumna rodzajów potrzebuje miejsca na nazwę i zdanie opisu; kolumna urządzenia - na nazwę. */
const LABEL_MIN_WIDTH = 300;
const DEVICE_COLUMN_WIDTH = 152;

const toastedGlobally = (error: unknown): boolean => {
    const status = problemStatus(error);
    return status !== undefined && status >= 400 && status < 500;
};

const nameOf = (device: PushDeviceNotifications) => device.deviceName || PLATFORM_LABEL[device.platform];

/** To urządzenie pierwsze, potem własne, potem reszta studia - kolejność, w której się ich szuka. */
const ordered = (devices: PushDeviceNotifications[], currentDeviceId: string | null) =>
    [...devices].sort((a, b) =>
        Number(b.id === currentDeviceId) - Number(a.id === currentDeviceId)
        || Number(b.mine) - Number(a.mine)
        || nameOf(a).localeCompare(nameOf(b), 'pl'));

interface Props {
    /** Odłączenie własnego urządzenia; cudzych nie odłącza się stąd (tylko na nich samych). */
    onRevoke: (deviceId: string) => Promise<void>;
    /**
     * Kolumna urządzenia, na którym otwarto ekran. Bez oznaczenia tabela i karta
     * parowania nad nią wyglądały jak dwie niezwiązane rzeczy.
     */
    currentDeviceId?: string | null;
    /** Co zrobić, żeby urządzenie się tu pojawiło - inne na komputerze (kod QR) i na telefonie. */
    emptyHint?: string;
}

export function DeviceNotificationSettings({ onRevoke, currentDeviceId = null, emptyHint }: Props) {
    const queryClient = useQueryClient();
    const { showError, showSuccess } = useToast();
    const settings = useQuery({
        queryKey: pushQueryKeys.notificationSettings,
        queryFn: pushApi.getNotificationSettings,
        staleTime: 30_000,
    });
    const [rootRef, width] = useContainerWidth<HTMLElement>();
    const [pickedId, setPickedId] = useState<string | null>(null);
    const [toRevoke, setToRevoke] = useState<PushDeviceNotifications | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const menu = useActionMenu<PushDeviceNotifications>();

    const manageAll = settings.data?.manageAll ?? false;
    const devices = useMemo(
        () => ordered(settings.data?.devices ?? [], currentDeviceId),
        [settings.data, currentDeviceId],
    );

    const update = useMutation({
        mutationFn: ({ deviceId, enabled }: { deviceId: string; enabled: PushNotificationCategory[] }) =>
            pushApi.updateDeviceNotifications(deviceId, enabled),
        // Od razu na ekranie: przełącznik, który czeka na serwer, wygląda na zepsuty.
        onMutate: async ({ deviceId, enabled }) => {
            await queryClient.cancelQueries({ queryKey: pushQueryKeys.notificationSettings });
            const previous = queryClient.getQueryData<PushNotificationSettings>(pushQueryKeys.notificationSettings);
            queryClient.setQueryData<PushNotificationSettings>(pushQueryKeys.notificationSettings, old => old && {
                ...old,
                devices: old.devices.map(d => d.id !== deviceId ? d : {
                    ...d,
                    categories: d.categories.map(c => ({ ...c, enabled: enabled.includes(c.category) })),
                }),
            });
            return { previous };
        },
        onError: (error, _variables, context) => {
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

    const toggle = (device: PushDeviceNotifications, category: PushNotificationCategory, next: boolean) => {
        const enabledNow = device.categories.filter(c => c.enabled).map(c => c.category);
        const enabled = next
            ? [...enabledNow.filter(c => c !== category), category]
            : enabledNow.filter(c => c !== category);
        update.mutate({ deviceId: device.id, enabled });
    };

    const setAll = (device: PushDeviceNotifications, next: boolean) => {
        // Kategorie niedostępne dla roli zostają, jak są - nikt ich tu nie widzi.
        const hidden = device.categories.filter(c => !c.available && c.enabled).map(c => c.category);
        const visible = device.categories.filter(c => c.available).map(c => c.category);
        update.mutate({ deviceId: device.id, enabled: next ? [...hidden, ...visible] : hidden });
    };

    const handleRevoke = async (device: PushDeviceNotifications) => {
        setToRevoke(null);
        setRevokingId(device.id);
        try {
            await onRevoke(device.id);
            showSuccess('Urządzenie odłączone', `„${nameOf(device)}" nie będzie już dostawać powiadomień.`);
        } catch (error) {
            if (!toastedGlobally(error)) showError('Nie udało się odłączyć', 'Spróbuj ponownie.');
        } finally {
            setRevokingId(null);
        }
    };

    const head = (
        <Head>
            <SectionTitle as="h3" count={devices.length > 0 ? String(devices.length) : undefined}>
                Rodzaje powiadomień
            </SectionTitle>
            <Lead>
                {manageAll
                    ? 'Wybierz, o czym ma dawać znać każde urządzenie w studiu. Nowe rodzaje powiadomień włączają się same.'
                    : 'Wybierz, o czym ma dawać znać każde z Twoich urządzeń. Nowe rodzaje powiadomień włączają się same.'}
            </Lead>
        </Head>
    );

    if (settings.isLoading) {
        return (
            <Section ref={rootRef} aria-busy="true">
                {head}
                <Box>{[70, 55, 62].map(w => <SkeletonLine key={w} $w={`${w}%`} />)}</Box>
            </Section>
        );
    }

    if (settings.isError && !settings.data) {
        return (
            <Section ref={rootRef}>
                {head}
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać ustawień powiadomień"
                    action={<Button variant="ghost" size="sm" onClick={() => void settings.refetch()}>Spróbuj ponownie</Button>}
                />
            </Section>
        );
    }

    if (devices.length === 0) {
        return (
            <Section ref={rootRef}>
                {head}
                <Box>
                    <Empty>
                        <strong>Żadne urządzenie nie odbiera jeszcze powiadomień</strong>
                        {emptyHint && <span>{emptyHint}</span>}
                    </Empty>
                </Box>
            </Section>
        );
    }

    // Kolumny, póki się mieszczą; inaczej jedna kolumna i wybór urządzenia. Bez pomiaru
    // (jsdom, ukryta karta) zakładamy szerokość komputera.
    const fits = devices.length > 1 && (width === null || width === 0
        ? devices.length <= 3
        : width >= LABEL_MIN_WIDTH + DEVICE_COLUMN_WIDTH * devices.length);
    const columns = fits ? devices : [devices.find(d => d.id === pickedId) ?? devices[0]];
    const single = columns.length === 1;

    // Wiersz tylko dla rodzaju, który dostanie choć jedno z pokazanych urządzeń.
    const visibleKeys = new Set(columns.flatMap(d => d.categories.filter(c => c.available).map(c => c.category)));
    const groups = groupCategories([...visibleKeys]);
    const settingOf = (device: PushDeviceNotifications, category: PushNotificationCategory) =>
        device.categories.find(c => c.category === category);
    // Kreska w komórce: rodzaj jest w tabeli, ale tego urządzenia nie dotyczy.
    const dashes = columns.some(d => [...visibleKeys].some(key => !settingOf(d, key)?.available));
    // Rodzaj bez wiersza: żadne z pokazanych urządzeń go nie dostanie.
    const hiddenRows = columns.some(d => d.categories.some(c => !visibleKeys.has(c.category)));
    const restricted = columns.filter(d => d.categories.some(c => !c.available));
    const onlyMine = restricted.every(d => d.mine);
    const role = onlyMine ? 'Twoja rola' : 'rola tej osoby';
    const footnote = [
        dashes && `„—" znaczy, że ${role} nie ma uprawnienia do tego powiadomienia.`,
        hiddenRows && `Pozostałe powiadomienia wymagają uprawnień, których ${role} nie ma.`,
        (dashes || hiddenRows) && !onlyMine && 'Uprawnienia zmienisz w Ustawieniach, w Rolach.',
    ].filter(Boolean).join(' ');

    // „To urządzenie" mówi już, czyje jest - serwer uznaje je tylko za urządzenie oglądającego.
    const deviceMeta = (device: PushDeviceNotifications) => (
        <Meta>
            {device.id === currentDeviceId
                ? <ThisDevice>To urządzenie</ThisDevice>
                : manageAll && <Owner>{device.mine ? 'Ty' : device.userName}</Owner>}
            <span>{PLATFORM_LABEL[device.platform]}</span>
        </Meta>
    );

    const menuButton = (device: PushDeviceNotifications) => (
        <IconButton
            label={`Więcej: ${nameOf(device)}`}
            variant="ghost"
            size="sm"
            aria-haspopup="menu"
            aria-expanded={menu.isOpen(device.id)}
            disabled={revokingId === device.id}
            onClick={e => menu.toggle(e, device, device.id)}
        >
            <MoreHorizontal />
        </IconButton>
    );

    const template = single ? 'minmax(0, 1fr) 72px' : `minmax(0, 1fr) repeat(${columns.length}, ${DEVICE_COLUMN_WIDTH}px)`;
    const menuDevice = menu.menu?.item ?? null;

    return (
        <Section ref={rootRef}>
            {head}

            {!fits && devices.length > 1 && (
                <Picker>
                    <label htmlFor="push-device-picker">Urządzenie</label>
                    <select
                        id="push-device-picker"
                        value={columns[0].id}
                        onChange={e => setPickedId(e.target.value)}
                    >
                        {devices.map(d => (
                            <option key={d.id} value={d.id}>
                                {nameOf(d)}
                                {d.id === currentDeviceId ? ' (to urządzenie)' : manageAll && !d.mine ? ` (${d.userName})` : ''}
                            </option>
                        ))}
                    </select>
                </Picker>
            )}

            <Box role="table" aria-label="Rodzaje powiadomień na urządzeniach">
                {single ? (
                    <DeviceBar>
                        <DeviceTexts>
                            <DeviceName title={nameOf(columns[0])}>{nameOf(columns[0])}</DeviceName>
                            {deviceMeta(columns[0])}
                        </DeviceTexts>
                        <Summary $muted={summaryOf(columns[0].categories) === 'Wszystkie wyłączone'}>
                            {summaryOf(columns[0].categories)}
                        </Summary>
                        {menuButton(columns[0])}
                    </DeviceBar>
                ) : (
                    <HeaderRow role="row" style={{ gridTemplateColumns: template }}>
                        <Corner role="columnheader">Powiadomienie</Corner>
                        {columns.map(device => (
                            <DeviceHead key={device.id} role="columnheader">
                                <DeviceHeadTop>
                                    <DeviceName title={nameOf(device)}>{nameOf(device)}</DeviceName>
                                    {menuButton(device)}
                                </DeviceHeadTop>
                                {deviceMeta(device)}
                            </DeviceHead>
                        ))}
                    </HeaderRow>
                )}

                {groups.map(group => (
                    <Fragment key={group.title}>
                        <GroupRow role="row">
                            <GroupTitle role="rowheader">{group.title}</GroupTitle>
                        </GroupRow>
                        {group.categories.map(category => {
                            const copy = copyOf(category);
                            return (
                                <Row key={category} role="row" style={{ gridTemplateColumns: template }}>
                                    <LabelCell role="rowheader">
                                        <Name>{copy.label}</Name>
                                        {copy.hint && <Hint>{copy.hint}</Hint>}
                                    </LabelCell>
                                    {columns.map(device => {
                                        const setting = settingOf(device, category);
                                        return (
                                            <Cell key={device.id} role="cell">
                                                {setting?.available ? (
                                                    <Toggle
                                                        size="sm"
                                                        checked={setting.enabled}
                                                        onChange={next => toggle(device, category, next)}
                                                        ariaLabel={single ? copy.label : `${copy.label}, ${nameOf(device)}`}
                                                    />
                                                ) : (
                                                    <Unavailable title="Rola posiadacza tego urządzenia nie ma uprawnienia do tego powiadomienia">—</Unavailable>
                                                )}
                                            </Cell>
                                        );
                                    })}
                                </Row>
                            );
                        })}
                    </Fragment>
                ))}
            </Box>

            {footnote && <Footnote>{footnote}</Footnote>}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje urządzenia">
                {menuDevice && (
                    <>
                        <MenuItem icon={<BellRing />} onClick={() => { setAll(menuDevice, true); menu.close(); }}>
                            Włącz wszystkie
                        </MenuItem>
                        <MenuItem icon={<BellOff />} onClick={() => { setAll(menuDevice, false); menu.close(); }}>
                            Wyłącz wszystkie
                        </MenuItem>
                        {menuDevice.mine && (
                            <>
                                <MenuDivider />
                                <MenuItem icon={<Unlink />} danger onClick={() => { setToRevoke(menuDevice); menu.close(); }}>
                                    Odłącz urządzenie
                                </MenuItem>
                            </>
                        )}
                    </>
                )}
            </ActionMenu>

            <ConfirmationModal
                isOpen={toRevoke !== null}
                title="Odłączyć urządzenie?"
                message={toRevoke
                    ? `„${nameOf(toRevoke)}" przestanie dostawać powiadomienia z CRM. Żeby je przywrócić, trzeba je włączyć od nowa na tym urządzeniu.`
                    : ''}
                variant="danger"
                confirmText="Odłącz"
                cancelText="Anuluj"
                onConfirm={() => { if (toRevoke) void handleRevoke(toRevoke); }}
                onCancel={() => setToRevoke(null)}
            />
        </Section>
    );
}

/** Rodzaje w kolejności i grupach ekranu; nieznane (nowszy backend) w „Inne" na końcu. */
function groupCategories(keys: PushNotificationCategory[]) {
    const present = new Set(keys);
    const known = new Set(GROUPS.flatMap(g => g.categories));
    const groups = GROUPS
        .map(g => ({ title: g.title, categories: g.categories.filter(key => present.has(key)) }))
        .filter(g => g.categories.length > 0);
    const rest = keys.filter(key => !known.has(key));
    return rest.length > 0 ? [...groups, { title: 'Inne', categories: rest }] : groups;
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
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

const Box = styled(Panel)`
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Picker = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    label { font-size: 13px; font-weight: 600; color: ${ui.inkSoft}; }

    select {
        flex: 1;
        min-width: 0;
        max-width: 360px;
        height: 40px;
        padding: 0 12px;
        border: 1px solid ${ui.line};
        border-radius: ${ui.radiusRow};
        background: ${ui.surface};
        font: inherit;
        font-size: 14px;
        color: ${ui.ink};
    }
`;

const HeaderRow = styled.div`
    display: grid;
    align-items: end;
    border-bottom: 1px solid ${ui.line};
    background: ${ui.surfaceSoft};
`;

const Corner = styled.div`
    padding: 12px 20px;
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textMuted};

    @media (max-width: 767px) { padding: 12px 16px; }
`;

const DeviceHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 10px 6px 10px 12px;
    border-left: 1px solid ${ui.lineFaint};
`;

const DeviceHeadTop = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;

    /* Nazwa w kolumnie na dwie linie zamiast ucięcia „Mac, Chro…". */
    > span {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.3;
        padding-top: 6px;
    }
`;

const DeviceBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 20px;
    border-bottom: 1px solid ${ui.line};
    background: ${ui.surfaceSoft};

    @media (max-width: 767px) { padding: 12px 8px 12px 16px; }
`;

const DeviceTexts = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const DeviceName = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Meta = styled.span`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 8px;
    font-size: 12px;
    color: ${ui.textMuted};
`;

const Owner = styled.span`
    font-weight: 600;
    color: ${ui.inkSoft};
`;

// Odcień marki jako tło i obwódka, bez wypełnienia - to oznaczenie, nie krok (CLAUDE.md §2).
const ThisDevice = styled.span`
    padding: 0 7px;
    border-radius: 999px;
    border: 1px solid ${ui.brandLine};
    background: ${ui.brandTint};
    color: ${ui.brandInk};
    font-weight: 600;
    white-space: nowrap;
`;

const Summary = styled.span<{ $muted?: boolean }>`
    flex-shrink: 0;
    font-size: 12.5px;
    font-weight: 500;
    color: ${p => (p.$muted ? ui.warnInk : ui.brandInk)};

    @media (max-width: 480px) { display: none; }
`;

const GroupRow = styled.div`
    padding: 16px 20px 4px;

    &:not(:first-child) { border-top: 1px solid ${ui.lineFaint}; }

    @media (max-width: 767px) { padding: 14px 16px 4px; }
`;

const GroupTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${ui.inkSoft};
`;

const Row = styled.div`
    display: grid;
    align-items: stretch;
`;

const LabelCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 10px 16px 10px 20px;

    @media (max-width: 767px) { padding: 10px 12px 10px 16px; }
`;

const Name = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Hint = styled.span`
    font-size: 12.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const Cell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: 1px solid ${ui.lineFaint};
`;

const Unavailable = styled.span`
    font-size: 14px;
    color: ${ui.textFaint};
    cursor: help;
`;

const Footnote = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
    max-width: 68ch;
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 24px 20px;
    text-align: center;
    font-size: 13px;
    color: ${ui.textMuted};

    strong { font-size: 14px; color: ${ui.ink}; }
`;

const SkeletonLine = styled.div<{ $w: string }>`
    width: ${p => p.$w};
    height: 12px;
    margin: 16px 20px;
    border-radius: 6px;
    background: ${ui.lineFaint};
`;
