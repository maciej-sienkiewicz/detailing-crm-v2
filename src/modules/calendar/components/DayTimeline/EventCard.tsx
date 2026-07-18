import type { CalendarEvent, AppointmentEventData, VisitEventData } from '../../types';
import { PiiText } from '@/common/pii';
import { formatTime, formatPrice } from './layout';
import { Card, CardTime, CardTitle, CardMeta, CardFooter, CardPrice, CardService } from './styles';

interface EventCardProps {
    event: CalendarEvent;
    onClick: (e: React.MouseEvent) => void;
}

export const EventCard = ({ event, onClick }: EventCardProps) => {
    const props    = event.extendedProps as AppointmentEventData | VisitEventData;
    const status   = props.status as string | undefined;
    const color    = event.backgroundColor as string;

    const isDimmed     = status === 'COMPLETED' || status === 'ABANDONED' || status === 'CANCELLED' || status === 'ARCHIVED' || status === 'REJECTED';
    const isCrossedOut = status === 'ABANDONED' || status === 'CANCELLED';
    const isVisit      = props.type === 'VISIT' && !isDimmed;

    const startTime = formatTime(event.start as string);
    const endTime   = formatTime(event.end as string | undefined);
    const timeLabel = startTime && endTime ? `${startTime} – ${endTime}` : startTime;

    const serviceLabel = props.type === 'APPOINTMENT'
        ? (props as AppointmentEventData).serviceNames?.join(', ')
        : (props as VisitEventData).visitNumber;

    const totalPrice = props.totalPrice;
    const currency   = props.currency ?? 'PLN';

    return (
        <Card $color={color} $dimmed={isDimmed} $crossedOut={isCrossedOut} $isVisit={isVisit} onClick={onClick}>
            {timeLabel && <CardTime>{timeLabel}</CardTime>}

            <CardTitle><PiiText value={event.title} kind="name" /></CardTitle>

            {props.vehicleInfo && <CardMeta>{props.vehicleInfo}</CardMeta>}
            {props.customerPhone && <CardMeta>{props.customerPhone}</CardMeta>}

            {(serviceLabel || totalPrice) && (
                <CardFooter>
                    {serviceLabel && <CardService>{serviceLabel}</CardService>}
                    {totalPrice ? <CardPrice>{formatPrice(totalPrice, currency)}</CardPrice> : null}
                </CardFooter>
            )}
        </Card>
    );
};
