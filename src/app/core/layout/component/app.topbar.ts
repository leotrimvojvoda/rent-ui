import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
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
    imports: [RouterModule, CommonModule, NotificationBell],
    templateUrl: './app.topbar.html'
})
export class AppTopbar {
    private router = inject(Router);
    private confirmDialogService = inject(ConfirmDialogService);
    private host = inject(ElementRef<HTMLElement>);

    layoutService = inject(LayoutService);
    authService = inject(AuthService);

    readonly appName = environment.appName;
    readonly roleLabel = computed(() => {
        const role = this.authService.role();
        return role ? (ROLE_LABELS[role] ?? role) : '';
    });

    /**
     * The account menu was a `pStyleClass` class toggle, which no component could
     * observe — so `aria-expanded` had no honest value to bind to. A signal owns
     * the panel and the attribute together, and outside-click and Escape both go
     * through it.
     */
    readonly accountMenuOpen = signal(false);

    readonly themeToggleLabel = computed(() => (this.layoutService.isDarkTheme() ? 'Switch to light theme' : 'Switch to dark theme'));

    toggleAccountMenu(event: Event): void {
        event.stopPropagation();
        this.accountMenuOpen.update((open) => !open);
    }

    closeAccountMenu(): void {
        this.accountMenuOpen.set(false);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.accountMenuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
            this.closeAccountMenu();
        }
    }

    toggleDarkMode(): void {
        this.layoutService.setThemeMode(this.layoutService.isDarkTheme() ? 'light' : 'dark');
    }

    /** Logout is best-effort server-side; the local session goes either way. */
    async logout(): Promise<void> {
        this.closeAccountMenu();
        const confirmed = await this.confirmDialogService.confirm({
            message: 'Are you sure you want to log out?',
            header: 'Log out?',
            acceptLabel: 'Log out',
            rejectLabel: 'Stay signed in',
            icon: 'pi pi-sign-out'
        });
        if (!confirmed) {
            return;
        }
        this.authService.logout().subscribe(() => void this.router.navigateByUrl('/'));
    }
}
