import { useState } from 'react';
import { formatCurrency } from '@/common/utils';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import type { ServiceLineItem, ServiceStatus } from '../types';

interface EditServicesModalProps {
    isOpen: boolean;
    services: ServiceLineItem[];
    onClose: () => void;
    onAddService: (service: { id?: string; name: string; basePriceNet: number; vatRate: number }, notifyCustomer: boolean) => void;
    onUpdateService: (serviceId: string, price: number, notifyCustomer: boolean) => void;
    onDeleteService: (serviceId: string, notifyCustomer: boolean) => void;
    onUpdateServiceStatus: (serviceId: string, status: ServiceStatus) => void;
}

export const EditServicesModal = ({
    isOpen,
    services,
    onClose,
    onAddService,
    onUpdateService,
    onDeleteService,
    onUpdateServiceStatus,
}: EditServicesModalProps) => {
    const [notifyCustomer, setNotifyCustomer] = useState(true);
    const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
    const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);

    if (!isOpen) return null;

    const handlePriceChange = (serviceId: string, value: string) => {
        const numValue = parseFloat(value) * 100; // Convert to cents
        if (!isNaN(numValue)) {
            setEditingPrices(prev => ({ ...prev, [serviceId]: numValue }));
        }
    };

    const handleSavePrice = (serviceId: string) => {
        const newPrice = editingPrices[serviceId];
        if (newPrice !== undefined) {
            onUpdateService(serviceId, newPrice, notifyCustomer);
            setEditingPrices(prev => {
                const { [serviceId]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleDelete = (serviceId: string) => {
        if (window.confirm('Czy na pewno chcesz usunąć tę usługę?')) {
            onDeleteService(serviceId, notifyCustomer);
        }
    };

    const hasPendingChanges = services.some(s => s.status === 'PENDING');

    const handleServiceCreate = (service: { id?: string; name: string; basePriceNet: number; vatRate: number }) => {
        onAddService(service, notifyCustomer);
        setIsQuickServiceModalOpen(false);
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-300 opacity-100 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}
                onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            >
                {/* Modal Container */}
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
                    {/* Header */}
                    <div className="relative px-8 pt-6 pb-4 border-b border-gray-100">
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
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>

                        {/* Title */}
                        <h2 className="text-2xl font-semibold text-gray-900">
                            Zarządzanie usługami
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {services.length} {services.length === 1 ? 'usługa' : services.length < 5 ? 'usługi' : 'usług'}
                            {hasPendingChanges && ' • Zawiera usługi oczekujące na potwierdzenie'}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                        {/* Services List */}
                        {services.map(service => {
                            const isEditing = editingPrices[service.id] !== undefined;
                            const displayPrice = isEditing
                                ? editingPrices[service.id] / 100
                                : service.finalPriceNet / 100;

                            return (
                                <div
                                    key={service.id}
                                    className={`p-4 rounded-2xl border-2 transition-all ${
                                        service.status === 'PENDING'
                                            ? 'bg-amber-50 border-amber-300'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Service Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900">{service.serviceName}</h3>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        service.status === 'PENDING'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-emerald-100 text-emerald-800'
                                                    }`}
                                                >
                                                    {service.status === 'PENDING' ? 'Oczekuje' : 'Potwierdzona'}
                                                </span>
                                            </div>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={displayPrice}
                                                    onChange={(e) => handlePriceChange(service.id, e.target.value)}
                                                    onBlur={() => handleSavePrice(service.id)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSavePrice(service.id);
                                                        }
                                                    }}
                                                    className="w-32 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                    autoFocus
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-600">
                                                    Netto: <span className="font-medium">{formatCurrency(service.finalPriceNet / 100)}</span> •
                                                    Brutto: <span className="font-medium">{formatCurrency(service.finalPriceGross / 100)}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {service.status === 'PENDING' && (
                                                <button
                                                    onClick={() => onUpdateServiceStatus(service.id, 'CONFIRMED')}
                                                    className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
                                                    title="Zatwierdź ręcznie"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditingPrices(prev => ({ ...prev, [service.id]: service.finalPriceNet }))}
                                                className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                                                title="Edytuj cenę"
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                                title="Usuń usługę"
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Service Button */}
                        <button
                            onClick={() => setIsQuickServiceModalOpen(true)}
                            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Dodaj usługę
                        </button>

                        {/* Notification Section */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifyCustomer}
                                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-900">
                                        Poinformuj klienta SMS-em o zmianach w usługach
                                    </span>
                                    {hasPendingChanges && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            ⚠️ Zmiany wymagają akceptacji klienta
                                        </p>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                        >
                            Zamknij
                        </button>
                    </div>
                </div>
            </div>

            {/* QuickServiceModal with higher z-index */}
            <div style={{ zIndex: 1100 }}>
                <QuickServiceModal
                    isOpen={isQuickServiceModalOpen}
                    onClose={() => setIsQuickServiceModalOpen(false)}
                    onServiceCreate={handleServiceCreate}
                />
            </div>
        </>
    );
};
