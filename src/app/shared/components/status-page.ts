import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Full-page state shared by 404, access-denied and the generic error page.
 * Same shell as the auth screens so every page outside the app layout reads as
 * one product.
 */
@Component({
    selector: 'app-status-page',
    standalone: true,
    imports: [RouterModule],
    template: `
        <div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
            <div class="w-full max-w-md bg-surface-0 dark:bg-surface-900 rounded-[20px] shadow-[0_16px_40px_rgba(15,40,30,0.12)] dark:shadow-none dark:border dark:border-surface p-10 text-center">
                <a routerLink="/" class="inline-flex items-center gap-2.5 no-underline mb-8">
                    <span class="keyway-logo-mark">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0f4c3a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"></path>
                            <rect x="3" y="11" width="18" height="6" rx="2"></rect>
                            <circle cx="7.5" cy="17" r="1.6" fill="#0f4c3a" stroke="none"></circle>
                            <circle cx="16.5" cy="17" r="1.6" fill="#0f4c3a" stroke="none"></circle>
                        </svg>
                    </span>
                    <span class="font-display font-bold text-xl text-color">{{ appName() }}</span>
                </a>

                <div class="w-14 h-14 mx-auto rounded-2xl bg-primary-50 dark:bg-surface-800 flex items-center justify-center mb-5">
                    <i [class]="icon()" class="text-2xl! text-primary"></i>
                </div>

                @if (code()) {
                    <div class="font-display font-bold text-primary text-sm tracking-[1px] mb-2">{{ code() }}</div>
                }
                <h1 class="font-display font-bold text-2xl text-color m-0 mb-3">{{ title() }}</h1>
                <p class="text-muted-color text-sm leading-relaxed m-0 mb-8">{{ message() }}</p>

                <div class="flex flex-col gap-3">
                    <a [routerLink]="actionLink()" class="keyway-cta w-full no-underline">{{ actionLabel() }}</a>
                    <ng-content />
                </div>
            </div>
        </div>
    `
})
export class StatusPage {
    appName = input<string>('Keyway');
    icon = input<string>('pi pi-exclamation-circle');
    code = input<string>('');
    title = input.required<string>();
    message = input.required<string>();
    actionLabel = input<string>('Browse cars');
    actionLink = input<string>('/');
}
