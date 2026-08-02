import { DestroyRef, Signal, computed, inject, signal } from '@angular/core';

export interface Countdown {
    /** Seconds left, 0 when idle. */
    readonly seconds: Signal<number>;
    readonly active: Signal<boolean>;
    /** `"1:05"` / `"45s"` — ready for inline copy. */
    readonly label: Signal<string>;
    start(seconds: number): void;
    stop(): void;
}

/**
 * A ticking countdown for the two places auth screens need one: the `429`
 * `Retry-After` window, and the local cooldown between "resend code" clicks.
 * Call from an injection context — the interval is cleared on destroy.
 */
export function createCountdown(): Countdown {
    const remaining = signal(0);
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
        if (timer) {
            clearInterval(timer);
            timer = undefined;
        }
    };

    const start = (seconds: number) => {
        stop();
        const initial = Math.max(0, Math.ceil(seconds));
        remaining.set(initial);
        if (initial === 0) {
            return;
        }
        timer = setInterval(() => {
            remaining.update((value) => Math.max(0, value - 1));
            if (remaining() === 0) {
                stop();
            }
        }, 1000);
    };

    inject(DestroyRef).onDestroy(stop);

    return {
        seconds: remaining.asReadonly(),
        active: computed(() => remaining() > 0),
        label: computed(() => {
            const value = remaining();
            if (value >= 60) {
                const minutes = Math.floor(value / 60);
                return `${minutes}:${String(value % 60).padStart(2, '0')}`;
            }
            return `${value}s`;
        }),
        start,
        stop
    };
}
