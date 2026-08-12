import styled from 'styled-components';
import { EmptyState } from '@/common/components/EmptyState';

const Container = styled.div`
    max-width: 560px;
    margin: 10vh auto 0;
    padding: 0 ${p => p.theme.spacing.md};
`;

/**
 * Landing page for an authenticated user whose role grants no permissions
 * (and who does not track work time). getDefaultRoute sends them here instead
 * of bouncing between gated routes. Deliberately calm — this is a
 * configuration state, not an error: the administrator simply has not
 * assigned them a role yet.
 */
export function NoAccessView() {
    return (
        <Container>
            <EmptyState
                icon="🔒"
                title="Brak przypisanych uprawnień"
                description="Twoje konto jest aktywne, ale nie ma jeszcze przypisanej roli z uprawnieniami.
                    Poproś właściciela lub administratora firmy o nadanie roli w ustawieniach zespołu."
            />
        </Container>
    );
}
