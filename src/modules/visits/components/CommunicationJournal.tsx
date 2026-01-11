import { useState } from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { TextArea, FieldGroup, Label } from '@/common/components/Form';
import { Button } from '@/common/components/Button';
import { formatDateTime } from '@/common/utils';
import type { JournalEntry, JournalEntryType } from '../types';

const JournalContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const JournalHeader = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 2px solid ${props => props.theme.colors.border};
`;

const Title = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const AddEntryForm = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const TypeSelector = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm};
    background: white;
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
`;

const TypeButton = styled.button<{ $isActive: boolean }>`
    flex: 1;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    background: ${props => props.$isActive
    ? 'linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%)'
    : 'transparent'
};
    color: ${props => props.$isActive ? 'white' : props.theme.colors.textMuted};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$isActive
    ? 'linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%)'
    : props.theme.colors.surfaceHover
};
    }
`;

const EntriesList = styled.div`
    padding: ${props => props.theme.spacing.lg};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    max-height: 600px;
    overflow-y: auto;
`;

const EntryCard = styled.div<{ $type: JournalEntryType }>`
    padding: ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.md};
    border-left: 4px solid ${props =>
    props.$type === 'customer_communication' ? '#10b981' : 'var(--brand-primary)'
};
    background: ${props =>
    props.$type === 'customer_communication'
        ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
        : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
};
    transition: all 0.2s ease;

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const EntryHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
    gap: ${props => props.theme.spacing.sm};
`;

const EntryMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const EntryAuthor = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const EntryDate = styled.time`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const EntryType = styled.span<{ $type: JournalEntryType }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    white-space: nowrap;

    ${props => props.$type === 'customer_communication'
    ? 'background: #dcfce7; color: #166534;'
    : 'background: #dbeafe; color: #1e40af;'
}
`;

const EntryContent = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    line-height: 1.6;
    white-space: pre-wrap;
`;

const DeleteButton = styled.button`
    padding: 4px 8px;
    background: transparent;
    border: 1px solid ${props => props.theme.colors.error};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.error};
    font-size: ${props => props.theme.fontSizes.xs};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.theme.colors.error};
        color: white;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface CommunicationJournalProps {
    entries: JournalEntry[];
    onAddEntry: (type: JournalEntryType, content: string) => void;
    onDeleteEntry: (entryId: string) => void;
    isAdding: boolean;
}

export const CommunicationJournal = ({
                                         entries,
                                         onAddEntry,
                                         onDeleteEntry,
                                         isAdding,
                                     }: CommunicationJournalProps) => {
    const [newEntryType, setNewEntryType] = useState<JournalEntryType>('internal_note');
    const [newEntryContent, setNewEntryContent] = useState('');

    const handleSubmit = () => {
        if (newEntryContent.trim()) {
            onAddEntry(newEntryType, newEntryContent.trim());
            setNewEntryContent('');
        }
    };

    const activeEntries = entries.filter(e => !e.isDeleted);
    const sortedEntries = [...activeEntries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <JournalContainer>
            <JournalHeader>
                <Title>Dziennik komunikacji</Title>
                <Subtitle>
                    {activeEntries.length} {activeEntries.length === 1 ? 'wpis' : 'wpisów'}
                </Subtitle>
            </JournalHeader>

            <AddEntryForm>
                <TypeSelector>
                    <TypeButton
                        $isActive={newEntryType === 'internal_note'}
                        onClick={() => setNewEntryType('internal_note')}
                    >
                        📝 Notatka wewnętrzna
                    </TypeButton>
                    <TypeButton
                        $isActive={newEntryType === 'customer_communication'}
                        onClick={() => setNewEntryType('customer_communication')}
                    >
                        💬 Komunikacja z klientem
                    </TypeButton>
                </TypeSelector>

                <FieldGroup>
                    <Label>Treść wpisu</Label>
                    <TextArea
                        value={newEntryContent}
                        onChange={(e) => setNewEntryContent(e.target.value)}
                        placeholder={
                            newEntryType === 'internal_note'
                                ? 'Dodaj notatkę dla zespołu...'
                                : 'Opisz komunikację z klientem...'
                        }
                    />
                </FieldGroup>

                <div style={{ marginTop: '12px' }}>
                    <Button
                        onClick={handleSubmit}
                        disabled={!newEntryContent.trim() || isAdding}
                        $variant="primary"
                    >
                        {isAdding ? 'Dodawanie...' : 'Dodaj wpis'}
                    </Button>
                </div>
            </AddEntryForm>

            <EntriesList>
                {sortedEntries.length === 0 ? (
                    <EmptyState>
                        Brak wpisów. Dodaj pierwszy wpis powyżej.
                    </EmptyState>
                ) : (
                    sortedEntries.map(entry => (
                        <EntryCard key={entry.id} $type={entry.type}>
                            <EntryHeader>
                                <EntryMeta>
                                    <EntryAuthor>{entry.createdBy}</EntryAuthor>
                                    <EntryDate>{formatDateTime(entry.createdAt)}</EntryDate>
                                </EntryMeta>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <EntryType $type={entry.type}>
                                        {entry.type === 'customer_communication'
                                            ? '💬 Klient'
                                            : '📝 Zespół'
                                        }
                                    </EntryType>
                                    <DeleteButton onClick={() => onDeleteEntry(entry.id)}>
                                        Usuń
                                    </DeleteButton>
                                </div>
                            </EntryHeader>
                            <EntryContent>{entry.content}</EntryContent>
                        </EntryCard>
                    ))
                )}
            </EntriesList>
        </JournalContainer>
    );
};