import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { EmptyState } from './empty-state';

export interface PlaceholderData {
    icon?: string;
    title: string;
    message: string;
}

/**
 * Stands in for a page that a later phase builds, so the route skeleton, the
 * menu and the breadcrumbs are all real and navigable today. Configured through
 * route `data.placeholder`.
 */
@Component({
    selector: 'app-placeholder-page',
    standalone: true,
    imports: [EmptyState],
    template: `
        <!-- The public shell is full-bleed for the landing hero, so the page brings its own container. -->
        <div class="mx-auto w-full max-w-[1100px] px-6 py-10">
            <div class="card">
                <app-empty-state [icon]="placeholder().icon ?? 'pi pi-compass'" [title]="placeholder().title" [message]="placeholder().message" />
            </div>
        </div>
    `
})
export class PlaceholderPage {
    private route = inject(ActivatedRoute);

    readonly placeholder = toSignal(
        this.route.data.pipe(
            map(
                (data) =>
                    (data['placeholder'] as PlaceholderData | undefined) ?? {
                        title: 'Coming soon',
                        message: 'This page is not built yet.'
                    }
            )
        ),
        {
            initialValue: {
                title: 'Coming soon',
                message: 'This page is not built yet.'
            } as PlaceholderData
        }
    );
}
