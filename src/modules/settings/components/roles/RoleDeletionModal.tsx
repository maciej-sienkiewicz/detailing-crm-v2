import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldSelect,
    CancelBtn, DangerBtn, Badge, SkeletonBox,
} from '../rbacShared.styles';
import { useRoleUsers } from '../../hooks/useRoles';
import type { Role } from '../../rbacTypes';

/**
 * Deleting a role that people hold, without the dead end.
 *
 * The old flow warned that the operation "will be rejected" and then let the backend
 * reject it — leaving the studio to work out for itself who had to be moved. Here the
 * hand-over is part of the deletion: pick where the holders land, see what that costs
 * them, and confirm once.
 */
const NO_ROLE = '__none__';

interface RoleDeletionModalProps {
    role: Role;
    /** Every other role in the studio — candidates to receive the holders. */
    otherRoles: Role[];
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: (reassignToRoleId: string | null) => void;
}

export function RoleDeletionModal({ role, otherRoles, isDeleting, onCancel, onConfirm }: RoleDeletionModalProps) {
    const holderCount = role.assignedUserCount;
    const hasHolders = holderCount > 0;

    const [target, setTarget] = useState<string>(() => otherRoles[0]?.id ?? NO_ROLE);
    const [showPeople, setShowPeople] = useState(false);

    // Names are only worth a request once someone asks to see them.
    const { users, isLoading: usersLoading } = useRoleUsers(showPeople && hasHolders ? role.id : null);

    const targetRole = otherRoles.find(r => r.id === target) ?? null;

    const diff = useMemo(() => {
        const source = new Set(role.permissions.map(p => p.code));
        const next = new Set((targetRole?.permissions ?? []).map(p => p.code));
        return {
            gained: (targetRole?.permissions ?? []).filter(p => !source.has(p.code)),
            lost: role.permissions.filter(p => !next.has(p.code)),
        };
    }, [role.permissions, targetRole]);

    const confirmLabel = !hasHolders
        ? 'Usuń rolę'
        : target === NO_ROLE
            ? `Usuń rolę i zostaw ${holderCount} ${peopleWord(holderCount)} bez dostępu`
            : `Przenieś ${holderCount} ${peopleWord(holderCount)} i usuń rolę`;

    return (
        <Overlay onClick={e => e.target === e.currentTarget && !isDeleting && onCancel()}>
            <ModalCard $maxWidth={540}>
                <ModalHead>
                    <div>
                        <ModalTitle>Usuń rolę „{role.name}"</ModalTitle>
                        <ModalSubtitle>
                            {hasHolders
                                ? `Ta rola jest przypisana do ${holderCount} ${peopleWord(holderCount)}`
                                : 'Nikt nie ma przypisanej tej roli'}
                        </ModalSubtitle>
                    </div>
                    <ModalCloseBtn onClick={onCancel} aria-label="Zamknij" disabled={isDeleting}>
                        <CloseIcon />
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    {!hasHolders ? (
                        <Lede>
                            Rola zostanie usunięta. Nikt nie straci dostępu, bo nikt jej obecnie nie używa.
                        </Lede>
                    ) : (
                        <>
                            <Lede>
                                Zanim usuniemy rolę, przenieś przypisane osoby, aby nie straciły dostępu do systemu.
                            </Lede>

                            <FormField>
                                <FieldLabel>
                                    {`Przenieś wszystkich (${holderCount}) do roli`}
                                </FieldLabel>
                                <FieldSelect
                                    value={target}
                                    onChange={e => setTarget(e.target.value)}
                                    disabled={isDeleting}
                                >
                                    {otherRoles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                    <option value={NO_ROLE}>Bez roli — zablokuje dostęp</option>
                                </FieldSelect>
                            </FormField>

                            {target === NO_ROLE ? (
                                <Callout $tone="danger">
                                    <CalloutTitle>Te osoby stracą dostęp do systemu</CalloutTitle>
                                    Konta pozostaną aktywne, ale po zalogowaniu zobaczą komunikat o braku
                                    uprawnień, dopóki nie przypiszesz im nowej roli.
                                </Callout>
                            ) : (
                                <DiffGrid>
                                    <DiffCol>
                                        <DiffHead $tone="gain">Zyskają</DiffHead>
                                        {diff.gained.length === 0
                                            ? <DiffEmpty>nic nowego</DiffEmpty>
                                            : <Chips>{diff.gained.slice(0, 6).map(p => (
                                                <Badge key={p.code} $variant="green">{p.displayName}</Badge>
                                            ))}{diff.gained.length > 6 && <More>+{diff.gained.length - 6}</More>}</Chips>}
                                    </DiffCol>
                                    <DiffCol>
                                        <DiffHead $tone="loss">Stracą</DiffHead>
                                        {diff.lost.length === 0
                                            ? <DiffEmpty>nic — nowa rola obejmuje wszystko</DiffEmpty>
                                            : <Chips>{diff.lost.slice(0, 6).map(p => (
                                                <Badge key={p.code} $variant="amber">{p.displayName}</Badge>
                                            ))}{diff.lost.length > 6 && <More>+{diff.lost.length - 6}</More>}</Chips>}
                                    </DiffCol>
                                </DiffGrid>
                            )}

                            <PeopleToggle
                                type="button"
                                onClick={() => setShowPeople(s => !s)}
                                aria-expanded={showPeople}
                            >
                                {showPeople ? 'Ukryj osoby' : `Przejrzyj osoby (${holderCount})`}
                            </PeopleToggle>

                            {showPeople && (
                                <PeopleList>
                                    {usersLoading
                                        ? Array.from({ length: Math.min(holderCount, 4) }).map((_, i) => (
                                            <PersonRow key={i}><SkeletonBox $w="60%" /></PersonRow>
                                        ))
                                        : users.map(u => (
                                            <PersonRow key={u.userId}>
                                                <PersonName>{u.fullName}</PersonName>
                                                <PersonMail>{u.email}</PersonMail>
                                                {!u.isActive && <Badge $variant="gray">zablokowane</Badge>}
                                            </PersonRow>
                                        ))}
                                    <PeopleHint>
                                        Chcesz przypisać różne role różnym osobom? Zrób to w profilach
                                        pracowników przed usunięciem roli.
                                    </PeopleHint>
                                </PeopleList>
                            )}

                            <Callout $tone="warn">
                                <CalloutTitle>Zmiana zadziała natychmiast</CalloutTitle>
                                Uprawnienia {holderCount} {peopleWord(holderCount)} zmienią się od razu po
                                zatwierdzeniu. Operacji nie można cofnąć, ale role można przypisać ponownie.
                            </Callout>
                        </>
                    )}
                </ModalBody>

                <ModalFooter>
                    <CancelBtn onClick={onCancel} disabled={isDeleting}>Anuluj</CancelBtn>
                    <DangerBtn
                        onClick={() => onConfirm(hasHolders && target !== NO_ROLE ? target : null)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Usuwanie…' : confirmLabel}
                    </DangerBtn>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
}

const peopleWord = (n: number) => (n === 1 ? 'osobę' : 'osób');

// ─── Styled ─────────────────────────────────────────────────────────────────────
const Lede = styled.p`
    margin: 0;
    font-size: 13px;
    color: #475569;
    line-height: 1.6;
`;

const Callout = styled.div<{ $tone: 'warn' | 'danger' }>`
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 12.5px;
    line-height: 1.55;
    border: 1px solid ${p => (p.$tone === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.35)')};
    background: ${p => (p.$tone === 'danger' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.08)')};
    color: ${p => (p.$tone === 'danger' ? '#7f1d1d' : '#78350f')};
`;

const CalloutTitle = styled.strong`
    display: block;
    font-weight: 700;
    margin-bottom: 2px;
`;

const DiffGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const DiffCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 11px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fafbfc;
    min-width: 0;
`;

const DiffHead = styled.span<{ $tone: 'gain' | 'loss' }>`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${p => (p.$tone === 'gain' ? '#059669' : '#d97706')};
`;

const DiffEmpty = styled.span`
    font-size: 11px;
    color: #94a3b8;
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const More = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    align-self: center;
`;

const PeopleToggle = styled.button`
    align-self: flex-start;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #0284c7;
    cursor: pointer;

    &:hover { text-decoration: underline; }
`;

const PeopleList = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
`;

const PersonRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 13px;
    border-bottom: 1px solid #f1f5f9;
    min-width: 0;
`;

const PersonName = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
`;

const PersonMail = styled.span`
    flex: 1;
    font-size: 11.5px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PeopleHint = styled.p`
    margin: 0;
    padding: 9px 13px;
    background: #fafbfc;
    font-size: 11px;
    color: #64748b;
    line-height: 1.5;
`;

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
