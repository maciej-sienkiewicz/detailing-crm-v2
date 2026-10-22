// src/modules/settings/components/phone/PhoneSection.tsx
//
// Ustawienia → Telefon: wszystko, co CRM robi na telefonie, w jednym miejscu.
//
// Układ jak wybór postaci: z lewej skład funkcji (sam tekst - nazwa i stan), na scenie
// telefon z ekranem, który człowiek zobaczy u siebie, obok jedno zdanie i JEDEN
// wypełniony przycisk (CLAUDE.md §2). Pierwsza wersja tej sekcji była listą
// „ikona + tytuł + podtytuł + plakietka + strzałka" z paskiem postępu - opisywała
// funkcje, zamiast je pokazać, i wyglądała jak każdy szablon onboardingu.
//
// Ruch mówi, skąd i dokąd się idzie: znacznik w składzie przejeżdża do wybranej
// pozycji, ekran telefonu ucieka w stronę, z której przyszedł wybór, a przycisk
// chowa skład - ustawienia funkcji dostają całą szerokość, telefon odgrywa samą
// funkcję (wpadające powiadomienie, dzwoniąca słuchawka), a „Wróć" cofa wszystko.
//
// Skład zostaje kolumną przy każdej szerokości komputera - przy węższej sekcji maleje
// telefon, a opis schodzi pod niego. Przewijany palcem pasek zakładek (pierwsza
// wersja wąskiego układu) wyglądał jak zaślepka, nie jak wybór. Na telefonie jest jak
// w spisie ustawień: lista funkcji, a po dotknięciu jej ekran z „‹ Funkcje telefonu".

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import styled, { css } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, ui } from '@/common/components/ui';
import { useContainerWidth } from '@/common/hooks';
import { pluralPl } from '@/common/utils/plural';
import { isNativeApp } from '@/core/native/platform';
import { usePermissions } from '@/core/permissions';
import { carddavApi, CARDDAV_ACCOUNTS_KEY } from '@/modules/carddav';
import { pushApi } from '@/modules/push/api/pushApi';
import { pushQueryKeys } from '@/modules/push/hooks/usePushDevice';
import { useMobileShortcutToken } from '@/modules/voice-commands/hooks/useMobileShortcutToken';
import { usePWAInstall } from '@/modules/voice-commands/hooks/usePWAInstall';
import { PHONE_FEATURES, availablePhoneFeatures, screenTone, type PhoneFeatureId } from './phoneFeatures';
import { PhoneFrame, PhoneNotch, PhoneScreen, PhoneScreenArea } from './PhoneScreens';
import { PhoneSetup } from './PhoneSetups';
import { SPRING, animate, clearAnimations, finished, prefersReducedMotion, staggerIn } from './motion';

interface PhoneSectionProps {
    feature: PhoneFeatureId;
    onFeatureChange: (feature: PhoneFeatureId) => void;
    /** Dawny adres prowadził wprost do ustawień (np. `?tab=mobile-devices&view=notifications`). */
    openSetupOnArrival?: boolean;
    /**
     * Adres wskazał funkcję (`&view=…`). Na telefonie otwiera się wtedy od razu jej
     * ekran zamiast listy - link z toastu czy wiadomości ma prowadzić do celu.
     */
    featureChosen?: boolean;
}

type Mode = 'info' | 'setup';

/** Co ma się wydarzyć po najbliższym renderze - wejście nowej treści. */
type Entrance =
    | { kind: 'switch'; dir: 1 | -1 }
    | { kind: 'open' }
    | { kind: 'close' }
    /** Telefon: z listy do ekranu funkcji i z powrotem. */
    | { kind: 'detail' }
    | { kind: 'list' };

/**
 * Poniżej tej szerokości SEKCJI (nie okna) jest to telefon: lista funkcji i ekran
 * jednej z nich. Ten sam próg co w CSS niżej (COMPACT) - JS decyduje o tym, CO jest
 * na ekranie, CSS o tym, jak to wygląda.
 */
const COMPACT_WIDTH = 560;

/** Gdzie szukać kodu QR - aparat nie ma ustawień, więc zamiast przycisku mówi, gdzie go użyć. */
const CAMERA_PLACES: { where: string; what: string }[] = [
    { where: 'Przyjęcie pojazdu', what: 'zdjęcia i usterki z telefonu' },
    { where: 'Wizyta', what: 'zdjęcia z telefonu i mapa uszkodzeń' },
    { where: 'Zlecenie zbiorcze', what: 'VIN ze zdjęcia' },
    { where: 'Produkty', what: 'skanowanie kodu kreskowego' },
    { where: 'Klienci', what: 'import kontaktów z telefonu' },
    { where: 'Lista obecności', what: 'podpis na Twoim telefonie' },
];

// ─── Stan funkcji w składzie ─────────────────────────────────────────────────

/**
 * Jedna linia pod nazwą funkcji. Liczby z tej samej pamięci podręcznej, z której
 * czytają panele ustawień - bez osobnych zapytań. Póki nie wiadomo, linia mówi,
 * co funkcja daje, a nie zgaduje „nieustawione".
 */
function useFeatureStatuses(features: PhoneFeatureId[]): Record<PhoneFeatureId, string> {
    const has = (id: PhoneFeatureId) => features.includes(id);

    const devices = useQuery({
        queryKey: pushQueryKeys.devices,
        queryFn: pushApi.listDevices,
        staleTime: 30_000,
        enabled: has('push'),
    });
    const notificationSettings = useQuery({
        queryKey: pushQueryKeys.notificationSettings,
        queryFn: pushApi.getNotificationSettings,
        staleTime: 30_000,
        enabled: has('dial'),
    });
    const phones = useQuery({
        queryKey: CARDDAV_ACCOUNTS_KEY,
        queryFn: carddavApi.listAccounts,
        staleTime: 30_000,
        enabled: has('calls'),
    });
    const voiceToken = useMobileShortcutToken({ enabled: has('voice') });
    const pwa = usePWAInstall();

    const onDevices = (n: number) => `Włączone na ${n} ${pluralPl(n, 'urządzeniu', 'urządzeniach', 'urządzeniach')}`;

    const activeDevices = devices.data?.filter(d => d.active).length;
    // Prośba o połączenie dzwoni tylko na urządzenia osoby, która kliknęła numer.
    const dialDevices = notificationSettings.data?.devices.filter(d =>
        d.mine && d.categories.some(c => c.category === 'CLICK_TO_CALL' && c.enabled && c.available)).length;
    const syncedPhones = phones.data?.length;

    return {
        push: activeDevices === undefined ? 'Leady, rezerwacje, przychody' : activeDevices > 0 ? onDevices(activeDevices) : 'Nieustawione',
        dial: dialDevices === undefined ? 'Numer z karty klienta' : dialDevices > 0 ? `Działa na ${dialDevices} ${pluralPl(dialDevices, 'urządzeniu', 'urządzeniach', 'urządzeniach')}` : 'Nieustawione',
        calls: syncedPhones === undefined ? 'Klienci w kontaktach' : syncedPhones > 0 ? `Na ${syncedPhones} ${pluralPl(syncedPhones, 'telefonie', 'telefonach', 'telefonach')}` : 'Nieustawione',
        voice: voiceToken.data === null ? 'Niedostępne dla tego konta' : 'Skrót bez logowania',
        camera: 'Zdjęcia, VIN, skany',
        app: pwa.isInstalled ? 'Na tym urządzeniu' : 'Ikona na ekranie głównym',
    };
}

// ─── Sekcja ──────────────────────────────────────────────────────────────────

export function PhoneSection({ feature, onFeatureChange, openSetupOnArrival = false, featureChosen = false }: PhoneSectionProps) {
    const { can } = usePermissions();
    // Same flagi, nie `can`: lista musi być tym samym obiektem między renderami, bo
    // od niej zależy pomiar znacznika - nowa tablica co render mierzyłaby go w kółko.
    const canViewCustomers = can('CUSTOMERS_VIEW');
    const canViewVisits = can('VISITS_VIEW');
    const features = useMemo(
        () => availablePhoneFeatures({ canViewCustomers, canViewVisits, nativeApp: isNativeApp() }),
        [canViewCustomers, canViewVisits],
    );
    const selected = features.includes(feature) ? feature : features[0];
    const statuses = useFeatureStatuses(features);

    // 0 = jeszcze bez układu (jsdom, ukryta karta) - wtedy zostaje układ komputera.
    const [rootRef, width] = useContainerWidth<HTMLDivElement>();
    const compact = width !== null && width > 0 && width < COMPACT_WIDTH;
    const [listOpen, setListOpen] = useState(() => !featureChosen && !openSetupOnArrival);

    // `shown` to funkcja na scenie; zostaje w tyle za `selected`, póki stara treść wychodzi.
    const [shown, setShown] = useState<PhoneFeatureId>(selected);
    const [mode, setMode] = useState<Mode>(() => (openSetupOnArrival && PHONE_FEATURES[selected].cta ? 'setup' : 'info'));
    const [demoKey, setDemoKey] = useState(0);

    const rosterRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef(new Map<PhoneFeatureId, HTMLButtonElement>());
    const listRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);
    const phoneRef = useRef<HTMLDivElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const entrance = useRef<Entrance | null>(null);
    // Każde przejście dostaje numer; spóźniony koniec starego przejścia nic już nie zmienia.
    const switchRun = useRef(0);
    const panelRun = useRef(0);
    // Na telefonie scena pokazuje wybraną funkcję od razu - wymianę w miejscu zastępuje
    // przejście z listy. Na komputerze `shown` zostaje w tyle, póki stara treść wychodzi.
    const onStage = compact ? selected : shown;
    // Dla opóźnionego pokazu: czy po 280 ms dalej są otwarte ustawienia tej samej funkcji.
    const current = useRef({ onStage, mode });
    useEffect(() => { current.current = { onStage, mode }; }, [onStage, mode]);

    // ── Zmiana funkcji: stara treść ucieka, nowa wjeżdża z drugiej strony ──
    useEffect(() => {
        // Na telefonie funkcję wybiera się z listy - scena bierze ją wprost (onStage).
        if (selected === shown || compact) return;
        const run = ++switchRun.current;
        panelRun.current++;
        const dir = features.indexOf(selected) > features.indexOf(shown) ? 1 : -1;
        const out = animate(screenRef.current, [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: `translateY(${-18 * dir}px)` },
        ], { duration: 150, fill: 'forwards' });
        animate(panelRef.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: 'forwards' });
        void finished(out).then(() => {
            if (run !== switchRun.current) return;
            entrance.current = { kind: 'switch', dir };
            setShown(selected);
            setMode('info');
        });
    }, [selected, shown, features, compact]);

    // ── Wejście nowej treści, zanim przeglądarka cokolwiek narysuje ──
    useLayoutEffect(() => {
        const next = entrance.current;
        if (!next) return;
        entrance.current = null;
        clearAnimations(screenRef.current);
        clearAnimations(panelRef.current);
        clearAnimations(listRef.current);
        clearAnimations(detailRef.current);
        if (next.kind === 'switch') {
            staggerIn(screenRef.current, { opacity: 0, transform: `translateY(${22 * next.dir}px)` }, { duration: 420, step: 55 });
            staggerIn(panelRef.current, { opacity: 0, transform: 'translateY(8px)' }, { duration: 340, step: 50, delay: 90 });
        } else if (next.kind === 'open') {
            staggerIn(panelRef.current, { opacity: 0, transform: 'translateX(22px)' }, { duration: 380, step: 60 });
        } else if (next.kind === 'close') {
            staggerIn(panelRef.current, { opacity: 0, transform: 'translateX(-14px)' }, { duration: 320, step: 50 });
        } else if (next.kind === 'detail') {
            staggerIn(detailRef.current, { opacity: 0, transform: 'translateX(24px)' }, { duration: 360, step: 50 });
        } else {
            staggerIn(listRef.current, { opacity: 0, transform: 'translateX(-16px)' }, { duration: 320, step: 35 });
        }
    }, [shown, mode, listOpen]);

    const openSetup = useCallback(() => {
        // Klik w trakcie zmiany funkcji trafiłby w znikający przycisk poprzedniej.
        if (current.current.mode === 'setup' || onStage !== selected) return;
        const run = ++panelRun.current;
        const feature = onStage;
        animate(phoneRef.current, [{ transform: 'none' }, { transform: 'scale(1.025)' }, { transform: 'none' }], { duration: 520, easing: SPRING });
        const out = animate(panelRef.current, [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateX(-18px)' },
        ], { duration: 170, fill: 'forwards' });
        void finished(out).then(() => {
            if (run !== panelRun.current) return;
            entrance.current = { kind: 'open' };
            setMode('setup');
            // Telefon odgrywa funkcję, kiedy ustawienia już stoją - inaczej oba ruchy zlewają się w jeden.
            window.setTimeout(() => {
                if (current.current.mode === 'setup' && current.current.onStage === feature) setDemoKey(k => k + 1);
            }, prefersReducedMotion() ? 0 : 280);
        });
    }, [onStage, selected]);

    const closeSetup = useCallback(() => {
        const run = ++panelRun.current;
        const out = animate(panelRef.current, [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateX(18px)' },
        ], { duration: 160, fill: 'forwards' });
        void finished(out).then(() => {
            if (run !== panelRun.current) return;
            entrance.current = { kind: 'close' };
            setMode('info');
        });
    }, []);

    // ── Telefon: z listy do ekranu funkcji i z powrotem ──
    const openFromList = (id: PhoneFeatureId) => {
        const run = ++panelRun.current;
        const out = animate(listRef.current, [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateX(-18px)' },
        ], { duration: 160, fill: 'forwards' });
        void finished(out).then(() => {
            if (run !== panelRun.current) return;
            entrance.current = { kind: 'detail' };
            if (id !== selected) onFeatureChange(id);
            setMode('info');
            setListOpen(false);
        });
    };

    const backToList = () => {
        const run = ++panelRun.current;
        const out = animate(detailRef.current, [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateX(18px)' },
        ], { duration: 160, fill: 'forwards' });
        void finished(out).then(() => {
            if (run !== panelRun.current) return;
            entrance.current = { kind: 'list' };
            setListOpen(true);
        });
    };

    // ── Znacznik w składzie: jedzie do wybranej pozycji zamiast przeskakiwać ──
    const [indicator, setIndicator] = useState<{ y: number; h: number } | null>(null);
    const [instantIndicator, setInstantIndicator] = useState(true);

    useLayoutEffect(() => {
        const roster = rosterRef.current;
        const measure = () => {
            const item = itemRefs.current.get(selected);
            if (item) setIndicator({ y: item.offsetTop, h: item.offsetHeight });
        };
        measure();
        if (!roster || typeof ResizeObserver === 'undefined') return;
        // Zmiana szerokości (pasek boczny, obrót) przestawia znacznik bez jazdy.
        const observer = new ResizeObserver(() => { setInstantIndicator(true); measure(); });
        observer.observe(roster);
        return () => observer.disconnect();
    }, [selected, features, compact]);

    useEffect(() => {
        if (!instantIndicator) return;
        const frame = requestAnimationFrame(() => setInstantIndicator(false));
        return () => cancelAnimationFrame(frame);
    }, [instantIndicator, indicator]);

    // ── Klawiatura: strzałki chodzą po składzie jak po zakładkach ──
    const onRosterKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const index = features.indexOf(selected);
        let next: number | null = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % features.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + features.length) % features.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = features.length - 1;
        if (next === null) return;
        event.preventDefault();
        const id = features[next];
        itemRefs.current.get(id)?.focus();
        onFeatureChange(id);
    };

    const info = PHONE_FEATURES[onStage];
    const setupOpen = mode === 'setup';

    const stage = (
        <Stage id="phone-stage" role={compact ? undefined : 'tabpanel'} aria-labelledby={compact ? undefined : `phone-tab-${onStage}`} $setup={setupOpen}>
            {/* Makieta, nie treść: czytnik dostaje to samo w opisie obok. */}
            <PhoneSlot ref={phoneRef} aria-hidden="true" $setup={setupOpen}>
                <PhoneFrame>
                    <PhoneScreenArea ref={screenRef} $tone={screenTone(onStage)} key={onStage}>
                        <PhoneScreen feature={onStage} demoKey={demoKey} />
                    </PhoneScreenArea>
                    <PhoneNotch />
                </PhoneFrame>
            </PhoneSlot>

            <Panel ref={panelRef} $setup={setupOpen}>
                {setupOpen ? (
                    <>
                        <SetupHead>
                            <Button variant="ghost" size="sm" onClick={closeSetup}>
                                <ChevronLeft aria-hidden="true" />
                                Wróć
                            </Button>
                            <SetupTitle>{info.name}</SetupTitle>
                        </SetupHead>
                        <PhoneSetup feature={onStage} />
                    </>
                ) : (
                    <>
                        <InfoTitle>{info.name}</InfoTitle>
                        <InfoText>{info.description}</InfoText>
                        {onStage === 'camera' && (
                            <Places>
                                {CAMERA_PLACES.map(place => (
                                    <div key={place.where}>
                                        <dt>{place.where}</dt>
                                        <dd>{place.what}</dd>
                                    </div>
                                ))}
                            </Places>
                        )}
                        {info.cta && (
                            <div>
                                <Cta variant="primary" size="lg" onClick={openSetup}>
                                    {info.cta}
                                    <ArrowRight aria-hidden="true" />
                                </Cta>
                            </div>
                        )}
                    </>
                )}
            </Panel>
        </Stage>
    );

    if (compact) {
        return (
            <Root ref={rootRef}>
                {listOpen ? (
                    <MobileList ref={listRef} aria-label="Funkcje telefonu">
                        {features.map(id => (
                            <MobileRow key={id} type="button" onClick={() => openFromList(id)}>
                                <span>
                                    <strong>{PHONE_FEATURES[id].name}</strong>
                                    <span>{statuses[id]}</span>
                                </span>
                                <ChevronRight aria-hidden="true" />
                            </MobileRow>
                        ))}
                    </MobileList>
                ) : (
                    <MobileDetail ref={detailRef}>
                        {/* W ustawieniach funkcji „Wróć" prowadzi do jej opisu, stąd - do listy. */}
                        {!setupOpen && (
                            <MobileBack type="button" onClick={backToList}>
                                <ChevronLeft aria-hidden="true" />
                                Funkcje telefonu
                            </MobileBack>
                        )}
                        {stage}
                    </MobileDetail>
                )}
            </Root>
        );
    }

    return (
        <Root ref={rootRef}>
            <Layout $setup={setupOpen}>
                <RosterWrap $setup={setupOpen} inert={setupOpen}>
                    <Roster
                        ref={rosterRef}
                        role="tablist"
                        aria-label="Funkcje telefonu"
                        aria-orientation="vertical"
                        onKeyDown={onRosterKeyDown}
                    >
                        {indicator && (
                            <Indicator
                                aria-hidden="true"
                                $instant={instantIndicator}
                                style={{ height: indicator.h, transform: `translateY(${indicator.y}px)` }}
                            />
                        )}
                        {features.map(id => (
                            <RosterItem
                                key={id}
                                ref={el => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id); }}
                                type="button"
                                role="tab"
                                id={`phone-tab-${id}`}
                                aria-selected={id === selected}
                                aria-controls="phone-stage"
                                tabIndex={id === selected ? 0 : -1}
                                $active={id === selected}
                                onClick={() => onFeatureChange(id)}
                            >
                                <strong>{PHONE_FEATURES[id].name}</strong>
                                <span>{statuses[id]}</span>
                            </RosterItem>
                        ))}
                    </Roster>
                </RosterWrap>
                {stage}
            </Layout>
        </Root>
    );
}

// ─── Style ───────────────────────────────────────────────────────────────────

/** Węższa sekcja (laptop z rozwiniętym paskiem bocznym): mniejszy telefon i skład. */
const MEDIUM = '(max-width: 860px)';
/** Jeszcze węższa: opis schodzi pod telefon, skład zostaje kolumną. */
const NARROW = '(max-width: 700px)';
/** Telefon (COMPACT_WIDTH): lista i ekran funkcji, makieta telefonu mała nad opisem. */
const COMPACT = `(max-width: ${COMPACT_WIDTH - 1}px)`;

const Root = styled.div`
    container: phone-settings / inline-size;
    min-width: 0;
`;

const Layout = styled.div<{ $setup: boolean }>`
    display: grid;
    grid-template-columns: ${p => (p.$setup ? '0px' : '200px')} minmax(0, 1fr);
    column-gap: ${p => (p.$setup ? '0px' : '32px')};
    align-items: start;
    transition: grid-template-columns 420ms cubic-bezier(.2, .8, .2, 1), column-gap 420ms cubic-bezier(.2, .8, .2, 1);

    @media (prefers-reduced-motion: reduce) { transition: none; }

    @container phone-settings ${MEDIUM} {
        grid-template-columns: ${p => (p.$setup ? '0px' : '184px')} minmax(0, 1fr);
        column-gap: ${p => (p.$setup ? '0px' : '24px')};
    }
`;

const RosterWrap = styled.div<{ $setup: boolean }>`
    min-width: 0;
    overflow: hidden;
    opacity: ${p => (p.$setup ? 0 : 1)};
    transform: ${p => (p.$setup ? 'translateX(-24px)' : 'none')};
    transition: opacity 260ms ease, transform 420ms cubic-bezier(.2, .8, .2, 1);

    @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const Roster = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    width: 200px;

    @container phone-settings ${MEDIUM} { width: 184px; }
`;

const Indicator = styled.span<{ $instant: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    border-left: 2px solid ${ui.brandInk};
    border-radius: 0 ${ui.radiusRow} ${ui.radiusRow} 0;
    background: ${ui.surface};
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    pointer-events: none;
    transition: ${p => (p.$instant ? 'none' : 'transform 380ms cubic-bezier(.34, 1.56, .64, 1), height 300ms ease')};

    @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const RosterItem = styled.button<{ $active: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 11px 14px;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    strong {
        font-size: 14.5px;
        font-weight: 600;
        color: ${p => (p.$active ? ui.ink : ui.textSecondary)};
        transition: color 240ms ease;
    }
    span {
        font-size: 12px;
        color: ${ui.textMuted};
    }
    &:hover strong { color: ${ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; border-radius: ${ui.radiusRow}; }
`;

const Stage = styled.div<{ $setup: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 32px;
    min-width: 0;

    @container phone-settings ${MEDIUM} { gap: 24px; }

    /* Opis pod telefonem; w ustawieniach skład jest schowany, więc miejsca jest dość obok. */
    @container phone-settings ${NARROW} {
        ${p => !p.$setup && css`flex-direction: column;`}
    }

    @container phone-settings ${COMPACT} {
        flex-direction: column;
        align-items: stretch;
        gap: 18px;
    }
`;

/**
 * Telefon skaluje się transformacją w ramce o przeskalowanych wymiarach: układ dookoła
 * widzi mały telefon, a ekran w środku liczy się tak samo jak w pełnym rozmiarze.
 */
const PhoneSlot = styled.div<{ $setup: boolean }>`
    --phone-scale: 1;
    flex-shrink: 0;
    width: calc(220px * var(--phone-scale));
    height: calc(440px * var(--phone-scale));

    > * { transform: scale(var(--phone-scale)); transform-origin: top left; }

    @container phone-settings ${MEDIUM} { --phone-scale: 0.82; }

    @container phone-settings ${COMPACT} {
        --phone-scale: 0.6;
        align-self: center;
        /* W ustawieniach funkcji na telefonie liczy się miejsce na ustawienia. */
        ${p => p.$setup && css`display: none;`}
    }
`;

const Panel = styled.div<{ $setup: boolean }>`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: ${p => (p.$setup ? '16px' : '12px')};
    /* Opis stoi na wysokości treści ekranu telefonu, a ustawienia od samej góry. */
    padding-top: ${p => (p.$setup ? '0' : '44px')};

    @container phone-settings ${NARROW} {
        ${p => !p.$setup && css`padding-top: 0;`}
    }
`;

const InfoTitle = styled.h3`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

const InfoText = styled.p`
    margin: 0 0 6px;
    max-width: 46ch;
    font-size: 14.5px;
    line-height: 1.6;
    color: ${ui.textSecondary};
`;

/** Jedyny wypełniony element sceny: krok następny, ze strzałką, która rusza się pod kursorem. */
const Cta = styled(Button)`
    box-shadow: 0 8px 22px rgba(3, 105, 161, 0.28);

    svg { transition: transform 200ms ease; }
    &:hover svg { transform: translateX(3px); }
`;

const Places = styled.dl`
    display: grid;
    gap: 8px;
    margin: 0;
    max-width: 46ch;

    div { display: flex; flex-wrap: wrap; gap: 0 8px; font-size: 13.5px; line-height: 1.5; }
    dt { font-weight: 600; color: ${ui.ink}; }
    dd { margin: 0; color: ${ui.textSecondary}; }
`;

const SetupHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
`;

const SetupTitle = styled.h3`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: ${ui.ink};
`;

/* Telefon: lista jak spis sekcji ustawień - biała powierzchnia, wiersz pod palec. */
const MobileList = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
    background: ${ui.surface};
    overflow: hidden;
`;

const MobileRow = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 12px 16px;
    border: none;
    border-bottom: 1px solid ${ui.lineSoft};
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:last-child { border-bottom: none; }
    &:active { background: ${ui.surfaceSoft}; }

    > span { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    strong { font-size: 15.5px; font-weight: 600; color: ${ui.ink}; }
    span span { font-size: 13px; color: ${ui.textMuted}; }
    > svg { width: 18px; height: 18px; flex-shrink: 0; color: ${ui.textFaint}; }
`;

const MobileDetail = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

/** Ten sam powrót co „‹ Ustawienia" ramy (SettingsView): odnośnik, nie przycisk. */
const MobileBack = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: -4px;
    padding: 4px;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;

    svg { width: 18px; height: 18px; }
`;
