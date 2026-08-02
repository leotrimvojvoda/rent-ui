import { RentalAction, RentalStatus } from '../../core/models/rental.model';

/**
 * Lime is the affirmative CTA and never appears twice on one row, so the only
 * pairing that exists — approve next to reject — is lime next to danger text.
 */
export type ActionTone = 'primary' | 'danger';

export interface RentalActionDefinition {
    action: RentalAction;
    label: string;
    busyLabel: string;
    tone: ActionTone;
    confirmHeader: string;
    /** The car and the customer are named in the dialog so it is clear what is being decided. */
    confirmMessage: (car: string, client: string) => string;
    acceptLabel: string;
    rejectLabel: string;
    successSummary: string;
    successDetail: string;
    /**
     * What a 409 means for this specific action. The generic copy ("this rental
     * can no longer change that way") is true but useless at the moment someone
     * has just clicked Approve.
     */
    conflictMessage: string;
}

const APPROVE: RentalActionDefinition = {
    action: 'approve',
    label: 'Approve',
    busyLabel: 'Approving…',
    tone: 'primary',
    confirmHeader: 'Approve this request?',
    confirmMessage: (car, client) =>
        `This accepts ${client}'s request and holds the ${car} for these dates — it stays off the catalog until the rental ends. ${client} is notified. You cannot take an approval back; only the customer can cancel, and only before pick-up.`,
    acceptLabel: 'Approve request',
    rejectLabel: 'Not yet',
    successSummary: 'Request approved',
    successDetail: 'The car is held for these dates and the customer has been told.',
    conflictMessage: 'This request is no longer pending, so it cannot be approved. Its current status is shown below.'
};

const REJECT: RentalActionDefinition = {
    action: 'reject',
    label: 'Reject',
    busyLabel: 'Rejecting…',
    tone: 'danger',
    confirmHeader: 'Reject this request?',
    confirmMessage: (car, client) => `This declines ${client}'s request and releases the ${car} for those dates. ${client} is notified. This cannot be undone — they would have to request the car again.`,
    acceptLabel: 'Reject request',
    rejectLabel: 'Keep it pending',
    successSummary: 'Request rejected',
    successDetail: 'The dates are free again and the customer has been told.',
    conflictMessage: 'This request is no longer pending, so it cannot be rejected. Its current status is shown below.'
};

const ACTIVATE: RentalActionDefinition = {
    action: 'activate',
    label: 'Mark picked up',
    busyLabel: 'Saving…',
    tone: 'primary',
    confirmHeader: 'Hand the car over?',
    confirmMessage: (car, client) => `Only do this once ${client} actually has the keys to the ${car}. It records the handover and cannot be undone. The customer is not notified — this is your record of the rental starting.`,
    acceptLabel: 'Mark picked up',
    rejectLabel: 'Cancel',
    successSummary: 'Marked as picked up',
    successDetail: 'This rental is now running.',
    conflictMessage: 'This rental is not in the approved state, so it cannot be marked as picked up. Its current status is shown below.'
};

const COMPLETE: RentalActionDefinition = {
    action: 'complete',
    label: 'Mark returned',
    busyLabel: 'Saving…',
    tone: 'primary',
    confirmHeader: 'Mark the car as returned?',
    confirmMessage: (car) => `This closes the rental and puts the ${car} back on the catalog for new bookings straight away. It cannot be undone, so only do it once the car is actually back.`,
    acceptLabel: 'Mark returned',
    rejectLabel: 'Cancel',
    successSummary: 'Rental completed',
    successDetail: 'The car is bookable again.',
    conflictMessage: 'This rental is not running, so it cannot be completed. Its current status is shown below.'
};

/**
 * Whose move it is, per status. The owner has no move on the four terminal
 * statuses, and none on APPROVED beyond the handover — after approving, only
 * the customer can back out, and only before pick-up.
 */
const ACTIONS_BY_STATUS: Partial<Record<RentalStatus, RentalActionDefinition[]>> = {
    PENDING: [APPROVE, REJECT],
    APPROVED: [ACTIVATE],
    ACTIVE: [COMPLETE]
};

export function actionsFor(status: RentalStatus): RentalActionDefinition[] {
    return ACTIONS_BY_STATUS[status] ?? [];
}

/** Statuses the owner still has to do something about, newest queue first. */
export function needsOwnerAttention(status: RentalStatus): boolean {
    return actionsFor(status).length > 0;
}
