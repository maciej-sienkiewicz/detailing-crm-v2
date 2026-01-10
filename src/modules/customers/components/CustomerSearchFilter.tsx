import { ChangeEvent, useCallback } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';

const SearchContainer = styled.div`
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        max-width: 320px;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

interface CustomerSearchFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export const CustomerSearchFilter = ({
                                         value,
                                         onChange,
                                     }: CustomerSearchFilterProps) => {
    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            onChange(event.target.value);
        },
        [onChange]
    );

    return (
        <SearchContainer>
            <SearchInput
                type="text"
                value={value}
                onChange={handleChange}
                placeholder={t.customers.searchPlaceholder}
                aria-label={t.common.search}
            />
        </SearchContainer>
    );
};