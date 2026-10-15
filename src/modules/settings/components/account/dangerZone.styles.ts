import styled from 'styled-components';

/** Wspólne dla obu nieodwracalnych operacji na koncie: wyczyszczenia i usunięcia. */

export const WarnBox = styled.div`
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const WarnTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #dc2626;
`;

export const WarnText = styled.p`
    margin: 0;
    font-size: 13px;
    color: #0f172a;
    line-height: 1.6;
`;

export const LegalNote = styled.p`
    margin: 0;
    font-size: 12px;
    color: #b91c1c;
    line-height: 1.5;
    font-weight: 500;
`;
