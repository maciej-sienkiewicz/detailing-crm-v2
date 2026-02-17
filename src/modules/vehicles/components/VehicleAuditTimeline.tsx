// src/modules/vehicles/components/VehicleAuditTimeline.tsx

import { AuditTimeline } from '@/common/components/AuditTimeline';

interface VehicleAuditTimelineProps {
    vehicleId: string;
}

export const VehicleAuditTimeline = ({ vehicleId }: VehicleAuditTimelineProps) => (
    <AuditTimeline module="VEHICLE" entityId={vehicleId} />
);
