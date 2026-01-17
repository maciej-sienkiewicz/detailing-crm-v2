// src/modules/calendar/components/QuickEventModal.tsx

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { EventCreationData } from '../types';

const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
    z-index: 1000;
`;

const ModalContainer = styled.div`
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-width: 500px;
    padding: 24px;
    position: relative;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
`;

const Title = styled.h2`
    font-size: 20px;
    font-weight: 500;
    color: #1f2937;
    margin: 0;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: 24px;
    color: #6b7280;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
        background-color: #f3f4f6;
    }
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 14px;
    font-weight: 500;
    color: #374151;
`;

const Input = styled.input`
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
        outline: none;
        border-color: #1a73e8;
    }
`;

const DateTimeRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'text' }>`
    padding: ${props => props.$variant === 'text' ? '8px 12px' : '10px 20px'};
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;

    ${props => {
        if (props.$variant === 'primary') {
            return `
                background: #1a73e8;
                color: #ffffff;
                &:hover {
                    background: #1557b0;
                }
            `;
        } else if (props.$variant === 'text') {
            return `
                background: transparent;
                color: #1a73e8;
                &:hover {
                    background: #e8f0fe;
                }
            `;
        } else {
            return `
                background: #f3f4f6;
                color: #374151;
                &:hover {
                    background: #e5e7eb;
                }
            `;
        }
    }}
`;

const Toggle = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #374151;

    input {
        cursor: pointer;
    }
`;

interface QuickEventModalProps {
    isOpen: boolean;
    eventData: EventCreationData | null;
    onClose: () => void;
    onSave: (data: QuickEventFormData) => void;
    onMoreOptions: (data: QuickEventFormData) => void;
}

export interface QuickEventFormData {
    title: string;
    startDateTime: string;
    endDateTime: string;
    isAllDay: boolean;
}

export const QuickEventModal: React.FC<QuickEventModalProps> = ({
    isOpen,
    eventData,
    onClose,
    onSave,
    onMoreOptions,
}) => {
    const [title, setTitle] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);

    // Format helpers
    const formatDateTimeLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize form when eventData changes
    useEffect(() => {
        if (eventData) {
            const timeDiff = eventData.end.getTime() - eventData.start.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            const shouldBeAllDay = daysDiff === 1 && eventData.allDay;

            setIsAllDay(shouldBeAllDay);

            if (shouldBeAllDay) {
                setStartDateTime(formatDate(eventData.start));
                setEndDateTime(formatDate(eventData.start));
            } else if (daysDiff > 1) {
                const startDate = new Date(eventData.start);
                startDate.setHours(9, 0, 0, 0);
                setStartDateTime(formatDateTimeLocal(startDate));

                const endDate = new Date(eventData.end);
                endDate.setDate(endDate.getDate() - 1);
                setEndDateTime(formatDateTimeLocal(endDate));
            } else {
                setStartDateTime(formatDateTimeLocal(eventData.start));
                setEndDateTime(formatDateTimeLocal(eventData.end));
            }
        }
    }, [eventData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            startDateTime,
            endDateTime,
            isAllDay,
        });
    };

    const handleMoreOptions = () => {
        onMoreOptions({
            title,
            startDateTime,
            endDateTime,
            isAllDay,
        });
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!eventData) return null;

    return (
        <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
            <ModalContainer>
                <Header>
                    <Title>Nowe wydarzenie</Title>
                    <CloseButton onClick={onClose}>✕</CloseButton>
                </Header>

                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <Input
                            type="text"
                            placeholder="Dodaj tytuł"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </FormGroup>

                    <FormGroup>
                        <Toggle>
                            <input
                                type="checkbox"
                                checked={isAllDay}
                                onChange={(e) => setIsAllDay(e.target.checked)}
                            />
                            Wizyta całodniowa
                        </Toggle>
                    </FormGroup>

                    <DateTimeRow>
                        <FormGroup>
                            <Label>Początek</Label>
                            <Input
                                type={isAllDay ? 'date' : 'datetime-local'}
                                value={startDateTime}
                                onChange={(e) => setStartDateTime(e.target.value)}
                                required
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label>Koniec</Label>
                            <Input
                                type={isAllDay ? 'date' : 'datetime-local'}
                                value={endDateTime}
                                onChange={(e) => setEndDateTime(e.target.value)}
                                required
                            />
                        </FormGroup>
                    </DateTimeRow>

                    <ButtonRow>
                        <Button type="button" $variant="text" onClick={handleMoreOptions}>
                            Więcej opcji
                        </Button>
                        <Button type="submit" $variant="primary">
                            Zapisz
                        </Button>
                    </ButtonRow>
                </Form>
            </ModalContainer>
        </Overlay>
    );
};
