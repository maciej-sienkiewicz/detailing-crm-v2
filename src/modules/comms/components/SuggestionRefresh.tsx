// src/modules/comms/components/SuggestionRefresh.tsx
//
// „Znajdź ponownie": przelicza dobór usług od nowa i pokazuje, co z tego wyszło.
//
// Pusta lista sugestii ma kilka zupełnie różnych przyczyn - model nie odpowiedział,
// uznał, że usługi nie ma w cenniku, wskazał pozycję, którą odsiała bramka, albo
// odrzucił ją model sprawdzający - a na ekranie wszystkie wyglądały tak samo: brakiem
// czegokolwiek. Po odświeżeniu pod przyciskiem stoi jedno zdanie z przyczyną i lista
// rozważonych pozycji z etapem, na którym każda się zatrzymała.
//
// Przycisk jest cichy (tekst z ikoną, bez wypełnienia): w oknie leada krokiem
// następnym jest „Stwórz rezerwację" (CLAUDE.md §2), a to jest narzędzie, nie akcja.
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';
import type { SuggestionActions } from './SuggestedServiceRows';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
`;

const RefreshButton = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    border: none;
    background: none;
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:hover:not(:disabled) { color: ${p => p.theme.colors.text}; }
    &:disabled { cursor: default; }
    &[aria-busy='true'] svg { animation: spin 1s linear infinite; }

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const Panel = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceHover};
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};

    .outcome { color: ${p => p.theme.colors.text}; font-weight: 600; }

    /* Surowe uzasadnienie asystenta mówi językiem implementacji (nazwy z kodu) - dla
       wsparcia technicznego, schowane. Na wierzchu tylko zdanie i powody przy pozycjach. */
    details { font-size: 12px; color: ${p => p.theme.colors.textMuted}; }
    summary { cursor: pointer; width: max-content; }
    details p { margin: 6px 0 0; font-style: italic; }
`;

const Candidates = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li { display: flex; flex-direction: column; gap: 1px; }
    .name { color: ${p => p.theme.colors.text}; font-weight: 500; }
    .stage { font-size: 12px; }
    .stage[data-shown='true'] { color: ${p => p.theme.colors.success}; }
    .quote { font-size: 12px; color: ${p => p.theme.colors.textMuted}; }
`;

export function SuggestionRefresh({ actions }: { actions: SuggestionActions }) {
    const { refresh, accept, reject } = actions;
    const busy = refresh.isPending || accept.isPending || reject.isPending;
    // Starszy backend nie zwraca diagnozy - wtedy panel po prostu się nie pokazuje.
    const diagnostics = refresh.data && 'diagnostics' in refresh.data ? refresh.data.diagnostics : undefined;

    return (
        <Wrap>
            <RefreshButton
                type="button"
                onClick={() => refresh.mutate()}
                disabled={busy}
                aria-busy={refresh.isPending}
                title="Przelicz dobór usług z cennika od nowa i pokaż, co z tego wyszło"
            >
                <RefreshCw />
                {refresh.isPending ? 'Szukam usług od nowa, to trwa kilkanaście sekund…' : 'Znajdź ponownie'}
            </RefreshButton>

            {refresh.isError && !refresh.isPending && (
                <Panel role="status">
                    <span className="outcome">Nie udało się odświeżyć sugestii. Spróbuj ponownie za chwilę.</span>
                </Panel>
            )}

            {diagnostics && !refresh.isPending && (
                <Panel role="status" aria-label="Wynik odświeżenia sugestii">
                    <span className="outcome">{diagnostics.outcome}</span>
                    {diagnostics.candidates.length > 0 && (
                        <Candidates>
                            {diagnostics.candidates.map((candidate, index) => (
                                <li key={`${candidate.serviceName}-${index}`}>
                                    <span className="name">{candidate.serviceName}</span>
                                    <span className="stage" data-shown={candidate.shown}>{candidate.stageLabel}</span>
                                    {candidate.quote && <span className="quote">Klient pisze: „{candidate.quote}”</span>}
                                </li>
                            ))}
                        </Candidates>
                    )}
                    {diagnostics.reasoning && (
                        <details>
                            <summary>Szczegóły techniczne</summary>
                            <p>„{diagnostics.reasoning}”</p>
                        </details>
                    )}
                </Panel>
            )}
        </Wrap>
    );
}
