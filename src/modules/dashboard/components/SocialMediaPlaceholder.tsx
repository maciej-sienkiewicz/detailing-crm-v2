/**
 * Social Media Placeholder Component
 * Displays a disabled placeholder for future social media content generation feature
 */

import styled from 'styled-components';
import { Share2, Sparkles } from 'lucide-react';
import { t } from '@/common/i18n';

const PlaceholderContainer = styled.div`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.xl};
  box-shadow: ${(props) => props.theme.shadows.md};
  border: 1px dashed ${(props) => props.theme.colors.border};
  opacity: 0.7;
  transition: opacity ${(props) => props.theme.transitions.normal};

  &:hover {
    opacity: 0.85;
  }
`;

const PlaceholderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.md};
  text-align: center;
  min-height: 200px;
`;

const IconWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const MainIcon = styled(Share2)`
  width: 48px;
  height: 48px;
  color: ${(props) => props.theme.colors.textMuted};
`;

const SparkleIcon = styled(Sparkles)`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  color: ${(props) => props.theme.colors.primary};
`;

const PlaceholderTitle = styled.h3`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
  margin: 0;
`;

const PlaceholderDescription = styled.p`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textMuted};
  margin: 0;
  max-width: 320px;
`;

const ComingSoonBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.colors.surfaceAlt};
  color: ${(props) => props.theme.colors.textSecondary};
  border-radius: ${(props) => props.theme.radii.full};
  font-size: ${(props) => props.theme.fontSizes.xs};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const SocialMediaPlaceholder = () => {
  return (
    <PlaceholderContainer>
      <PlaceholderContent>
        <IconWrapper>
          <MainIcon />
          <SparkleIcon />
        </IconWrapper>
        <PlaceholderTitle>{t.dashboard.social.title}</PlaceholderTitle>
        <PlaceholderDescription>{t.dashboard.social.placeholder}</PlaceholderDescription>
        <ComingSoonBadge>Wkrótce</ComingSoonBadge>
      </PlaceholderContent>
    </PlaceholderContainer>
  );
};
