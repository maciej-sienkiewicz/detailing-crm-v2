import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader/PageHeader';
import { useEmployee } from '../hooks/useEmployees';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { AccountManagementCard } from '../components/AccountManagementCard';
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

const SubtitleLink = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    transition: color 180ms ease;

    &:hover { color: #94a3b8; }

    svg { width: 13px; height: 13px; }
`;

const SubtitleSep = styled.span`
    color: #334155;
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

    return (
        <Page>
            <PageHeader
                title={employee.fullName}
                subtitle={
                    <>
                        <SubtitleLink onClick={() => navigate('/team')}>
                            <ArrowLeftIcon /> Pracownicy
                        </SubtitleLink>
                        {employee.email && (
                            <>
                                <SubtitleSep>·</SubtitleSep>
                                <span>{employee.email}</span>
                            </>
                        )}
                        {employee.phone && (
                            <>
                                <SubtitleSep>·</SubtitleSep>
                                <span>{employee.phone}</span>
                            </>
                        )}
                    </>
                }
                actions={
                    <PageHeaderGhostButton onClick={() => setIsEditOpen(true)}>
                        <PencilIcon /> Edytuj dane
                    </PageHeaderGhostButton>
                }
            />

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
                        <InfoRow>
                            <InfoIcon><ClockIcon /></InfoIcon>
                            <InfoText>
                                <InfoLabel>W systemie od</InfoLabel>
                                <InfoValue>
                                    {new Date(employee.createdAt).toLocaleDateString('pl-PL', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                </InfoValue>
                            </InfoText>
                        </InfoRow>
                    </SideSection>

                    <SideDivider />

                    <AccountManagementCard
                        employee={employee}
                        onChanged={() => refetch()}
                        onEmployeeDeleted={() => navigate('/team')}
                    />
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
