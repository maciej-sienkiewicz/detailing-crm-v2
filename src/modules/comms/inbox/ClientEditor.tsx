// src/modules/comms/inbox/ClientEditor.tsx
// Co otwiera ołówek przy kliencie w panelu sprawy.
//
// Trzy przypadki, bo „edytuj klienta" znaczy co innego zależnie od tego, kogo znamy:
//  - klient w kartotece → okno edycji kartoteki (to samo co w module klientów),
//  - nieznany adres e-mail → wizytówka z wyszukiwarką i zakładaniem kartoteki;
//    nieznany adres to zwykle klient zapisany pod innym mailem, a nie nowy klient,
//    i tę decyzję wizytówka już umie poprowadzić - druga kopia by się rozjechała,
//  - zapytanie bez maila (telefon) → nowa kartoteka z danymi ze sprawy, przypięta
//    do sprawy po zapisie.
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { MODAL_Z_INDEX } from '@/common/styles/sharedModalStyles';
import { AddCustomerModal } from '@/modules/customers/components/AddCustomerModal';
import { EditCustomerModal } from '@/modules/customers/components/EditCustomerModal';
import { useCustomerDetail } from '@/modules/customers/hooks/useCustomerDetail';
import { ContactCardPopover } from '../components/ContactCardPopover';
import { COMMS_CONTACT_CARD_KEY } from '../hooks/useComms';
import { useAssignLeadCustomer } from '../hooks/useLeads';
import type { Lead } from '../types';
import { leadPhoneNumber } from '../utils/leadPrimaryAction';

interface ClientEditorProps {
    lead: Lead;
    /** Klient z kartoteki - ze sprawy albo rozpoznany po adresie. */
    customerId: string | null;
    email: string | null;
    anchor: HTMLElement;
    onClose: () => void;
}

export function ClientEditor({ lead, customerId, email, anchor, onClose }: ClientEditorProps) {
    if (customerId) return <KnownClient customerId={customerId} onClose={onClose} />;
    if (email) {
        return (
            <ContactCardPopover
                email={email}
                participantName={lead.customerName}
                anchor={anchor}
                // Nad pełnoekranową rozmową telefonu (900) - domyślne 120 chowałoby się pod nią.
                zIndex={MODAL_Z_INDEX}
                onClose={onClose}
            />
        );
    }
    return <NewClient lead={lead} onClose={onClose} />;
}

function KnownClient({ customerId, onClose }: { customerId: string; onClose: () => void }) {
    const queryClient = useQueryClient();
    const { customerDetail } = useCustomerDetail(customerId);
    if (!customerDetail) return null;
    return (
        <EditCustomerModal
            isOpen
            customer={customerDetail.customer}
            onClose={() => {
                // Nazwisko i telefon w panelu sprawy biorą się z wizytówki - po edycji kartoteki
                // byłyby stare aż do następnego odświeżenia.
                queryClient.invalidateQueries({ queryKey: COMMS_CONTACT_CARD_KEY });
                onClose();
            }}
        />
    );
}

function NewClient({ lead, onClose }: { lead: Lead; onClose: () => void }) {
    const assign = useAssignLeadCustomer();
    const { showError } = useToast();
    const [firstName = '', ...rest] = (lead.customerName ?? '').trim().split(/\s+/);
    return (
        <AddCustomerModal
            isOpen
            onClose={onClose}
            initialValues={{ firstName, lastName: rest.join(' '), phone: leadPhoneNumber(lead) ?? '' }}
            onSuccess={(customer) => {
                onClose();
                assign.mutate(
                    { leadId: lead.id, customerId: customer.id },
                    { onError: () => showError('Nie udało się przypiąć klienta', 'Kartoteka powstała - przypnij ją w szczegółach sprawy.') }
                );
            }}
        />
    );
}
