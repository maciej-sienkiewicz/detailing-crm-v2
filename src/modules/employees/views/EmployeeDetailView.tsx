import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useEmployee } from '../hooks/useEmployees';
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { TerminateEmployeeModal } from '../components/TerminateEmployeeModal';
import { ContractCompensationTab } from '../components/ContractCompensationTab';
import { WorkTimeTab } from '../components/WorkTimeTab';
import { LeavesTab } from '../components/LeavesTab';
import { PayrollTab } from '../components/PayrollTab';
import { BonusesTab } from '../components/BonusesTab';
import { DocumentsTab } from '../components/DocumentsTab';

// ─── Layout ──────────────────────────────────────────────────────────────────

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    min-height: 100vh;
    background: ${st.bg};

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

const Position = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
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

const TerminateBtn = styled.button`
    padding: 8px 16px;
    background: none;
    border: 1px solid ${st.accentRed};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentRed};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.accentRedDim}; }
`;

// ─── Detail Grid ─────────────────────────────────────────────────────────────

const DetailGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-top: 4px;

    @media (max-width: 768px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const DetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const DetailLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const DetailValue = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    font-weight: 500;
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

const NotesBox = styled.div`
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 12px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
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

type TabId = 'profile' | 'employment' | 'bonuses' | 'worktime' | 'leaves' | 'payroll' | 'documents';

const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profil' },
    { id: 'employment', label: 'Umowy i wynagrodzenie' },
    { id: 'bonuses', label: 'Bonusy i dodatki' },
    { id: 'worktime', label: 'Czas pracy' },
    { id: 'leaves', label: 'Urlopy' },
    { id: 'payroll', label: 'Historia płatności' },
    { id: 'documents', label: 'Dokumenty' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const EmployeeDetailView = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabId>('employment');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTerminateOpen, setIsTerminateOpen] = useState(false);

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
                                    <InfoLabel>Email służbowy</InfoLabel>
                                    <InfoValue>{employee.email ?? '—'}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>Email prywatny</InfoLabel>
                                    <InfoValue>{employee.personalEmail ?? '—'}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>Telefon</InfoLabel>
                                    <InfoValue>{employee.phone ?? '—'}</InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>Dane formalne</InfoSectionTitle>
                            <InfoGrid>
                                <InfoItem>
                                    <InfoLabel>PESEL</InfoLabel>
                                    <InfoValue>{employee.pesel ?? '—'}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>NIP</InfoLabel>
                                    <InfoValue>{employee.nip ?? '—'}</InfoValue>
                                </InfoItem>
                            </InfoGrid>
                        </InfoSection>

                        {(employee.addressStreet || employee.addressCity || employee.addressPostalCode) && (
                            <InfoSection>
                                <InfoSectionTitle>Adres zamieszkania</InfoSectionTitle>
                                <InfoGrid>
                                    <InfoItem>
                                        <InfoLabel>Ulica</InfoLabel>
                                        <InfoValue>{employee.addressStreet ?? '—'}</InfoValue>
                                    </InfoItem>
                                    <InfoItem>
                                        <InfoLabel>Miasto</InfoLabel>
                                        <InfoValue>{employee.addressCity ?? '—'}</InfoValue>
                                    </InfoItem>
                                    <InfoItem>
                                        <InfoLabel>Kod pocztowy</InfoLabel>
                                        <InfoValue>{employee.addressPostalCode ?? '—'}</InfoValue>
                                    </InfoItem>
                                </InfoGrid>
                            </InfoSection>
                        )}

                        {employee.notes && (
                            <InfoSection>
                                <InfoSectionTitle>Notatki</InfoSectionTitle>
                                <NotesBox>{employee.notes}</NotesBox>
                            </InfoSection>
                        )}
                    </ProfileTabContent>
                );
            case 'employment':
                return <ContractCompensationTab employeeId={employeeId} />;
            case 'worktime':
                return <WorkTimeTab employeeId={employeeId} hireDate={employee.hireDate} />;
            case 'leaves':
                return <LeavesTab employeeId={employeeId} />;
            case 'bonuses':
                return <BonusesTab employeeId={employeeId} />;
            case 'payroll':
                return <PayrollTab employeeId={employeeId} />;
            case 'documents':
                return <DocumentsTab employeeId={employeeId} />;
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
                        <Position>{employee.position}</Position>
                        <MetaRow>
                            <EmployeeStatusBadge status={employee.status} />
                            <MetaItem>
                                Zatrudniony od: {new Date(employee.hireDate).toLocaleDateString('pl-PL')}
                            </MetaItem>
                            {employee.terminationDate && (
                                <MetaItem>
                                    Zwolniony: {new Date(employee.terminationDate).toLocaleDateString('pl-PL')}
                                </MetaItem>
                            )}
                        </MetaRow>
                        <DetailGrid style={{ marginTop: 8 }}>
                            {employee.email && (
                                <DetailItem>
                                    <DetailLabel>Email</DetailLabel>
                                    <DetailValue>{employee.email}</DetailValue>
                                </DetailItem>
                            )}
                            {employee.phone && (
                                <DetailItem>
                                    <DetailLabel>Telefon</DetailLabel>
                                    <DetailValue>{employee.phone}</DetailValue>
                                </DetailItem>
                            )}
                        </DetailGrid>
                    </ProfileInfo>
                </ProfileMain>

                {employee.status === 'ACTIVE' && (
                    <ProfileActions>
                        <EditBtn onClick={() => setIsEditOpen(true)}>Edytuj</EditBtn>
                        <TerminateBtn onClick={() => setIsTerminateOpen(true)}>Zwolnij</TerminateBtn>
                    </ProfileActions>
                )}
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

            {isTerminateOpen && (
                <TerminateEmployeeModal
                    isOpen={isTerminateOpen}
                    onClose={() => setIsTerminateOpen(false)}
                    onSuccess={() => { setIsTerminateOpen(false); navigate('/team'); }}
                    employeeId={employee.id}
                    employeeName={employee.fullName}
                />
            )}
        </ViewContainer>
    );
};
