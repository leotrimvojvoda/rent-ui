import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CompanyRentalResponse, RentalResponse, RentalStatus } from '../../core/models/rental.model';
import { AuthService } from '../../core/services/auth.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { CompanyRentalService } from '../../core/services/company-rental.service';
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

/** Cap on how many rows a queue widget lists before deferring to the full page. */
const QUEUE_PREVIEW = 3;

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [RouterModule, RentalStatusBadge],
    templateUrl: './dashboard.html'
})
export class Dashboard {
    private rentalService = inject(RentalService);
    private companyRentalService = inject(CompanyRentalService);
    private companyContext = inject(CompanyContextService);

    authService = inject(AuthService);

    readonly ownerTiles = OWNER_TILES;
    readonly neutralTiles = NEUTRAL_TILES;

    readonly rentals = signal<RentalResponse[]>([]);
    readonly totalRentals = signal(0);
    readonly loading = signal(false);

    readonly ownerRentals = signal<CompanyRentalResponse[]>([]);
    readonly totalOwnerRentals = signal(0);
    readonly needsCompany = signal(false);

    /** True when there are more rentals than one page, so counts are of recent ones. */
    readonly countsArePartial = computed(() => this.totalRentals() > this.rentals().length);
    readonly ownerCountsArePartial = computed(() => this.totalOwnerRentals() > this.ownerRentals().length);

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

    /** Requests waiting on a decision — oldest first, since those expire soonest. */
    readonly pending = computed(() => this.ownerQueue('PENDING', (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));

    /** Approved and not yet handed over, soonest pick-up first. */
    readonly handovers = computed(() => this.ownerQueue('APPROVED', (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));

    /** Out with a customer, soonest return first. */
    readonly returns = computed(() => this.ownerQueue('ACTIVE', (a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime()));

    readonly pendingCount = computed(() => this.ownerCountOf('PENDING'));
    readonly approvedCount = computed(() => this.ownerCountOf('APPROVED'));
    readonly outNowCount = computed(() => this.ownerCountOf('ACTIVE'));

    readonly ownerCounts = computed(() => {
        const tally = {} as Record<RentalStatus, number>;
        for (const rental of this.ownerRentals()) {
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
                if (this.needsCompany()) {
                    return 'Set up your company to start listing cars — it takes a minute and you only do it once.';
                }
                return this.pendingCount() > 0 ? 'Requests are waiting on your decision — undecided ones expire at their pick-up time.' : 'Manage your fleet and answer rental requests here.';
            default:
                return 'Browsing the catalog is available from any account.';
        }
    });

    /**
     * Owners get sent to the queue when something is waiting there. The band holds
     * the page's only lime CTA, so it has to point at whatever matters most.
     */
    readonly primaryAction = computed(() => {
        if (!this.authService.isOwner()) {
            return { label: 'Browse cars', link: '/cars' };
        }
        if (this.needsCompany()) {
            return { label: 'Set up your company', link: '/company/setup' };
        }
        const pending = this.pendingCount();
        return pending > 0 ? { label: pending === 1 ? 'Review 1 request' : `Review ${pending} requests`, link: '/company/rentals' } : { label: 'Manage fleet', link: '/fleet' };
    });

    constructor() {
        if (this.authService.isClient()) {
            this.loadClientSummary();
        } else if (this.authService.isOwner()) {
            this.loadOwnerSummary();
        }
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    dateTime(instant: string | null | undefined): string {
        return formatDateTime(instant);
    }

    clientName(rental: CompanyRentalResponse): string {
        return `${rental.client.firstName} ${rental.client.lastName}`.trim();
    }

    private loadClientSummary(): void {
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

    /**
     * The dashboard is not behind the owner-company guard, so an owner may well
     * land here before creating a company. Resolving the (cached) context first
     * turns that into a prompt instead of a request that is certain to 409.
     */
    private loadOwnerSummary(): void {
        this.loading.set(true);
        this.companyContext.resolve().subscribe({
            next: (company) => {
                this.needsCompany.set(company === null);
                if (company === null) {
                    this.loading.set(false);
                    return;
                }
                this.loadOwnerRentals();
            },
            error: () => this.loading.set(false)
        });
    }

    private loadOwnerRentals(): void {
        this.companyRentalService.list({ page: 0, size: SUMMARY_PAGE_SIZE }).subscribe({
            next: (page) => {
                this.ownerRentals.set(page.data ?? []);
                this.totalOwnerRentals.set(page.totalElements ?? 0);
                this.loading.set(false);
            },
            error: () => {
                this.ownerRentals.set([]);
                this.loading.set(false);
            }
        });
    }

    private ownerCountOf(status: RentalStatus): number {
        return this.ownerRentals().filter((rental) => rental.status === status).length;
    }

    private ownerQueue(status: RentalStatus, compare: (a: CompanyRentalResponse, b: CompanyRentalResponse) => number): CompanyRentalResponse[] {
        return this.ownerRentals()
            .filter((rental) => rental.status === status)
            .sort(compare)
            .slice(0, QUEUE_PREVIEW);
    }
}
