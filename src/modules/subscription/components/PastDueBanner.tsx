// src/modules/subscription/components/PastDueBanner.tsx
//
// Karencja po końcu opłaconego okresu (PAST_DUE): studio ma pełny dostęp do
// `graceEndsAt`, a potem traci go w całości. Bramka abonamentu przepuszcza wtedy
// aplikację bez słowa, więc jedyny ślad był w Ustawieniach → Abonament, do których
// nikt nie zagląda - pierwszą informacją o problemie było okno „subskrypcja wygasła".
//
// Baner stoi nad treścią każdego widoku. Bursztyn = „przeczytaj", bez wypełnienia:
// w oknie, nad którym wisi, krokiem następnym jest praca, nie płatność (CLAUDE.md §2).
// Nie mówimy „płatność nie przeszła" - automatycznego obciążenia nie ma, okres po
// prostu minął. Na zakładce Abonament baneru nie ma: tam ten sam komunikat stoi
// z przyciskiem płatności.

import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Notice } from '@/common/components/ui';
import { pageColumn } from '@/common/components/PageContainer';
import { usePermissions } from '@/core/permissions/usePermissions';
import { useSubscriptionStatus } from '@/modules/settings/hooks/useSubscription';
import { formatDate } from '../utils/formatters';
import { PLAN_SETTINGS_PATH } from '../utils/subscriptionLock';

const Wrap = styled.div`
    ${pageColumn}
    padding-top: 12px;
`;

export function PastDueBanner() {
    const { status } = useSubscriptionStatus();
    const { isOwner } = usePermissions();
    const { pathname, search } = useLocation();
    const navigate = useNavigate();

    if (!status) return null;
    const inGrace = status.status === 'PAST_DUE' || status.inGrace === true;
    if (!inGrace || !status.isAccessible) return null;

    const onPlanTab = pathname === '/settings' && new URLSearchParams(search).get('tab') === 'plan';
    if (onPlanTab) return null;

    const until = status.graceEndsAt ? `do ${formatDate(status.graceEndsAt)}` : 'jeszcze przez kilka dni';

    return (
        <Wrap>
            <Notice
                tone="warn"
                role="status"
                title="Opłacony okres abonamentu minął"
                action={isOwner ? (
                    <Button variant="tinted" size="sm" onClick={() => navigate(PLAN_SETTINGS_PATH)}>
                        Przedłuż abonament
                    </Button>
                ) : undefined}
            >
                {isOwner
                    ? `Pełny dostęp działa ${until}. Opłać przedłużenie, żeby go nie stracić.`
                    : `Pełny dostęp działa ${until}. Poproś właściciela studia o opłacenie przedłużenia.`}
            </Notice>
        </Wrap>
    );
}
