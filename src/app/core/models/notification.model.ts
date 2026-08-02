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
