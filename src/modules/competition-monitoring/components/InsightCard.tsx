import React from 'react';
import styled from 'styled-components';
import { ExternalLink, Check } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { Insight, InsightSeverity } from '../types';

/**
 * Karta insightu: co się stało → dlaczego to ważne → co możesz zrobić.
 * Treść przychodzi z backendu gotowa, w prostym polskim, karta tylko ją układa.
 */

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
    HIGH: st.accentRed,
    MEDIUM: st.accentAmber,
    LOW: st.accentBlue,
};

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
    HIGH: 'Ważne',
    MEDIUM: 'Warto wiedzieć',
    LOW: 'Drobiazg',
};

const CardWrap = styled.article<{ $severity: InsightSeverity }>`
    position: relative;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-left: 4px solid ${p => SEVERITY_COLOR[p.$severity]};
    border-radius: ${st.radius};
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: ${st.shadowXs};
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const SeverityTag = styled.span<{ $severity: InsightSeverity }>`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${p => SEVERITY_COLOR[p.$severity]};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const DateLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    line-height: 1.35;
`;

const Body = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const ActionBox = styled.p`
    margin: 0;
    padding: 10px 12px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.5;

    strong { font-weight: 700; }
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const PostLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
    text-decoration: none;

    &:hover { text-decoration: underline; }

    svg { width: 13px; height: 13px; }
`;

const DismissBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textMuted};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { border-color: ${st.accentGreen}; color: ${st.accentGreen}; }

    svg { width: 12px; height: 12px; }
`;

export const InsightCard: React.FC<{
    insight: Insight;
    onDismiss?: (id: string) => void;
}> = ({ insight, onDismiss }) => (
    <CardWrap $severity={insight.severity}>
        <TopRow>
            <SeverityTag $severity={insight.severity}>{SEVERITY_LABEL[insight.severity]}</SeverityTag>
            <DateLabel>
                {new Date(insight.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
            </DateLabel>
        </TopRow>
        <Title>{insight.title}</Title>
        <Body>{insight.body}</Body>
        <ActionBox>
            <strong>Co możesz zrobić: </strong>
            {insight.actionText}
        </ActionBox>
        <FooterRow>
            {insight.permalink ? (
                <PostLink href={insight.permalink} target="_blank" rel="noopener noreferrer">
                    Zobacz post na Instagramie <ExternalLink />
                </PostLink>
            ) : (
                <span />
            )}
            {onDismiss && insight.status === 'NEW' && (
                <DismissBtn onClick={() => onDismiss(insight.id)}>
                    <Check /> Załatwione
                </DismissBtn>
            )}
        </FooterRow>
    </CardWrap>
);
