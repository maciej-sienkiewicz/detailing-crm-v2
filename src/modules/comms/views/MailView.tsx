// src/modules/comms/views/MailView.tsx
// Trasa /mail - „Poczta": odebrane i wysłane. Osobna pozycja panelu bocznego obok
// „Zapytań" (decyzja z 23.10.2026); widok jest ten sam co w Zapytaniach (../inbox).
import InboxPage from '../inbox/InboxPage';

export default function MailView() {
    return <InboxPage scope="mail" />;
}
