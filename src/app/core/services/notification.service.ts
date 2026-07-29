import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationItem } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);

  private _notifications = signal<NotificationItem[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  loadNotifications(): void {
    this.http.get<NotificationItem[]>(`${environment.apiUrl}/notifications`).subscribe({
      next: (items) => this._notifications.set(items),
      error: () => this._notifications.set([])
    });
  }

  markAsRead(id: string): void {
    this.http.put<void>(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this._notifications.update(items =>
          items.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    });
  }

  markAllAsRead(): void {
    this.http.put<void>(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this._notifications.update(items =>
          items.map(n => ({ ...n, read: true }))
        );
      }
    });
  }
}
