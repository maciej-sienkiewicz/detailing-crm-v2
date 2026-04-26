import styled from 'styled-components';
import type { CalendarView as CalendarViewType } from '../../types';

// ─── Styled components ────────────────────────────────────────────────────────

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-shrink: 0;
    gap: 12px;
`;

const ToolbarLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ToolbarTitle = styled.span`
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
    letter-spacing: -0.3px;
    margin: 0 10px;
    white-space: nowrap;
`;

const NavBtn = styled.button`
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #1e293b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    flex-shrink: 0;

    &:hover { background: rgba(99, 102, 241, 0.08); color: #6366f1; }

    svg { width: 16px; height: 16px; }
`;

const TodayBtn = styled.button`
    height: 34px;
    padding: 0 14px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    background: #fff;
    color: #1e293b;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover {
        background: rgba(99, 102, 241, 0.06);
        border-color: rgba(99, 102, 241, 0.3);
        color: #6366f1;
    }
`;

const ViewSwitcher = styled.div`
    display: flex;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 8px;
    overflow: hidden;
`;

const ViewBtn = styled.button<{ $active: boolean }>`
    padding: 7px 14px;
    border: none;
    background: ${p => p.$active ? 'rgba(99, 102, 241, 0.1)' : '#fff'};
    color: ${p => p.$active ? '#6366f1' : '#1e293b'};
    font-size: 13px;
    font-weight: ${p => p.$active ? 600 : 500};
    cursor: pointer;
    transition: all 0.15s;
    border-right: 1px solid rgba(15, 23, 42, 0.08);

    &:last-child { border-right: none; }
    &:not([data-active]):hover {
        background: rgba(99, 102, 241, 0.06);
        color: #6366f1;
    }
`;

// ─── View labels ──────────────────────────────────────────────────────────────

const VIEW_LABELS: { view: CalendarViewType; label: string }[] = [
    { view: 'timeGridDay',  label: 'Dzień'   },
    { view: 'timeGridWeek', label: 'Tydzień' },
    { view: 'dayGridMonth', label: 'Miesiąc' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarToolbarProps {
    title: string;
    currentView: CalendarViewType;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: CalendarViewType) => void;
    prevAriaLabel?: string;
    nextAriaLabel?: string;
}

export const CalendarToolbar = ({
    title,
    currentView,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    prevAriaLabel = 'Poprzedni',
    nextAriaLabel  = 'Następny',
}: CalendarToolbarProps) => (
    <Toolbar>
        <ToolbarLeft>
            <NavBtn onClick={onPrev} aria-label={prevAriaLabel}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </NavBtn>
            <NavBtn onClick={onNext} aria-label={nextAriaLabel}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </NavBtn>
            <TodayBtn onClick={onToday}>Dzisiaj</TodayBtn>
            <ToolbarTitle>{title}</ToolbarTitle>
        </ToolbarLeft>

        <ViewSwitcher>
            {VIEW_LABELS.map(({ view, label }) => (
                <ViewBtn
                    key={view}
                    $active={currentView === view}
                    onClick={() => onViewChange(view)}
                >
                    {label}
                </ViewBtn>
            ))}
        </ViewSwitcher>
    </Toolbar>
);
