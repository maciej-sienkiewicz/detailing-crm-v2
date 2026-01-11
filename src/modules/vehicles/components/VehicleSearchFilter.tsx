import styled from 'styled-components';
import { t } from '@/common/i18n';

const SearchContainer = styled.div`
    position: relative;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        width: 320px;
    }
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${props => props.theme.colors.textMuted};
    pointer-events: none;

    svg {
        width: 18px;
        height: 18px;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    padding-left: 42px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    transition: all 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

interface VehicleSearchFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export const VehicleSearchFilter = ({ value, onChange }: VehicleSearchFilterProps) => (
    <SearchContainer>
        <SearchIcon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
            </svg>
        </SearchIcon>
        <SearchInput
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={t.vehicles.searchPlaceholder}
        />
    </SearchContainer>
);