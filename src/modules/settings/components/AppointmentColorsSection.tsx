// src/modules/settings/components/AppointmentColorsSection.tsx
//
// Ustawienia → Oznaczenia → Kolory wizyt.
//
// Widok istniał wcześniej pod osobnym adresem /appointment-colors, do którego nic
// nie prowadziło — trzeba było znać URL. Kolory są ustawieniem studia, tak samo
// jak numeracja wizyt, więc mieszkają teraz obok niej.
//
// Dwie rzeczy, których poprzedni widok nie miał:
//  - kolor domyślny (zaznaczany z góry przy nowej wizycie),
//  - archiwizacja, czyli sposób na wycofanie koloru bez psucia historii.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { AppointmentColorFormModal } from '@/modules/appointment-colors';
import {
    useAppointmentColors,
    useDeleteAppointmentColor,
    useSetAppointmentColorArchived,
    useSetDefaultAppointmentColor,
    useClearDefaultAppointmentColor,
} from '@/modules/appointment-colors/hooks/useAppointmentColors';
import type { AppointmentColor } from '@/modules/appointment-colors';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Card = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 22px 24px;
`;

const CardHead = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 6px;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const CardHint = styled.p`
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.55;
    color: ${p => p.theme.colors.textMuted};
    max-width: 62ch;
`;

const AddButton = styled.button`
    padding: 9px 16px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${p => p.theme.radii.md};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    &:hover { opacity: 0.9; }
`;

const Row = styled.div<{ $muted?: boolean }>`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    opacity: ${p => (p.$muted ? 0.65 : 1)};

    &:last-child { border-bottom: none; }
`;

const Swatch = styled.span<{ $color: string }>`
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 8px;
    background: ${p => p.$color};
    border: 1px solid rgba(15, 23, 42, 0.12);
`;

const RowText = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const RowName = styled.span`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
`;

const DefaultBadge = styled.span`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #0369a1;
    background: #e0f2fe;
    padding: 2px 8px;
    border-radius: 999px;
`;

const RowHex = styled.span`
    font-family: monospace;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
`;

const LinkButton = styled.button<{ $danger?: boolean }>`
    background: transparent;
    border: 1px solid ${p => (p.$danger ? p.theme.colors.error : p.theme.colors.border)};
    color: ${p => (p.$danger ? p.theme.colors.error : p.theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.md};
    padding: 6px 11px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(:disabled) {
        border-color: ${p => (p.$danger ? p.theme.colors.error : 'var(--brand-primary)')};
        color: ${p => (p.$danger ? p.theme.colors.error : 'var(--brand-primary)')};
    }

    &:disabled { opacity: 0.5; cursor: default; }
`;

const Empty = styled.p`
    margin: 0;
    padding: 18px 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

const ArchiveToggle = styled.button`
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--brand-primary);
    cursor: pointer;
`;

const ConfirmOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 20px;
`;

const ConfirmBox = styled.div`
    background: white;
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px;
    max-width: 420px;
    width: 100%;
`;

const ConfirmTitle = styled.h4`
    margin: 0 0 8px;
    font-size: 16px;
    color: ${p => p.theme.colors.text};
`;

const ConfirmText = styled.p`
    margin: 0 0 20px;
    font-size: 13px;
    line-height: 1.6;
    color: ${p => p.theme.colors.textSecondary};
`;

const ConfirmActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;

// ─── Component ────────────────────────────────────────────────────────────────

/** Backendowy komunikat jest konkretny („używany przez 7 wizyt"), więc go pokazujemy. */
const apiMessage = (error: unknown): string | undefined =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

export function AppointmentColorsSection() {
    const { showSuccess, showError } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<AppointmentColor | undefined>();
    const [deleting, setDeleting] = useState<AppointmentColor | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    // Jedno zapytanie po wszystkie kolory (także archiwalne) — rozdzielamy je w
    // pamięci, żeby przełącznik „Pokaż archiwalne" nie kosztował rundy do API.
    const { colors, isLoading, isError, refetch } = useAppointmentColors(
        useMemo(() => ({ page: 1, limit: 200, showInactive: true }), [])
    );

    const active = colors.filter(c => c.isActive);
    const archived = colors.filter(c => !c.isActive);

    const setDefault = useSetDefaultAppointmentColor();
    const clearDefault = useClearDefaultAppointmentColor();
    const setArchived = useSetAppointmentColorArchived();
    const remove = useDeleteAppointmentColor();

    const busy =
        setDefault.isPending || clearDefault.isPending || setArchived.isPending || remove.isPending;

    const handleSetDefault = (color: AppointmentColor) => {
        setDefault.mutate(color.id, {
            onSuccess: () => showSuccess('Kolor domyślny', `„${color.name}" będzie zaznaczany na nowych wizytach`),
            onError: error => showError('Nie udało się ustawić domyślnego', apiMessage(error) ?? 'Spróbuj ponownie'),
        });
    };

    const handleClearDefault = () => {
        clearDefault.mutate(undefined, {
            onSuccess: () => showSuccess('Zdjęto oznaczenie', 'Nowa wizyta startuje bez wybranego koloru'),
            onError: error => showError('Nie udało się zdjąć oznaczenia', apiMessage(error) ?? 'Spróbuj ponownie'),
        });
    };

    const handleArchive = (color: AppointmentColor, archive: boolean) => {
        setArchived.mutate(
            { id: color.id, archived: archive },
            {
                onSuccess: () =>
                    showSuccess(
                        archive ? 'Kolor zarchiwizowany' : 'Kolor przywrócony',
                        archive
                            ? 'Zniknął z list wyboru; wizyty, które go używają, zachowały oznaczenie'
                            : `„${color.name}" znowu jest do wyboru`
                    ),
                onError: error =>
                    showError('Nie udało się zmienić statusu', apiMessage(error) ?? 'Spróbuj ponownie'),
            }
        );
    };

    const handleDelete = () => {
        if (!deleting) return;
        remove.mutate(deleting.id, {
            onSuccess: () => {
                showSuccess('Kolor usunięty', `„${deleting.name}" zniknął z listy`);
                setDeleting(null);
            },
            onError: error => {
                // 409 z backendu: kolor jest w użyciu i trzeba go zarchiwizować.
                showError('Nie można usunąć koloru', apiMessage(error) ?? 'Spróbuj ponownie');
                setDeleting(null);
            },
        });
    };

    const openAdd = () => { setEditing(undefined); setIsFormOpen(true); };
    const openEdit = (color: AppointmentColor) => { setEditing(color); setIsFormOpen(true); };

    const renderRow = (color: AppointmentColor) => (
        <Row key={color.id} $muted={!color.isActive}>
            <Swatch $color={color.hexColor} />
            <RowText>
                <RowName>
                    {color.name}
                    {color.isDefault && <DefaultBadge>Domyślny</DefaultBadge>}
                </RowName>
                <RowHex>{color.hexColor}</RowHex>
            </RowText>
            <RowActions>
                {color.isActive && (
                    color.isDefault ? (
                        <LinkButton onClick={handleClearDefault} disabled={busy}>
                            Zdejmij domyślny
                        </LinkButton>
                    ) : (
                        <LinkButton onClick={() => handleSetDefault(color)} disabled={busy}>
                            Ustaw domyślny
                        </LinkButton>
                    )
                )}
                <LinkButton onClick={() => openEdit(color)}>Edytuj</LinkButton>
                <LinkButton onClick={() => handleArchive(color, color.isActive)} disabled={busy}>
                    {color.isActive ? 'Archiwizuj' : 'Przywróć'}
                </LinkButton>
                <LinkButton $danger onClick={() => setDeleting(color)} disabled={busy}>
                    Usuń
                </LinkButton>
            </RowActions>
        </Row>
    );

    return (
        <Wrap>
            <Card>
                <CardHead>
                    <CardTitle>Kolory wizyt</CardTitle>
                    <AddButton onClick={openAdd}>+ Dodaj kolor</AddButton>
                </CardHead>
                <CardHint>
                    Kolory oznaczają typy wizyt w kalendarzu. Kolor domyślny jest zaznaczany z góry
                    przy rozpoczynaniu wizyty i w szybkim dodawaniu z kalendarza — może być tylko
                    jeden. Koloru używanego przez wizyty nie da się usunąć; zarchiwizuj go, a zniknie
                    z list wyboru, nie ruszając historii.
                </CardHint>

                {isLoading && <Empty>Wczytywanie kolorów…</Empty>}

                {isError && (
                    <Empty>
                        Nie udało się wczytać kolorów.{' '}
                        <LinkButton onClick={() => refetch()}>Spróbuj ponownie</LinkButton>
                    </Empty>
                )}

                {!isLoading && !isError && active.length === 0 && (
                    <Empty>Brak kolorów. Dodaj pierwszy, żeby oznaczać wizyty w kalendarzu.</Empty>
                )}

                {!isLoading && !isError && active.map(renderRow)}
            </Card>

            {archived.length > 0 && (
                <Card>
                    <ArchiveToggle onClick={() => setShowArchived(open => !open)}>
                        {showArchived ? 'Ukryj archiwalne' : `Pokaż archiwalne (${archived.length})`}
                    </ArchiveToggle>
                    {showArchived && (
                        <>
                            <CardHint style={{ marginTop: 12, marginBottom: 0 }}>
                                Te kolory nie pojawiają się przy nowych wizytach, ale nadal opisują
                                wizyty, na których zostały użyte.
                            </CardHint>
                            {archived.map(renderRow)}
                        </>
                    )}
                </Card>
            )}

            <AppointmentColorFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(undefined); }}
                color={editing}
            />

            {deleting && (
                <ConfirmOverlay onClick={() => setDeleting(null)}>
                    <ConfirmBox onClick={e => e.stopPropagation()}>
                        <ConfirmTitle>Usunąć kolor „{deleting.name}"?</ConfirmTitle>
                        <ConfirmText>
                            Operacja jest nieodwracalna. Jeśli kolor jest używany przez wizyty lub
                            rezerwacje, usunięcie się nie powiedzie — zarchiwizuj go zamiast tego.
                        </ConfirmText>
                        <ConfirmActions>
                            <LinkButton onClick={() => setDeleting(null)}>Anuluj</LinkButton>
                            <LinkButton $danger onClick={handleDelete} disabled={remove.isPending}>
                                {remove.isPending ? 'Usuwanie…' : 'Usuń kolor'}
                            </LinkButton>
                        </ConfirmActions>
                    </ConfirmBox>
                </ConfirmOverlay>
            )}
        </Wrap>
    );
}
