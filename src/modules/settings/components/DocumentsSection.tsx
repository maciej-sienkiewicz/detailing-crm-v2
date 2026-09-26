// src/modules/settings/components/DocumentsSection.tsx
//
// Ustawienia → Studio → Dokumenty i podpisy.
//
// Jedna karta - protokoły podpisywane przy przyjęciu i przy wydaniu pojazdu, bo po
// nie się tu wraca. Zgody, logo na dokumentach i podpis pracownika leżą płasko pod
// nią (CLAUDE.md §2: jedno wyniesienie w kolumnie). „Dodaj dokument" stoi w nagłówku
// sekcji; przyciski przy etapach otwierają to samo okno z wybranym etapem.
//
// Co było nie tak wcześniej:
//  - usunięcie protokołu pytało przez window.confirm, a potem usuwało szablon
//    ZAWSZE - także gdy inna reguła (np. drugi etap albo usługa) nadal go używała.
//    Błąd usuwania reguły był połykany, więc „Usuń" potrafił nic nie zrobić bez słowa;
//  - usunięcie zgody pytało przez confirm() i nie mówiło, czy się udało;
//  - błąd wczytania list wyglądał jak pusta lista („Brak dokumentów");
//  - reguły sortowane były w miejscu, na tablicy z cache react-query;
//  - meta wierszy sklejona kropką „·" (CLAUDE.md §4).

import { useState } from 'react';
import styled from 'styled-components';
import { Eye, FileText, MoreVertical, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { usePermissions } from '@/core/permissions';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    ActionMenu, Button, Card, IconButton, MenuDivider, MenuItem, Notice, Panel, SectionTitle, StatusPill, ui,
    useActionMenu,
} from '@/common/components/ui';
import {
    useProtocolTemplates,
    useProtocolRules,
    useDeleteProtocolRule,
    useDeleteProtocolTemplate,
} from '@/modules/protocols/api/useProtocols';
import { useConsentDefinitions, useDeleteDefinition } from '@/modules/consents/hooks/useConsents';
import type { ProtocolRule, ProtocolStage, ProtocolTemplate } from '@/modules/protocols/types';
import type { ConsentResponse } from '@/modules/consents/types';
import { MySignatureSection } from './MySignatureSection';
import { DocumentLogoCard } from './DocumentLogoCard';
import { AddDocumentModal } from './AddDocumentModal';
import { AddConsentDocumentModal } from './AddConsentDocumentModal';
import { EditTemplateModal } from './EditTemplateModal';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import { STAGE_TITLE, byDisplayOrder, consentsWord, documentsWord, isTemplateOrphanedBy } from './documentsModel';
import { backendMessage, shownByInterceptor } from './studioErrors';

// ─── Wygląd ───────────────────────────────────────────────────────────────────

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
`;

const Stages = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

    @media (max-width: 900px) { grid-template-columns: minmax(0, 1fr); }
`;

const Stage = styled.section`
    min-width: 0;
    padding: 18px 22px 10px;

    & + & { border-left: 1px solid ${ui.lineFaint}; }

    @media (max-width: 900px) {
        & + & { border-left: none; border-top: 1px solid ${ui.lineFaint}; }
    }
    @media (max-width: 640px) { padding: 16px 16px 8px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
    min-width: 0;
`;

// Przy etapie przycisk zostaje po prawej, a licznik łamie się pod nazwą etapu -
// w półkolumnie „Dodaj dokument" spadał inaczej do osobnej linii.
const StageHead = styled(Head)`
    flex-wrap: nowrap;
    align-items: flex-start;

    > h3 { flex: 1 1 auto; }
    > button { flex-shrink: 0; }
`;

const LoadState = styled.div`
    padding: 22px;

    @media (max-width: 640px) { padding: 16px; }
`;

const List = styled.ul`
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
`;

const Row = styled.li`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-top: 1px solid ${ui.lineFaint};
    min-width: 0;

    &:first-child { border-top: none; }
`;

const RowIcon = styled.span`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: ${ui.surfaceAlt};
    color: ${ui.textMuted};

    svg { width: 17px; height: 17px; }
`;

const RowText = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;

    strong { font-size: 14.5px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
`;

// Atrybuty wiersza to osobne elementy z odstępem, nie ciąg sklejony kropką (CLAUDE.md §4).
const Meta = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Empty = styled.p`
    margin: 10px 0 12px;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const FlatPanel = styled(Panel)`
    padding: 16px 20px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const PanelNote = styled.p`
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

type RuleMenuItem = { rule: ProtocolRule; template: ProtocolTemplate | undefined };

// ─── Sekcja ───────────────────────────────────────────────────────────────────

export function DocumentsSection() {
    const { can } = usePermissions();
    const canManage = can('VISITS_CREATE');
    const canDelete = can('VISITS_DELETE');
    const { showSuccess, showError } = useToast();

    const [addStage, setAddStage] = useState<ProtocolStage>('CHECK_IN');
    const [modalOpen, setModalOpen] = useState(false);
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ProtocolTemplate | null>(null);
    const [deletingRule, setDeletingRule] = useState<RuleMenuItem | null>(null);
    const [deletingConsent, setDeletingConsent] = useState<ConsentResponse | null>(null);

    const ruleMenu = useActionMenu<RuleMenuItem>();
    const consentMenu = useActionMenu<ConsentResponse>();

    const templatesQuery = useProtocolTemplates();
    const rulesQuery = useProtocolRules();
    const consentsQuery = useConsentDefinitions();
    const deleteRule = useDeleteProtocolRule();
    const deleteTemplate = useDeleteProtocolTemplate();
    const { deleteDefinition, isDeleting: isDeletingConsent } = useDeleteDefinition();

    const templates = templatesQuery.data ?? [];
    const rules = rulesQuery.data ?? [];
    const templatesMap = new Map<string, ProtocolTemplate>(templates.map(t => [t.id, t]));
    const rulesLoading = templatesQuery.isLoading || rulesQuery.isLoading;
    const rulesError = templatesQuery.isError || rulesQuery.isError;

    const reportError = (title: string, error: unknown) => {
        // 4xx pokazał już interceptor (tym samym zdaniem z backendu) - tu tylko 5xx i sieć.
        if (shownByInterceptor(error)) return;
        showError(title, backendMessage(error) ?? 'Sprawdź połączenie i spróbuj ponownie.');
    };

    const refreshAll = () => {
        templatesQuery.refetch();
        rulesQuery.refetch();
        consentsQuery.refetch();
    };

    const openAdd = (stage: ProtocolStage) => {
        setAddStage(stage);
        setModalOpen(true);
    };

    const removeProtocol = async ({ rule, template }: RuleMenuItem) => {
        const name = template?.name ?? 'Dokument';
        try {
            await deleteRule.mutateAsync(rule.id);
        } catch (err) {
            reportError('Nie udało się usunąć dokumentu', err);
            return;
        }
        if (isTemplateOrphanedBy(rule, rules)) {
            try {
                await deleteTemplate.mutateAsync(rule.protocolTemplateId);
            } catch (err) {
                // Dokument zniknął z etapu (to było celem), został tylko nieużywany plik
                // szablonu - mówimy o tym, ale nie jak o porażce całej operacji.
                if (!shownByInterceptor(err)) {
                    showError('Dokument usunięty z etapu, ale plik szablonu został', backendMessage(err) ?? 'Nie przeszkadza w pracy. Możesz spróbować usunąć go później.');
                }
                return;
            }
        }
        showSuccess(
            'Dokument usunięty',
            `„${name}" nie będzie już podpisywany przy ${rule.stage === 'CHECK_IN' ? 'przyjęciu' : 'wydaniu'} pojazdu.`,
        );
    };

    const removeConsent = (definition: ConsentResponse) => {
        deleteDefinition(definition.id, {
            onSuccess: () => showSuccess('Zgoda usunięta', `„${definition.name}" nie będzie już zbierana. Podpisy klientów zostają w historii.`),
            onError: error => reportError('Nie udało się usunąć zgody', error),
        });
    };

    const renderStage = (stage: ProtocolStage) => {
        const stageRules = byDisplayOrder(rules.filter(r => r.stage === stage));
        const titleId = `documents-stage-${stage}`;
        return (
            <Stage aria-labelledby={titleId}>
                <StageHead>
                    <SectionTitle as="h3" id={titleId} count={stageRules.length ? `${stageRules.length} ${documentsWord(stageRules.length)}` : undefined}>
                        {STAGE_TITLE[stage]}
                    </SectionTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Dodaj dokument: ${STAGE_TITLE[stage].toLowerCase()}`}
                        onClick={() => openAdd(stage)}
                    >
                        <Plus aria-hidden="true" />
                        Dodaj dokument
                    </Button>
                </StageHead>
                {stageRules.length === 0 ? (
                    <Empty>Klient nic tu nie podpisuje. Dodaj protokół, jeśli ma go podpisać przy każdej wizycie.</Empty>
                ) : (
                    <List>
                        {stageRules.map(rule => {
                            const template = rule.protocolTemplate ?? templatesMap.get(rule.protocolTemplateId);
                            const previewUrl = template?.previewUrl || template?.templateUrl;
                            const hasMenu = !!previewUrl || !!template || canDelete;
                            const forServices = rule.triggerType === 'SERVICE_SPECIFIC';
                            return (
                                <Row key={rule.id}>
                                    <RowIcon aria-hidden="true"><FileText /></RowIcon>
                                    <RowText>
                                        <strong>{template?.name ?? 'Dokument bez nazwy'}</strong>
                                        <Meta>
                                            <StatusPill $tone={forServices ? 'info' : 'neutral'}>
                                                {forServices ? 'Dla wybranych usług' : 'Przy każdej wizycie'}
                                            </StatusPill>
                                            {forServices && rule.serviceNames.length > 0 && (
                                                <span>{rule.serviceNames.join(', ')}</span>
                                            )}
                                        </Meta>
                                    </RowText>
                                    {hasMenu && (
                                        <IconButton
                                            label={`Więcej akcji: ${template?.name ?? 'dokument'}`}
                                            variant="ghost"
                                            size="sm"
                                            shape="square"
                                            aria-haspopup="menu"
                                            active={ruleMenu.isOpen(rule.id)}
                                            onClick={e => ruleMenu.toggle(e, { rule, template }, rule.id)}
                                        >
                                            <MoreVertical />
                                        </IconButton>
                                    )}
                                </Row>
                            );
                        })}
                    </List>
                )}
            </Stage>
        );
    };

    const consents = byDisplayOrder(consentsQuery.definitions);
    const currentRule = ruleMenu.menu?.item ?? null;
    const currentRulePreview = currentRule?.template?.previewUrl || currentRule?.template?.templateUrl;
    const currentConsent = consentMenu.menu?.item ?? null;
    const currentConsentPreview = currentConsent?.currentVersion?.previewUrl || currentConsent?.currentVersion?.pdfUrl;

    return (
        <Column>
            {canManage && (
                <SettingsHeaderActions>
                    <Button variant="primary" size="lg" onClick={() => openAdd('CHECK_IN')}>
                        <Plus aria-hidden="true" />
                        Dodaj dokument
                    </Button>
                </SettingsHeaderActions>
            )}

            {canManage && (
                <Card aria-label="Dokumenty do podpisu">
                    {rulesError ? (
                        <LoadState>
                            <Notice
                                tone="danger"
                                role="alert"
                                title="Nie udało się wczytać dokumentów"
                                action={(
                                    <Button variant="ghost" size="sm" onClick={() => { templatesQuery.refetch(); rulesQuery.refetch(); }}>
                                        Spróbuj ponownie
                                    </Button>
                                )}
                            >
                                Lista może nie być pusta - po prostu jej nie widzimy. Sprawdź połączenie z internetem.
                            </Notice>
                        </LoadState>
                    ) : rulesLoading ? (
                        <LoadState><Empty role="status">Wczytywanie dokumentów...</Empty></LoadState>
                    ) : (
                        <Stages>
                            {renderStage('CHECK_IN')}
                            {renderStage('CHECK_OUT')}
                        </Stages>
                    )}
                </Card>
            )}

            {canManage && (
                <FlatPanel aria-labelledby="documents-consents-title">
                    <Head>
                        <SectionTitle
                            as="h3"
                            id="documents-consents-title"
                            count={consents.length ? `${consents.length} ${consentsWord(consents.length)}` : undefined}
                        >
                            Zgody
                        </SectionTitle>
                        <Button variant="tinted" size="sm" onClick={() => setConsentModalOpen(true)}>
                            <Plus aria-hidden="true" />
                            Dodaj zgodę
                        </Button>
                    </Head>

                    {consentsQuery.isError ? (
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać zgód"
                            action={<Button variant="ghost" size="sm" onClick={() => consentsQuery.refetch()}>Spróbuj ponownie</Button>}
                        >
                            Sprawdź połączenie z internetem.
                        </Notice>
                    ) : consentsQuery.isLoading ? (
                        <Empty role="status">Wczytywanie zgód...</Empty>
                    ) : consents.length === 0 ? (
                        <Empty>Nie zbierasz jeszcze żadnych zgód, np. na kontakt marketingowy.</Empty>
                    ) : (
                        <List>
                            {consents.map(definition => {
                                const hasPreview = !!(definition.currentVersion?.previewUrl || definition.currentVersion?.pdfUrl);
                                return (
                                    <Row key={definition.id}>
                                        <RowIcon aria-hidden="true"><ShieldCheck /></RowIcon>
                                        <RowText>
                                            <strong>{definition.name}</strong>
                                            <Meta>
                                                <StatusPill $tone={definition.isMandatory ? 'warn' : 'neutral'}>
                                                    {definition.isMandatory ? 'Obowiązkowa' : 'Opcjonalna'}
                                                </StatusPill>
                                                <span>{definition.stage === 'CHECK_IN' ? 'Przy przyjęciu pojazdu' : 'Przy wydaniu pojazdu'}</span>
                                            </Meta>
                                        </RowText>
                                        {(hasPreview || canDelete) && (
                                            <IconButton
                                                label={`Więcej akcji: ${definition.name}`}
                                                variant="ghost"
                                                size="sm"
                                                shape="square"
                                                aria-haspopup="menu"
                                                disabled={isDeletingConsent}
                                                active={consentMenu.isOpen(definition.id)}
                                                onClick={e => consentMenu.toggle(e, definition, definition.id)}
                                            >
                                                <MoreVertical />
                                            </IconButton>
                                        )}
                                    </Row>
                                );
                            })}
                        </List>
                    )}

                    <PanelNote>
                        Zgodę klient podpisuje raz. Przy kolejnych wizytach nie pojawi się ponownie, dopóki podpisana wersja jest aktualna.
                    </PanelNote>
                </FlatPanel>
            )}

            {canManage && <DocumentLogoCard />}

            <MySignatureSection />

            <ActionMenu anchor={ruleMenu.menu?.anchor ?? null} onClose={ruleMenu.close} label="Akcje dokumentu">
                {currentRulePreview && (
                    <MenuItem icon={<Eye />} onClick={() => window.open(currentRulePreview, '_blank', 'noopener,noreferrer')}>
                        Podgląd PDF
                    </MenuItem>
                )}
                {currentRule?.template && (
                    <MenuItem icon={<Pencil />} onClick={() => setEditingTemplate(currentRule.template ?? null)}>
                        Zmień nazwę i opis
                    </MenuItem>
                )}
                {currentRule && canDelete && (
                    <>
                        {(currentRulePreview || currentRule.template) && <MenuDivider />}
                        <MenuItem icon={<Trash2 />} danger onClick={() => setDeletingRule(currentRule)}>Usuń dokument</MenuItem>
                    </>
                )}
            </ActionMenu>

            <ActionMenu anchor={consentMenu.menu?.anchor ?? null} onClose={consentMenu.close} label="Akcje zgody">
                {currentConsentPreview && (
                    <MenuItem icon={<Eye />} onClick={() => window.open(currentConsentPreview, '_blank', 'noopener,noreferrer')}>
                        Podgląd PDF
                    </MenuItem>
                )}
                {currentConsent && canDelete && (
                    <>
                        {currentConsentPreview && <MenuDivider />}
                        <MenuItem icon={<Trash2 />} danger onClick={() => setDeletingConsent(currentConsent)}>Usuń zgodę</MenuItem>
                    </>
                )}
            </ActionMenu>

            <ConfirmationModal
                isOpen={deletingRule !== null}
                title={`Usunąć dokument „${deletingRule?.template?.name ?? 'bez nazwy'}"?`}
                message={deletingRule
                    ? `Klient przestanie go podpisywać przy ${deletingRule.rule.stage === 'CHECK_IN' ? 'przyjęciu' : 'wydaniu'} pojazdu. Protokoły już podpisane zostają w wizytach. Tego nie da się cofnąć.`
                    : ''}
                variant="danger"
                confirmText="Usuń dokument"
                cancelText="Zostaw"
                onConfirm={() => { if (deletingRule) void removeProtocol(deletingRule); }}
                onCancel={() => setDeletingRule(null)}
            />

            <ConfirmationModal
                isOpen={deletingConsent !== null}
                title={`Usunąć zgodę „${deletingConsent?.name ?? ''}"?`}
                message="Zgoda przestanie pojawiać się przy wizytach. Podpisy, które klienci już złożyli, zostają w historii."
                variant="danger"
                confirmText="Usuń zgodę"
                cancelText="Zostaw"
                onConfirm={() => { if (deletingConsent) removeConsent(deletingConsent); }}
                onCancel={() => setDeletingConsent(null)}
            />

            {canManage && (
                <>
                    {/* Klucz = etap: okno otwarte z „Wydania" startuje z wydaniem, nie z etapem poprzedniego otwarcia. */}
                    <AddDocumentModal
                        key={addStage}
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        initialStage={addStage}
                        onSuccess={refreshAll}
                    />
                    <AddConsentDocumentModal
                        isOpen={consentModalOpen}
                        onClose={() => setConsentModalOpen(false)}
                        onSuccess={refreshAll}
                    />
                </>
            )}

            {editingTemplate && (
                <EditTemplateModal template={editingTemplate} onClose={() => setEditingTemplate(null)} />
            )}
        </Column>
    );
}
