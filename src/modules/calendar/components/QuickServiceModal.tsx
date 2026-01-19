// src/modules/calendar/components/QuickServiceModal.tsx
import React, { useState, useEffect } from 'react';
import { PriceInput } from '@/modules/services/components/PriceInput';
import { useCreateService } from '@/modules/services/hooks/useServices';

// --- ICONS (Inline SVG) ---
const IconX = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

// --- TYPES ---
interface QuickServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onServiceCreate: (service: { id?: string; name: string; basePriceNet: number; vatRate: 23 }) => void;
    initialServiceName?: string;
}

// --- COMPONENT ---
export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
    isOpen,
    onClose,
    onServiceCreate,
    initialServiceName = '',
}) => {
    const [serviceName, setServiceName] = useState(initialServiceName);
    const [basePriceNet, setBasePriceNet] = useState(0);
    const [saveToDatabase, setSaveToDatabase] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createMutation = useCreateService();

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setServiceName(initialServiceName);
            setBasePriceNet(0);
            setSaveToDatabase(false);
            setErrors({});
        }
    }, [isOpen, initialServiceName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors: Record<string, string> = {};
        if (!serviceName || serviceName.trim().length < 3) {
            newErrors.name = 'Nazwa usługi musi mieć co najmniej 3 znaki';
        }
        if (basePriceNet <= 0) {
            newErrors.price = 'Cena musi być większa niż 0';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            let createdServiceId: string | undefined;

            // If save to database is checked, create the service
            if (saveToDatabase) {
                const result = await createMutation.mutateAsync({
                    name: serviceName,
                    basePriceNet,
                    vatRate: 23,
                });
                // API returns the service object directly, not wrapped
                createdServiceId = result.id;
            }

            // Return the service (with ID if saved to DB, without if not)
            onServiceCreate({
                id: createdServiceId,
                name: serviceName,
                basePriceNet,
                vatRate: 23,
            });

            onClose();
        } catch (error) {
            console.error('Failed to create service:', error);
            setErrors({ submit: 'Nie udało się zapisać usługi' });
        }
    };

    const isSubmitting = createMutation.isPending;

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-100 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            >
                {/* Modal Container */}
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        {/* Header */}
                        <div className="relative px-8 pt-6 pb-4">
                            {/* Drag handle visual indicator */}
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                            </div>

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <IconX />
                            </button>

                            {/* Title */}
                            <h2 className="text-2xl font-semibold text-gray-900">
                                Wprowadź nową usługę
                            </h2>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
                            {/* Service Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nazwa usługi
                                </label>
                                <input
                                    type="text"
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    placeholder="np. Mycie i odkurzanie"
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            {/* Price Input */}
                            <div>
                                <PriceInput
                                    netAmount={basePriceNet}
                                    vatRate={23}
                                    onChange={setBasePriceNet}
                                    netLabel="Cena netto"
                                    grossLabel="Cena brutto"
                                    vatLabel="VAT"
                                    hasError={!!errors.price}
                                />
                                {errors.price && (
                                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                                )}
                            </div>

                            {/* Save to Database Checkbox */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={saveToDatabase}
                                        onChange={(e) => setSaveToDatabase(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900">
                                            Czy zapisać usługę w bazie danych?
                                        </span>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Jeśli zaznaczysz tę opcję, usługa będzie dostępna do użycia w przyszłości
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {errors.submit && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                                    {errors.submit}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                                disabled={isSubmitting}
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Zapisywanie...' : 'Dodaj usługę'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
