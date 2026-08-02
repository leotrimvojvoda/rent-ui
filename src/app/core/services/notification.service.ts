import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/api.model';
import { NotificationResponse, UnreadCountResponse } from '../models/notification.model';
import { AuthService } from './auth.service';

/**
 * There is no websocket or SSE — the unread count is polled. Phase 7 adds the
 * 60 s visibility-aware polling and the role-aware deep links; this covers the
 * endpoints themselves and keeps the badge honest after login and logout.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrl}/notifications`;

    private _notifications = signal<NotificationResponse[]>([]);
    private _unreadCount = signal(0);

    readonly notifications = this._notifications.asReadonly();
    readonly unreadCount = this._unreadCount.asReadonly();

    constructor() {
        effect(() => {
            if (this.auth.isLoggedIn()) {
                this.refreshUnreadCount();
            } else {
                this.clear();
            }
        });
    }

    list(options: { page?: number; size?: number; unreadOnly?: boolean } = {}): Observable<PageResponse<NotificationResponse>> {
        let params = new HttpParams().set('page', options.page ?? 0).set('size', options.size ?? 20);
        if (options.unreadOnly) {
            params = params.set('unreadOnly', true);
        }
        return this.http.get<PageResponse<NotificationResponse>>(this.baseUrl, {
            params
        });
    }

    /** Loads the first page into the shared signal the bell renders from. */
    loadLatest(): void {
        this.list({ size: 10 }).subscribe((page) => this._notifications.set(page.data));
    }

    refreshUnreadCount(): void {
        this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`).subscribe((response) => this._unreadCount.set(response.unread ?? 0));
    }

    markAsRead(id: string): Observable<unknown> {
        return this.http.post(`${this.baseUrl}/${id}/read`, {}).pipe(
            tap(() => {
                this._notifications.update((items) => items.map((item) => (item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item)));
                this._unreadCount.update((count) => Math.max(0, count - 1));
            })
        );
    }

    markAllAsRead(): Observable<UnreadCountResponse> {
        return this.http.post<UnreadCountResponse>(`${this.baseUrl}/read-all`, {}).pipe(
            tap((response) => {
                this._notifications.update((items) => items.map((item) => (item.read ? item : { ...item, read: true, readAt: new Date().toISOString() })));
                this._unreadCount.set(response?.unread ?? 0);
            })
        );
    }

    clear(): void {
        this._notifications.set([]);
        this._unreadCount.set(0);
    }
}
