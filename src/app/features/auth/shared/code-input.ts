import { Component, ElementRef, QueryList, ViewChildren, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const LENGTH = 6;

/**
 * The six-box verification code input used by verify-email and reset-password.
 * Typing advances, backspace retreats, and pasting a whole code fills every box
 * — people paste these out of an email far more often than they type them.
 */
@Component({
    selector: 'app-code-input',
    standalone: true,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CodeInput), multi: true }],
    template: `
        <div class="flex gap-2 sm:gap-3 justify-between" role="group" [attr.aria-label]="label()">
            @for (index of positions; track index) {
                <input
                    #box
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="1"
                    class="w-full min-w-0 h-14 text-center text-xl font-semibold font-display rounded-xl border-[1.5px] border-surface bg-surface-0 dark:bg-surface-800 text-color outline-none transition-colors focus:border-primary disabled:opacity-60"
                    [attr.aria-label]="'Digit ' + (index + 1)"
                    [value]="digits()[index]"
                    [disabled]="isDisabled()"
                    (input)="onInput(index, $event)"
                    (keydown)="onKeydown(index, $event)"
                    (paste)="onPaste($event)"
                    (focus)="selectAll($event)"
                    (blur)="onTouched()"
                />
            }
        </div>
    `
})
export class CodeInput implements ControlValueAccessor {
    label = input<string>('Verification code');

    readonly positions = Array.from({ length: LENGTH }, (_, index) => index);
    readonly digits = signal<string[]>(Array(LENGTH).fill(''));
    readonly isDisabled = signal(false);

    @ViewChildren('box') private boxes!: QueryList<ElementRef<HTMLInputElement>>;

    private onChange: (value: string) => void = () => {};
    onTouched: () => void = () => {};

    writeValue(value: string | null): void {
        const characters = (value ?? '').replace(/\D/g, '').slice(0, LENGTH).split('');
        this.digits.set(Array.from({ length: LENGTH }, (_, index) => characters[index] ?? ''));
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled.set(isDisabled);
    }

    onInput(index: number, event: Event): void {
        const input = event.target as HTMLInputElement;
        const digit = input.value.replace(/\D/g, '').slice(-1);

        this.setDigit(index, digit);
        // Keep the box in sync when a non-digit was rejected.
        input.value = digit;

        if (digit && index < LENGTH - 1) {
            this.focusBox(index + 1);
        }
    }

    onKeydown(index: number, event: KeyboardEvent): void {
        if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
            // Nothing to delete here — step back and clear that one instead.
            event.preventDefault();
            this.setDigit(index - 1, '');
            this.focusBox(index - 1);
        } else if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            this.focusBox(index - 1);
        } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
            event.preventDefault();
            this.focusBox(index + 1);
        }
    }

    onPaste(event: ClipboardEvent): void {
        const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
        if (!pasted) {
            return;
        }
        event.preventDefault();

        this.writeValue(pasted);
        this.emit();
        this.focusBox(Math.min(pasted.length, LENGTH - 1));
    }

    selectAll(event: Event): void {
        (event.target as HTMLInputElement).select();
    }

    private setDigit(index: number, digit: string): void {
        this.digits.update((digits) => digits.map((current, position) => (position === index ? digit : current)));
        this.emit();
    }

    private emit(): void {
        this.onChange(this.digits().join(''));
    }

    private focusBox(index: number): void {
        const box = this.boxes?.get(index)?.nativeElement;
        box?.focus();
        box?.select();
    }
}
