// src/modules/calendar/components/PriceInputModal.tsx

import React, { useState, useEffect } from 'react';

// --- ICONS (Inline SVG) ---
const IconX = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

// --- TYPES ---
interface PriceInputModalProps {
    isOpen: boolean;
    serviceName: string;
    onClose: () => void;
    onConfirm: (price: number) => void;
}

// --- COMPONENT ---
export const PriceInputModal: React.FC<PriceInputModalProps> = ({
    isOpen,
    serviceName,
    onClose,
    onConfirm,
}) => {
    const [price, setPrice] = useState('');
    const [error, setError] = useState('');

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setPrice('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const numPrice = parseFloat(price);

        if (!price || isNaN(numPrice) || numPrice <= 0) {
            setError('Podaj prawidłową cenę większą niż 0');
            return;
        }

        onConfirm(numPrice);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 opacity-100 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
                onMouseDown={(e) => e.target === e.currentTarget && handleCancel()}
            >
                {/* Modal Container */}
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        {/* Header */}
                        <div className="relative px-8 pt-6 pb-4">
                            {/* Drag handle visual indicator */}
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                            </div>

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <IconX />
                            </button>

                            {/* Title */}
                            <h2 className="text-2xl font-semibold text-gray-900">
                                Wprowadź cenę
                            </h2>
                            <p className="text-sm text-gray-500 mt-2">
                                Ta usługa wymaga ręcznego wprowadzenia ceny
                            </p>
                        </div>

                        {/* Content */}
                        <div className="px-8 py-4">
                            {/* Service Name Display */}
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <p className="text-sm font-medium text-gray-700 mb-1">Usługa:</p>
                                <p className="text-lg font-semibold text-gray-900">{serviceName}</p>
                            </div>

                            {/* Price Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cena brutto (w zł)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                        zł
                                    </span>
                                </div>
                                {error && (
                                    <p className="mt-2 text-sm text-red-600">{error}</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                            >
                                Potwierdź cenę
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
