import type { PlacedEvent } from './types';
import type { AppointmentEventData, VisitEventData } from '../../types';
import { COL_GAP } from './layout';
import {
    CardWrap, CardInner,
    CardStatusDot, CardStatusRow, CardStatusLabel,
    CardTitle, CardMeta, CardFooter,
    CompactCard, CompactTitle,
} from './styles';

// ─── Status metadata ──────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
    IN_PROGRESS:      { label: 'W trakcie',        color: '#f59e0b' },
    READY_FOR_PICKUP: { label: 'Gotowe do odbioru', color: '#10b981' },
    COMPLETED:        { label: 'Zakończona',        color: '#6366f1' },
    REJECTED:         { label: 'Odrzucona',         color: '#ef4444' },
    ABANDONED:        { label: 'Porzucona',         color: '#94a3b8' },
    CANCELLED:        { label: 'Anulowana',         color: '#94a3b8' },
    ARCHIVED:         { label: 'Archiwum',          color: '#9ca3af' },
    CREATED:          { label: 'Rezerwacja',        color: '#6366f1' },
};

function formatTime(isoStr: string | undefined): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 })
        .format(amount);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EventCardProps {
    placed: PlacedEvent;
    onClick: (e: React.MouseEvent) => void;
}

export const EventCard = ({ placed, onClick }: EventCardProps) => {
    const { event, col, totalCols, topPx, heightPx } = placed;
    const props  = event.extendedProps as AppointmentEventData | VisitEventData;
    const status = props.status as string | undefined;
    const color  = event.backgroundColor as string;

    const isDimmed     = status === 'COMPLETED' || status === 'ABANDONED' || status === 'CANCELLED' || status === 'ARCHIVED';
    const isCrossedOut = status === 'ABANDONED' || status === 'CANCELLED';

    const colWidthPct = 100 / totalCols;
    const leftPct     = col * colWidthPct;
    // Subtract gap from width (except last column)
    const gapOffset   = col < totalCols - 1 ? COL_GAP : 0;

    const startTime = formatTime(event.start as string);
    const endTime   = formatTime(event.end as string | undefined);
    const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime;

    const statusMeta = status ? STATUS_META[status] : undefined;

    const serviceLabel = props.type === 'APPOINTMENT'
        ? (props as AppointmentEventData).serviceNames?.join(', ')
        : (props as VisitEventData).visitNumber;

    const totalPrice = props.totalPrice;
    const currency   = props.currency ?? 'PLN';

    // Compact variant for very short events
    if (heightPx < 36) {
        return (
            <CardWrap
                $topPx={topPx}
                $heightPx={heightPx}
                $leftPct={leftPct}
                $widthPct={colWidthPct}
                $color={color}
                $dimmed={isDimmed}
                onClick={onClick}
                style={{ paddingRight: gapOffset }}
            >
                <CompactCard $color={color} $dimmed={false}>
                    <CompactTitle>{event.title}</CompactTitle>
                    {startTime && (
                        <CompactTitle style={{ opacity: 0.55, fontWeight: 500, flexShrink: 0 }}>
                            {startTime}
                        </CompactTitle>
                    )}
                </CompactCard>
            </CardWrap>
        );
    }

    return (
        <CardWrap
            $topPx={topPx}
            $heightPx={heightPx}
            $leftPct={leftPct}
            $widthPct={colWidthPct}
            $color={color}
            $dimmed={isDimmed}
            onClick={onClick}
            style={{ paddingRight: gapOffset }}
        >
            <CardInner $color={color} $crossedOut={isCrossedOut}>
                {statusMeta && (
                    <CardStatusRow>
                        <CardStatusDot $color={statusMeta.color} />
                        <CardStatusLabel $color={statusMeta.color}>
                            {statusMeta.label}
                        </CardStatusLabel>
                    </CardStatusRow>
                )}

                <CardTitle>{event.title}</CardTitle>

                {heightPx >= 56 && props.customerPhone && (
                    <CardMeta>{props.customerPhone}</CardMeta>
                )}

                {heightPx >= 70 && props.vehicleInfo && (
                    <CardMeta>{props.vehicleInfo}</CardMeta>
                )}

                {heightPx >= 84 && serviceLabel && (
                    <CardMeta style={{ fontStyle: 'italic' }}>{serviceLabel}</CardMeta>
                )}

                <CardFooter>
                    {timeLabel}
                    {totalPrice ? ` · ${formatPrice(totalPrice, currency)}` : ''}
                </CardFooter>
            </CardInner>
        </CardWrap>
    );
};
