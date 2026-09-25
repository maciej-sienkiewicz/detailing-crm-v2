// src/modules/vehicles/components/VehicleComments.tsx
//
// Komentarze ze wszystkich wizyt pojazdu - płaski panel, każdy komentarz tak jak
// w karcie wizyty (kafelek autora w odcieniu rodzaju, plakietka, treść), a pod nim
// wizyta, z której pochodzi, jako odnośnik. Stopka stronicowania mówi zwykłym
// zdaniem, gdzie jesteśmy, zamiast „‹ Poprzednia · Następna ›".

import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVehicleComments } from '../hooks/useVehicleComments';
import { formatDate } from '@/common/utils';
import { Button, Panel, PanelBody, PanelHead, SectionTitle, StatusPill, ui } from '@/common/components/ui';
import type { VehicleComment, VehicleCommentType } from '../types';

const PAGE_SIZE = 5;

const List = styled.ol`
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Item = styled.li`
    display: flex;
    gap: 12px;
    min-width: 0;
`;

const Avatar = styled.span<{ $type: VehicleCommentType }>`
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: ${p => p.$type === 'INTERNAL' ? '#fef3c7' : ui.brandTintHover};
    color: ${p => p.$type === 'INTERNAL' ? ui.warnInk : ui.brandInk};
    font-size: 12px;
    font-weight: 700;
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;

    strong { font-size: 13.5px; font-weight: 600; color: ${ui.ink}; }
`;

const Muted = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
`;

const Text = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.ink};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

const VisitLink = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:hover { text-decoration: underline; }
`;

const Pager = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 12px 0 0 -11px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Empty = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const TYPE_LABEL: Record<VehicleCommentType, string> = {
    INTERNAL: 'Wewnętrzny',
    FOR_CUSTOMER: 'Dla klienta',
};

const initials = (name: string) => name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2);

interface Props {
    vehicleId: string;
    id?: string;
}

export function VehicleComments({ vehicleId, id }: Props) {
    const [page, setPage] = useState(1);
    const navigate = useNavigate();
    const { comments, pagination, isLoading } = useVehicleComments(vehicleId, page, PAGE_SIZE);

    const totalPages = pagination?.totalPages ?? 1;
    const totalItems = pagination?.totalItems ?? comments.length;

    return (
        <Panel id={id} aria-labelledby="vehicle-comments-title">
            <PanelHead>
                <SectionTitle id="vehicle-comments-title" count={totalItems || undefined}>Komentarze z wizyt</SectionTitle>
            </PanelHead>
            <PanelBody>
                {isLoading ? (
                    <Empty>Wczytywanie komentarzy...</Empty>
                ) : comments.length === 0 ? (
                    <Empty>Przy wizytach tego pojazdu nikt nie zostawił komentarza.</Empty>
                ) : (
                    <List>
                        {comments.map((c: VehicleComment) => (
                            <Item key={c.id}>
                                <Avatar $type={c.type} aria-hidden="true">{initials(c.createdByName)}</Avatar>
                                <Body>
                                    <Head>
                                        <strong>{c.createdByName}</strong>
                                        <StatusPill $tone={c.type === 'INTERNAL' ? 'warn' : 'info'}>{TYPE_LABEL[c.type]}</StatusPill>
                                        <Muted>{formatDate(c.createdAt)}</Muted>
                                    </Head>
                                    <Text>{c.content}</Text>
                                    <VisitLink type="button" onClick={() => navigate(`/visits/${c.visitId}`)}>
                                        {c.visitTitle}, {formatDate(c.visitDate)}<ArrowRight aria-hidden="true" />
                                    </VisitLink>
                                </Body>
                            </Item>
                        ))}
                    </List>
                )}

                {totalPages > 1 && (
                    <Pager>
                        <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft />Nowsze
                        </Button>
                        <span>strona {page} z {totalPages}</span>
                        <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                            Starsze<ChevronRight />
                        </Button>
                    </Pager>
                )}
            </PanelBody>
        </Panel>
    );
}
