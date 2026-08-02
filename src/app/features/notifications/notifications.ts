import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { NotificationResponse } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyState } from '../../shared/components/empty-state';
import { NotificationRow } from '../../shared/components/notification-row';
import { Pager } from '../../shared/components/pager';

const PAGE_SIZE = 20;

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [EmptyState, Pager, NotificationRow],
    templateUrl: './notifications.html'
})
export class Notifications {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    notificationService = inject(NotificationService);

    readonly pageSize = PAGE_SIZE;
    readonly skeletons = [0, 1, 2, 3, 4];

    readonly items = signal<NotificationResponse[]>([]);
    readonly loading = signal(true);
    readonly failed = signal(false);
    readonly page = signal(0);
    readonly totalPages = signal(0);
    readonly totalElements = signal(0);
    readonly unreadOnly = signal(false);
    readonly markingAll = signal(false);

    readonly hasUnread = computed(() => this.notificationService.unreadCount() > 0);

    constructor() {
        // The toggle and the page live in the URL, so the back button works and a
        // filtered view survives a reload.
        this.route.queryParamMap
            .pipe(
                tap((params) => {
                    this.unreadOnly.set(params.get('unread') === '1');
                    this.page.set(Math.max(0, Number(params.get('page') ?? 0) || 0));
                    this.loading.set(true);
                    this.failed.set(false);
                }),
                switchMap(() => this.notificationService.list({ page: this.page(), size: PAGE_SIZE, unreadOnly: this.unreadOnly() })),
                takeUntilDestroyed()
            )
            .subscribe({
                next: (result) => {
                    this.items.set(result.data ?? []);
                    this.totalPages.set(result.totalPages ?? 0);
                    this.totalElements.set(result.totalElements ?? 0);
                    this.loading.set(false);
                },
                error: () => {
                    this.items.set([]);
                    this.totalPages.set(0);
                    this.totalElements.set(0);
                    this.failed.set(true);
                    this.loading.set(false);
                }
            });
    }

    setUnreadOnly(unreadOnly: boolean): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { unread: unreadOnly ? 1 : undefined, page: undefined }
        });
    }

    onPageChange(page: number): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { unread: this.unreadOnly() ? 1 : undefined, page: page > 0 ? page : undefined }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Opening a notification marks it read here as well as in the shared signal
     * the bell renders from — this page has its own copy of the rows.
     */
    onActivate(item: NotificationResponse): void {
        if (item.read) {
            return;
        }
        this.notificationService.markAsRead(item.id).subscribe({
            next: () => this.applyRead(item.id),
            error: () => {
                /* Leave the dot showing rather than claiming it was read. */
            }
        });
    }

    markAllAsRead(): void {
        if (this.markingAll()) {
            return;
        }
        this.markingAll.set(true);
        this.notificationService.markAllAsRead().subscribe({
            next: () => {
                this.markingAll.set(false);
                // On the unread-only view everything just left the filter, so
                // refetch instead of rendering a list that contradicts the toggle.
                if (this.unreadOnly()) {
                    this.reload();
                    return;
                }
                const readAt = new Date().toISOString();
                this.items.update((items) => items.map((item) => (item.read ? item : { ...item, read: true, readAt })));
            },
            error: () => this.markingAll.set(false)
        });
    }

    private applyRead(id: string): void {
        if (this.unreadOnly()) {
            this.items.update((items) => items.filter((item) => item.id !== id));
            this.totalElements.update((total) => Math.max(0, total - 1));
            return;
        }
        this.items.update((items) => items.map((item) => (item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item)));
    }

    private reload(): void {
        this.notificationService.list({ page: this.page(), size: PAGE_SIZE, unreadOnly: this.unreadOnly() }).subscribe({
            next: (result) => {
                this.items.set(result.data ?? []);
                this.totalPages.set(result.totalPages ?? 0);
                this.totalElements.set(result.totalElements ?? 0);
            },
            error: () => {
                /* Keep what is on screen; the counts above already updated. */
            }
        });
    }
}
