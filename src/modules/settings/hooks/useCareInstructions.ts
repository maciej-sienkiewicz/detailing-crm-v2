// src/modules/settings/hooks/useCareInstructions.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    careInstructionsApi,
    type SaveCareInstructionRequest,
} from '../api/careInstructionsApi';

export const CARE_INSTRUCTIONS_KEY = ['care-instructions'] as const;

/**
 * @param enabled `false` wstrzymuje zapytanie — okno certyfikatu pyta o słownik dopiero
 *   wtedy, gdy użytkownik ma prawo je oglądać.
 */
export const useCareInstructions = (enabled = true) => {
    const query = useQuery({
        queryKey: CARE_INSTRUCTIONS_KEY,
        queryFn: careInstructionsApi.list,
        enabled,
    });
    return { instructions: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
};

export const useCareInstructionMutations = () => {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: CARE_INSTRUCTIONS_KEY });

    const create = useMutation({
        mutationFn: (req: SaveCareInstructionRequest) => careInstructionsApi.create(req),
        onSuccess: invalidate,
    });
    const update = useMutation({
        mutationFn: ({ id, req }: { id: string; req: SaveCareInstructionRequest }) =>
            careInstructionsApi.update(id, req),
        onSuccess: invalidate,
    });
    const remove = useMutation({
        mutationFn: (id: string) => careInstructionsApi.remove(id),
        onSuccess: invalidate,
    });
    const setForService = useMutation({
        mutationFn: ({ serviceId, instructionIds }: { serviceId: string; instructionIds: string[] }) =>
            careInstructionsApi.setForService(serviceId, instructionIds),
        onSuccess: invalidate,
    });

    return { create, update, remove, setForService };
};
