import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { pinApi } from '../api/pinApi';
import { useStudioProfiles } from '../hooks/usePinStatus';
import { useAuth } from '@/core/context/AuthContext';
import { useKnownProfiles } from '../hooks/useKnownProfiles';
import type { StudioProfile } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); }`;
const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

// ─── Overlay ──────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(10, 13, 20, 0.97);
    z-index: 9000;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    animation: ${fadeIn} 200ms ease;
    backdrop-filter: blur(4px);
    padding: 56px 16px 32px;
    box-sizing: border-box;
    justify-content: safe center;
`;

// CloseBtn is fixed so it stays in the corner even when overlay scrolls
const CloseBtn = styled.button`
    position: fixed;
    top: 14px;
    right: 18px;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    z-index: 9001;
    transition: all 150ms;
    display: flex;
    align-items: center;

    &:hover { color: #e2e8f0; background: rgba(255,255,255,0.06); }
`;

// ─── Profile list view ────────────────────────────────────────────────────────

const Title = styled.h1`
    color: #fff;
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 6px;
    text-align: center;

    @media (max-width: 480px)          { font-size: 21px; }
    @media (max-height: 500px)         { font-size: 18px; margin-bottom: 2px; }
`;

const Subtitle = styled.p`
    color: #94a3b8;
    font-size: 14px;
    margin: 0 0 36px;
    text-align: center;

    @media (max-width: 480px)          { font-size: 13px; margin-bottom: 24px; }
    @media (max-height: 500px)         { font-size: 12px; margin-bottom: 16px; }
`;

const ProfileGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    max-width: 720px;
    width: 100%;
    animation: ${slideUp} 250ms ease;

    @media (max-width: 480px)  { gap: 10px; }
    @media (max-height: 500px) {
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: visible;
        padding-bottom: 6px;
        justify-content: flex-start;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
    }
`;

const ProfileCard = styled.button<{ $locked?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 18px 14px;
    background: transparent;
    border: 2px solid transparent;
    border-radius: 16px;
    cursor: ${({ $locked }) => ($locked ? 'not-allowed' : 'pointer')};
    transition: all 200ms ease;
    min-width: 110px;
    flex-shrink: 0;
    opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};

    @media (max-width: 480px)  { min-width: 96px;  padding: 14px 10px; gap: 8px; }
    @media (max-height: 500px) { min-width: 86px;  padding: 10px 8px;  gap: 6px; }

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
    }
`;

const Avatar = styled.div<{ $locked?: boolean }>`
    width: 76px;
    height: 76px;
    border-radius: 12px;
    background: ${({ $locked }) => ($locked ? '#334155' : 'linear-gradient(135deg, #0ea5e9, #6366f1)')};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    position: relative;
    flex-shrink: 0;

    @media (max-width: 480px)  { width: 62px; height: 62px; font-size: 20px; border-radius: 10px; }
    @media (max-height: 500px) { width: 52px; height: 52px; font-size: 17px; border-radius: 8px;  }
`;

const LockBadge = styled.div`
    position: absolute;
    bottom: -6px; right: -6px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: #ef4444;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid rgba(10, 13, 20, 0.97);
`;

const NoPinBadge = styled.div`
    position: absolute;
    bottom: -6px; right: -6px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: #64748b;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid rgba(10, 13, 20, 0.97);
`;

const ProfileName = styled.span`
    color: #e2e8f0;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    max-width: 110px;
    line-height: 1.3;

    @media (max-width: 480px)  { font-size: 12px; }
    @media (max-height: 500px) { font-size: 11px; }
`;

const ProfileRole = styled.span`
    color: #64748b;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
`;

const ProfileLockHint = styled.span`
    color: #ef4444;
    font-size: 10px;
    font-weight: 600;
    text-align: center;
`;

// ─── PIN entry view ───────────────────────────────────────────────────────────

const ModalWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    animation: ${slideUp} 200ms ease;
    width: 100%;
    max-width: 480px;

    @media (max-height: 500px) {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 32px;
        max-width: 640px;
    }
`;

const ModalInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    @media (max-height: 500px) { gap: 10px; }
`;

const ModalNumpadSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    @media (max-height: 500px) { gap: 10px; }
`;

const ModalAvatar = styled.div`
    width: 68px; height: 68px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700; color: #fff;

    @media (max-width: 480px)  { width: 58px; height: 58px; font-size: 19px; }
    @media (max-height: 500px) { width: 50px; height: 50px; font-size: 16px; border-radius: 10px; }
`;

const ModalName = styled.h2`
    color: #fff;
    font-size: 20px; font-weight: 700;
    margin: 0; text-align: center;

    @media (max-width: 480px)  { font-size: 17px; }
    @media (max-height: 500px) { font-size: 15px; }
`;

const PinDots = styled.div<{ $shake?: boolean }>`
    display: flex;
    gap: 14px;
    animation: ${({ $shake }) => $shake ? shake : 'none'} 400ms ease;
`;

const PinDot = styled.div<{ $filled: boolean }>`
    width: 15px; height: 15px;
    border-radius: 50%;
    background: ${({ $filled }) => ($filled ? '#0ea5e9' : 'rgba(255,255,255,0.15)')};
    border: 2px solid ${({ $filled }) => ($filled ? '#0ea5e9' : 'rgba(255,255,255,0.25)')};
    transition: all 150ms ease;
`;

const NumPad = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 64px);
    gap: 10px;

    @media (max-width: 360px)  { grid-template-columns: repeat(3, 56px); gap: 8px; }
    @media (max-height: 500px) { grid-template-columns: repeat(3, 52px); gap: 7px; }
`;

const NumBtn = styled.button`
    width: 64px; height: 64px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #fff;
    font-size: 20px; font-weight: 600;
    cursor: pointer;
    transition: all 150ms;
    display: flex; align-items: center; justify-content: center;

    @media (max-width: 360px)  { width: 56px; height: 56px; font-size: 18px; }
    @media (max-height: 500px) { width: 52px; height: 52px; font-size: 17px; }

    &:hover  { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); }
    &:active { transform: scale(0.92); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    color: #ef4444;
    font-size: 13px; font-weight: 600;
    margin: 0; text-align: center;
    max-width: 220px;

    @media (max-height: 500px) { font-size: 11px; }
`;

const PasswordLoginLink = styled.button`
    background: none; border: none;
    color: #64748b; font-size: 13px;
    cursor: pointer; padding: 0;
    text-decoration: underline;

    @media (max-height: 500px) { font-size: 11px; }

    &:hover { color: #94a3b8; }
`;

const BackBtn = styled.button`
    background: none; border: none;
    color: #64748b; font-size: 13px;
    cursor: pointer;
    display: flex; align-items: center; gap: 6px;
    padding: 0; align-self: flex-start;

    @media (max-height: 500px) { font-size: 11px; }

    &:hover { color: #94a3b8; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (firstName: string, lastName: string) =>
    (firstName[0] ?? '').toUpperCase() + (lastName[0] ?? '').toUpperCase();

const getRoleLabel = (profile: StudioProfile) =>
    profile.isOwner ? 'Właściciel' : 'Pracownik';

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
    onClose: () => void;
    /** When true, session is locked: no close/escape, only PIN or password login allowed */
    lockMode?: boolean;
}

export const UserSwitcherPanel = ({ onClose, lockMode = false }: Props) => {
    const navigate = useNavigate();
    const { setUser, setAuthenticated } = useAuth();
    const { addOrUpdateProfile } = useKnownProfiles();
    const { profiles, isLoading } = useStudioProfiles();

    const [selected, setSelected] = useState<StudioProfile | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (!lockMode) onClose();
                return;
            }
            if (!selected) return;
            if (e.key === 'Backspace') { handleDelete(); return; }
            if (/^\d$/.test(e.key)) handleDigit(e.key);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose, selected, pin, isSwitching, lockMode]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 450);
    };

    const handleDigit = (d: string) => {
        if (pin.length >= 4 || isSwitching) return;
        const next = pin + d;
        setPin(next);
        setError('');
        if (next.length === 4) submitPin(next);
    };

    const handleDelete = () => { setPin(p => p.slice(0, -1)); setError(''); };

    const submitPin = async (pinValue: string) => {
        if (!selected) return;
        setIsSwitching(true);
        try {
            const result = await pinApi.switchUser({ userId: selected.userId, pin: pinValue });
            if (result.user) {
                addOrUpdateProfile({
                    userId: result.user.userId,
                    studioId: result.user.studioId,
                    firstName: result.user.firstName ?? '',
                    lastName: result.user.lastName ?? '',
                    role: result.user.role,
                });
                setUser(result.user);
                setAuthenticated(true);
                onClose();
                if (!lockMode) navigate('/dashboard');
            }
        } catch {
            triggerShake();
            setPin('');
            setError('Nieprawidłowy kod PIN. Spróbuj ponownie.');
        } finally {
            setIsSwitching(false);
        }
    };

    const handlePasswordLogin = () => { onClose(); navigate('/login'); };

    const clearSelection = () => { setSelected(null); setPin(''); setError(''); };

    // ── PIN entry screen ──────────────────────────────────────────────────────
    if (selected) {
        return (
            <Overlay onClick={(e) => { if (!lockMode && e.target === e.currentTarget) clearSelection(); }}>
                {!lockMode && (
                    <CloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </CloseBtn>
                )}

                <ModalWrap>
                    {!lockMode && (
                        <BackBtn onClick={clearSelection}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                            Wróć do listy
                        </BackBtn>
                    )}

                    <ModalInfo>
                        <ModalAvatar>{getInitials(selected.firstName, selected.lastName)}</ModalAvatar>
                        <ModalName>{selected.firstName} {selected.lastName}</ModalName>
                        <PinDots $shake={shake}>
                            {[0, 1, 2, 3].map(i => <PinDot key={i} $filled={i < pin.length} />)}
                        </PinDots>
                        {error && <ErrorMsg>{error}</ErrorMsg>}
                    </ModalInfo>

                    <ModalNumpadSection>
                        <NumPad>
                            {['1','2','3','4','5','6','7','8','9'].map(d => (
                                <NumBtn key={d} onClick={() => handleDigit(d)} disabled={isSwitching}>{d}</NumBtn>
                            ))}
                            <span />
                            <NumBtn onClick={() => handleDigit('0')} disabled={isSwitching}>0</NumBtn>
                            <NumBtn onClick={handleDelete} disabled={isSwitching || pin.length === 0}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0-2-2z"/>
                                    <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                                </svg>
                            </NumBtn>
                        </NumPad>
                        <PasswordLoginLink onClick={handlePasswordLogin}>
                            Zaloguj podając hasło
                        </PasswordLoginLink>
                    </ModalNumpadSection>
                </ModalWrap>
            </Overlay>
        );
    }

    // ── Profile selection screen ──────────────────────────────────────────────
    return (
        <Overlay onClick={(e) => { if (!lockMode && e.target === e.currentTarget) onClose(); }}>
            {!lockMode && (
                <CloseBtn onClick={onClose} aria-label="Zamknij">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </CloseBtn>
            )}

            <Title>{lockMode ? 'Sesja zablokowana' : 'Wybierz użytkownika'}</Title>
            <Subtitle>
                {lockMode
                    ? 'Wprowadź kod PIN, aby wznowić sesję'
                    : 'Wybierz profil i wprowadź kod PIN, aby się przełączyć'}
            </Subtitle>

            {isLoading ? (
                <p style={{ color: '#64748b' }}>Ładowanie...</p>
            ) : (
                <ProfileGrid>
                    {profiles.map(profile => (
                        <ProfileCard
                            key={profile.userId}
                            $locked={profile.pinLocked || !profile.hasPinConfigured}
                            onClick={() => {
                                if (profile.pinLocked || !profile.hasPinConfigured) return;
                                setSelected(profile);
                                setPin('');
                                setError('');
                            }}
                            title={
                                profile.pinLocked
                                    ? 'PIN zablokowany: wymagane logowanie hasłem'
                                    : !profile.hasPinConfigured
                                    ? 'Brak kodu PIN: wymagane logowanie hasłem'
                                    : undefined
                            }
                        >
                            <Avatar $locked={profile.pinLocked}>
                                {getInitials(profile.firstName, profile.lastName)}
                                {profile.pinLocked && (
                                    <LockBadge>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        </svg>
                                    </LockBadge>
                                )}
                                {!profile.pinLocked && !profile.hasPinConfigured && (
                                    <NoPinBadge>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                        </svg>
                                    </NoPinBadge>
                                )}
                            </Avatar>
                            <ProfileName>{profile.firstName} {profile.lastName}</ProfileName>
                            <ProfileRole>{getRoleLabel(profile)}</ProfileRole>
                            {profile.pinLocked && <ProfileLockHint>PIN zablokowany</ProfileLockHint>}
                            {!profile.pinLocked && !profile.hasPinConfigured && (
                                <ProfileLockHint style={{ color: '#64748b' }}>Brak PIN</ProfileLockHint>
                            )}
                        </ProfileCard>
                    ))}
                </ProfileGrid>
            )}

            <PasswordLoginLink style={{ marginTop: 28 }} onClick={handlePasswordLogin}>
                Zaloguj podając hasło
            </PasswordLoginLink>
        </Overlay>
    );
};
