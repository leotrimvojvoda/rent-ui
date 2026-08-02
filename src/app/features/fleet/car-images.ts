import { Component, inject, input, output, signal } from '@angular/core';
import { errorCodeOf, errorMessage } from '../../core/errors/api-error';
import { CarImageResponse } from '../../core/models/car.model';
import { ACCEPTED_IMAGE_TYPES, CarService, MAX_IMAGE_BYTES } from '../../core/services/car.service';
import { ConfirmDialogService } from '../../core/services/confirmation.service';

interface UploadJob {
    name: string;
    percent: number;
    error?: string;
}

@Component({
    selector: 'app-car-images',
    standalone: true,
    templateUrl: './car-images.html'
})
export class CarImages {
    private carService = inject(CarService);
    private confirmDialog = inject(ConfirmDialogService);

    carId = input.required<string>();
    images = input.required<CarImageResponse[]>();

    /** Emits the new image list whenever it changes, so the page stays in sync. */
    imagesChange = output<CarImageResponse[]>();

    readonly jobs = signal<UploadJob[]>([]);
    readonly uploading = signal(false);
    readonly error = signal<string | null>(null);

    readonly acceptAttribute = ACCEPTED_IMAGE_TYPES.join(',');

    /** Lowest position is what the catalog shows; there is no reorder endpoint. */
    sorted(): CarImageResponse[] {
        return [...this.images()].sort((a, b) => a.position - b.position);
    }

    onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        input.value = '';

        if (files.length) {
            void this.uploadAll(files);
        }
    }

    async remove(image: CarImageResponse): Promise<void> {
        const confirmed = await this.confirmDialog.confirm({
            header: 'Delete this photo?',
            message: 'It is removed from the catalog and from storage. This cannot be undone.',
            acceptLabel: 'Delete photo',
            rejectLabel: 'Keep it',
            icon: 'pi pi-exclamation-triangle'
        });
        if (!confirmed) {
            return;
        }

        this.carService.deleteImage(this.carId(), image.id).subscribe({
            next: () => this.imagesChange.emit(this.images().filter((current) => current.id !== image.id)),
            error: (failure) => this.error.set(errorMessage(failure, 'We could not delete that photo.'))
        });
    }

    /** One file per request, and one at a time so progress stays meaningful. */
    private async uploadAll(files: File[]): Promise<void> {
        this.error.set(null);
        this.uploading.set(true);
        this.jobs.set(files.map((file) => ({ name: file.name, percent: 0 })));

        const uploaded: CarImageResponse[] = [];

        for (const [index, file] of files.entries()) {
            const rejection = this.preCheck(file);
            if (rejection) {
                this.updateJob(index, { error: rejection });
                continue;
            }

            try {
                const image = await this.uploadOne(index, file);
                uploaded.push(image);
            } catch (failure) {
                this.updateJob(index, { error: this.uploadErrorMessage(failure) });
            }
        }

        this.uploading.set(false);
        if (uploaded.length) {
            this.imagesChange.emit([...this.images(), ...uploaded]);
        }
        // Successful jobs disappear; failed ones stay so the reason is readable.
        this.jobs.update((jobs) => jobs.filter((job) => job.error));
    }

    private uploadOne(index: number, file: File): Promise<CarImageResponse> {
        return new Promise((resolve, reject) => {
            this.carService.uploadImage(this.carId(), file).subscribe({
                next: (progress) => {
                    if (progress.kind === 'progress') {
                        this.updateJob(index, { percent: progress.percent });
                    } else {
                        this.updateJob(index, { percent: 100 });
                        resolve(progress.image);
                    }
                },
                error: reject
            });
        });
    }

    /** Catches the two rejections we can see coming, before spending the upload. */
    private preCheck(file: File): string | null {
        if (file.size === 0) {
            return 'That file is empty.';
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            return 'Only JPEG, PNG and WebP images are accepted.';
        }
        if (file.size > MAX_IMAGE_BYTES) {
            return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 10 MB.`;
        }
        return null;
    }

    private uploadErrorMessage(failure: unknown): string {
        switch (errorCodeOf(failure)) {
            case 'UNSUPPORTED_IMAGE_TYPE':
                return 'Only JPEG, PNG and WebP images are accepted.';
            case 'EMPTY_UPLOAD':
                return 'That file was empty.';
            case 'PAYLOAD_TOO_LARGE':
                return 'That file is over the 10 MB limit.';
            case 'STORAGE_UNAVAILABLE':
                return 'The image service is unavailable. Nothing was saved — try again.';
            default:
                return errorMessage(failure, 'That upload failed.');
        }
    }

    private updateJob(index: number, patch: Partial<UploadJob>): void {
        this.jobs.update((jobs) => jobs.map((job, position) => (position === index ? { ...job, ...patch } : job)));
    }
}
