import { RentalCompanyResponse } from './company.model';

/**
 * `PENDING → APPROVED → ACTIVE → COMPLETED`, with `REJECTED` (owner, from
 * PENDING), `CANCELLED` (client, from PENDING/APPROVED before pickup) and
 * `EXPIRED` (job, undecided requests whose start arrives) as dead ends.
 * PENDING, APPROVED and ACTIVE all block the car.
 */
export type RentalStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export const RENTAL_STATUSES: RentalStatus[] = ['PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

/** Statuses that hold the car and so block new bookings. */
export const BLOCKING_RENTAL_STATUSES: RentalStatus[] = ['PENDING', 'APPROVED', 'ACTIVE'];

/** Owner-driven transitions, as `POST /company/rentals/{id}/{action}`. */
export type RentalAction = 'approve' | 'reject' | 'activate' | 'complete';

/** Car block on a client's rental — no licence plate. */
export interface RentalCarResponse {
    id: string;
    make: string;
    model: string;
    modelYear: number;
}

/** Car block on an owner's rental — includes the licence plate. */
export interface CompanyRentalCarResponse extends RentalCarResponse {
    licensePlate: string;
}

/** Client block on an owner's rental — this is where the owner sees who booked. */
export interface RentalClientResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

/** Prices are snapshotted server-side; the client never sends or recomputes them. */
interface RentalBase {
    id: string;
    status: RentalStatus;
    startAt: string;
    endAt: string;
    dailyPrice: number;
    totalDays: number;
    totalPrice: number;
    createdAt: string;
}

/** The client's view of a rental — carries the company's contact details. */
export interface RentalResponse extends RentalBase {
    car: RentalCarResponse;
    company: RentalCompanyResponse;
}

/** The owner's view of the same rental — carries the client and the plate instead. */
export interface CompanyRentalResponse extends RentalBase {
    car: CompanyRentalCarResponse;
    client: RentalClientResponse;
}

export interface CreateRentalRequest {
    carId: string;
    /** ISO-8601 UTC instant. */
    startAt: string;
    /** ISO-8601 UTC instant. */
    endAt: string;
}
