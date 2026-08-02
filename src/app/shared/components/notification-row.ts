import { Component, computed, inject, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NOTIFICATION_ICONS, NOTIFICATION_LABELS, NotificationResponse } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { formatRelativeTime } from '../utils/format';

/**
 * One notification, rendered identically in the bell popover and on the full
 * page — the two differ only in how many of these they stack.
 *
 * Every notification carries a `rentalId`, but the two roles read that rental at
 * different URLs: a client owns `/rentals/:id`, an owner `/company/rentals/:id`,
 * and each 404s on the other. So the link is resolved from the signed-in role
 * rather than baked into the notification.
 */
@Component({
    selector: 'app-notification-row',
    standalone: true,
    imports: [RouterModule],
    template: `
        <a [routerLink]="link()" class="flex items-start gap-3 px-4 py-3.5 no-underline text-color transition-colors hover:bg-emphasis" [class]="unreadClass()" (click)="activate.emit(notification())">
            <span class="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center shrink-0" [attr.aria-hidden]="true">
                <i [class]="icon()" class="text-sm text-primary"></i>
            </span>

            <span class="flex-1 min-w-0">
                <span class="block text-sm leading-snug">{{ notification().message }}</span>
                <span class="block text-xs text-muted-color mt-1">
                    <span class="sr-only">{{ label() }} · </span>
                    {{ time() }}
                </span>
            </span>

            @if (!notification().read) {
                <span class="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-primary" [attr.aria-label]="'Unread'"></span>
            }
        </a>
    `
})
export class NotificationRow {
    private auth = inject(AuthService);

    notification = input.required<NotificationResponse>();

    activate = output<NotificationResponse>();

    readonly icon = computed(() => NOTIFICATION_ICONS[this.notification().type] ?? 'pi pi-bell');
    readonly label = computed(() => NOTIFICATION_LABELS[this.notification().type] ?? 'Notification');
    readonly time = computed(() => formatRelativeTime(this.notification().createdAt));

    /** Unread rows carry a tint as well as the dot, so the state survives greyscale. */
    readonly unreadClass = computed(() => (this.notification().read ? '' : 'bg-primary-50 dark:bg-surface-800'));

    readonly link = computed(() => {
        const rentalId = this.notification().rentalId;
        switch (this.auth.role()) {
            case 'CLIENT':
                return ['/rentals', rentalId];
            case 'OWNER':
                return ['/company/rentals', rentalId];
            default:
                // No role that owns a rental view — stay on the list rather than
                // sending someone to a URL that will 404 on them.
                return ['/notifications'];
        }
    });
}
