import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';

/**
 * Route data this service reads.
 *
 * `breadcrumb` names the page. `breadcrumbParent` exists because several pages
 * are declared as one flat route — `company/rentals/:rentalId` is a single route
 * definition, not a child of `company/rentals` — so the router tree alone cannot
 * produce the trail. Rather than restructure the routes purely for a widget, a
 * detail page names the list it belongs to.
 */
export interface BreadcrumbParent {
    label: string;
    link: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
    private router = inject(Router);

    readonly breadcrumbs = signal<MenuItem[]>([]);

    constructor() {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.breadcrumbs.set(this.build()));
    }

    /**
     * Walks the activated route down its primary outlet, collecting every level
     * that names itself. Levels without a `breadcrumb` — the layout shells — are
     * passed through rather than rendered, which is what keeps the trail short.
     */
    private build(): MenuItem[] {
        const crumbs: MenuItem[] = [];
        let route = this.router.routerState.snapshot.root;
        let url = '';

        while (route.firstChild) {
            route = route.firstChild;

            const segment = route.url.map((part) => part.path).join('/');
            if (segment) {
                url += `/${segment}`;
            }

            const parent = route.data['breadcrumbParent'] as BreadcrumbParent | undefined;
            if (parent) {
                crumbs.push({ label: parent.label, routerLink: parent.link });
            }

            const label = route.data['breadcrumb'] as string | undefined;
            if (label) {
                crumbs.push({ label, routerLink: url || '/' });
            }
        }

        return crumbs;
    }
}
