import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-empty-state',
    standalone: true,
    imports: [RouterModule],
    template: `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-surface-800 flex items-center justify-center mb-5">
                <i [class]="icon()" class="text-2xl! text-primary"></i>
            </div>
            <div class="font-display text-lg font-bold mb-2">{{ title() }}</div>
            @if (message()) {
                <p class="text-muted-color text-sm mb-5 max-w-md leading-relaxed">{{ message() }}</p>
            }
            @if (actionLabel()) {
                @if (actionLink()) {
                    <a [routerLink]="actionLink()" class="keyway-cta no-underline">{{ actionLabel() }}</a>
                } @else {
                    <button type="button" class="keyway-cta" (click)="actionClick.emit()">{{ actionLabel() }}</button>
                }
            }
        </div>
    `
})
export class EmptyState {
    icon = input<string>('pi pi-inbox');
    title = input<string>('Nothing here yet');
    message = input<string>('');
    actionLabel = input<string>('');
    actionLink = input<string>('');

    actionClick = output<void>();
}
