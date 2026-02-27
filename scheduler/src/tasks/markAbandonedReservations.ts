import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';
const SCHEDULER_EMAIL = process.env.SCHEDULER_EMAIL ?? '';
const SCHEDULER_PASSWORD = process.env.SCHEDULER_PASSWORD ?? '';

interface AppointmentSchedule {
    isAllDay: boolean;
    startDateTime: string;
    endDateTime: string;
}

interface Appointment {
    id: string;
    schedule: AppointmentSchedule;
    status: string;
}

interface AppointmentsListResponse {
    appointments: Appointment[];
}

const createAuthenticatedClient = async (): Promise<AxiosInstance> => {
    const response = await axios.post(
        `${BACKEND_URL}/v1/auth/login`,
        { email: SCHEDULER_EMAIL, password: SCHEDULER_PASSWORD }
    );

    const sessionCookies = response.headers['set-cookie'];
    if (!sessionCookies?.length) {
        throw new Error('Authentication failed: no session cookie received');
    }

    return axios.create({
        baseURL: BACKEND_URL,
        headers: {
            Cookie: sessionCookies.join('; '),
            'Content-Type': 'application/json',
        },
    });
};

const fetchCreatedAppointments = async (client: AxiosInstance): Promise<Appointment[]> => {
    const response = await client.get<AppointmentsListResponse>('/v1/appointments', {
        params: { status: 'CREATED', page: 1, limit: 1000 },
    });
    return response.data.appointments ?? [];
};

const isStartDatePassed = (appointment: Appointment): boolean =>
    new Date(appointment.schedule.startDateTime) < new Date();

const abandonAppointment = async (client: AxiosInstance, appointmentId: string): Promise<void> => {
    await client.patch(`/v1/appointments/${appointmentId}`, { status: 'ABANDONED' });
};

export const markAbandonedReservations = async (): Promise<void> => {
    console.log(`[${new Date().toISOString()}] Starting mark abandoned reservations task`);

    const client = await createAuthenticatedClient();
    const appointments = await fetchCreatedAppointments(client);
    const overdueAppointments = appointments.filter(isStartDatePassed);

    console.log(`[${new Date().toISOString()}] Found ${overdueAppointments.length} overdue reservations`);

    await Promise.all(overdueAppointments.map(({ id }) => abandonAppointment(client, id)));

    console.log(`[${new Date().toISOString()}] Task completed: ${overdueAppointments.length} reservations marked as ABANDONED`);
};
