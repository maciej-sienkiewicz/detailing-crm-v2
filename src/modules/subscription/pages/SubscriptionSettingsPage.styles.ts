import styled from 'styled-components';
import { ui } from '@/common/components/ui';

export const PageWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;

    @media (max-width: 767px) { gap: 20px; }
`;

export const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px 24px 24px;

    @media (max-width: 640px) { padding: 16px; }
`;

export const PlanHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
`;

export const Block = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

// `min(260px, 100%)`: na telefonie kolumna treści bywa węższa niż 260 px, a siatka
// z twardym minimum wypychała wtedy kartę poza ekran (strona ma overflow-x: clip).
export const PlansGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
    gap: 14px;
`;

export const AddOnsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
    gap: 14px;
`;

export const AddOnList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
`;

export const AddOnRow = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid ${ui.lineFaint};
`;

export const AddOnRowText = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
        font-size: 14px;
        font-weight: 600;
        color: ${ui.ink};
    }

    span {
        font-size: 12.5px;
        color: ${ui.textMuted};
    }
`;

export const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;
