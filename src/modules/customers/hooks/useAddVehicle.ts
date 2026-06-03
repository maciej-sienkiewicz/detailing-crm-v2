import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { customerDetailApi } from '../api/customerDetailApi';
import { customerVehiclesQueryKey } from './useCustomerVehicles';
import type { AddVehiclePayload } from '../types';

export const useAddVehicle = (customerId: string) => {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addVehicle = async (payload: AddVehiclePayload): Promise<boolean> => {
        setIsSubmitting(true);
        setError(null);
        try {
            await customerDetailApi.addVehicle(customerId, payload);
            await queryClient.invalidateQueries({ queryKey: [customerVehiclesQueryKey, customerId] });
            return true;
        } catch {
            setError('Nie udało się dodać pojazdu. Spróbuj ponownie.');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { addVehicle, isSubmitting, error };
};
