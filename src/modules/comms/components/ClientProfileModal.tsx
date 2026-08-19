// src/modules/comms/components/ClientProfileModal.tsx
// Krótki profil klienta wywoływany paskiem nad korespondencją.
//
// Świadomie w formie modala, nie stałego panelu bocznego: kontekst klienta jest
// potrzebny raz na rozmowę — przy jej otwarciu albo przed odpowiedzią — a nie przez
// cały czas czytania. Stały panel zabierał 300 px szerokości na każdym ekranie i
// powtarzał dane, które i tak stoją w nagłówku wątku.
//
// Zawartość jest na razie zapowiedzią: pasek dostarcza liczby, które mają znaczenie
// przy odpowiadaniu (ile wizyt, ile zostawił), a pełna karta klienta wejdzie tutaj.
import { Modal } from '@/common/components/Modal';
import styled from 'styled-components';
import { User } from 'lucide-react';

const Placeholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 48px 24px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};

    .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: ${p => p.theme.colors.surfaceAlt};
        color: ${p => p.theme.colors.textMuted};
    }
    p { margin: 0; font-size: 14px; }
`;

interface ClientProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Nazwa do tytułu — modal otwiera się tylko dla rozpoznanego klienta. */
    clientName: string;
}

export function ClientProfileModal({ isOpen, onClose, clientName }: ClientProfileModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={clientName}>
            <Placeholder>
                <span className="icon"><User size={24} /></span>
                <p>Tutaj pojawi się profil klienta…</p>
            </Placeholder>
        </Modal>
    );
}
