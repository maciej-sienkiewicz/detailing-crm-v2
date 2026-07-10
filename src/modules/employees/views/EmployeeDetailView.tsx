import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useEmployee } from '../hooks/useEmployees';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { LeavesTab } from '../components/LeavesTab';

// ─── Layout ──────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
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
        padding: 40px 48px;
    }
`;

const BackLink = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    cursor: pointer;
    padding: 0;
    transition: color ${st.transition};

    &:hover {
        color: ${st.accentBlue};
    }
`;

// ─── Profile Header ───────────────────────────────────────────────────────────

const ProfileCard = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 24px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
`;

const ProfileMain = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const Avatar = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    flex-shrink: 0;
`;

const ProfileInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const FullName = styled.h1`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
`;

const MetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 4px;
`;

const MetaItem = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const AccountBadge = styled.span<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $active }) => ($active
        ? 'background: rgba(16,185,129,0.12); color: #059669;'
        : 'background: rgba(100,116,139,0.10); color: #64748B;')}
`;

const ProfileActions = styled.div`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
`;

const EditBtn = styled.button`
    padding: 8px 16px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
`;

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TabsWrapper = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

const TabBar = styled.div`
    display: flex;
    border-bottom: 1px solid ${st.border};
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const Tab = styled.button<{ $active: boolean }>`
    padding: 13px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid ${({ $active }) => ($active ? st.accentBlue : 'transparent')};
    font-size: ${st.fontSm};
    font-weight: ${({ $active }) => ($active ? '600' : '400')};
    color: ${({ $active }) => ($active ? st.accentBlue : st.textMuted)};
    cursor: pointer;
    white-space: nowrap;
    transition: all ${st.transition};
    &:hover { color: ${({ $active }) => ($active ? st.accentBlue : st.text)}; }
`;

const TabContent = styled.div`
    padding: 24px;
`;

// ─── Profile Tab Content ──────────────────────────────────────────────────────

const ProfileTabContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const InfoSection = styled.div``;

const InfoSectionTitle = styled.h3`
    margin: 0 0 12px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const InfoItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const InfoLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const InfoValue = styled.span`
    font-size: ${st.fontSm};
    color: ${st.text};
    font-weight: 500;
`;

// ─── Loading / Error ─────────────────────────────────────────────────────────

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
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

const ErrorContainer = styled.div`
    padding: 48px 24px;
    text-align: center;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
`;

// ─── Tabs definition ──────────────────────────────────────────────────────────
// Kolejne zakładki (dokumenty, czas pracy, przypomnienia o umowach/certyfikatach)
// dojdą wraz z kolejnymi iteracjami modułu kadrowego.

type TabId = 'profile' | 'leaves';

const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profil' },
    { id: 'leaves', label: 'Urlopy' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const EmployeeDetailView = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('leaves');
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { employee, isLoading, isError, refetch } = useEmployee(employeeId ?? '');

    if (isLoading) {
        return (
            <ViewContainer>
                <LoadingOverlay><Spinner /></LoadingOverlay>
            </ViewContainer>
        );
    }

    if (isError || !employee) {
        return (
            <ViewContainer>
                <ErrorContainer>
                    <p>Nie udało się załadować danych pracownika.</p>
                    <button onClick={() => refetch()} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>
                        Spróbuj ponownie
                    </button>
                </ErrorContainer>
            </ViewContainer>
        );
    }

    const initials = `${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase();

    const renderTabContent = () => {
        if (!employeeId) return null;
        switch (activeTab) {
            case 'profile':
                return (
                    <ProfileTabContent>
                        <InfoSection>
                            <InfoSectionTitle>Dane kontaktowe</InfoSectionTitle>
                            <InfoGrid>
                                <InfoItem>
                                    <InfoLabel>Email</InfoLabel>
                                    <InfoValue>{employee.email ?? '—'}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>Telefon</InfoLabel>
                                    <InfoValue>{employee.phone ?? '—'}</InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>Konto użytkownika</InfoSectionTitle>
                            <InfoGrid>
                                <InfoItem>
                                    <InfoLabel>Status konta</InfoLabel>
                                    <InfoValue>
                                        {employee.account
                                            ? (employee.account.isActive ? 'Aktywne' : 'Zablokowane')
                                            : 'Brak konta'}
                                    </InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>W systemie</InfoSectionTitle>
                            <InfoGrid>
                                <InfoItem>
                                    <InfoLabel>Dodany</InfoLabel>
                                    <InfoValue>{new Date(employee.createdAt).toLocaleDateString('pl-PL')}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>Ostatnia aktualizacja</InfoLabel>
                                    <InfoValue>{new Date(employee.updatedAt).toLocaleDateString('pl-PL')}</InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </InfoSection>
                    </ProfileTabContent>
                );
            case 'leaves':
                return <LeavesTab employeeId={employeeId} />;
        }
    };

    return (
        <ViewContainer>
            <BackLink onClick={() => navigate('/team')}>
                ← Powrót do listy pracowników
            </BackLink>

            <ProfileCard>
                <ProfileMain>
                    <Avatar>{initials}</Avatar>
                    <ProfileInfo>
                        <FullName>{employee.fullName}</FullName>
                        <MetaRow>
                            <AccountBadge $active={employee.account?.isActive}>
                                {employee.account
                                    ? (employee.account.isActive ? 'Konto aktywne' : 'Konto zablokowane')
                                    : 'Brak konta'}
                            </AccountBadge>
                            {employee.email && <MetaItem>{employee.email}</MetaItem>}
                            {employee.phone && <MetaItem>{employee.phone}</MetaItem>}
                        </MetaRow>
                    </ProfileInfo>
                </ProfileMain>

                <ProfileActions>
                    <EditBtn onClick={() => setIsEditOpen(true)}>Edytuj</EditBtn>
                </ProfileActions>
            </ProfileCard>

            <TabsWrapper>
                <TabBar>
                    {TABS.map(tab => (
                        <Tab
                            key={tab.id}
                            $active={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </Tab>
                    ))}
                </TabBar>
                <TabContent>
                    {renderTabContent()}
                </TabContent>
            </TabsWrapper>

            {isEditOpen && (
                <AddEmployeeModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    onSuccess={() => { setIsEditOpen(false); refetch(); }}
                    employee={employee}
                />
            )}
        </ViewContainer>
    );
};
