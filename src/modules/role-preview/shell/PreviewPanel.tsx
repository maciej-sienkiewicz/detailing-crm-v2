import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { PermissionTreeEditor, TrackWorkTimeToggle } from '@/modules/settings/components/roles/PermissionTreeEditor';
import { buildTreeIndex, orderedCodes } from '@/modules/settings/components/roles/permissionGraph';
import type { RolePreviewState, SimulatedEffect } from '../rolePreviewApi';
import { changeCount, diffCodes, sameSelection } from './previewModel';

interface PreviewPanelProps {
    state: RolePreviewState;
    applying: boolean;
    applyError: string | null;
    onApply: (permissions: string[], trackWorkTime: boolean) => void;
    onClose: () => void;
}

/**
 * Panel uprawnień okna podglądu: drzewo uprawnień roli w piaskownicy, różnica względem
 * roli z ustawień i to, co system wysłałby na zewnątrz. „Zastosuj" zmienia rolę wyłącznie
 * w piaskownicy - prawdziwa rola zostaje nietknięta.
 */
export function PreviewPanel({ state, applying, applyError, onApply, onClose }: PreviewPanelProps) {
    const applied = useMemo(() => new Set(state.permissions), [state.permissions]);
    const initial = useMemo(() => new Set(state.initialPermissions), [state.initialPermissions]);
    const index = useMemo(() => buildTreeIndex(state.catalog), [state.catalog]);
    const allCodes = useMemo(() => orderedCodes(state.catalog, index), [state.catalog, index]);
    const labelOf = index.labelOf;

    const [draft, setDraft] = useState<Set<string>>(applied);
    const [draftTrackWorkTime, setDraftTrackWorkTime] = useState(state.trackWorkTime);

    // Nowa rola na serwerze (po zastosowaniu) jest nowym punktem wyjścia edycji. Po treści,
    // nie po obiekcie: okresowe odświeżenie stanu przynosi nowy obiekt z tą samą rolą
    // i nie może skasować zmian, których ktoś jeszcze nie zastosował.
    const appliedKey = `${[...state.permissions].sort().join(',')}|${state.trackWorkTime}`;
    useEffect(() => {
        setDraft(new Set(state.permissions));
        setDraftTrackWorkTime(state.trackWorkTime);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- appliedKey niesie całą treść
    }, [appliedKey]);

    const enabledFeatures = useMemo(() => new Set(state.enabledFeatures), [state.enabledFeatures]);
    const isFeatureEnabled = (featureKey: string | null) => !featureKey || enabledFeatures.has(featureKey);

    const pending = !sameSelection(draft, applied) || draftTrackWorkTime !== state.trackWorkTime;
    const vsInitial = diffCodes(initial, draft);
    const trackWorkTimeChanged = draftTrackWorkTime !== state.initialTrackWorkTime;
    const initialDiffCount = changeCount(vsInitial) + (trackWorkTimeChanged ? 1 : 0);

    const apply = (permissions: Set<string>, trackWorkTime: boolean) =>
        onApply(allCodes.filter(c => permissions.has(c)), trackWorkTime);

    return (
        <Panel aria-label="Uprawnienia roli w podglądzie">
            <Head>
                <div>
                    <Title>Uprawnienia roli</Title>
                    <Subtitle>„{state.roleName}"</Subtitle>
                </div>
                <CloseBtn type="button" onClick={onClose} aria-label="Zamknij panel uprawnień">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </CloseBtn>
            </Head>

            <Body>
                <Note>
                    Zmiany działają tylko w tym podglądzie. Rola w ustawieniach studia zostaje bez zmian -
                    jeśli chcesz ją zmienić naprawdę, zrób to w ustawieniach ról.
                </Note>

                <DiffCard>
                    <DiffHead>
                        <DiffTitle>Względem roli z ustawień</DiffTitle>
                        {initialDiffCount > 0 && (
                            <LinkBtn
                                type="button"
                                disabled={applying}
                                onClick={() => apply(initial, state.initialTrackWorkTime)}
                            >
                                Przywróć
                            </LinkBtn>
                        )}
                    </DiffHead>
                    {initialDiffCount === 0 ? (
                        <DiffEmpty>Bez zmian - podgląd pokazuje rolę dokładnie taką, jak w ustawieniach.</DiffEmpty>
                    ) : (
                        <DiffList>
                            {[...vsInitial.added].map(code => (
                                <DiffItem key={`+${code}`} $kind="added">+ {labelOf.get(code) ?? code}</DiffItem>
                            ))}
                            {[...vsInitial.removed].map(code => (
                                <DiffItem key={`-${code}`} $kind="removed">− {labelOf.get(code) ?? code}</DiffItem>
                            ))}
                            {trackWorkTimeChanged && (
                                <DiffItem $kind={draftTrackWorkTime ? 'added' : 'removed'}>
                                    {draftTrackWorkTime ? '+ Śledzenie czasu pracy' : '− Śledzenie czasu pracy'}
                                </DiffItem>
                            )}
                        </DiffList>
                    )}
                </DiffCard>

                <TrackWorkTimeToggle value={draftTrackWorkTime} onChange={setDraftTrackWorkTime} />

                <PermissionTreeEditor
                    catalog={state.catalog}
                    selected={draft}
                    onChange={setDraft}
                    isFeatureEnabled={isFeatureEnabled}
                    changes={vsInitial}
                />

                <Effects effects={state.simulatedEffects} />
            </Body>

            <Footer>
                {applyError && <ApplyError role="alert">{applyError}</ApplyError>}
                <FooterRow>
                    <PendingText>
                        {pending ? 'Niezastosowane zmiany' : 'Podgląd pokazuje te uprawnienia'}
                    </PendingText>
                    <GhostBtn
                        type="button"
                        disabled={!pending || applying}
                        onClick={() => { setDraft(new Set(applied)); setDraftTrackWorkTime(state.trackWorkTime); }}
                    >
                        Cofnij
                    </GhostBtn>
                    <PrimaryBtn
                        type="button"
                        disabled={!pending || applying}
                        onClick={() => apply(draft, draftTrackWorkTime)}
                    >
                        {applying ? 'Zapisywanie...' : 'Zastosuj w podglądzie'}
                    </PrimaryBtn>
                </FooterRow>
            </Footer>
        </Panel>
    );
}

function Effects({ effects }: { effects: SimulatedEffect[] }) {
    return (
        <EffectsCard>
            <DiffTitle>Co system wysłałby na zewnątrz</DiffTitle>
            {effects.length === 0 ? (
                <DiffEmpty>
                    Nic. Wiadomości do klientów, powiadomienia i zapytania do usług zewnętrznych nie wychodzą
                    z podglądu - pojawią się tutaj, gdy system by je wysłał.
                </DiffEmpty>
            ) : (
                <EffectList>
                    {effects.map((effect, i) => (
                        <EffectItem key={`${effect.at}-${i}`}>
                            <EffectMeta>
                                <EffectChannel>{effect.channelLabel}</EffectChannel>
                                {effect.recipient && <EffectRecipient>→ {effect.recipient}</EffectRecipient>}
                                <EffectTime>{new Date(effect.at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</EffectTime>
                            </EffectMeta>
                            <EffectSummary>{effect.summary}</EffectSummary>
                        </EffectItem>
                    ))}
                </EffectList>
            )}
        </EffectsCard>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const Panel = styled.aside`
    display: flex;
    flex-direction: column;
    width: 420px;
    max-width: 100%;
    height: 100%;
    background: #ffffff;
    border-left: 1px solid #e2e8f0;
    box-shadow: -12px 0 32px rgba(15, 23, 42, 0.08);

    @media (max-width: 900px) {
        position: absolute;
        inset: 0 0 0 auto;
        width: min(420px, 100%);
        z-index: 5;
    }
`;

const Head = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid #f1f5f9;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const Subtitle = styled.p`
    margin: 2px 0 0;
    font-size: 12px;
    color: #64748b;
`;

const CloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    cursor: pointer;
    flex-shrink: 0;

    &:hover { background: #f8fafc; color: #0f172a; }
`;

const Body = styled.div`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 18px 18px;
`;

const Note = styled.p`
    margin: 0;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.5;
    color: #92400e;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 10px;
`;

const DiffCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    flex-shrink: 0;
`;

const DiffHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const DiffTitle = styled.span`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64748b;
`;

const DiffEmpty = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: #94a3b8;
`;

const DiffList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DiffItem = styled.span<{ $kind: 'added' | 'removed' }>`
    font-size: 12px;
    line-height: 1.4;
    color: ${p => (p.$kind === 'added' ? '#15803d' : '#b91c1c')};
`;

const LinkBtn = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #0284c7;
    cursor: pointer;

    &:hover:not(:disabled) { text-decoration: underline; }
    &:disabled { opacity: 0.5; cursor: wait; }
`;

const EffectsCard = styled(DiffCard)`
    margin-top: 4px;
`;

const EffectList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const EffectItem = styled.li`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; padding-bottom: 0; }
`;

const EffectMeta = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
`;

const EffectChannel = styled.span`
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
`;

const EffectRecipient = styled.span`
    font-size: 12px;
    color: #475569;
    word-break: break-all;
`;

const EffectTime = styled.span`
    margin-left: auto;
    font-size: 11px;
    color: #94a3b8;
`;

const EffectSummary = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: #334155;
    white-space: pre-line;
    overflow-wrap: anywhere;
`;

const Footer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PendingText = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: #64748b;

    /* Na wąskim ekranie stan mówią same przyciski (aktywne = są zmiany). */
    @media (max-width: 420px) { visibility: hidden; }
`;

const ApplyError = styled.p`
    margin: 0;
    font-size: 12px;
    color: #b91c1c;
`;

const GhostBtn = styled.button`
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: #334155;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    cursor: pointer;

    &:hover:not(:disabled) { background: #f8fafc; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PrimaryBtn = styled.button`
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    color: white;
    background: #0ea5e9;
    border: none;
    border-radius: 9px;
    cursor: pointer;

    &:hover:not(:disabled) { opacity: 0.9; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
