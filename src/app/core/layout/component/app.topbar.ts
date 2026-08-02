import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { environment } from '../../../../environments/environment';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../services/confirmation.service';
import { NotificationBell } from '../../../features/notifications/notification-bell';

const ROLE_LABELS: Record<string, string> = {
    CLIENT: 'Client',
    OWNER: 'Owner',
    ADMIN: 'Admin'
};

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, NotificationBell],
    templateUrl: './app.topbar.html'
})
export class AppTopbar {
    private router = inject(Router);
    private confirmDialogService = inject(ConfirmDialogService);

    layoutService = inject(LayoutService);
    authService = inject(AuthService);

    readonly appName = environment.appName;
    readonly roleLabel = computed(() => {
        const role = this.authService.role();
        return role ? (ROLE_LABELS[role] ?? role) : '';
    });

    toggleDarkMode(): void {
        this.layoutService.setThemeMode(this.layoutService.isDarkTheme() ? 'light' : 'dark');
    }

    /** Logout is best-effort server-side; the local session goes either way. */
    async logout(): Promise<void> {
        const confirmed = await this.confirmDialogService.confirm({
            message: 'Are you sure you want to log out?',
            header: 'Confirm Logout',
            icon: 'pi pi-sign-out'
        });
        if (!confirmed) {
            return;
        }
        this.authService.logout().subscribe(() => void this.router.navigateByUrl('/'));
    }
}
