import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { applyFieldErrors, clearServerErrors, clearServerErrorsOnEdit } from '../../core/forms/server-errors';
import { CarImageResponse, CarResponse, CarStatus } from '../../core/models/car.model';
import { CarService } from '../../core/services/car.service';
import { ToastService } from '../../core/services/toast.service';
import { CarStatusBadge, PublishedBadge } from '../../shared/components/car-status-badge';
import { FieldError } from '../../shared/components/field-error';
import { CarImages } from './car-images';
import { PriceTiers } from './price-tiers';

const STATUS_OPTIONS: { label: string; value: CarStatus }[] = [
    { label: 'Active — bookable', value: 'ACTIVE' },
    { label: 'In maintenance — hidden from the catalog', value: 'IN_MAINTENANCE' },
    { label: 'Retired — no longer in service', value: 'RETIRED' }
];

const CURRENT_YEAR = new Date().getFullYear();

@Component({
    selector: 'app-car-edit',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, InputTextModule, InputNumberModule, SelectModule, MessageModule, FieldError, CarImages, PriceTiers, CarStatusBadge, PublishedBadge],
    templateUrl: './car-edit.html'
})
export class CarEdit {
    private fb = inject(FormBuilder);
    private carService = inject(CarService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private toast = inject(ToastService);

    readonly statusOptions = STATUS_OPTIONS;
    /** Wide enough for classics, with a little room for next year's models. */
    readonly minYear = 1950;
    readonly maxYear = CURRENT_YEAR + 1;

    readonly car = signal<CarResponse | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly publishing = signal(false);
    readonly notFound = signal(false);
    readonly formError = signal<string | null>(null);

    readonly isNew = computed(() => this.car() === null);

    readonly form = this.fb.nonNullable.group({
        make: ['', [Validators.required, Validators.maxLength(80)]],
        model: ['', [Validators.required, Validators.maxLength(80)]],
        modelYear: [CURRENT_YEAR, [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)]],
        licensePlate: ['', [Validators.required, Validators.maxLength(20)]],
        defaultDailyPrice: [null as number | null, [Validators.required, Validators.min(0.01)]],
        status: ['ACTIVE' as CarStatus, [Validators.required]]
    });

    constructor() {
        clearServerErrorsOnEdit(this.form);

        const carId = this.route.snapshot.paramMap.get('carId');
        if (carId) {
            this.load(carId);
        }
    }

    onSubmit(): void {
        if (this.saving()) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.formError.set(null);
        clearServerErrors(this.form);

        const value = this.form.getRawValue();
        const request = {
            make: value.make.trim(),
            model: value.model.trim(),
            modelYear: value.modelYear,
            licensePlate: value.licensePlate.trim(),
            defaultDailyPrice: value.defaultDailyPrice!,
            status: value.status
        };

        const existing = this.car();
        const call = existing ? this.carService.update(existing.id, request) : this.carService.create(request);

        call.subscribe({
            next: (car) => {
                this.saving.set(false);
                const wasNew = !existing;
                this.car.set(car);

                if (wasNew) {
                    // Photos and pricing need a car to hang off, so creation lands on edit.
                    this.toast.success('Car added', 'Now add photos and pricing, then publish it.');
                    void this.router.navigate(['/fleet', car.id], { replaceUrl: true });
                } else {
                    this.toast.success('Car saved', 'Your changes are live.');
                }
            },
            error: (failure) => {
                this.saving.set(false);
                this.handleFailure(failure);
            }
        });
    }

    togglePublish(): void {
        const car = this.car();
        if (!car || this.publishing()) {
            return;
        }

        this.publishing.set(true);
        const call = car.published ? this.carService.unpublish(car.id) : this.carService.publish(car.id);

        call.subscribe({
            next: (updated) => {
                this.publishing.set(false);
                this.car.set(updated);
                this.toast.success(updated.published ? 'Car published' : 'Car unpublished', updated.published ? 'It is in the catalog while its status is active.' : 'It is no longer in the catalog.');
            },
            error: (failure) => {
                this.publishing.set(false);
                this.toast.error('That did not work', errorMessage(failure));
            }
        });
    }

    onImagesChange(images: CarImageResponse[]): void {
        this.car.update((car) => (car ? { ...car, images } : car));
    }

    onTiersSaved(car: CarResponse): void {
        this.car.set(car);
    }

    private load(carId: string): void {
        this.loading.set(true);
        this.carService.getById(carId).subscribe({
            next: (car) => {
                this.car.set(car);
                this.form.setValue({
                    make: car.make ?? '',
                    model: car.model ?? '',
                    modelYear: car.modelYear ?? CURRENT_YEAR,
                    licensePlate: car.licensePlate ?? '',
                    defaultDailyPrice: car.defaultDailyPrice ?? null,
                    status: car.status ?? 'ACTIVE'
                });
                this.loading.set(false);
            },
            error: (failure) => {
                this.loading.set(false);
                // 404 covers "not in this company" too — either way it is not theirs.
                this.notFound.set(failure instanceof HttpErrorResponse && failure.status === 404);
                if (!this.notFound()) {
                    this.formError.set(errorMessage(failure, 'We could not load that car.'));
                }
            }
        });
    }

    private handleFailure(failure: unknown): void {
        switch (errorCodeOf(failure)) {
            case 'DUPLICATE_LICENSE_PLATE':
                this.form.controls.licensePlate.setErrors({ server: 'Another car in your company already uses this plate.' });
                this.form.controls.licensePlate.markAsTouched();
                return;
            case 'VALIDATION_FAILED': {
                const unmatched = applyFieldErrors(this.form, failure);
                this.formError.set(unmatched.length ? unmatched.join(' ') : null);
                return;
            }
            default:
                this.formError.set(errorMessage(failure, 'We could not save that car. Please try again.'));
        }
    }
}
