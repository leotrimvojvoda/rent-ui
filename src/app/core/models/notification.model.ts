export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    type: 'info' | 'warning' | 'error' | 'success';
    link?: string;
}
