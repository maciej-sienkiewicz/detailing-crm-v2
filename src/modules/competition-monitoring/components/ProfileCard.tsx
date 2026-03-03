import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { InstagramProfile, InstagramProfileStatus } from '../types';

// ─── Status badge ──────────────────────────────────────────────────────────────

const statusConfig: Record<
    InstagramProfileStatus,
    { label: string; bg: string; color: string }
> = {
    ACTIVE: { label: 'Aktywny', bg: st.accentGreenDim, color: st.accentGreen },
    PENDING_APPROVAL: { label: 'Oczekuje na akceptację', bg: st.accentAmberDim, color: st.accentAmber },
    REJECTED: { label: 'Odrzucony', bg: st.accentRedDim, color: st.accentRed },
};

const StatusBadge = styled.span<{ $bg: string; $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    background: ${p => p.$bg};
    color: ${p => p.$color};
    white-space: nowrap;
`;

const StatusDot = styled.span<{ $color: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

// ─── Card ──────────────────────────────────────────────────────────────────────

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: ${st.shadowXs};
    transition: box-shadow ${st.transition}, border-color ${st.transition};

    &:hover {
        box-shadow: ${st.shadowMd};
        border-color: ${st.borderHover};
    }
`;

const Avatar = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f9a825, #e91e63, #9c27b0);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
`;

const Info = styled.div`
    flex: 1;
    min-width: 0;
`;

const Username = styled.div`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Meta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
    flex-wrap: wrap;
`;

const AddedAt = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const ApiErrorChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    background: ${st.accentRedDim};
    color: ${st.accentRed};
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'success' | 'danger' | 'ghost' }>`
    padding: 7px 14px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;

    ${p => p.$variant === 'primary' && `
        background: ${st.accentBlue};
        color: #fff;
        border-color: ${st.accentBlue};
        &:hover:not(:disabled) {
            background: #2563EB;
            border-color: #2563EB;
            transform: translateY(-1px);
        }
    `}
    ${p => p.$variant === 'success' && `
        background: ${st.accentGreenDim};
        color: ${st.accentGreen};
        border-color: transparent;
        &:hover:not(:disabled) {
            background: ${st.accentGreen};
            color: #fff;
        }
    `}
    ${p => p.$variant === 'danger' && `
        background: transparent;
        color: ${st.accentRed};
        border-color: ${st.accentRedDim};
        &:hover:not(:disabled) {
            background: ${st.accentRedDim};
        }
    `}
    ${p => p.$variant === 'ghost' && `
        background: ${st.bgCardAlt};
        color: ${st.textSecondary};
        border-color: ${st.border};
        &:hover:not(:disabled) {
            background: ${st.bgCardAlt};
            border-color: ${st.borderHover};
            color: ${st.text};
        }
    `}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
    }
`;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

interface ProfileCardProps {
    profile: InstagramProfile;
    isManagerOrOwner: boolean;
    isApproving: boolean;
    isRejecting: boolean;
    isRemoving: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onRemove: (id: string) => void;
    onViewPosts: (profile: InstagramProfile) => void;
}

export const ProfileCard = ({
    profile,
    isManagerOrOwner,
    isApproving,
    isRejecting,
    isRemoving,
    onApprove,
    onReject,
    onRemove,
    onViewPosts,
}: ProfileCardProps) => {
    const cfg = statusConfig[profile.status];

    return (
        <Card>
            <Avatar>{profile.username.charAt(0)}</Avatar>

            <Info>
                <Username>@{profile.username}</Username>
                <Meta>
                    <StatusBadge $bg={cfg.bg} $color={cfg.color}>
                        <StatusDot $color={cfg.color} />
                        {cfg.label}
                    </StatusBadge>
                    <AddedAt>Dodano {formatDate(profile.addedAt)}</AddedAt>
                    {profile.apiError && (
                        <ApiErrorChip>⚠ Błąd API</ApiErrorChip>
                    )}
                </Meta>
            </Info>

            <Actions>
                {profile.status === 'ACTIVE' && (
                    <Btn
                        $variant="primary"
                        onClick={() => onViewPosts(profile)}
                        title="Pokaż posty z ostatniej synchronizacji"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        Posty
                    </Btn>
                )}

                {profile.status === 'PENDING_APPROVAL' && isManagerOrOwner && (
                    <>
                        <Btn
                            $variant="success"
                            onClick={() => onApprove(profile.id)}
                            disabled={isApproving || isRejecting}
                        >
                            {isApproving ? '…' : '✓ Zatwierdź'}
                        </Btn>
                        <Btn
                            $variant="danger"
                            onClick={() => onReject(profile.id)}
                            disabled={isApproving || isRejecting}
                        >
                            {isRejecting ? '…' : '✕ Odrzuć'}
                        </Btn>
                    </>
                )}

                <Btn
                    $variant="ghost"
                    onClick={() => onRemove(profile.id)}
                    disabled={isRemoving}
                    title="Usuń profil"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                    </svg>
                    {isRemoving ? '…' : 'Usuń'}
                </Btn>
            </Actions>
        </Card>
    );
};
