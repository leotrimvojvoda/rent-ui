import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CarSummaryResponse } from '../../core/models/car.model';
import { CarService } from '../../core/services/car.service';
import { ConfirmDialogService } from '../../core/services/confirmation.service';
import { ToastService } from '../../core/services/toast.service';
import { errorMessage } from '../../core/errors/api-error';
import { CarStatusBadge, PublishedBadge } from '../../shared/components/car-status-badge';
import { EmptyState } from '../../shared/components/empty-state';
import { Pager } from '../../shared/components/pager';
import { formatMoney } from '../../shared/utils/format';

const PAGE_SIZE = 10;

@Component({
    selector: 'app-fleet',
    standalone: true,
    imports: [RouterModule, CarStatusBadge, PublishedBadge, EmptyState, Pager],
    templateUrl: './fleet.html'
})
export class Fleet {
    private carService = inject(CarService);
    private confirmDialog = inject(ConfirmDialogService);
    private toast = inject(ToastService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    readonly pageSize = PAGE_SIZE;
    readonly skeletons = [0, 1, 2];

    readonly cars = signal<CarSummaryResponse[]>([]);
    readonly loading = signal(true);
    readonly failed = signal(false);
    readonly page = signal(0);
    readonly totalPages = signal(0);
    readonly totalElements = signal(0);
    /** Ids with a publish toggle in flight, so their buttons can be disabled. */
    readonly busy = signal<Set<string>>(new Set());

    /** Set right after company setup, to prompt the very first car. */
    readonly justCreatedCompany = signal(false);

    constructor() {
        this.justCreatedCompany.set(this.route.snapshot.queryParamMap.get('welcome') === '1');
        this.load(0);
    }

    money(amount: number | null | undefined): string {
        return formatMoney(amount);
    }

    isBusy(carId: string): boolean {
        return this.busy().has(carId);
    }

    load(page: number): void {
        this.loading.set(true);
        this.failed.set(false);

        this.carService.list({ page, size: PAGE_SIZE }).subscribe({
            next: (result) => {
                this.cars.set(result.data ?? []);
                this.page.set(result.page ?? page);
                this.totalPages.set(result.totalPages ?? 0);
                this.totalElements.set(result.totalElements ?? 0);
                this.loading.set(false);
            },
            error: () => {
                this.cars.set([]);
                this.failed.set(true);
                this.loading.set(false);
            }
        });
    }

    onPageChange(page: number): void {
        this.load(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /** Optimistic: the row flips immediately and rolls back if the call fails. */
    togglePublish(car: CarSummaryResponse): void {
        if (this.isBusy(car.id)) {
            return;
        }

        const publishing = !car.published;
        this.setPublished(car.id, publishing);
        this.markBusy(car.id, true);

        const request = publishing ? this.carService.publish(car.id) : this.carService.unpublish(car.id);
        request.subscribe({
            next: (updated) => {
                this.markBusy(car.id, false);
                this.replaceCar(updated);
            },
            error: (failure) => {
                this.markBusy(car.id, false);
                this.setPublished(car.id, !publishing);
                this.toast.error(publishing ? 'Could not publish' : 'Could not unpublish', errorMessage(failure));
            }
        });
    }

    async remove(car: CarSummaryResponse): Promise<void> {
        const confirmed = await this.confirmDialog.confirm({
            header: `Remove the ${car.make} ${car.model}?`,
            // The server picks the outcome, so the copy has to cover both.
            message: `It comes off the catalog either way. If this car has never been rented it is deleted along with its photos; if it has rental history it is retired and unpublished instead, so past rentals still name a real car.`,
            acceptLabel: 'Remove car',
            rejectLabel: 'Keep it',
            icon: 'pi pi-exclamation-triangle'
        });
        if (!confirmed) {
            return;
        }

        this.markBusy(car.id, true);
        this.carService.delete(car.id).subscribe({
            next: () => {
                this.markBusy(car.id, false);
                this.toast.success('Car removed', `${car.make} ${car.model} is off the catalog.`);
                // Which of the two outcomes happened is only visible in fresh data.
                this.load(this.page());
            },
            error: (failure) => {
                this.markBusy(car.id, false);
                this.toast.error('Could not remove that car', errorMessage(failure));
            }
        });
    }

    dismissWelcome(): void {
        this.justCreatedCompany.set(false);
        void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }

    private setPublished(carId: string, published: boolean): void {
        this.cars.update((cars) => cars.map((car) => (car.id === carId ? { ...car, published } : car)));
    }

    private replaceCar(updated: { id: string; published: boolean; status: CarSummaryResponse['status'] }): void {
        this.cars.update((cars) => cars.map((car) => (car.id === updated.id ? { ...car, published: updated.published, status: updated.status } : car)));
    }

    private markBusy(carId: string, busy: boolean): void {
        this.busy.update((current) => {
            const next = new Set(current);
            if (busy) {
                next.add(carId);
            } else {
                next.delete(carId);
            }
            return next;
        });
    }
}
