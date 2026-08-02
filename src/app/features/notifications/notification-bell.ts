import { Component, ViewChild, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Popover, PopoverModule } from 'primeng/popover';
import { NotificationResponse } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationRow } from '../../shared/components/notification-row';

/**
 * The badge is the one place in the design system red is allowed: it is the only
 * element whose whole job is to be noticed against a green topbar.
 */
@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [PopoverModule, RouterModule, NotificationRow],
    template: `
        <button type="button" class="layout-topbar-action relative" [attr.aria-label]="ariaLabel()" (click)="toggle($event)">
            <i class="pi pi-bell"></i>
            @if (notificationService.unreadCount() > 0) {
                <span class="absolute -top-0.5 -right-0.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-5 h-5 px-1.5 leading-none">
                    {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
                </span>
            }
        </button>

        <p-popover #op styleClass="keyway-popover">
            <div class="w-[min(21rem,calc(100vw-2rem))]">
                <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface">
                    <span class="font-display font-bold">Notifications</span>
                    @if (notificationService.unreadCount() > 0) {
                        <button type="button" class="text-primary text-sm font-medium cursor-pointer bg-transparent border-none p-0" (click)="markAllAsRead()">Mark all as read</button>
                    }
                </div>

                <div class="max-h-96 overflow-y-auto">
                    @if (notificationService.loadingLatest() && notificationService.notifications().length === 0) {
                        <div class="px-4 py-6 flex flex-col gap-3" aria-hidden="true">
                            <div class="h-4 rounded bg-keyway-shade dark:bg-surface-800 animate-pulse"></div>
                            <div class="h-4 w-2/3 rounded bg-keyway-shade dark:bg-surface-800 animate-pulse"></div>
                        </div>
                    } @else {
                        @for (item of notificationService.notifications(); track item.id) {
                            <app-notification-row [notification]="item" (activate)="onActivate($event)" />
                        } @empty {
                            <div class="px-4 py-8 text-center text-muted-color text-sm">
                                <i class="pi pi-bell-slash text-xl! mb-2 block"></i>
                                Nothing yet. Updates about your rentals land here.
                            </div>
                        }
                    }
                </div>

                <div class="border-t border-surface px-4 py-3 text-center">
                    <a routerLink="/notifications" class="text-primary text-sm font-medium no-underline" (click)="op.hide()">See all</a>
                </div>
            </div>
        </p-popover>
    `
})
export class NotificationBell {
    notificationService = inject(NotificationService);

    @ViewChild('op') op!: Popover;

    ariaLabel(): string {
        const unread = this.notificationService.unreadCount();
        return unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
    }

    toggle(event: Event): void {
        // The list is only worth fetching when someone actually looks at it — the
        // badge is what polls, and it costs a count rather than a page of rows.
        this.notificationService.loadLatest();
        this.op.toggle(event);
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe();
    }

    /**
     * The row navigates by itself; this only settles the read state. Marking
     * happens optimistically in the service, so a failure leaves the dot showing
     * rather than lying about it.
     */
    onActivate(item: NotificationResponse): void {
        this.op.hide();
        if (!item.read) {
            this.notificationService.markAsRead(item.id).subscribe();
        }
    }
}
