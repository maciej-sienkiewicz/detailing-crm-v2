import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Toast } from './Toast';

/**
 * Fixed stack anchored to the bottom-right corner. Toasts are laid out in a
 * column so multiple simultaneous notifications never overlap each other.
 */
const ToastStack = styled.div`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    pointer-events: none;

    @media (max-width: ${props => props.theme.breakpoints.sm}) {
        left: 16px;
        right: 16px;
        bottom: 16px;
        align-items: stretch;
    }
`;

interface ToastItem {
    id: string;
    title: string;
    message?: string;
    variant?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface ToastContextValue {
    showToast: (toast: Omit<ToastItem, 'id'>) => void;
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
    showInfo: (title: string, message?: string) => void;
    showWarning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const showSuccess = useCallback((title: string, message?: string) => {
        showToast({ title, message, variant: 'success' });
    }, [showToast]);

    const showError = useCallback((title: string, message?: string) => {
        showToast({ title, message, variant: 'error' });
    }, [showToast]);

    const showInfo = useCallback((title: string, message?: string) => {
        showToast({ title, message, variant: 'info' });
    }, [showToast]);

    const showWarning = useCallback((title: string, message?: string) => {
        showToast({ title, message, variant: 'warning' });
    }, [showToast]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    useEffect(() => {
        const handleApiError = (e: Event) => {
            const { message } = (e as CustomEvent<{ message: string }>).detail;
            showError(message);
        };
        window.addEventListener('api:error', handleApiError);
        return () => window.removeEventListener('api:error', handleApiError);
    }, [showError]);

    const value: ToastContextValue = {
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {createPortal(
                <ToastStack>
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            title={toast.title}
                            message={toast.message}
                            variant={toast.variant}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </ToastStack>,
                document.body
            )}
        </ToastContext.Provider>
    );
};
