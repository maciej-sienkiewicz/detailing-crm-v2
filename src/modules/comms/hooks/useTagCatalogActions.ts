// src/modules/comms/hooks/useTagCatalogActions.ts
// Dodawanie i usuwanie tagów w słowniku studia - jedno zachowanie i jedne komunikaty.
//
// Wywołujący (okno „Oznacz jako lead", edytor komórki w tabeli) podaje wyłącznie to,
// co dla niego specyficzne: co zrobić ze świeżo dodanym kodem. Reszta - mutacje,
// toasty, treść komunikatów - jest wspólna, bo z punktu widzenia użytkownika to ta
// sama operacja wykonana z dwóch różnych miejsc.
import { useCreateLeadTag, useDeleteLeadTag } from './useLeads';
import { useToast } from '@/common/components/Toast';
import type { TagOption } from '../components/TagMultiSelect';

/**
 * Domyślne podpięcie do słownika studia: dodaje, kasuje i melduje o wyniku.
 * Wywołujący podaje tylko zaznaczenie - nie musi za każdym razem powtarzać
 * tych samych mutacji i tych samych komunikatów.
 */
export function useTagCatalogActions(onSelect?: (code: string) => void) {
    const createTag = useCreateLeadTag();
    const deleteTag = useDeleteLeadTag();
    const { showSuccess, showError } = useToast();

    const message = (error: unknown) =>
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

    return {
        isCreating: createTag.isPending,
        onCreate: (label: string) =>
            createTag.mutate(label, {
                // Świeżo dodany tag jest z definicji tym, o który chodziło - zaznaczamy go
                // od razu, żeby nie trzeba było go szukać na liście po dodaniu.
                onSuccess: (entry) => onSelect?.(entry.code),
                onError: (error) =>
                    showError('Nie udało się dodać tagu', message(error) ?? 'Spróbuj ponownie'),
            }),
        onDelete: (option: TagOption) =>
            deleteTag.mutate(option.code, {
                onSuccess: () =>
                    showSuccess(
                        `Tag „${option.label}" usunięty`,
                        'Leady, które go mają, zachowują go w historii'
                    ),
                onError: (error) =>
                    showError('Nie udało się usunąć tagu', message(error) ?? 'Spróbuj ponownie'),
            }),
    };
}
