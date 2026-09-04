// src/modules/campaigns/views/CampaignDetailsView.tsx
// Szczegóły kampanii nie są już osobną stroną - otwierają się w oknie nad listą,
// tak samo jak szczegóły leada. Ten komponent został po to, żeby stare adresy
// (/campaigns/:id z zakładki, z maila, z powrotu kreatora) nie kończyły się
// pustym ekranem: przekierowuje na listę z otwartym oknem tej kampanii.
import { Navigate, useParams } from 'react-router-dom';

export function CampaignDetailsView() {
    const { id } = useParams<{ id: string }>();
    return <Navigate to={id ? `/campaigns?campaign=${id}` : '/campaigns'} replace />;
}
