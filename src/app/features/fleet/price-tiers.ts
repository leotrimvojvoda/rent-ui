import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { CarResponse, PriceTierRequest, PriceTierResponse } from '../../core/models/car.model';
import { CarService } from '../../core/services/car.service';
import { ToastService } from '../../core/services/toast.service';
import { formatMoney } from '../../shared/utils/format';

interface TierRow {
    minDays: number | null;
    maxDays: number | null;
    dailyPrice: number | null;
}

@Component({
    selector: 'app-price-tiers',
    standalone: true,
    imports: [ReactiveFormsModule, InputNumberModule, MessageModule],
    templateUrl: './price-tiers.html'
})
export class PriceTiers {
    private fb = inject(FormBuilder);
    private carService = inject(CarService);
    private toast = inject(ToastService);

    carId = input.required<string>();
    tiers = input.required<PriceTierResponse[]>();
    defaultDailyPrice = input.required<number>();

    saved = output<CarResponse>();

    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);

    readonly rows = this.fb.array<FormGroup>([]);
    private readonly rowsValue = toSignal(this.rows.valueChanges, { initialValue: [] as TierRow[] });

    /** Sorted preview of what a customer would be charged, including the fallback. */
    readonly preview = computed(() => {
        const lines = this.currentRows()
            .filter((row) => row.minDays != null && row.dailyPrice != null)
            .sort((a, b) => (a.minDays ?? 0) - (b.minDays ?? 0))
            .map((row) => `${describeRange(row)} → ${formatMoney(row.dailyPrice)}/day`);

        lines.push(`All other durations → ${formatMoney(this.defaultDailyPrice())}/day (standard rate)`);
        return lines;
    });

    readonly validationError = computed(() => validateRows(this.currentRows()));

    constructor() {
        // Rows are seeded once from the loaded car; edits stay local until saved.
        queueMicrotask(() => this.seed(this.tiers()));
    }

    addRow(): void {
        const rows = this.currentRows();
        const lastMax = rows.length ? Math.max(...rows.map((row) => row.maxDays ?? row.minDays ?? 0)) : 0;
        this.rows.push(this.buildRow({ minDays: lastMax + 1, maxDays: null, dailyPrice: null }));
    }

    removeRow(index: number): void {
        this.rows.removeAt(index);
    }

    save(): void {
        if (this.saving()) {
            return;
        }

        const problem = this.validationError();
        if (problem) {
            this.formError.set(problem);
            return;
        }

        this.saving.set(true);
        this.formError.set(null);

        // The whole set is replaced at once; an empty array clears the tiers.
        const payload: PriceTierRequest[] = this.currentRows()
            .filter((row) => row.minDays != null && row.dailyPrice != null)
            .sort((a, b) => (a.minDays ?? 0) - (b.minDays ?? 0))
            .map((row) => ({ minDays: row.minDays!, maxDays: row.maxDays ?? null, dailyPrice: row.dailyPrice! }));

        this.carService.replacePriceTiers(this.carId(), payload).subscribe({
            next: (car) => {
                this.saving.set(false);
                this.seed(car.priceTiers ?? []);
                this.toast.success('Pricing saved', payload.length ? 'Your price tiers are live.' : 'All tiers removed — the standard rate applies to every rental.');
                this.saved.emit(car);
            },
            error: (failure) => {
                this.saving.set(false);
                if (errorCodeOf(failure) === 'OVERLAPPING_PRICE_TIERS') {
                    this.formError.set('Those brackets overlap. Each rental length can only match one tier.');
                    return;
                }
                this.formError.set(errorMessage(failure, 'We could not save that pricing. Please try again.'));
            }
        });
    }

    private currentRows(): TierRow[] {
        // Reading the signal keeps the computeds reactive to every keystroke.
        this.rowsValue();
        return this.rows.controls.map((control) => control.value as TierRow);
    }

    private seed(tiers: PriceTierResponse[]): void {
        this.rows.clear();
        for (const tier of [...tiers].sort((a, b) => a.minDays - b.minDays)) {
            this.rows.push(this.buildRow({ minDays: tier.minDays, maxDays: tier.maxDays ?? null, dailyPrice: tier.dailyPrice }));
        }
    }

    private buildRow(row: TierRow): FormGroup {
        return this.fb.group({
            minDays: [row.minDays],
            maxDays: [row.maxDays],
            dailyPrice: [row.dailyPrice]
        });
    }
}

function describeRange(row: TierRow): string {
    if (row.maxDays == null) {
        return `${row.minDays}+ days`;
    }
    if (row.maxDays === row.minDays) {
        return `${row.minDays} ${row.minDays === 1 ? 'day' : 'days'}`;
    }
    return `${row.minDays}–${row.maxDays} days`;
}

/**
 * Mirrors the server's rules so the common mistakes are caught before a round
 * trip: brackets must not overlap, and an open-ended tier swallows everything
 * above it, so it can only be the last one.
 */
export function validateRows(rows: TierRow[]): string | null {
    const filled = rows.filter((row) => row.minDays != null || row.maxDays != null || row.dailyPrice != null);

    for (const row of filled) {
        if (row.minDays == null || row.dailyPrice == null) {
            return 'Every tier needs a starting day and a price.';
        }
        if (row.minDays < 1) {
            return 'Tiers start at day 1 or later.';
        }
        if (row.dailyPrice <= 0) {
            return 'A tier price has to be above zero.';
        }
        if (row.maxDays != null && row.maxDays < row.minDays) {
            return 'A tier cannot end before it starts.';
        }
    }

    const sorted = [...filled].sort((a, b) => (a.minDays ?? 0) - (b.minDays ?? 0));
    for (let index = 0; index < sorted.length - 1; index++) {
        const current = sorted[index];
        const next = sorted[index + 1];

        if (current.maxDays == null) {
            return 'Only the longest tier can be open-ended — give the others an end day.';
        }
        if ((next.minDays ?? 0) <= current.maxDays) {
            return 'Those brackets overlap. Each rental length can only match one tier.';
        }
    }

    return null;
}
