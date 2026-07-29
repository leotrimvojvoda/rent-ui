import { Component, inject, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialogService } from '../../services/confirmation.service';
import { NotificationBell } from '../../../features/notifications/notification-bell';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, NotificationBell],
    templateUrl: './app.topbar.html'
})
export class AppTopbar implements OnInit {
    items!: MenuItem[];

    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private confirmDialogService = inject(ConfirmDialogService);

    constructor(public layoutService: LayoutService, public authService: AuthService) { }

    ngOnInit() {
        if (this.authService.isLoggedIn()) {
            this.notificationService.loadNotifications();
        }
    }

    toggleDarkMode() {
        this.layoutService.setThemeMode(this.layoutService.isDarkTheme() ? 'light' : 'dark');
    }

    async logout() {
        const confirmed = await this.confirmDialogService.confirm({
            message: 'Are you sure you want to log out?',
            header: 'Confirm Logout',
            icon: 'pi pi-sign-out'
        });
        if (confirmed) {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
        }
    }
}
