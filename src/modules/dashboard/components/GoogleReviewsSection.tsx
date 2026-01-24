/**
 * Google Reviews Section Component
 * Displays Google reviews statistics, recent reviews, and competitor rankings
 */

import styled from 'styled-components';
import { Star, TrendingUp, Award, MessageCircle } from 'lucide-react';
import { t } from '@/common/i18n';
import type { GoogleReviewsData, GoogleReview, CompetitorRanking } from '../types';

interface GoogleReviewsSectionProps {
  data?: GoogleReviewsData;
}

const SectionContainer = styled.div`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.md};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  padding-bottom: ${(props) => props.theme.spacing.md};
  border-bottom: 2px solid ${(props) => props.theme.colors.border};
`;

const SectionTitle = styled.h3`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
  margin: 0;
  flex: 1;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.lg};

  @media (min-width: ${(props) => props.theme.breakpoints.sm}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const StatCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.colors.surfaceAlt};
  border-radius: ${(props) => props.theme.radii.md};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const StatLabel = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const StatValue = styled.div`
  font-size: ${(props) => props.theme.fontSizes.xxl};
  font-weight: ${(props) => props.theme.fontWeights.bold};
  color: ${(props) => props.theme.colors.primary};
  display: flex;
  align-items: baseline;
  gap: ${(props) => props.theme.spacing.xs};
`;

const StarRating = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StarIcon = styled(Star)<{ $filled: boolean }>`
  width: 20px;
  height: 20px;
  fill: ${(props) => (props.$filled ? '#fbbf24' : 'none')};
  stroke: ${(props) => (props.$filled ? '#fbbf24' : props.theme.colors.textMuted)};
`;

const NewBadge = styled.span`
  font-size: ${(props) => props.theme.fontSizes.xs};
  color: ${(props) => props.theme.colors.success};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.lg};

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const SubSectionTitle = styled.h4`
  font-size: ${(props) => props.theme.fontSizes.md};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
  margin: 0;
`;

const ReviewCard = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  transition: background-color ${(props) => props.theme.transitions.fast};

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.xs};
`;

const ReviewAuthor = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
`;

const SmallStarRating = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const SmallStarIcon = styled(Star)<{ $filled: boolean }>`
  width: 14px;
  height: 14px;
  fill: ${(props) => (props.$filled ? '#fbbf24' : 'none')};
  stroke: ${(props) => (props.$filled ? '#fbbf24' : props.theme.colors.textMuted)};
`;

const ReviewText = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: 1.5;
  margin-bottom: ${(props) => props.theme.spacing.xs};
`;

const ReviewMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${(props) => props.theme.fontSizes.xs};
  color: ${(props) => props.theme.colors.textMuted};
`;

const ReplyBadge = styled.span<{ $hasReply: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${(props) => props.theme.radii.full};
  background-color: ${(props) =>
    props.$hasReply ? props.theme.colors.successLight : props.theme.colors.warningLight};
  color: ${(props) => (props.$hasReply ? props.theme.colors.success : props.theme.colors.warning)};
  font-weight: ${(props) => props.theme.fontWeights.semibold};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const CompetitorTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const CompetitorRow = styled.div<{ $isOurs: boolean }>`
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  gap: ${(props) => props.theme.spacing.sm};
  align-items: center;
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) =>
    props.$isOurs ? props.theme.colors.successLight : props.theme.colors.surface};
  border: 1px solid
    ${(props) => (props.$isOurs ? props.theme.colors.success : props.theme.colors.border)};
  border-radius: ${(props) => props.theme.radii.md};
  transition: background-color ${(props) => props.theme.transitions.fast};

  &:hover {
    background-color: ${(props) =>
      props.$isOurs ? props.theme.colors.successLight : props.theme.colors.surfaceHover};
  }
`;

const Position = styled.div<{ $isOurs: boolean }>`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: ${(props) => props.theme.fontWeights.bold};
  color: ${(props) => (props.$isOurs ? props.theme.colors.success : props.theme.colors.textMuted)};
  text-align: center;
`;

const CompetitorName = styled.div<{ $isOurs: boolean }>`
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) =>
    props.$isOurs ? props.theme.fontWeights.semibold : props.theme.fontWeights.normal};
  color: ${(props) => props.theme.colors.text};
`;

const CompetitorRating = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};

  svg {
    width: 14px;
    height: 14px;
    fill: #fbbf24;
    stroke: #fbbf24;
  }
`;

const CompetitorReviews = styled.div`
  font-size: ${(props) => props.theme.fontSizes.xs};
  color: ${(props) => props.theme.colors.textMuted};
`;

const Skeleton = styled.div`
  height: 120px;
  background: linear-gradient(
    90deg,
    ${(props) => props.theme.colors.surfaceAlt} 0%,
    ${(props) => props.theme.colors.surfaceHover} 50%,
    ${(props) => props.theme.colors.surfaceAlt} 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: ${(props) => props.theme.radii.md};

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const renderStarRating = (rating: number, size: 'small' | 'large' = 'large') => {
  const stars = [];
  const StarComponent = size === 'small' ? SmallStarIcon : StarIcon;

  for (let i = 1; i <= 5; i++) {
    stars.push(<StarComponent key={i} $filled={i <= Math.round(rating)} />);
  }

  return size === 'small' ? (
    <SmallStarRating>{stars}</SmallStarRating>
  ) : (
    <StarRating>{stars}</StarRating>
  );
};

const formatRelativeDate = (timestamp: string): string => {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Dzisiaj';
  if (diffDays === 1) return 'Wczoraj';
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'tydzień' : 'tygodnie'} temu`;
  }
  const months = Math.floor(diffDays / 30);
  return `${months} ${months === 1 ? 'miesiąc' : 'miesięcy'} temu`;
};

const ReviewItem = ({ review }: { review: GoogleReview }) => (
  <ReviewCard>
    <ReviewHeader>
      <ReviewAuthor>{review.authorName}</ReviewAuthor>
      {renderStarRating(review.rating, 'small')}
    </ReviewHeader>
    <ReviewText>{review.text}</ReviewText>
    <ReviewMeta>
      <span>{formatRelativeDate(review.timestamp)}</span>
      <ReplyBadge $hasReply={review.hasReply}>
        <MessageCircle />
        {review.hasReply ? 'Udzielono odpowiedzi' : 'Brak odpowiedzi'}
      </ReplyBadge>
    </ReviewMeta>
  </ReviewCard>
);

const CompetitorItem = ({ competitor }: { competitor: CompetitorRanking }) => (
  <CompetitorRow $isOurs={competitor.isOurs}>
    <Position $isOurs={competitor.isOurs}>
      {competitor.position === 1 && <Award size={20} />}
      {competitor.position !== 1 && `#${competitor.position}`}
    </Position>
    <CompetitorName $isOurs={competitor.isOurs}>{competitor.name}</CompetitorName>
    <CompetitorRating>
      <Star size={14} />
      {competitor.rating.toFixed(1)}
    </CompetitorRating>
    <CompetitorReviews>({competitor.reviewCount})</CompetitorReviews>
  </CompetitorRow>
);

export const GoogleReviewsSection = ({ data }: GoogleReviewsSectionProps) => {
  if (!data) {
    return (
      <SectionContainer>
        <Skeleton />
      </SectionContainer>
    );
  }

  return (
    <SectionContainer>
      <SectionHeader>
        <SectionTitle>{t.dashboard.googleReviews.title}</SectionTitle>
      </SectionHeader>

      {/* Statistics Cards */}
      <StatsGrid>
        <StatCard>
          <StatLabel>
            <Star size={14} />
            {t.dashboard.googleReviews.averageRating}
          </StatLabel>
          <StatValue>
            {data.averageRating.toFixed(1)}
            {renderStarRating(data.averageRating)}
          </StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>
            <MessageCircle size={14} />
            {t.dashboard.googleReviews.totalReviews}
          </StatLabel>
          <StatValue>{data.totalReviews}</StatValue>
        </StatCard>

        <StatCard>
          <StatLabel>
            <TrendingUp size={14} />
            {t.dashboard.googleReviews.newReviews}
          </StatLabel>
          <StatValue>
            +{data.newReviews} <NewBadge>ostatnie 30 dni</NewBadge>
          </StatValue>
        </StatCard>
      </StatsGrid>

      {/* Recent Reviews and Competitor Rankings */}
      <ContentGrid>
        <SubSection>
          <SubSectionTitle>{t.dashboard.googleReviews.recentReviews}</SubSectionTitle>
          {data.recentReviews.slice(0, 3).map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </SubSection>

        <SubSection>
          <SubSectionTitle>{t.dashboard.googleReviews.competitorRanking}</SubSectionTitle>
          <CompetitorTable>
            {data.competitors.map((competitor) => (
              <CompetitorItem key={competitor.position} competitor={competitor} />
            ))}
          </CompetitorTable>
        </SubSection>
      </ContentGrid>
    </SectionContainer>
  );
};
