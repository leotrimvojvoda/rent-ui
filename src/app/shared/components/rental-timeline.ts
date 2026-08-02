import { Component, computed, input } from '@angular/core';
import { RentalStatus } from '../../core/models/rental.model';
import { STATUS_LABELS } from './rental-status-badge';

type StepState = 'done' | 'current' | 'upcoming' | 'dead';

interface TimelineStep {
    label: string;
    state: StepState;
}

/** The one path a rental takes when nothing goes wrong. */
const LIVE_PATH: { status: RentalStatus; label: string }[] = [
    { status: 'PENDING', label: 'Requested' },
    { status: 'APPROVED', label: 'Approved' },
    { status: 'ACTIVE', label: 'Picked up' },
    { status: 'COMPLETED', label: 'Returned' }
];

const DEAD_ENDS: RentalStatus[] = ['REJECTED', 'CANCELLED', 'EXPIRED'];

/**
 * Where a rental has got to. The live path is four steps; the three dead ends
 * get their own short path instead.
 *
 * A dead end deliberately shows only "Requested → Rejected/Cancelled/Expired"
 * and never fills in the middle: a rental can be cancelled from either PENDING
 * or APPROVED, and the status alone cannot tell us which, so drawing "Approved"
 * as reached would be a guess. Two honest steps beat four confident ones.
 */
@Component({
    selector: 'app-rental-timeline',
    standalone: true,
    template: `
        <ol class="flex items-start list-none m-0 p-0" [attr.aria-label]="'Rental progress: ' + currentLabel()">
            @for (step of steps(); track step.label; let i = $index; let last = $last) {
                <li class="flex-1 flex flex-col items-center text-center min-w-0" [attr.aria-current]="step.state === 'current' ? 'step' : null">
                    <div class="flex items-center w-full">
                        <span class="h-0.5 flex-1" [class]="i === 0 ? 'bg-transparent' : connectorClass(step)"></span>
                        <span class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2" [class]="dotClass(step)">
                            @if (step.state === 'done' || step.state === 'current') {
                                <i class="pi pi-check text-[9px]"></i>
                            } @else if (step.state === 'dead') {
                                <i class="pi pi-times text-[9px]"></i>
                            }
                        </span>
                        <span class="h-0.5 flex-1" [class]="last ? 'bg-transparent' : connectorClass(nextStep(i))"></span>
                    </div>
                    <span class="mt-2 text-[11px] sm:text-xs leading-tight px-0.5" [class]="labelClass(step)">{{ step.label }}</span>
                </li>
            }
        </ol>
    `
})
export class RentalTimeline {
    status = input.required<RentalStatus>();

    readonly currentLabel = computed(() => STATUS_LABELS[this.status()] ?? this.status());

    readonly steps = computed<TimelineStep[]>(() => {
        const status = this.status();

        if (DEAD_ENDS.includes(status)) {
            return [
                { label: 'Requested', state: 'done' },
                { label: STATUS_LABELS[status] ?? status, state: 'dead' }
            ];
        }

        const reached = LIVE_PATH.findIndex((step) => step.status === status);
        return LIVE_PATH.map((step, index) => ({
            label: step.label,
            state: index < reached ? 'done' : index === reached ? 'current' : 'upcoming'
        }));
    });

    nextStep(index: number): TimelineStep {
        return this.steps()[index + 1] ?? this.steps()[index];
    }

    dotClass(step: TimelineStep): string {
        switch (step.state) {
            case 'done':
                return 'bg-primary border-primary text-primary-contrast';
            case 'current':
                return 'bg-primary border-primary text-primary-contrast ring-4 ring-primary/15';
            case 'dead':
                return 'bg-surface-300 border-surface-300 text-surface-0 dark:bg-surface-700 dark:border-surface-700';
            default:
                return 'bg-surface-0 border-surface dark:bg-surface-900';
        }
    }

    /** The line leading into a step is only filled once that step is reached. */
    connectorClass(step: TimelineStep): string {
        return step.state === 'done' || step.state === 'current' ? 'bg-primary' : 'bg-surface-200 dark:bg-surface-700';
    }

    labelClass(step: TimelineStep): string {
        switch (step.state) {
            case 'current':
                return 'font-semibold text-color';
            case 'done':
                return 'text-color';
            case 'dead':
                return 'font-semibold text-muted-color';
            default:
                return 'text-muted-color';
        }
    }
}
