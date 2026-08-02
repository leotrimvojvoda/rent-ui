import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/api.model';
import { NotificationResponse, UnreadCountResponse } from '../models/notification.model';
import { skipErrorToast } from '../http/http-context';
import { AuthService } from './auth.service';

/** How often the badge asks the server, while the tab is actually being looked at. */
const POLL_INTERVAL_MS = 60_000;

/**
 * Floor on how often focus and visibility events may trigger a fetch. Alt-tabbing
 * between two windows fires these constantly; without a floor the "cheap" endpoint
 * stops being cheap.
 */
const MIN_REFRESH_GAP_MS = 10_000;

/**
 * There is no websocket or SSE, so the unread count is polled — which makes
 * restraint the whole design. Polling runs only while someone is signed in and
 * the tab is visible; a hidden tab is a tab nobody is reading a badge in. Coming
 * back to the tab refreshes immediately, so the wait is never the poll interval.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private destroyRef = inject(DestroyRef);
    private readonly baseUrl = `${environment.apiUrl}/notifications`;

    private _notifications = signal<NotificationResponse[]>([]);
    private _unreadCount = signal(0);
    private _loadingLatest = signal(false);

    readonly notifications = this._notifications.asReadonly();
    readonly unreadCount = this._unreadCount.asReadonly();
    readonly loadingLatest = this._loadingLatest.asReadonly();

    private pollHandle: ReturnType<typeof setInterval> | null = null;
    private countInFlight = false;
    private lastCountAt = 0;

    constructor() {
        effect(() => {
            if (this.auth.isLoggedIn()) {
                this.start();
            } else {
                this.stop();
                this.clear();
            }
        });

        const onVisibilityChange = () => {
            if (document.hidden) {
                this.stopTimer();
            } else if (this.auth.isLoggedIn()) {
                this.start();
            }
        };
        const onFocus = () => {
            if (this.auth.isLoggedIn()) {
                this.refreshUnreadCount();
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onFocus);
        this.destroyRef.onDestroy(() => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onFocus);
            this.stop();
        });
    }

    list(options: { page?: number; size?: number; unreadOnly?: boolean } = {}): Observable<PageResponse<NotificationResponse>> {
        let params = new HttpParams().set('page', options.page ?? 0).set('size', options.size ?? 20);
        if (options.unreadOnly) {
            params = params.set('unreadOnly', true);
        }
        return this.http.get<PageResponse<NotificationResponse>>(this.baseUrl, { params });
    }

    /** Loads the first page into the shared signal the bell renders from. */
    loadLatest(): void {
        this._loadingLatest.set(true);
        this.list({ size: 10 }).subscribe({
            next: (page) => {
                this._notifications.set(page.data ?? []);
                this._loadingLatest.set(false);
            },
            error: () => this._loadingLatest.set(false)
        });
    }

    /**
     * `force` skips the throttle — used when an action has just changed the count
     * and the badge would otherwise lag behind the list the user is looking at.
     */
    refreshUnreadCount(force = false): void {
        if (this.countInFlight) {
            return;
        }
        const now = Date.now();
        if (!force && now - this.lastCountAt < MIN_REFRESH_GAP_MS) {
            return;
        }

        this.countInFlight = true;
        this.lastCountAt = now;
        // A failed poll is not worth a toast: the badge simply stays as it was.
        this.http.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`, { context: skipErrorToast() }).subscribe({
            next: (response) => {
                this._unreadCount.set(response?.unread ?? 0);
                this.countInFlight = false;
            },
            error: () => (this.countInFlight = false)
        });
    }

    markAsRead(id: string): Observable<unknown> {
        return this.http.post(`${this.baseUrl}/${id}/read`, {}, { context: skipErrorToast() }).pipe(
            tap(() => {
                this._notifications.update((items) => items.map((item) => (item.id === id ? { ...item, read: true, readAt: new Date().toISOString() } : item)));
                this._unreadCount.update((count) => Math.max(0, count - 1));
            })
        );
    }

    /** The response carries the count *after* the sweep, so trust it over arithmetic. */
    markAllAsRead(): Observable<UnreadCountResponse> {
        return this.http.post<UnreadCountResponse>(`${this.baseUrl}/read-all`, {}, { context: skipErrorToast() }).pipe(
            tap((response) => {
                const readAt = new Date().toISOString();
                this._notifications.update((items) => items.map((item) => (item.read ? item : { ...item, read: true, readAt })));
                this._unreadCount.set(response?.unread ?? 0);
            })
        );
    }

    clear(): void {
        this._notifications.set([]);
        this._unreadCount.set(0);
        this.lastCountAt = 0;
    }

    private start(): void {
        this.refreshUnreadCount();
        if (this.pollHandle === null && !document.hidden) {
            this.pollHandle = setInterval(() => this.refreshUnreadCount(true), POLL_INTERVAL_MS);
        }
    }

    private stop(): void {
        this.stopTimer();
        this.countInFlight = false;
    }

    private stopTimer(): void {
        if (this.pollHandle !== null) {
            clearInterval(this.pollHandle);
            this.pollHandle = null;
        }
    }
}
