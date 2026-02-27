import cron from 'node-cron';
import { markAbandonedReservations } from './tasks/markAbandonedReservations';

const SCHEDULE = '0 6 * * *';
const TIMEZONE = 'Europe/Warsaw';

cron.schedule(SCHEDULE, markAbandonedReservations, { timezone: TIMEZONE });

console.log(`[${new Date().toISOString()}] Scheduler started: mark abandoned reservations at 6 AM (${TIMEZONE})`);
