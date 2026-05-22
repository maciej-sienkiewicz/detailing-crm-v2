import { useState } from 'react';
import styled from 'styled-components';
import {
    useProtocolTemplates,
    useProtocolRules,
    useDeleteProtocolRule,
    useDeleteProtocolTemplate,
    useUpdateProtocolTemplate,
} from '@/modules/protocols/api/useProtocols';
import { useConsentDefinitions, useDeleteDefinition } from '@/modules/consents/hooks/useConsents';
import type { ProtocolRule, ProtocolStage, ProtocolTemplate } from '@/modules/protocols/types';
import type { ConsentResponse } from '@/modules/consents/types';
import { AddDocumentModal } from './AddDocumentModal';
import { AddConsentDocumentModal } from './AddConsentDocumentModal';

const StagesGrid = styled.div`
    display: grid;
    gap: 18px;
    grid-template-columns: 1fr 1fr;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

// ─── Stage panel ─────────────────────────────────────────────────────────────

const Panel = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const PanelHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #f1f5f9;
`;

const PanelTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const StageIconWrap = styled.div<{ $stage: ProtocolStage }>`
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: ${props => props.$stage === 'CHECK_IN'
        ? 'rgba(16,185,129,0.12)'
        : 'rgba(99,102,241,0.12)'};
    color: ${props => props.$stage === 'CHECK_IN' ? '#059669' : '#6366f1'};
    svg { width: 15px; height: 15px; }
`;

const Count = styled.span`
    font-size: 10px;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 9999px;
    background: #f1f5f9;
    color: #64748b;
`;

const AddBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: #0284c7;
    background: transparent;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: all 180ms;
    white-space: nowrap;

    &:hover { background: rgba(14,165,233,0.06); }
    svg { width: 13px; height: 13px; }
`;

const RuleList = styled.div`
    display: flex;
    flex-direction: column;
`;

const RuleItem = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid #f8fafc;
    transition: background 150ms;

    &:last-child { border-bottom: none; }
    &:hover { background: #fafbfc; }
`;

const FileIconWrap = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #f1f5f9;
    color: #64748b;
    svg { width: 18px; height: 18px; }
`;

const RuleInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const RuleName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const RuleMeta = styled.div`
    font-size: 11px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

const MetaDot = styled.span`
    color: #cbd5e1;
`;

const PillBadge = styled.span<{ $variant: 'mandatory' | 'optional' | 'global' | 'service' }>`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 600;
    ${props => {
        switch (props.$variant) {
            case 'mandatory': return 'background: rgba(239,68,68,0.1); color: #dc2626;';
            case 'optional':  return 'background: #f1f5f9; color: #64748b;';
            case 'global':    return 'background: rgba(59,130,246,0.1); color: #2563eb;';
            case 'service':   return 'background: rgba(99,102,241,0.1); color: #6366f1;';
        }
    }}
`;

const RuleActions = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
`;

const IconBtn = styled.button`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: #94a3b8;
    transition: all 150ms;

    &:hover { background: #f1f5f9; color: #334155; }
    &.danger:hover { background: rgba(239,68,68,0.08); color: #dc2626; }
    svg { width: 14px; height: 14px; }
`;

const EmptyBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    text-align: center;
    gap: 8px;
`;

const EmptyTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
`;

const EmptyDesc = styled.div`
    font-size: 12px;
    color: #cbd5e1;
    max-width: 200px;
    line-height: 1.5;
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 40px auto;

    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Edit-name inline modal ───────────────────────────────────────────────────

const EditOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const EditCard = styled.div`
    background: white;
    border-radius: 14px;
    padding: 24px;
    width: 100%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: 0 20px 60px rgba(15,23,42,0.18);
`;

const EditTitle = styled.h3`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
`;

const EditField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const EditLabel = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: #334155;
`;

const EditInput = styled.input`
    height: 38px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    padding: 0 12px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    outline: none;
    transition: all 180ms;

    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
`;

const EditTextarea = styled.textarea`
    min-height: 72px;
    padding: 10px 12px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.55;
    color: #0f172a;
    resize: vertical;
    outline: none;
    transition: all 180ms;

    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
`;

const EditActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const BtnSecondary = styled.button`
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms;
    &:hover { background: #f8fafc; }
`;

const BtnPrimary = styled.button`
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    background: #0ea5e9;
    font-size: 13px;
    font-weight: 500;
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms;
    &:hover { opacity: 0.9; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const FileTextIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
);

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const PencilIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

const EmptyFileIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);

// ─── Edit template mini-modal ─────────────────────────────────────────────────

interface EditTemplateModalProps {
    template: ProtocolTemplate;
    onClose: () => void;
    onSuccess: () => void;
}

function EditTemplateModal({ template, onClose, onSuccess }: EditTemplateModalProps) {
    const [name, setName] = useState(template.name);
    const [description, setDescription] = useState(template.description ?? '');
    const updateTemplate = useUpdateProtocolTemplate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name.trim().length < 3) return;
        await updateTemplate.mutateAsync({
            id: template.id,
            data: { name: name.trim(), description: description.trim() || undefined },
        });
        onSuccess();
        onClose();
    };

    return (
        <EditOverlay onClick={onClose}>
            <EditCard onClick={e => e.stopPropagation()}>
                <EditTitle>Edytuj dokument</EditTitle>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <EditField>
                        <EditLabel>Nazwa dokumentu</EditLabel>
                        <EditInput
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />
                    </EditField>
                    <EditField>
                        <EditLabel>Opis <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcjonalnie)</span></EditLabel>
                        <EditTextarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                        />
                    </EditField>
                    <EditActions>
                        <BtnSecondary type="button" onClick={onClose}>Anuluj</BtnSecondary>
                        <BtnPrimary type="submit" disabled={updateTemplate.isPending}>
                            {updateTemplate.isPending ? 'Zapisywanie…' : 'Zapisz'}
                        </BtnPrimary>
                    </EditActions>
                </form>
            </EditCard>
        </EditOverlay>
    );
}

// ─── Stage section ────────────────────────────────────────────────────────────

interface StageSectionProps {
    stage: ProtocolStage;
    rules: ProtocolRule[];
    templatesMap: Map<string, ProtocolTemplate>;
    onAdd: () => void;
    onRefresh: () => void;
}

function StageSection({ stage, rules, templatesMap, onAdd, onRefresh }: StageSectionProps) {
    const deleteRule = useDeleteProtocolRule();
    const deleteTemplate = useDeleteProtocolTemplate();
    const [editingTemplate, setEditingTemplate] = useState<ProtocolTemplate | null>(null);

    const label = stage === 'CHECK_IN' ? 'Przyjęcie pojazdu' : 'Wydanie pojazdu';
    const icon  = stage === 'CHECK_IN' ? <ArrowDownIcon /> : <ArrowUpIcon />;

    const handleDelete = async (rule: ProtocolRule) => {
        if (!confirm(`Usunąć dokument „${rule.protocolTemplate?.name ?? rule.protocolTemplateId}"? Tej operacji nie można cofnąć.`)) return;
        try {
            await deleteRule.mutateAsync(rule.id);
            // Also delete the template if it has no other rules
            const template = templatesMap.get(rule.protocolTemplateId);
            if (template) {
                await deleteTemplate.mutateAsync(template.id);
            }
            onRefresh();
        } catch {
            // rule deletion succeeded, template deletion failed — not critical
            onRefresh();
        }
    };

    return (
        <Panel>
            <PanelHead>
                <PanelTitle>
                    <StageIconWrap $stage={stage}>{icon}</StageIconWrap>
                    {label}
                    <Count>{rules.length}</Count>
                </PanelTitle>
                <AddBtn onClick={onAdd}>
                    <PlusIcon />
                    Dodaj dokument
                </AddBtn>
            </PanelHead>

            <RuleList>
                {rules.length === 0 ? (
                    <EmptyBox>
                        <EmptyFileIcon />
                        <EmptyTitle>Brak dokumentów</EmptyTitle>
                        <EmptyDesc>Kliknij „Dodaj dokument", aby skonfigurować pierwszy protokół dla tego etapu.</EmptyDesc>
                    </EmptyBox>
                ) : (
                    rules
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map(rule => {
                            const tpl = rule.protocolTemplate ?? templatesMap.get(rule.protocolTemplateId);
                            return (
                                <RuleItem key={rule.id}>
                                    <FileIconWrap><FileTextIcon /></FileIconWrap>
                                    <RuleInfo>
                                        <RuleName>{tpl?.name ?? '—'}</RuleName>
                                        <RuleMeta>
                                            <PillBadge $variant={rule.triggerType === 'GLOBAL_ALWAYS' ? 'global' : 'service'}>
                                                {rule.triggerType === 'GLOBAL_ALWAYS' ? 'Zawsze' : 'Dla usług'}
                                            </PillBadge>
                                            {rule.triggerType === 'SERVICE_SPECIFIC' && rule.serviceNames.length > 0 && (
                                                <>
                                                    <MetaDot>·</MetaDot>
                                                    <span>{rule.serviceNames.join(', ')}</span>
                                                </>
                                            )}
                                        </RuleMeta>
                                    </RuleInfo>
                                    <RuleActions>
                                        {tpl?.templateUrl && (
                                            <IconBtn
                                                as="a"
                                                href={tpl.templateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Podgląd PDF"
                                            >
                                                <EyeIcon />
                                            </IconBtn>
                                        )}
                                        {tpl && (
                                            <IconBtn title="Edytuj" onClick={() => setEditingTemplate(tpl)}>
                                                <PencilIcon />
                                            </IconBtn>
                                        )}
                                        <IconBtn
                                            className="danger"
                                            title="Usuń"
                                            onClick={() => handleDelete(rule)}
                                        >
                                            <TrashIcon />
                                        </IconBtn>
                                    </RuleActions>
                                </RuleItem>
                            );
                        })
                )}
            </RuleList>

            {editingTemplate && (
                <EditTemplateModal
                    template={editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSuccess={onRefresh}
                />
            )}
        </Panel>
    );
}

// ─── Consent-section styled extras ───────────────────────────────────────────

const ConsentPanel = styled(Panel)`
    border-top: 3px solid #6366f1;
`;

const ConsentPanelHead = styled(PanelHead)`
    background: linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 100%);
`;

const ConsentIconWrap = styled.div`
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: rgba(99,102,241,0.12);
    color: #6366f1;
    svg { width: 15px; height: 15px; }
`;

const ConsentAddBtn = styled(AddBtn)`
    color: #6366f1;
    border-color: #6366f1;
    &:hover { background: rgba(99,102,241,0.06); }
`;

const StageMiniPill = styled.span<{ $stage: ProtocolStage }>`
    display: inline-flex; align-items: center; padding: 2px 7px;
    border-radius: 9999px; font-size: 10px; font-weight: 600;
    background: ${p => p.$stage === 'CHECK_IN' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)'};
    color: ${p => p.$stage === 'CHECK_IN' ? '#059669' : '#6366f1'};
`;

const SlugPill = styled.span`
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 600;
    padding: 2px 7px; border-radius: 9999px;
    background: #f1f5f9; color: #64748b;
    letter-spacing: -0.2px;
`;

const InfoChip = styled.div`
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; color: #64748b;
    padding: 8px 14px;
    background: rgba(99,102,241,0.04);
    border-top: 1px solid #f1f5f9;
    svg { width: 13px; height: 13px; color: #6366f1; }
`;

// ─── ShieldIcon ───────────────────────────────────────────────────────────────

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const InfoIconSm = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

// ─── ConsentSection ───────────────────────────────────────────────────────────

interface ConsentSectionProps {
    definitions: ConsentResponse[];
    onAdd: () => void;
    onRefresh: () => void;
}

function ConsentSection({ definitions, onAdd, onRefresh }: ConsentSectionProps) {
    const { deleteDefinition, isDeleting } = useDeleteDefinition({ onSuccess: onRefresh });

    const handleDelete = (def: ConsentResponse) => {
        if (!confirm(`Usunąć zgodę „${def.name}"?\n\nHistoria podpisów klientów zostanie zachowana, ale zgoda przestanie być aktywna.`)) return;
        deleteDefinition(def.id);
    };

    const sorted = [...definitions].sort((a, b) => a.displayOrder - b.displayOrder);

    return (
        <ConsentPanel>
            <ConsentPanelHead>
                <PanelTitle>
                    <ConsentIconWrap><ShieldIcon /></ConsentIconWrap>
                    Zgody marketingowe
                    <Count>{definitions.length}</Count>
                </PanelTitle>
                <ConsentAddBtn onClick={onAdd}>
                    <PlusIcon />
                    Dodaj zgodę
                </ConsentAddBtn>
            </ConsentPanelHead>

            <RuleList>
                {sorted.length === 0 ? (
                    <EmptyBox>
                        <EmptyFileIcon />
                        <EmptyTitle>Brak zgód</EmptyTitle>
                        <EmptyDesc>Zgody zbierane jednorazowo — klient podpisuje tylko raz i system pamięta to między wizytami.</EmptyDesc>
                    </EmptyBox>
                ) : (
                    sorted.map(def => (
                        <RuleItem key={def.id}>
                            <FileIconWrap style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                                <ShieldIcon />
                            </FileIconWrap>
                            <RuleInfo>
                                <RuleName>{def.name}</RuleName>
                                <RuleMeta>
                                    <StageMiniPill $stage={def.stage}>
                                        {def.stage === 'CHECK_IN' ? 'Przyjęcie' : 'Wydanie'}
                                    </StageMiniPill>
                                    <MetaDot>·</MetaDot>
                                    <PillBadge $variant={def.isMandatory ? 'mandatory' : 'optional'}>
                                        {def.isMandatory ? 'Obowiązkowa' : 'Opcjonalna'}
                                    </PillBadge>
                                </RuleMeta>
                            </RuleInfo>
                            <RuleActions>
                                {def.currentVersion?.pdfUrl && (
                                    <IconBtn
                                        as="a"
                                        href={def.currentVersion.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Podgląd PDF"
                                    >
                                        <EyeIcon />
                                    </IconBtn>
                                )}
                                <IconBtn
                                    className="danger"
                                    title="Usuń"
                                    disabled={isDeleting}
                                    onClick={() => handleDelete(def)}
                                >
                                    <TrashIcon />
                                </IconBtn>
                            </RuleActions>
                        </RuleItem>
                    ))
                )}
            </RuleList>

            <InfoChip>
                <InfoIconSm />
                Zgoda jest zbierana jednorazowo per klient i nie jest wymagana przy kolejnych wizytach, jeśli jest już aktywna.
            </InfoChip>
        </ConsentPanel>
    );
}

// ─── DocumentsSection ─────────────────────────────────────────────────────────

export function DocumentsSection() {
    const [addStage, setAddStage] = useState<ProtocolStage>('CHECK_IN');
    const [modalOpen, setModalOpen] = useState(false);
    const [consentModalOpen, setConsentModalOpen] = useState(false);

    const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useProtocolTemplates();
    const { data: rules = [], isLoading: loadingRules, refetch: refetchRules } = useProtocolRules();
    const { definitions: definitionItems, isLoading: loadingDefinitions, refetch: refetchDefinitions } = useConsentDefinitions();

    const isLoading = loadingTemplates || loadingRules || loadingDefinitions;

    const templatesMap = new Map<string, ProtocolTemplate>(templates.map(t => [t.id, t]));

    const checkInRules  = rules.filter(r => r.stage === 'CHECK_IN');
    const checkOutRules = rules.filter(r => r.stage === 'CHECK_OUT');

    const handleAdd = (stage: ProtocolStage) => {
        setAddStage(stage);
        setModalOpen(true);
    };

    const handleRefresh = () => {
        refetchTemplates();
        refetchRules();
        refetchDefinitions();
    };

    return (
        <>

            {isLoading ? (
                <Spinner />
            ) : (
                <>
                    <StagesGrid>
                        <StageSection
                            stage="CHECK_IN"
                            rules={checkInRules}
                            templatesMap={templatesMap}
                            onAdd={() => handleAdd('CHECK_IN')}
                            onRefresh={handleRefresh}
                        />
                        <StageSection
                            stage="CHECK_OUT"
                            rules={checkOutRules}
                            templatesMap={templatesMap}
                            onAdd={() => handleAdd('CHECK_OUT')}
                            onRefresh={handleRefresh}
                        />
                    </StagesGrid>

                    <ConsentSection
                        definitions={definitionItems}
                        onAdd={() => setConsentModalOpen(true)}
                        onRefresh={handleRefresh}
                    />
                </>
            )}

            <AddDocumentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                initialStage={addStage}
                onSuccess={handleRefresh}
            />

            <AddConsentDocumentModal
                isOpen={consentModalOpen}
                onClose={() => setConsentModalOpen(false)}
                onSuccess={handleRefresh}
            />
        </>
    );
}
