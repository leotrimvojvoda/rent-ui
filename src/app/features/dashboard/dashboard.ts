import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RentalResponse, RentalStatus } from '../../core/models/rental.model';
import { AuthService } from '../../core/services/auth.service';
import { RentalService } from '../../core/services/rental.service';
import { RentalStatusBadge } from '../../shared/components/rental-status-badge';
import { formatDateTime, formatMoney } from '../../shared/utils/format';

interface DashboardTile {
    icon: string;
    title: string;
    body: string;
    link: string;
}

const OWNER_TILES: DashboardTile[] = [
    { icon: 'pi pi-car', title: 'Your fleet', body: 'Add cars, upload photos, set price tiers and publish them.', link: '/fleet' },
    { icon: 'pi pi-inbox', title: 'Rental requests', body: 'Approve, reject and track handovers for your cars.', link: '/company/rentals' },
    { icon: 'pi pi-building', title: 'Company', body: 'The details renters see, and the contacts they reach you on.', link: '/company' }
];

const NEUTRAL_TILES: DashboardTile[] = [
    { icon: 'pi pi-search', title: 'Browse cars', body: 'The public catalog is open to every account.', link: '/cars' },
    { icon: 'pi pi-cog', title: 'Settings', body: 'Appearance and account details.', link: '/settings' }
];

/** One page is enough to summarise; there is no stats endpoint. */
const SUMMARY_PAGE_SIZE = 100;

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [RouterModule, RentalStatusBadge],
    templateUrl: './dashboard.html'
})
export class Dashboard {
    private rentalService = inject(RentalService);

    authService = inject(AuthService);

    readonly ownerTiles = OWNER_TILES;
    readonly neutralTiles = NEUTRAL_TILES;

    readonly rentals = signal<RentalResponse[]>([]);
    readonly totalRentals = signal(0);
    readonly loading = signal(false);

    /** True when there are more rentals than one page, so counts are of recent ones. */
    readonly countsArePartial = computed(() => this.totalRentals() > this.rentals().length);

    readonly active = computed(() => this.rentals().find((rental) => rental.status === 'ACTIVE') ?? null);

    /** Soonest future pick-up that is still live. */
    readonly upcoming = computed(() => {
        const now = Date.now();
        return (
            this.rentals()
                .filter((rental) => (rental.status === 'PENDING' || rental.status === 'APPROVED') && new Date(rental.startAt).getTime() > now)
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
        );
    });

    readonly counts = computed(() => {
        const tally = { PENDING: 0, APPROVED: 0, ACTIVE: 0, COMPLETED: 0 } as Record<RentalStatus, number>;
        for (const rental of this.rentals()) {
            tally[rental.status] = (tally[rental.status] ?? 0) + 1;
        }
        return [
            { label: 'Pending', value: tally.PENDING ?? 0, status: 'PENDING' as RentalStatus },
            { label: 'Approved', value: tally.APPROVED ?? 0, status: 'APPROVED' as RentalStatus },
            { label: 'Picked up', value: tally.ACTIVE ?? 0, status: 'ACTIVE' as RentalStatus },
            { label: 'Completed', value: tally.COMPLETED ?? 0, status: 'COMPLETED' as RentalStatus }
        ];
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

    constructor() {
        if (this.authService.isClient()) {
            this.loading.set(true);
            this.rentalService.list({ page: 0, size: SUMMARY_PAGE_SIZE }).subscribe({
                next: (page) => {
                    this.rentals.set(page.data ?? []);
                    this.totalRentals.set(page.totalElements ?? 0);
                    this.loading.set(false);
                },
                error: () => {
                    // The dashboard degrades to its links rather than blocking.
                    this.rentals.set([]);
                    this.loading.set(false);
                }
            });
        }
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    dateTime(instant: string | null | undefined): string {
        return formatDateTime(instant);
    }
}
