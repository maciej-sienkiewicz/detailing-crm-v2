import React, { useRef, useState, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrap, Blurred, Overlay, LockBadge, IconClosed, IconOpen, Message, UpgradeHint } from './LockedSection.styles';

const ClosedLockIcon = () => (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const OpenLockIcon = () => (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
);

// badge(36) + gap(7) + message(~16) + gap(7) + hint(~15) + padding(8+8) ≈ 97px
const HINT_MIN_HEIGHT = 98;

interface Props {
    locked: boolean;
    message: string;
    upgradeHint?: string;
    settingsTab?: string;
    children: React.ReactNode;
}

export function LockedSection({
    locked,
    message,
    upgradeHint = 'Rozszerz abonament',
    settingsTab = 'plan',
    children,
}: Props) {
    const navigate = useNavigate();
    const wrapRef = useRef<HTMLDivElement>(null);
    const [showHint, setShowHint] = useState(false);

    useLayoutEffect(() => {
        if (!locked) return;
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            setShowHint(entry.contentRect.height >= HINT_MIN_HEIGHT);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [locked]);

    if (!locked) return <>{children}</>;

    return (
        <Wrap ref={wrapRef} $locked>
            <Blurred>{children}</Blurred>
            <Overlay>
                <LockBadge
                    type="button"
                    onClick={() => navigate(`/settings?tab=${settingsTab}`)}
                    title="Przejdź do ustawień abonamentu"
                >
                    <IconClosed><ClosedLockIcon /></IconClosed>
                    <IconOpen><OpenLockIcon /></IconOpen>
                </LockBadge>
                <Message>{message}</Message>
                {showHint && <UpgradeHint>{upgradeHint}</UpgradeHint>}
            </Overlay>
        </Wrap>
    );
}
