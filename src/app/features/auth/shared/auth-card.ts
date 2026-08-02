import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

/**
 * The shell every auth screen sits in: cream ground, one card, brand logo mark,
 * Sora heading, muted subline. Keeping it here is what stops the five screens
 * drifting apart (PLAN.md §3.3).
 */
@Component({
    selector: 'app-auth-card',
    standalone: true,
    imports: [RouterModule],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
            <div class="w-full bg-surface-0 dark:bg-surface-900 rounded-[20px] shadow-[0_16px_40px_rgba(15,40,30,0.12)] dark:shadow-none dark:border dark:border-surface p-6 sm:p-10" [class]="widthClass()">
                <div class="text-center mb-8">
                    <a routerLink="/" class="inline-flex items-center gap-2.5 no-underline mb-7">
                        <span class="keyway-logo-mark">
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0f4c3a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"></path>
                                <rect x="3" y="11" width="18" height="6" rx="2"></rect>
                                <circle cx="7.5" cy="17" r="1.6" fill="#0f4c3a" stroke="none"></circle>
                                <circle cx="16.5" cy="17" r="1.6" fill="#0f4c3a" stroke="none"></circle>
                            </svg>
                        </span>
                        <span class="font-display font-bold text-xl text-color">{{ appName }}</span>
                    </a>

                    <h1 class="font-display font-bold text-2xl text-color m-0 mb-2">{{ heading() }}</h1>
                    @if (subheading()) {
                        <p class="text-muted-color text-sm m-0 leading-relaxed">{{ subheading() }}</p>
                    }
                </div>

                <ng-content />
            </div>
        </div>
    `
})
export class AuthCard {
    readonly appName = environment.appName;

    heading = input.required<string>();
    subheading = input<string>('');
    /** Register needs two columns; everything else is a single narrow column. */
    widthClass = input<string>('max-w-md');
}
