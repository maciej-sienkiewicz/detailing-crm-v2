import styled from 'styled-components';
import type { ProtocolRule } from '../types';

const Card = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    transition: all ${props => props.theme.transitions.fast};
    cursor: pointer;

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
        transform: translateY(-2px);
    }
`;

const CardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
`;

const TitleSection = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentName = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.xs} 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
`;

const MandatoryIcon = styled.span`
    color: rgb(239, 68, 68); // red-500
    font-weight: 700;
`;

const Description = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const BadgeGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
    flex-wrap: wrap;
    margin-top: ${props => props.theme.spacing.sm};
`;

const Badge = styled.span<{ $variant: 'global' | 'service' | 'mandatory' | 'optional' }>`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: 2px ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;

    ${props => {
        switch (props.$variant) {
            case 'global':
                return `
                    background: rgb(239, 246, 255); // blue-50
                    color: rgb(37, 99, 235); // blue-600
                `;
            case 'service':
                return `
                    background: rgb(243, 232, 255); // purple-50
                    color: rgb(147, 51, 234); // purple-600
                `;
            case 'mandatory':
                return `
                    background: rgb(254, 242, 242); // red-50
                    color: rgb(220, 38, 38); // red-600
                `;
            case 'optional':
                return `
                    background: rgb(243, 244, 246); // gray-50
                    color: rgb(75, 85, 99); // gray-600
                `;
        }
    }}

    svg {
        width: 12px;
        height: 12px;
    }
`;

// Icons
const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WrenchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

interface ProtocolRuleCardProps {
    rule: ProtocolRule;
    onEdit?: (rule: ProtocolRule) => void; // Optional since rules are now immutable
    onRefresh?: () => void; // Optional
}

export const ProtocolRuleCard = ({ rule }: ProtocolRuleCardProps) => {
    // Note: Backend does not support updating or deleting protocol rules
    // Rules are immutable once created

    return (
        <Card>
            <CardHeader>
                <TitleSection>
                    <DocumentName>
                        {rule.isMandatory && <MandatoryIcon>*</MandatoryIcon>}
                        {rule.protocolTemplate?.name || 'Nieznany protokół'}
                    </DocumentName>
                    {rule.protocolTemplate?.description && (
                        <Description>{rule.protocolTemplate.description}</Description>
                    )}
                    <BadgeGroup>
                        <Badge $variant={rule.triggerType === 'GLOBAL_ALWAYS' ? 'global' : 'service'}>
                            {rule.triggerType === 'GLOBAL_ALWAYS' ? <GlobeIcon /> : <WrenchIcon />}
                            {rule.triggerType === 'GLOBAL_ALWAYS' ? 'Globalny' : rule.serviceName || 'Specyficzny'}
                        </Badge>
                        <Badge $variant={rule.isMandatory ? 'mandatory' : 'optional'}>
                            {rule.isMandatory ? <ShieldCheckIcon /> : null}
                            {rule.isMandatory ? 'Obowiązkowy' : 'Opcjonalny'}
                        </Badge>
                    </BadgeGroup>
                </TitleSection>
            </CardHeader>
        </Card>
    );
};
