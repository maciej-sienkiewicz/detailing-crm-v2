// src/modules/settings/components/ServicesSection.tsx
//
// Ustawienia → Cennik usług → Usługi / Pakiety.
//
// Jedna karta z listą (jedyne wyniesienie w kolumnie, CLAUDE.md §2), nad nią pasek:
// przełącznik „Usługi | Pakiety | Instrukcje pielęgnacji" (podaje go rama sekcji),
// wyszukiwarka, „Pokaż archiwalne (N)" i „Ceny: Brutto | Netto". Akcje sekcji
// („Dodaj pakiet", „Dodaj usługę") stoją w nagłówku ramy, akcje wiersza w menu ⋮.
//
// Wcześniej stały tu obok siebie: pasek zakładek, drugi filtr „Wszystkie / Usługi /
// Pakiety" i przycisk „+ Dodaj ▾" z menu - trzy przełączniki robiące prawie to samo.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { Archive, ChevronLeft, ChevronRight, Droplet, Pencil, Plus, Search } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { InputShell, BareInput } from '@/common/components/Form';
import {
    ActionMenu, Button, Card, MenuDivider, MenuItem, Notice, Segmented, ui, useActionMenu,
} from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useArchiveService, useServices, useSyncItemName } from '@/modules/services/hooks/useServices';
import type { AffectedPackage, Service } from '@/modules/services/types';
import type { PriceSide } from '@/common/utils/priceInputs';
import { useCareInstructions, useCareInstructionMutations } from '../hooks/useCareInstructions';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import { CareInstructionPickerModal } from './services/CareInstructionPickerModal';
import { ServicesTableRow } from './services/ServicesTableRow';
import { ServiceEditorModal } from './services/ServiceEditorModal';
import { PackageEditorModal } from './services/PackageEditorModal';
import { SERVICES_TABLE_GRID } from './services/servicesTable.helpers';
import { packagesToRename } from './services/servicePriceForm.helpers';
import { usePriceSidePreference } from './services/usePriceSidePreference';
import { reportMutationError } from './services/mutationFeedback';

export type CatalogKind = 'services' | 'packages';

const PAGE_SIZE = 15;

const PRICE_SIDE_OPTIONS: { value: PriceSide; label: string }[] = [
    { value: 'gross', label: 'Brutto' },
    { value: 'net', label: 'Netto' },
];

type Editor =
    | { type: 'service'; target: Service | null }
    | { type: 'package'; target: Service | null };

interface Props {
    kind: CatalogKind;
    onKindChange: (kind: CatalogKind) => void;
    /** Przełącznik „Usługi | Pakiety | Instrukcje pielęgnacji" - stoi pierwszy w pasku. */
    switcher: ReactNode;
}

export function ServicesSection({ kind, onKindChange, switcher }: Props) {
    const { showSuccess, showError } = useToast();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showInactive, setShowInactive] = useState(false);
    const [priceSide, setPriceSide] = usePriceSidePreference();

    const [editor, setEditor] = useState<Editor | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<Service | null>(null);
    const [careTarget, setCareTarget] = useState<Service | null>(null);
    const [rename, setRename] = useState<{ serviceId: string; name: string; packages: AffectedPackage[] } | null>(null);
    const menu = useActionMenu<Service>();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // Zmiana „Usługi ↔ Pakiety" zaczyna listę od pierwszej strony.
    useEffect(() => { setPage(1); }, [kind]);

    const isPackage = kind === 'packages';
    const list = useServices({
        search: debouncedSearch, page, limit: PAGE_SIZE, showInactive, isPackage,
    });
    // Liczba archiwalnych = wszystkie danego rodzaju minus aktywne. Dwa zapytania po
    // jednej pozycji - odpowiedź niesie samą liczbę w `pagination`.
    const activeCount = useServices({ search: '', page: 1, limit: 1, showInactive: false, isPackage });
    const allCount = useServices({ search: '', page: 1, limit: 1, showInactive: true, isPackage });
    const archivedCount = allCount.pagination && activeCount.pagination
        ? Math.max(0, allCount.pagination.totalItems - activeCount.pagination.totalItems)
        : 0;

    const { instructions: careInstructions } = useCareInstructions();
    const { setForService } = useCareInstructionMutations();
    const archive = useArchiveService();
    const syncItemName = useSyncItemName();

    const careTitlesByService = useMemo(() => {
        const map = new Map<string, string[]>();
        careInstructions.forEach(i => i.serviceIds.forEach(id => {
            map.set(id, [...(map.get(id) ?? []), i.title]);
        }));
        return map;
    }, [careInstructions]);

    const totalItems = list.pagination?.totalItems ?? 0;
    const totalPages = list.pagination?.totalPages ?? 1;
    const actionsDisabled = editor !== null || archive.isPending;

    // Każda akcja z menu sprawdza blokadę jeszcze raz: menu otwarte przed otwarciem
    // edytora nie może obejść `actionsDisabled` (tak dawało się archiwizować w trakcie
    // edycji).
    const guarded = (action: () => void) => () => { if (!actionsDisabled) action(); };

    const confirmArchive = async () => {
        const target = archiveTarget;
        if (!target) return;
        try {
            await archive.mutateAsync(target.id);
            showSuccess(target.isPackage ? 'Pakiet zarchiwizowany' : 'Usługa zarchiwizowana',
                `„${target.name}" nie pojawi się przy nowych zleceniach.`);
        } catch (error) {
            reportMutationError(showError, error, 'Nie udało się zarchiwizować');
        } finally {
            setArchiveTarget(null);
        }
    };

    const saveCare = async (service: Service, ids: string[]) => {
        setCareTarget(null);
        try {
            await setForService.mutateAsync({ serviceId: service.id, instructionIds: ids });
            showSuccess('Instrukcje zapisane', ids.length === 0
                ? `„${service.name}" nie ma już przypiętych instrukcji.`
                : `Zaznaczą się na certyfikacie, gdy wizyta obejmie „${service.name}".`);
        } catch (error) {
            reportMutationError(showError, error, 'Nie udało się zapisać instrukcji');
        }
    };

    const syncNames = async () => {
        if (!rename) return;
        const { serviceId, name, packages } = rename;
        setRename(null);
        try {
            await Promise.all(packages.map(pkg => syncItemName.mutateAsync({
                packageId: pkg.packageId,
                data: { serviceId, newName: name },
            })));
            showSuccess('Nazwy w pakietach zaktualizowane');
        } catch (error) {
            reportMutationError(showError, error, 'Nie udało się zaktualizować nazw w pakietach');
        }
    };

    const labels = isPackage
        ? { item: 'Pakiet', search: 'Szukaj pakietu', empty: 'Nie ma jeszcze pakietów', emptyHint: 'Pakiet to kilka usług sprzedawanych razem z jedną ceną. Dodasz go przyciskiem „Dodaj pakiet".' }
        : { item: 'Usługa', search: 'Szukaj usługi', empty: 'Cennik jest pusty', emptyHint: 'Dodaj pierwszą usługę przyciskiem „Dodaj usługę".' };

    const current = menu.menu?.item ?? null;

    return (
        <Wrap>
            <SettingsHeaderActions>
                <Button variant="outline" size="lg" onClick={() => setEditor({ type: 'package', target: null })}>
                    <Plus /> Dodaj pakiet
                </Button>
                <Button variant="primary" size="lg" onClick={() => setEditor({ type: 'service', target: null })}>
                    <Plus /> Dodaj usługę
                </Button>
            </SettingsHeaderActions>

            <Toolbar>
                {switcher}
                <SearchShell>
                    <SearchIcon aria-hidden="true"><Search size={15} /></SearchIcon>
                    <BareInput
                        type="search"
                        placeholder={labels.search}
                        aria-label={labels.search}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </SearchShell>
                <ToolbarEnd>
                    {(archivedCount > 0 || showInactive) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-pressed={showInactive}
                            onClick={() => { setShowInactive(v => !v); setPage(1); }}
                        >
                            {showInactive ? 'Ukryj archiwalne' : `Pokaż archiwalne (${archivedCount})`}
                        </Button>
                    )}
                    <PriceSideControl>
                        <span aria-hidden="true">Ceny</span>
                        <Segmented
                            label="Która cena jest główna"
                            size="sm"
                            options={PRICE_SIDE_OPTIONS}
                            value={priceSide}
                            onChange={setPriceSide}
                        />
                    </PriceSideControl>
                </ToolbarEnd>
            </Toolbar>

            <Card aria-label={isPackage ? 'Pakiety' : 'Usługi'}>
                <HeadRow>
                    <span>{labels.item}</span>
                    <span>{priceSide === 'gross' ? 'Cena dla klienta' : 'Cena netto'}</span>
                    <span>{priceSide === 'gross' ? 'Netto i VAT' : 'Brutto i VAT'}</span>
                    <span />
                </HeadRow>

                {list.isError ? (
                    <Padded>
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać cennika"
                            action={<Button variant="ghost" size="sm" onClick={() => void list.refetch()}>Spróbuj ponownie</Button>}
                        >
                            Lista jest pusta tylko na ekranie - usługi w cenniku są bezpieczne.
                        </Notice>
                    </Padded>
                ) : list.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonRow key={i} aria-hidden="true">
                            <Bone $w={`${40 + (i % 3) * 15}%`} />
                            <Bone $w="90px" $right />
                            <Bone $w="150px" $right />
                            <span />
                        </SkeletonRow>
                    ))
                ) : list.services.length === 0 ? (
                    <Empty>
                        <strong>{debouncedSearch ? 'Nic nie pasuje do wyszukiwania' : labels.empty}</strong>
                        <span>{debouncedSearch ? `Brak pozycji ze słowem „${debouncedSearch}".` : labels.emptyHint}</span>
                    </Empty>
                ) : (
                    list.services.map(service => (
                        <ServicesTableRow
                            key={service.id}
                            service={service}
                            priceSide={priceSide}
                            careTitles={careTitlesByService.get(service.id)}
                            actionsDisabled={actionsDisabled}
                            menuOpen={menu.isOpen(service.id)}
                            onOpenMenu={(e, s) => menu.toggle(e, s, s.id)}
                        />
                    ))
                )}

                {!list.isLoading && !list.isError && totalPages > 1 && (
                    <Pager>
                        <PagerInfo>
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)} z {totalItems}
                        </PagerInfo>
                        <PagerControls>
                            <Button size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                                <ChevronLeft /> Poprzednia
                            </Button>
                            <PagerCurrent>Strona {page} z {totalPages}</PagerCurrent>
                            <Button size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                                Następna <ChevronRight />
                            </Button>
                        </PagerControls>
                    </Pager>
                )}
            </Card>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje pozycji cennika">
                {current && (
                    <>
                        <MenuItem
                            icon={<Pencil />}
                            disabled={actionsDisabled}
                            onClick={guarded(() => setEditor({ type: current.isPackage ? 'package' : 'service', target: current }))}
                        >
                            {current.isPackage ? 'Edytuj pakiet' : 'Edytuj usługę'}
                        </MenuItem>
                        {!current.isPackage && (
                            <MenuItem icon={<Droplet />} disabled={actionsDisabled} onClick={guarded(() => setCareTarget(current))}>
                                Instrukcje pielęgnacji…
                            </MenuItem>
                        )}
                        <MenuDivider />
                        <MenuItem icon={<Archive />} danger disabled={actionsDisabled} onClick={guarded(() => setArchiveTarget(current))}>
                            Archiwizuj
                        </MenuItem>
                    </>
                )}
            </ActionMenu>

            {editor?.type === 'service' && (
                <ServiceEditorModal
                    target={editor.target}
                    careInstructions={careInstructions}
                    onClose={() => setEditor(null)}
                    onSaved={(saved, previousName) => {
                        setEditor(null);
                        const packages = packagesToRename(previousName, saved);
                        if (packages.length > 0) setRename({ serviceId: saved.id, name: saved.name, packages });
                    }}
                />
            )}

            {editor?.type === 'package' && (
                <PackageEditorModal
                    target={editor.target}
                    onClose={() => setEditor(null)}
                    onSaved={() => {
                        setEditor(null);
                        // Nowy pakiet ląduje na liście pakietów - inaczej po zapisie „znikał".
                        if (!isPackage) onKindChange('packages');
                    }}
                />
            )}

            {careTarget && (
                <CareInstructionPickerModal
                    instructions={careInstructions}
                    selectedIds={careInstructions.filter(i => i.serviceIds.includes(careTarget.id)).map(i => i.id)}
                    serviceName={careTarget.name}
                    onCancel={() => setCareTarget(null)}
                    onConfirm={ids => void saveCare(careTarget, ids)}
                />
            )}

            <ConfirmationModal
                isOpen={archiveTarget !== null}
                title={archiveTarget?.isPackage ? 'Zarchiwizować pakiet?' : 'Zarchiwizować usługę?'}
                message={archiveTarget
                    ? `„${archiveTarget.name}" zniknie z wyboru przy nowych zleceniach. Wizyty, w których już jest, zostają bez zmian, a pozycję zobaczysz dalej pod „Pokaż archiwalne".`
                    : ''}
                variant="danger"
                confirmText={archive.isPending ? 'Archiwizowanie...' : 'Archiwizuj'}
                cancelText="Zostaw"
                onConfirm={() => void confirmArchive()}
                onCancel={() => setArchiveTarget(null)}
            />

            {rename && (
                <ModalShell isOpen onClose={() => setRename(null)} size="sm">
                    <ModalHeader>
                        <ModalTitleGroup>
                            <ModalTitle>Zaktualizować nazwę w pakietach?</ModalTitle>
                        </ModalTitleGroup>
                        <CloseBtn onClick={() => setRename(null)} />
                    </ModalHeader>
                    <ModalContent>
                        <DialogText>
                            Nowa nazwa to „{rename.name}". Usługa wchodzi w skład{' '}
                            {rename.packages.length === 1 ? 'pakietu' : 'pakietów'}{' '}
                            {rename.packages.map(p => `„${p.packageName}"`).join(', ')}, gdzie wciąż widnieje
                            pod starą nazwą.
                        </DialogText>
                    </ModalContent>
                    <ModalFooter>
                        <Button onClick={() => setRename(null)}>Zostaw starą nazwę</Button>
                        <Button variant="primary" onClick={() => void syncNames()}>
                            {rename.packages.length === 1 ? 'Zaktualizuj w pakiecie' : 'Zaktualizuj w pakietach'}
                        </Button>
                    </ModalFooter>
                </ModalShell>
            )}
        </Wrap>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PHONE = '@media (max-width: 767px)';

const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 12px;
    min-width: 0;
`;

const SearchShell = styled(InputShell)`
    flex: 1 1 220px;
    max-width: 360px;
    margin-left: auto;

    input { padding-left: 6px; }

    ${PHONE} { flex-basis: 100%; max-width: none; margin-left: 0; input { min-height: 44px; } }
`;

const SearchIcon = styled.span`
    display: inline-flex;
    padding-left: 12px;
    color: ${ui.textMuted};
`;

const ToolbarEnd = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;

    ${PHONE} { width: 100%; justify-content: space-between; }
`;

const PriceSideControl = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;

    > span { font-size: 13px; font-weight: 600; color: ${ui.textSecondary}; }
`;

const HeadRow = styled.div`
    display: grid;
    grid-template-columns: ${SERVICES_TABLE_GRID};
    gap: 16px;
    padding: 14px 24px 10px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};

    > span:nth-child(2), > span:nth-child(3) { text-align: right; }

    /* Na telefonie wiersz sam nazywa swoje kwoty - nagłówek kolumn nie ma czego opisywać. */
    ${PHONE} { display: none; }
`;

const SkeletonRow = styled.div`
    display: grid;
    grid-template-columns: ${SERVICES_TABLE_GRID};
    gap: 16px;
    align-items: center;
    padding: 18px 24px;
    border-top: 1px solid ${ui.lineFaint};

    ${PHONE} {
        grid-template-columns: minmax(0, 1fr) auto;
        padding: 16px;
        > :nth-child(3), > :nth-child(4) { display: none; }
    }
`;

const Bone = styled.span<{ $w: string; $right?: boolean }>`
    display: block;
    height: 13px;
    width: ${p => p.$w};
    justify-self: ${p => (p.$right ? 'end' : 'start')};
    border-radius: 6px;
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
`;

const Padded = styled.div`
    padding: 16px 24px 20px;

    ${PHONE} { padding: 14px 16px; }
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 40px 24px 44px;
    text-align: center;
    border-top: 1px solid ${ui.lineFaint};

    strong { font-size: 15px; font-weight: 600; color: ${ui.ink}; }
    span { max-width: 44ch; font-size: 13.5px; line-height: 1.5; color: ${ui.textMuted}; }
`;

const Pager = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 24px;
    border-top: 1px solid ${ui.lineFaint};

    ${PHONE} { padding: 12px 16px; }
`;

const PagerInfo = styled.span`
    font-size: 13px;
    color: ${ui.textMuted};
`;

const PagerControls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PagerCurrent = styled.span`
    font-size: 13px;
    color: ${ui.textSecondary};
    white-space: nowrap;
`;

const DialogText = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;
