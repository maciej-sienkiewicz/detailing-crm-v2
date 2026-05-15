import React from 'react';
import { Wrap, Blurred, Overlay, LockBadge, Message, UpgradeHint } from './LockedSection.styles';

const LockIcon = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

interface Props {
    locked: boolean;
    message: string;
    upgradeHint?: string;
    children: React.ReactNode;
}

export function LockedSection({ locked, message, upgradeHint = 'Rozszerz abonament', children }: Props) {
    if (!locked) return <>{children}</>;

    return (
        <Wrap>
            <Blurred>{children}</Blurred>
            <Overlay>
                <LockBadge><LockIcon /></LockBadge>
                <Message>{message}</Message>
                <UpgradeHint>{upgradeHint}</UpgradeHint>
            </Overlay>
        </Wrap>
    );
}
