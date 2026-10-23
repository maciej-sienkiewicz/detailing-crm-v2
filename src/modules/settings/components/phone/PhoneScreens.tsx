// src/modules/settings/components/phone/PhoneScreens.tsx
//
// Ekran telefonu na scenie Ustawienia → Telefon: to, co człowiek zobaczy u siebie,
// zamiast opisu funkcji. Treści są przepisane z prawdziwych powiadomień (backend:
// PushPayload, service-worker.js), żeby makieta nie obiecywała czegoś, czego telefon
// nie pokaże - np. kontakt z CardDAV niesie tylko imię i numer, więc ekran połączenia
// nie pokazuje auta.
//
// Każdy ekran zwraca płaską listę bloków: scena wprowadza je po kolei (staggerIn),
// a `demoKey` - zwiększany po otwarciu ustawień - odgrywa na telefonie samą funkcję.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ui } from '@/common/components/ui';
import type { PhoneFeatureId } from './phoneFeatures';
import { animate, SPRING } from './motion';

const MARK_SRC = '/brand/detailboost-mark-white.svg?v=3';

// ─── Rama ─────────────────────────────────────────────────────────────────────

export const PhoneFrame = styled.div`
    position: relative;
    width: 220px;
    height: 440px;
    flex-shrink: 0;
    border: 7px solid ${ui.ink};
    border-radius: 38px;
    background: ${ui.ink};
    overflow: hidden;
`;

export const PhoneNotch = styled.span`
    position: absolute;
    top: 9px;
    left: 50%;
    z-index: 2;
    width: 64px;
    height: 16px;
    border-radius: 8px;
    background: ${ui.ink};
    transform: translateX(-50%);
`;

/** Tapeta zależy od ekranu: blokada jasna w barwie marki, połączenie ciemne jak w iOS. */
export const PhoneScreenArea = styled.div<{ $tone: 'light' | 'dark' }>`
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    padding: 38px 12px 14px;
    border-radius: 31px;
    background: ${p => p.$tone === 'dark'
        ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
        : 'linear-gradient(165deg, #e0f2fe 0%, #f1f5f9 52%, #e2e8f0 100%)'};
    color: ${p => (p.$tone === 'dark' ? '#f8fafc' : ui.ink)};
    transition: background 0.3s ease;
`;

// ─── Ekran blokady z powiadomieniami ─────────────────────────────────────────

interface Notice {
    id: string;
    title: string;
    body: string;
    when: string;
    action?: string;
}

const PUSH_NOTICES: Notice[] = [
    { id: 'lead', title: 'Nowy lead', body: 'Kamil Zieliński, z Instagrama.', when: 'teraz' },
    { id: 'reservation', title: 'Nowa rezerwacja: jutro 9:00', body: 'Anna Nowak, BMW X3. Powłoka ceramiczna.', when: '8 min' },
    { id: 'earning', title: 'Właśnie zarobiłeś 2 460,00 zł', body: 'Pojazd wydany: Audi A6.', when: '1 godz.' },
];

const PUSH_DEMO: Notice = { id: 'demo', title: 'Nowy lead', body: 'Marta Kowalczyk, formularz na stronie.', when: 'teraz' };

// Ta sama treść co w service-worker.js (showCallNotification).
const DIAL_DEMO: Notice = {
    id: 'demo',
    title: 'Zadzwoń: Anna Nowak',
    body: 'Numer 600 123 456, zlecono z komputera.',
    when: 'teraz',
    action: 'Zadzwoń',
};

const todayLabel = () => new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Pokazy od zamontowania ekranu: `demoKey` rośnie po każdym otwarciu ustawień, a ekran
 * liczy od wartości, z którą wszedł na scenę - wcześniejsze pokazy dotyczyły innego ekranu.
 */
const useDemoCount = (demoKey: number): number => {
    const [mountedAt] = useState(demoKey);
    return demoKey - mountedAt;
};

/**
 * Nowe powiadomienie wpada z góry, a te pod nim zjeżdżają mu z drogi (FLIP): po każdym
 * układzie zapamiętujemy, gdzie stały, a po wstawieniu nowego cofamy je o różnicę
 * i puszczamy do nowego miejsca.
 */
function LockScreen({ base, demo, demoKey, idle }: { base: Notice[]; demo: Notice; demoKey: number; idle?: string }) {
    const demos = useDemoCount(demoKey);
    const notices = [
        ...Array.from({ length: demos }, (_, i) => ({ ...demo, id: `${demo.id}-${demos - i}` })),
        ...base,
    ].slice(0, 4);
    const listRef = useRef<HTMLDivElement>(null);
    // null = ekran jeszcze się nie ułożył; jego wejście robi scena, nie FLIP.
    const lastTops = useRef<Map<string, number> | null>(null);

    useLayoutEffect(() => {
        const before = lastTops.current;
        const cards = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-notice]') ?? []);
        lastTops.current = new Map(cards.map(el => [el.dataset.notice!, el.getBoundingClientRect().top]));
        if (!before) return;
        cards.forEach(el => {
            const was = before.get(el.dataset.notice!);
            if (was === undefined) {
                animate(el, [
                    { opacity: 0, transform: 'translateY(-48px) scale(.92)' },
                    { opacity: 1, transform: 'none' },
                ], { duration: 520, easing: SPRING });
                return;
            }
            // Telefon bywa pomniejszony (scale na ramce): różnica z ekranu przeliczona na
            // piksele samego powiadomienia, inaczej skok na końcu ruchu.
            const box = el.getBoundingClientRect();
            const scale = el.offsetHeight ? box.height / el.offsetHeight : 1;
            const delta = (was - box.top) / (scale || 1);
            if (delta) animate(el, [{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 420, easing: SPRING });
        });
    }, [demos]);

    return (
        <>
            <Clock>9:41</Clock>
            <DateLine>{todayLabel()}</DateLine>
            <NoticeList ref={listRef}>
                {notices.length === 0 && idle && <Idle>{idle}</Idle>}
                {notices.map(n => (
                    <NoticeCard key={n.id} data-notice={n.id}>
                        <NoticeHead>
                            <AppGlyph aria-hidden="true"><img src={MARK_SRC} alt="" /></AppGlyph>
                            <AppName>DetailBoost</AppName>
                            <time>{n.when}</time>
                        </NoticeHead>
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        {n.action && <NoticeAction>{n.action}</NoticeAction>}
                    </NoticeCard>
                ))}
            </NoticeList>
        </>
    );
}

// ─── Połączenie przychodzące ─────────────────────────────────────────────────

function CallScreen({ demoKey }: { demoKey: number }) {
    const acceptRef = useRef<HTMLSpanElement>(null);
    const seenDemo = useRef(demoKey);

    useEffect(() => {
        if (demoKey === seenDemo.current) return;
        seenDemo.current = demoKey;
        animate(acceptRef.current, [
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, .55)' },
            { transform: 'scale(1.12)', boxShadow: '0 0 0 14px rgba(34, 197, 94, 0)' },
            { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
        ], { duration: 900, iterations: 3, easing: 'ease-in-out' });
    }, [demoKey]);

    return (
        <>
            <CallLabel>połączenie przychodzące</CallLabel>
            <CallName>Tomasz Wiśniewski</CallName>
            <CallLabel>komórka</CallLabel>
            <CallButtons>
                <CallButton $tone="decline" aria-hidden="true" />
                <CallButton $tone="accept" ref={acceptRef} aria-hidden="true" />
            </CallButtons>
        </>
    );
}

// ─── Lead głosem ─────────────────────────────────────────────────────────────

function VoiceScreen({ demoKey }: { demoKey: number }) {
    const listening = useDemoCount(demoKey) > 0;

    return (
        <>
            <VoiceSpacer />
            <VoiceChoice>Nowy lead</VoiceChoice>
            <VoiceChoice>Notatka</VoiceChoice>
            <VoiceHint>
                {listening
                    ? Array.from({ length: 7 }, (_, i) => <WaveBar key={i} style={{ animationDelay: `${i * 70}ms`, animationDuration: `${520 + i * 60}ms` }} />)
                    : 'przytrzymaj i mów'}
            </VoiceHint>
        </>
    );
}

// ─── Aparat dla komputera ────────────────────────────────────────────────────

function CameraScreen() {
    const fillRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        animate(fillRef.current, [{ width: '0%' }, { width: '66%' }], { duration: 900, delay: 250, fill: 'backwards' });
    }, []);

    return (
        <>
            <Viewfinder aria-hidden="true"><span /></Viewfinder>
            <CameraStatus>Wysłano 4 z 6 zdjęć</CameraStatus>
            <Progress><span ref={fillRef} /></Progress>
            <CameraHint>Komputer w studiu już je widzi</CameraHint>
        </>
    );
}

// ─── Ekran główny z aplikacją ────────────────────────────────────────────────

function HomeScreen({ demoKey }: { demoKey: number }) {
    const iconRef = useRef<HTMLSpanElement>(null);
    const seenDemo = useRef(demoKey);

    useEffect(() => {
        animate(iconRef.current, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], {
            duration: 460, delay: 320, easing: SPRING, fill: 'backwards',
        });
    }, []);

    useEffect(() => {
        if (demoKey === seenDemo.current) return;
        seenDemo.current = demoKey;
        animate(iconRef.current, [
            { transform: 'scale(1) rotate(0)' },
            { transform: 'scale(1.18) rotate(-6deg)' },
            { transform: 'scale(1) rotate(0)' },
        ], { duration: 620, easing: SPRING });
    }, [demoKey]);

    return (
        <HomeGrid>
            {Array.from({ length: 16 }, (_, i) => (i === 5
                ? (
                    <HomeApp key={i}>
                        <AppIcon ref={iconRef}><img src={MARK_SRC} alt="" /></AppIcon>
                        <span>DetailBoost</span>
                    </HomeApp>
                )
                : <HomeApp key={i}><AppIcon $placeholder /></HomeApp>))}
        </HomeGrid>
    );
}

// ─── Wybór ekranu ────────────────────────────────────────────────────────────

export function PhoneScreen({ feature, demoKey }: { feature: PhoneFeatureId; demoKey: number }) {
    switch (feature) {
        case 'push': return <LockScreen base={PUSH_NOTICES} demo={PUSH_DEMO} demoKey={demoKey} />;
        case 'dial': return <LockScreen base={[]} demo={DIAL_DEMO} demoKey={demoKey} idle="czeka na numer z komputera" />;
        case 'calls': return <CallScreen demoKey={demoKey} />;
        case 'voice': return <VoiceScreen demoKey={demoKey} />;
        case 'camera': return <CameraScreen />;
        case 'app': return <HomeScreen demoKey={demoKey} />;
    }
}

// ─── Style ekranów ───────────────────────────────────────────────────────────

const Clock = styled.div`
    margin-top: 6px;
    font-size: 44px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
    text-align: center;
    font-variant-numeric: tabular-nums;
`;

const DateLine = styled.div`
    margin: 4px 0 16px;
    font-size: 12px;
    color: ${ui.textSecondary};
    text-align: center;

    &::first-letter { text-transform: uppercase; }
`;

const NoticeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

const Idle = styled.div`
    margin-top: 140px;
    font-size: 12px;
    color: ${ui.textMuted};
    text-align: center;
`;

const NoticeCard = styled.div`
    padding: 8px 10px 9px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    font-size: 11.5px;
    line-height: 1.35;

    strong { display: block; font-weight: 600; color: ${ui.ink}; }
    p { margin: 1px 0 0; color: ${ui.inkSoft}; }
`;

const NoticeHead = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 4px;
    font-size: 10.5px;
    color: ${ui.textMuted};
`;

const AppName = styled.span`
    flex: 1;
    min-width: 0;
    font-weight: 500;
`;

const AppGlyph = styled.span`
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 15px;
    height: 15px;
    border-radius: 4px;
    background: ${ui.brand};

    img { width: 10px; height: 10px; }
`;

const NoticeAction = styled.span`
    display: block;
    margin-top: 7px;
    padding-top: 6px;
    border-top: 1px solid ${ui.line};
    font-weight: 600;
    color: ${ui.brandInk};
    text-align: center;
`;

const CallLabel = styled.div`
    font-size: 12px;
    color: #cbd5e1;
    text-align: center;

    &:first-child { margin-top: 36px; }
`;

const CallName = styled.div`
    margin: 8px 0 4px;
    font-size: 22px;
    font-weight: 600;
    text-align: center;
`;

const CallButtons = styled.div`
    display: flex;
    justify-content: space-around;
    margin-top: auto;
    padding-bottom: 26px;
`;

const CallButton = styled.span<{ $tone: 'accept' | 'decline' }>`
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: ${p => (p.$tone === 'accept' ? '#22c55e' : '#ef4444')};
`;

const VoiceSpacer = styled.div`
    height: 56px;
`;

const VoiceChoice = styled.div`
    margin-bottom: 12px;
    padding: 22px 12px;
    border: 1px solid ${ui.line};
    border-radius: 18px;
    background: ${ui.surface};
    font-size: 16px;
    font-weight: 600;
    text-align: center;
`;

const wave = keyframes`
    from { transform: scaleY(0.2); }
    to   { transform: scaleY(1); }
`;

const VoiceHint = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 44px;
    font-size: 12px;
    color: ${ui.textMuted};
`;

const WaveBar = styled.span`
    width: 4px;
    height: 28px;
    border-radius: 2px;
    background: ${ui.ink};
    animation: ${wave} 0.6s ease-in-out infinite alternate both;

    @media (prefers-reduced-motion: reduce) { animation: none; transform: scaleY(0.6); }
`;

const Viewfinder = styled.div`
    position: relative;
    height: 240px;
    border-radius: 16px;
    background: linear-gradient(160deg, #334155 0%, #1e293b 100%);

    /* Rogi kadru - telefon jest tu aparatem, nie ekranem z treścią. */
    span {
        --corner: rgba(255, 255, 255, 0.75);
        position: absolute;
        inset: 22px;
        background:
            linear-gradient(var(--corner), var(--corner)) top left / 22px 2px,
            linear-gradient(var(--corner), var(--corner)) top left / 2px 22px,
            linear-gradient(var(--corner), var(--corner)) top right / 22px 2px,
            linear-gradient(var(--corner), var(--corner)) top right / 2px 22px,
            linear-gradient(var(--corner), var(--corner)) bottom left / 22px 2px,
            linear-gradient(var(--corner), var(--corner)) bottom left / 2px 22px,
            linear-gradient(var(--corner), var(--corner)) bottom right / 22px 2px,
            linear-gradient(var(--corner), var(--corner)) bottom right / 2px 22px;
        background-repeat: no-repeat;
    }
`;

const CameraStatus = styled.div`
    margin-top: 14px;
    font-size: 13px;
    font-weight: 600;
`;

const Progress = styled.div`
    height: 5px;
    margin-top: 6px;
    border-radius: 3px;
    background: rgba(15, 23, 42, 0.1);
    overflow: hidden;

    span { display: block; width: 66%; height: 100%; border-radius: 3px; background: ${ui.brand}; }
`;

const CameraHint = styled.div`
    margin-top: 8px;
    font-size: 12px;
    color: ${ui.textSecondary};
`;

const HomeGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px 10px;
    padding-top: 22px;
`;

const HomeApp = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;

    span:last-child:not(:first-child) {
        max-width: 100%;
        font-size: 9.5px;
        color: ${ui.inkSoft};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const AppIcon = styled.span<{ $placeholder?: boolean }>`
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    ${p => (p.$placeholder
        ? css`background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(15, 23, 42, 0.06);`
        : css`background: linear-gradient(160deg, ${ui.brand} 0%, ${ui.brandDeep} 100%);`)}

    img { width: 22px; height: 22px; }
`;
