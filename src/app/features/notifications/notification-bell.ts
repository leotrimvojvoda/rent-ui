import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Popover, PopoverModule } from 'primeng/popover';
import { NOTIFICATION_ICONS, NotificationResponse } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [CommonModule, PopoverModule, RouterModule],
    template: `
        <button type="button" class="layout-topbar-action relative" aria-label="Notifications" (click)="toggle($event)">
            <i class="pi pi-bell"></i>
            @if (notificationService.unreadCount() > 0) {
                <span class="absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white text-xs rounded-full w-5 h-5">
                    {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
                </span>
            }
        </button>
        <p-popover #op>
            <div class="w-80">
                <div class="flex items-center justify-between px-3 py-2 border-b border-surface">
                    <span class="font-semibold">Notifications</span>
                    @if (notificationService.unreadCount() > 0) {
                        <button type="button" class="text-primary text-sm cursor-pointer bg-transparent border-none" (click)="markAllAsRead()">Mark all as read</button>
                    }
                </div>
                <div class="max-h-80 overflow-y-auto">
                    @for (item of notificationService.notifications(); track item.id) {
                        <div class="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-emphasis transition-colors" [class.bg-emphasis]="!item.read" (click)="onItemClick(item)">
                            <i [class]="icon(item) + ' mt-1 text-muted-color'"></i>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm">{{ item.message }}</div>
                                <div class="text-muted-color text-xs mt-1">
                                    {{ relativeTime(item.createdAt) }}
                                </div>
                            </div>
                            @if (!item.read) {
                                <span class="mt-2 shrink-0 w-2 h-2 rounded-full bg-primary"></span>
                            }
                        </div>
                    } @empty {
                        <div class="px-3 py-6 text-center text-muted-color text-sm">
                            <i class="pi pi-bell-slash text-2xl mb-2 block"></i>
                            No notifications
                        </div>
                    }
                </div>
                <div class="border-t border-surface px-3 py-2 text-center">
                    <a routerLink="/notifications" class="text-primary text-sm no-underline" (click)="op.hide()">See all</a>
                </div>
            </div>
        </p-popover>
    `
})
export class NotificationBell {
    notificationService = inject(NotificationService);

    @ViewChild('op') op!: Popover;

    toggle(event: Event): void {
        // The list is only worth fetching when someone actually looks at it.
        this.notificationService.loadLatest();
        this.op.toggle(event);
    }

    icon(item: NotificationResponse): string {
        return NOTIFICATION_ICONS[item.type] ?? 'pi pi-bell';
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead().subscribe();
    }

    onItemClick(item: NotificationResponse): void {
        if (!item.read) {
            this.notificationService.markAsRead(item.id).subscribe();
        }
    }

    relativeTime(dateString: string): string {
        const diff = Date.now() - new Date(dateString).getTime();

        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        return new Date(dateString).toLocaleDateString();
    }
}
