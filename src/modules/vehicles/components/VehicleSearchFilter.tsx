import styled from 'styled-components';
import { t } from '@/common/i18n';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 220px;
`;

const SearchIconEl = styled.svg`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${st.textMuted};
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 14px 9px 38px;
    background: ${st.bgCardAlt};
    border: 1.5px solid ${st.border};
    border-radius: 10px;
    font-size: 13px;
    color: ${st.text};
    transition: all ${st.transition};

    &::placeholder {
        color: ${st.textMuted};
    }

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        background: #fff;
        box-shadow: ${st.shadowBlue};
    }
`;

interface VehicleSearchFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export const VehicleSearchFilter = ({ value, onChange }: VehicleSearchFilterProps) => (
    <SearchWrapper>
        <SearchIconEl viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
        </SearchIconEl>
        <SearchInput
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={t.vehicles.searchPlaceholder}
        />
    </SearchWrapper>
);
