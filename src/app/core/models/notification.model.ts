/**
 * Every notification carries a `rentalId`, so each one deep-links to a rental.
 * Activation and completion produce no notification.
 */
export type NotificationType = 'RENTAL_REQUESTED' | 'RENTAL_APPROVED' | 'RENTAL_REJECTED' | 'RENTAL_CANCELLED' | 'RENTAL_EXPIRED' | 'RENTAL_PICKUP_REMINDER' | 'RENTAL_RETURN_REMINDER';

export interface NotificationResponse {
    id: string;
    type: NotificationType;
    rentalId: string;
    message: string;
    read: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface UnreadCountResponse {
    unread: number;
}

/**
 * Short name per event type. The server already sends readable prose in
 * `message`, so this is not a heading — it is the accessible name for the icon
 * chip, which would otherwise be a decorative glyph with no text.
 */
export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
    RENTAL_REQUESTED: 'New request',
    RENTAL_APPROVED: 'Approved',
    RENTAL_REJECTED: 'Rejected',
    RENTAL_CANCELLED: 'Cancelled',
    RENTAL_EXPIRED: 'Expired',
    RENTAL_PICKUP_REMINDER: 'Pick-up reminder',
    RENTAL_RETURN_REMINDER: 'Return reminder'
};

/** Icon per event type, for the bell and the notifications page. */
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    RENTAL_REQUESTED: 'pi pi-inbox',
    RENTAL_APPROVED: 'pi pi-check-circle',
    RENTAL_REJECTED: 'pi pi-times-circle',
    RENTAL_CANCELLED: 'pi pi-ban',
    RENTAL_EXPIRED: 'pi pi-hourglass',
    RENTAL_PICKUP_REMINDER: 'pi pi-car',
    RENTAL_RETURN_REMINDER: 'pi pi-undo'
};
