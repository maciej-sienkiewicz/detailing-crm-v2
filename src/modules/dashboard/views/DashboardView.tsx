/**
 * Dashboard View
 * Main dashboard page displaying operational metrics, analytics, and lead inbox
 */

import styled from 'styled-components';
import { OperationalScorecard } from '../components/OperationalScorecard';
import { AnalyticsSection } from '../components/AnalyticsSection';
import { LeadInbox } from '../components/LeadInbox';
import { SocialMediaPlaceholder } from '../components/SocialMediaPlaceholder';
import { useDashboard } from '../hooks';

const ViewContainer = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  padding: ${(props) => props.theme.spacing.lg};
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    padding: ${(props) => props.theme.spacing.xl};
  }
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.lg};

  @media (min-width: ${(props) => props.theme.breakpoints.lg}) {
    grid-template-columns: 2fr 1fr;
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.xxl};
  background-color: ${(props) => props.theme.colors.errorLight};
  border: 1px solid ${(props) => props.theme.colors.error};
  border-radius: ${(props) => props.theme.radii.lg};
  text-align: center;
`;

const ErrorTitle = styled.h2`
  font-size: ${(props) => props.theme.fontSizes.xl};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.error};
  margin: 0 0 ${(props) => props.theme.spacing.sm} 0;
`;

const ErrorMessage = styled.p`
  font-size: ${(props) => props.theme.fontSizes.md};
  color: ${(props) => props.theme.colors.textSecondary};
  margin: 0 0 ${(props) => props.theme.spacing.lg} 0;
`;

const RetryButton = styled.button`
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.lg};
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${(props) => props.theme.radii.md};
  font-size: ${(props) => props.theme.fontSizes.md};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  cursor: pointer;
  transition: opacity ${(props) => props.theme.transitions.fast};

  &:hover {
    opacity: 0.9;
  }

  &:active {
    opacity: 0.8;
  }
`;

export const DashboardView = () => {
  const {
    stats,
    revenue,
    callActivity,
    recentCalls,
    isLoading,
    isError,
    refetch,
    onAccept,
    onReject,
    onEdit,
  } = useDashboard();

  if (isError) {
    return (
      <ViewContainer>
        <ErrorContainer>
          <ErrorTitle>Wystąpił błąd</ErrorTitle>
          <ErrorMessage>Nie udało się załadować danych dashboardu.</ErrorMessage>
          <RetryButton onClick={() => refetch()}>Spróbuj ponownie</RetryButton>
        </ErrorContainer>
      </ViewContainer>
    );
  }

  return (
    <ViewContainer>
      {/* Operational Statistics - Full Width */}
      <OperationalScorecard stats={stats} />

      {/* Main Dashboard Grid */}
      <DashboardGrid>
        {/* Main Column - 2/3 width on desktop */}
        <MainColumn>
          {/* Analytics Section */}
          <AnalyticsSection revenue={revenue} callActivity={callActivity} />

          {/* Social Media Placeholder */}
          <SocialMediaPlaceholder />
        </MainColumn>

        {/* Side Column - 1/3 width on desktop */}
        <SideColumn>
          {/* Lead Inbox */}
          <LeadInbox
            calls={recentCalls}
            onAccept={onAccept}
            onEdit={onEdit}
            onReject={onReject}
          />
        </SideColumn>
      </DashboardGrid>
    </ViewContainer>
  );
};
