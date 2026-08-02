import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface DashboardTile {
    icon: string;
    title: string;
    body: string;
    link: string;
}

const CLIENT_TILES: DashboardTile[] = [
    { icon: 'pi pi-search', title: 'Browse cars', body: 'Search by city and dates, and see the full price before you request.', link: '/cars' },
    { icon: 'pi pi-calendar', title: 'My rentals', body: 'Every request you have made, and where each one stands.', link: '/rentals' },
    { icon: 'pi pi-bell', title: 'Notifications', body: 'Approvals, rejections and pick-up reminders land here.', link: '/notifications' }
];

const OWNER_TILES: DashboardTile[] = [
    { icon: 'pi pi-car', title: 'Your fleet', body: 'Add cars, upload photos, set price tiers and publish them.', link: '/fleet' },
    { icon: 'pi pi-inbox', title: 'Rental requests', body: 'Approve, reject and track handovers for your cars.', link: '/company/rentals' },
    { icon: 'pi pi-building', title: 'Company', body: 'The details renters see, and the contacts they reach you on.', link: '/company' }
];

const NEUTRAL_TILES: DashboardTile[] = [
    { icon: 'pi pi-search', title: 'Browse cars', body: 'The public catalog is open to every account.', link: '/cars' },
    { icon: 'pi pi-cog', title: 'Settings', body: 'Appearance and account details.', link: '/settings' }
];

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './dashboard.html'
})
export class Dashboard {
    authService = inject(AuthService);

    /** One route, role-switched content — ADMIN has no workspace of its own. */
    readonly tiles = computed<DashboardTile[]>(() => {
        switch (this.authService.role()) {
            case 'CLIENT':
                return CLIENT_TILES;
            case 'OWNER':
                return OWNER_TILES;
            default:
                return NEUTRAL_TILES;
        }
    });

    readonly intro = computed(() => {
        switch (this.authService.role()) {
            case 'CLIENT':
                return 'Find a car, request it, and track the booking here.';
            case 'OWNER':
                return 'Manage your fleet and answer rental requests here.';
            default:
                return 'Browsing the catalog is available from any account.';
        }
    });

    readonly primaryAction = computed(() => (this.authService.isOwner() ? { label: 'Manage fleet', link: '/fleet' } : { label: 'Browse cars', link: '/cars' }));
}
