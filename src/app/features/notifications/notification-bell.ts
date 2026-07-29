import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { Popover, PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/notification.model';

@Component({
    selector: 'app-notification-bell',
    standalone: true,
    imports: [CommonModule, BadgeModule, PopoverModule, ButtonModule],
    template: `
        <button type="button" class="layout-topbar-action relative" (click)="toggle($event)">
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
                        <button type="button" class="text-primary text-sm cursor-pointer bg-transparent border-none"
                                (click)="notificationService.markAllAsRead()">
                            Mark all as read
                        </button>
                    }
                </div>
                <div class="max-h-80 overflow-y-auto">
                    @for (item of notificationService.notifications(); track item.id) {
                        <div class="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-emphasis transition-colors"
                             [ngClass]="{ 'bg-emphasis': !item.read }"
                             (click)="onItemClick(item)">
                            <span class="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
                                  [ngClass]="{
                                      'bg-blue-500': item.type === 'info',
                                      'bg-yellow-500': item.type === 'warning',
                                      'bg-red-500': item.type === 'error',
                                      'bg-green-500': item.type === 'success'
                                  }"></span>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">{{ item.title }}</div>
                                <div class="text-muted-color text-xs mt-1 line-clamp-2">{{ item.message }}</div>
                                <div class="text-muted-color text-xs mt-1">{{ getRelativeTime(item.createdAt) }}</div>
                            </div>
                        </div>
                    } @empty {
                        <div class="px-3 py-6 text-center text-muted-color text-sm">
                            <i class="pi pi-bell-slash text-2xl mb-2 block"></i>
                            No notifications
                        </div>
                    }
                </div>
            </div>
        </p-popover>
    `
})
export class NotificationBell {
    notificationService = inject(NotificationService);
    private router = inject(Router);

    @ViewChild('op') op!: Popover;

    toggle(event: Event): void {
        this.op.toggle(event);
    }

    onItemClick(item: NotificationItem): void {
        if (!item.read) {
            this.notificationService.markAsRead(item.id);
        }
        if (item.link) {
            this.op.hide();
            this.router.navigate([item.link]);
        }
    }

    getRelativeTime(dateString: string): string {
        const now = Date.now();
        const date = new Date(dateString).getTime();
        const diff = now - date;

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
