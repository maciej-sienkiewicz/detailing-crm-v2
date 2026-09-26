// src/modules/settings/components/AppointmentColorsSection.tsx
//
// Ustawienia → Oznaczenia → Kolory wizyt.
//
// Widok istniał wcześniej pod osobnym adresem /appointment-colors, do którego nic
// nie prowadziło - trzeba było znać URL. Kolory są ustawieniem studia, tak samo
// jak numeracja wizyt, więc mieszkają teraz obok niej.
//
// Dwie rzeczy, których poprzedni widok nie miał:
//  - kolor domyślny (zaznaczany z góry przy nowej wizycie),
//  - archiwizacja, czyli sposób na wycofanie koloru bez psucia historii.
//
// Po przebudowie ustawień:
//  - „Dodaj kolor" stoi w nagłówku sekcji jako jej jedyna akcja główna; wcześniej
//    był wypełnionym przyciskiem w karcie, obok czterech obrysowanych na wiersz;
//  - wiersz ma jedną widoczną akcję („Edytuj"), reszta siedzi w menu ⋮ - cztery
//    przyciski nie mieściły się w wierszu na telefonie;
//  - usunięcie pyta przez ConfirmationModal zamiast własnej nakładki bez Escape
//    i bez blokady przewijania;
//  - błąd 4xx pokazywał dwa dymki (interceptor + własny) - patrz studioErrors.ts.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Archive, ArchiveRestore, MoreVertical, Plus, Star, StarOff, Trash2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    ActionMenu, Button, Card, IconButton, MenuDivider, MenuItem, Notice, Panel, StatusPill, ui, useActionMenu,
} from '@/common/components/ui';
import { AppointmentColorFormModal } from '@/modules/appointment-colors';
import {
    useAppointmentColors,
    useDeleteAppointmentColor,
    useSetAppointmentColorArchived,
    useSetDefaultAppointmentColor,
    useClearDefaultAppointmentColor,
} from '@/modules/appointment-colors/hooks/useAppointmentColors';
import type { AppointmentColor } from '@/modules/appointment-colors';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import { backendMessage, shownByInterceptor } from './studioErrors';

// ─── Wygląd ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
`;

const CardBody = styled.div`
    padding: 20px 24px 12px;

    @media (max-width: 640px) { padding: 16px 16px 8px; }
`;

const Lead = styled.p`
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
    max-width: 66ch;
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Row = styled.li<{ $muted?: boolean }>`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 14px 0;
    border-top: 1px solid ${ui.lineFaint};
    min-width: 0;

    &:first-child { border-top: none; }
    > :not(:last-child) { opacity: ${p => (p.$muted ? 0.7 : 1)}; }
`;

const Swatch = styled.span<{ $color: string }>`
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 9px;
    background: ${p => p.$color};
    border: 1px solid rgba(15, 23, 42, 0.12);
`;

const RowText = styled.div`
    flex: 1 1 160px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const RowName = styled.span`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 14.5px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const RowHex = styled.span`
    font-family: ${ui.mono};
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
`;

const Muted = styled.p`
    margin: 0;
    padding: 18px 0 22px;
    font-size: 14px;
    color: ${ui.textMuted};
`;

const ArchivePanel = styled(Panel)`
    padding: 14px 18px;

    @media (max-width: 640px) { padding: 12px 16px; }
`;

const ArchiveHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;

    h3 { margin: 0; font-size: 15px; font-weight: 600; color: ${ui.ink}; }
`;

const ArchiveHint = styled.p`
    margin: 8px 0 4px;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

/** 1 kolor, 2 kolory, 5 kolorów. */
function colorsWord(n: number): string {
    if (n === 1) return 'kolor';
    const u = n % 10;
    const t = n % 100;
    return u >= 2 && u <= 4 && (t < 12 || t > 14) ? 'kolory' : 'kolorów';
}

// ─── Sekcja ───────────────────────────────────────────────────────────────────

export function AppointmentColorsSection() {
    const { showSuccess, showError } = useToast();
    const menu = useActionMenu<AppointmentColor>();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<AppointmentColor | undefined>();
    const [deleting, setDeleting] = useState<AppointmentColor | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    // Jedno zapytanie po wszystkie kolory (także archiwalne) - rozdzielamy je w
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

    /**
     * Odmowę 4xx („kolor jest używany przez 7 wizyt") pokazuje już interceptor
     * dokładnie tym zdaniem; sami mówimy tylko o tym, co on przepuszcza (5xx, sieć).
     */
    const reportError = (title: string, error: unknown) => {
        if (shownByInterceptor(error)) return;
        showError(title, backendMessage(error) ?? 'Sprawdź połączenie i spróbuj ponownie.');
    };

    const handleSetDefault = (color: AppointmentColor) => {
        setDefault.mutate(color.id, {
            onSuccess: () => showSuccess('Kolor domyślny ustawiony', `„${color.name}" będzie zaznaczany na nowych wizytach.`),
            onError: error => reportError('Nie udało się ustawić koloru domyślnego', error),
        });
    };

    const handleClearDefault = () => {
        clearDefault.mutate(undefined, {
            onSuccess: () => showSuccess('Zdjęto kolor domyślny', 'Nowa wizyta startuje bez wybranego koloru.'),
            onError: error => reportError('Nie udało się zdjąć koloru domyślnego', error),
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
                            ? 'Zniknął z list wyboru. Wizyty, które go używają, zachowały oznaczenie.'
                            : `„${color.name}" znowu jest do wyboru.`
                    ),
                onError: error => reportError('Nie udało się zmienić statusu koloru', error),
            }
        );
    };

    // ConfirmationModal zamyka się sam zaraz po „Usuń" - kolor przekazujemy wprost,
    // a nie przez stan, który w tej chwili jest już czyszczony.
    const handleDelete = (color: AppointmentColor) => {
        remove.mutate(color.id, {
            onSuccess: () => showSuccess('Kolor usunięty', `„${color.name}" zniknął z listy.`),
            // 409 z backendu: kolor jest w użyciu i trzeba go zarchiwizować.
            onError: error => reportError('Nie udało się usunąć koloru', error),
        });
    };

    const openAdd = () => { setEditing(undefined); setIsFormOpen(true); };
    const openEdit = (color: AppointmentColor) => { setEditing(color); setIsFormOpen(true); };

    const renderRow = (color: AppointmentColor) => (
        <Row key={color.id} $muted={!color.isActive}>
            <Swatch $color={color.hexColor} aria-hidden="true" />
            <RowText>
                <RowName>
                    {color.name}
                    {color.isDefault && <StatusPill $tone="info">Domyślny</StatusPill>}
                </RowName>
                <RowHex>{color.hexColor}</RowHex>
            </RowText>
            <RowActions>
                <Button variant="ghost" size="sm" onClick={() => openEdit(color)}>Edytuj</Button>
                <IconButton
                    label={`Więcej akcji: ${color.name}`}
                    variant="ghost"
                    size="sm"
                    shape="square"
                    disabled={busy}
                    aria-haspopup="menu"
                    active={menu.isOpen(color.id)}
                    onClick={e => menu.toggle(e, color, color.id)}
                >
                    <MoreVertical />
                </IconButton>
            </RowActions>
        </Row>
    );

    const current = menu.menu?.item ?? null;

    return (
        <Wrap>
            <SettingsHeaderActions>
                <Button variant="primary" size="lg" onClick={openAdd}>
                    <Plus aria-hidden="true" />
                    Dodaj kolor
                </Button>
            </SettingsHeaderActions>

            <Card aria-label="Kolory wizyt">
                <CardBody>
                    <Lead>
                        Kolorem oznaczasz rezerwacje w kalendarzu. Kolor domyślny jest zaznaczany z góry
                        przy każdej nowej wizycie.
                    </Lead>

                    {isLoading ? (
                        <Muted role="status">Wczytywanie kolorów...</Muted>
                    ) : isError ? (
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać kolorów"
                            action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                        >
                            Sprawdź połączenie z internetem.
                        </Notice>
                    ) : active.length === 0 ? (
                        <Muted>Nie masz jeszcze kolorów. Dodaj pierwszy, żeby oznaczać wizyty w kalendarzu.</Muted>
                    ) : (
                        <List>{active.map(renderRow)}</List>
                    )}
                </CardBody>
            </Card>

            {!isError && archived.length > 0 && (
                <ArchivePanel aria-label="Kolory archiwalne">
                    <ArchiveHead>
                        <h3>Archiwalne, {archived.length} {colorsWord(archived.length)}</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-expanded={showArchived}
                            onClick={() => setShowArchived(open => !open)}
                        >
                            {showArchived ? 'Ukryj' : 'Pokaż'}
                        </Button>
                    </ArchiveHead>
                    {showArchived && (
                        <>
                            <ArchiveHint>
                                Te kolory nie pojawiają się przy nowych wizytach, ale nadal opisują
                                wizyty, na których zostały użyte.
                            </ArchiveHint>
                            <List>{archived.map(renderRow)}</List>
                        </>
                    )}
                </ArchivePanel>
            )}

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje koloru">
                {current?.isActive && (
                    current.isDefault ? (
                        <MenuItem icon={<StarOff />} onClick={handleClearDefault}>Zdejmij oznaczenie domyślnego</MenuItem>
                    ) : (
                        <MenuItem icon={<Star />} onClick={() => handleSetDefault(current)}>Ustaw jako domyślny</MenuItem>
                    )
                )}
                {current && (
                    <MenuItem
                        icon={current.isActive ? <Archive /> : <ArchiveRestore />}
                        onClick={() => handleArchive(current, current.isActive)}
                    >
                        {current.isActive ? 'Archiwizuj' : 'Przywróć'}
                    </MenuItem>
                )}
                {current && (
                    <>
                        <MenuDivider />
                        <MenuItem icon={<Trash2 />} danger onClick={() => setDeleting(current)}>Usuń kolor</MenuItem>
                    </>
                )}
            </ActionMenu>

            <AppointmentColorFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(undefined); }}
                color={editing}
            />

            <ConfirmationModal
                isOpen={deleting !== null}
                title={deleting ? `Usunąć kolor „${deleting.name}"?` : 'Usunąć kolor?'}
                message="Tego nie da się cofnąć. Jeśli kolor oznacza jakąś wizytę albo rezerwację, usunięcie się nie powiedzie - wtedy go zarchiwizuj."
                variant="danger"
                confirmText="Usuń kolor"
                cancelText="Zostaw"
                onConfirm={() => { if (deleting) handleDelete(deleting); }}
                onCancel={() => setDeleting(null)}
            />
        </Wrap>
    );
}
