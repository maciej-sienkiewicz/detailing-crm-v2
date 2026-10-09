// src/modules/comms/components/LeadSuggestions.tsx
//
// Sugerowane usługi asystenta przy wycenie leada: wiersze z „Akceptuj"/„Odrzuć"
// i „Znajdź ponownie" z wyjaśnieniem, co trafiło, a co odpadło i dlaczego.
//
// Jeden klocek dla każdego miejsca, w którym widać wycenę leada: panel sprawy, okno
// wyceny i oferta w odpowiedzi. Przy przebudowie skrzynki wycena w panelu sprawy
// pokazywała już tylko przyjęte pozycje - sugestie i ich wyjaśnienie zniknęły razem
// z oknem leada, z którego panel przejął tę rolę.
import { useRef } from 'react';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { useSuggestionActions } from '../hooks/useLeads';
import type { Lead } from '../types';
import { toServiceLines } from '../utils/leadServiceLines';
import { SuggestedServiceRows } from './SuggestedServiceRows';
import { SuggestionRefresh } from './SuggestionRefresh';

interface LeadSuggestionsProps {
    lead: Lead;
    /**
     * Edytor z lokalną listą pozycji: przyjęta sugestia przychodzi tu jako gotowe
     * wiersze do dopisania. Bez tego wycena odświeża się sama z serwera.
     */
    onAccepted?: (lines: ServiceLineItem[]) => void;
}

export function LeadSuggestions({ lead, onAccepted }: LeadSuggestionsProps) {
    /*
     * Przyjęte pozycje znane w chwili otwarcia - tylko NOWO przyjęte trafiają do edytora.
     * Bez tego pozycja usunięta z wyceny w edytorze wracałaby przy pierwszej akceptacji.
     */
    const known = useRef(new Set(lead.services.filter(s => s.status === 'ACCEPTED').map(s => s.id)));
    const actions = useSuggestionActions(lead.id, {
        onAccepted: onAccepted && ((updated) => {
            const fresh = updated.services.filter(s => s.status === 'ACCEPTED' && !known.current.has(s.id));
            fresh.forEach(s => known.current.add(s.id));
            if (fresh.length > 0) onAccepted(toServiceLines(fresh));
        }),
    });
    const suggestions = lead.services.filter(s => s.status === 'SUGGESTED');

    return (
        <div>
            <SuggestedServiceRows suggestions={suggestions} actions={actions} />
            {/* Także bez sugestii: pusta lista to właśnie przypadek, w którym chce się
                zobaczyć, czemu dobór nic nie dał. */}
            <SuggestionRefresh actions={actions} />
        </div>
    );
}
