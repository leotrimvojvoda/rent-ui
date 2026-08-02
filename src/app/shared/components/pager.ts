import { Component, computed, input, output } from '@angular/core';
import { PaginatorModule } from 'primeng/paginator';

/**
 * Pager bound to the backend's page envelope. `page` is 0-based on both sides,
 * matching the API, so nothing has to translate between the two.
 */
@Component({
    selector: 'app-pager',
    standalone: true,
    imports: [PaginatorModule],
    template: `
        @if (totalPages() > 1) {
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8">
                <span class="text-sm text-muted-color order-2 sm:order-1"> Showing {{ firstShown() }}–{{ lastShown() }} of {{ totalElements() }} </span>
                <p-paginator
                    class="order-1 sm:order-2"
                    [first]="page() * size()"
                    [rows]="size()"
                    [totalRecords]="totalElements()"
                    [showFirstLastIcon]="totalPages() > 3"
                    (onPageChange)="pageChange.emit($event.page ?? 0)"
                    styleClass="bg-transparent p-0"
                />
            </div>
        }
    `
})
export class Pager {
    page = input.required<number>();
    size = input.required<number>();
    totalElements = input.required<number>();
    totalPages = input.required<number>();

    pageChange = output<number>();

    readonly firstShown = computed(() => (this.totalElements() === 0 ? 0 : this.page() * this.size() + 1));
    readonly lastShown = computed(() => Math.min((this.page() + 1) * this.size(), this.totalElements()));
}
