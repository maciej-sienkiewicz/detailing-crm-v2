import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useEmployee } from '../hooks/useEmployees';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { LeavesTab } from '../components/LeavesTab';

// ─── Layout ──────────────────────────────────────────────────────────────────

const Page = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};
    ${hexBackdrop}

    @media (min-width: 768px) {
        padding: 32px;
    }

    @media (min-width: 1280px) {
        padding: 36px 48px;
    }
`;

const BackLink = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    background: none;
    border: none;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    transition: color ${st.transition};

    &:hover { color: ${st.accentBlue}; }

    svg { width: 14px; height: 14px; }
`;

// ─── Hero ────────────────────────────────────────────────────────────────────

const Hero = styled.section`
    position: relative;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const HeroAccent = styled.div`
    height: 64px;
    background: ${st.gradientBlue};
    position: relative;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
            radial-gradient(circle at 85% -20%, rgba(255, 255, 255, 0.25) 0%, transparent 45%),
            radial-gradient(circle at 15% 120%, rgba(255, 255, 255, 0.12) 0%, transparent 40%);
    }
`;

const HeroBody = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 0 24px 20px;
    margin-top: -32px;
`;

const HeroMain = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 16px;
    min-width: 0;
`;

const Avatar = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 20px;
    background: ${st.gradientBlue};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    border: 3px solid ${st.bgCard};
    box-shadow: ${st.shadowMd};
`;

const HeroInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 2px;
    min-width: 0;
`;

const FullName = styled.h1`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
    line-height: 1.15;
`;

const ChipRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const Chip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border-radius: ${st.radiusFull};
    background: ${st.bgCardAlt};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};

    svg { width: 12px; height: 12px; color: ${st.textMuted}; }
`;

const AccountChip = styled.span<{ $tone: 'active' | 'blocked' | 'none' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    ${({ $tone }) => {
        if ($tone === 'active') return `background: ${st.accentGreenDim}; color: #059669;`;
        if ($tone === 'blocked') return `background: ${st.accentRedDim}; color: #DC2626;`;
        return `background: ${st.bgCardAlt}; color: ${st.textMuted};`;
    }}

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }
`;

const EditBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    box-shadow: ${st.shadowXs};
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
        box-shadow: ${st.shadowSm};
    }

    svg { width: 13px; height: 13px; }
`;

// ─── Content grid ────────────────────────────────────────────────────────────

const ContentGrid = styled.div`
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
    align-items: start;

    @media (max-width: 960px) {
        grid-template-columns: 1fr;
    }
`;

// ─── Sidebar (informacje) ────────────────────────────────────────────────────

const SideCard = styled.aside`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media (max-width: 960px) {
        order: 2;
    }
`;

const SideSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SideSectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const SideDivider = styled.div`
    height: 1px;
    background: ${st.bgCardAlt};
`;

const InfoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
`;

const InfoIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    color: ${st.textSecondary};
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }
`;

const InfoText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
`;

const InfoLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const InfoValue = styled.span<{ $muted?: boolean }>`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${({ $muted }) => ($muted ? st.textMuted : st.text)};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MainCol = styled.div`
    min-width: 0;

    @media (max-width: 960px) {
        order: 1;
    }
`;

// ─── Loading / Error ─────────────────────────────────────────────────────────

const CenterBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 400px;
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const ErrorText = styled.p`
    margin: 0;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
`;

const RetryBtn = styled.button`
    padding: 8px 20px;
    background: none;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;

    &:hover { background: ${st.accentBlueDim}; }
`;

// ─── Ikony ───────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const KeyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
    </svg>
);

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const PencilIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
);

// ─── Komponent ───────────────────────────────────────────────────────────────

export const EmployeeDetailView = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { employee, isLoading, isError, refetch } = useEmployee(employeeId ?? '');

    if (isLoading) {
        return (
            <Page>
                <CenterBox><Spinner /></CenterBox>
            </Page>
        );
    }

    if (isError || !employee || !employeeId) {
        return (
            <Page>
                <CenterBox>
                    <ErrorText>Nie udało się załadować danych pracownika.</ErrorText>
                    <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
                </CenterBox>
            </Page>
        );
    }

    const initials = `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase();
    const accountTone = employee.account
        ? (employee.account.isActive ? 'active' : 'blocked')
        : 'none';
    const accountLabel = employee.account
        ? (employee.account.isActive ? 'Konto aktywne' : 'Konto zablokowane')
        : 'Brak konta';

    return (
        <Page>
            <BackLink onClick={() => navigate('/team')}>
                <ArrowLeftIcon /> Pracownicy
            </BackLink>

            <Hero>
                <HeroAccent />
                <HeroBody>
                    <HeroMain>
                        <Avatar>{initials}</Avatar>
                        <HeroInfo>
                            <FullName>{employee.fullName}</FullName>
                            <ChipRow>
                                <AccountChip $tone={accountTone}>{accountLabel}</AccountChip>
                                {employee.email && (
                                    <Chip><MailIcon />{employee.email}</Chip>
                                )}
                                {employee.phone && (
                                    <Chip><PhoneIcon />{employee.phone}</Chip>
                                )}
                            </ChipRow>
                        </HeroInfo>
                    </HeroMain>

                    <EditBtn onClick={() => setIsEditOpen(true)}>
                        <PencilIcon /> Edytuj dane
                    </EditBtn>
                </HeroBody>
            </Hero>

            <ContentGrid>
                <SideCard>
                    <SideSection>
                        <SideSectionTitle>Kontakt</SideSectionTitle>
                        <InfoRow>
                            <InfoIcon><MailIcon /></InfoIcon>
                            <InfoText>
                                <InfoLabel>Email</InfoLabel>
                                <InfoValue $muted={!employee.email}>{employee.email ?? 'Nie podano'}</InfoValue>
                            </InfoText>
                        </InfoRow>
                        <InfoRow>
                            <InfoIcon><PhoneIcon /></InfoIcon>
                            <InfoText>
                                <InfoLabel>Telefon</InfoLabel>
                                <InfoValue $muted={!employee.phone}>{employee.phone ?? 'Nie podano'}</InfoValue>
                            </InfoText>
                        </InfoRow>
                    </SideSection>

                    <SideDivider />

                    <SideSection>
                        <SideSectionTitle>Dostęp do systemu</SideSectionTitle>
                        <InfoRow>
                            <InfoIcon><KeyIcon /></InfoIcon>
                            <InfoText>
                                <InfoLabel>Konto użytkownika</InfoLabel>
                                <InfoValue $muted={!employee.account}>
                                    {employee.account
                                        ? (employee.account.isActive ? 'Aktywne' : 'Zablokowane')
                                        : 'Nie utworzono'}
                                </InfoValue>
                            </InfoText>
                        </InfoRow>
                    </SideSection>

                    <SideDivider />

                    <SideSection>
                        <SideSectionTitle>W systemie</SideSectionTitle>
                        <InfoRow>
                            <InfoIcon><ClockIcon /></InfoIcon>
                            <InfoText>
                                <InfoLabel>Dodany</InfoLabel>
                                <InfoValue>
                                    {new Date(employee.createdAt).toLocaleDateString('pl-PL', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                </InfoValue>
                            </InfoText>
                        </InfoRow>
                    </SideSection>
                </SideCard>

                <MainCol>
                    <LeavesTab employeeId={employeeId} />
                </MainCol>
            </ContentGrid>

            {isEditOpen && (
                <AddEmployeeModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    onSuccess={() => { setIsEditOpen(false); refetch(); }}
                    employee={employee}
                />
            )}
        </Page>
    );
};
