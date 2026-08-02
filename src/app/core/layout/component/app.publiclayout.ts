import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../service/layout.service';

/**
 * The catalog is public, so anonymous visitors get their own lightweight shell
 * rather than the authenticated `AppLayout`. Signed-in users keep a way back
 * into their workspace.
 */
@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './app.publiclayout.html'
})
export class AppPublicLayout {
    private router = inject(Router);

    layoutService = inject(LayoutService);
    authService = inject(AuthService);

    readonly appName = environment.appName;
    readonly year = new Date().getFullYear();

    /** ADMIN has no workspace of its own, so it gets no dashboard link. */
    readonly hasWorkspace = computed(() => this.authService.isClient() || this.authService.isOwner());

    toggleDarkMode(): void {
        this.layoutService.setThemeMode(this.layoutService.isDarkTheme() ? 'light' : 'dark');
    }

    logout(): void {
        this.authService.logout().subscribe(() => void this.router.navigateByUrl('/'));
    }
}
