import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-empty-state',
    standalone: true,
    imports: [RouterModule, ButtonModule],
    template: `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
            <i [class]="icon() + ' text-5xl text-muted-color mb-4'"></i>
            <div class="text-xl font-semibold mb-2">{{ title() }}</div>
            @if (message()) {
                <p class="text-muted-color mb-4 max-w-md">{{ message() }}</p>
            }
            @if (actionLabel()) {
                @if (actionLink()) {
                    <p-button [label]="actionLabel()" [routerLink]="actionLink()" severity="secondary" />
                } @else {
                    <p-button [label]="actionLabel()" (click)="actionClick.emit()" severity="secondary" />
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
