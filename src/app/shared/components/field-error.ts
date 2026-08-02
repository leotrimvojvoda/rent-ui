import { Component, computed, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { serverErrorOf } from '../../core/forms/server-errors';

const DEFAULT_MESSAGES: Record<string, string> = {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    minlength: 'This is too short.',
    maxlength: 'This is too long.',
    mismatch: 'These do not match.'
};

/**
 * One line of validation copy under a field. The server's message always wins
 * over a client validator — it knows the real rule.
 */
@Component({
    selector: 'app-field-error',
    standalone: true,
    template: `
        @if (message(); as text) {
            <p class="mt-1.5 mb-0 text-xs text-red-600 dark:text-red-400">{{ text }}</p>
        }
    `
})
export class FieldError {
    control = input.required<AbstractControl | null>();
    /** Per-field overrides, keyed by validator name. */
    messages = input<Record<string, string>>({});

    readonly message = computed(() => {
        const control = this.control();
        if (!control || !control.errors || !(control.touched || control.dirty)) {
            return null;
        }

        const fromServer = serverErrorOf(control);
        if (fromServer) {
            return fromServer;
        }

        const overrides = this.messages();
        const key = Object.keys(control.errors).find((name) => name !== 'server');
        return key ? (overrides[key] ?? DEFAULT_MESSAGES[key] ?? 'This value is not valid.') : null;
    });
}
