import { Component, inject } from '@angular/core';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [BreadcrumbModule],
    template: ` <p-breadcrumb [model]="breadcrumbService.breadcrumbs()" [home]="home" styleClass="mb-4 border-none px-0" /> `
})
export class AppBreadcrumb {
    breadcrumbService = inject(BreadcrumbService);

    /**
     * This breadcrumb only ever renders inside the authenticated shell, so "home"
     * is the dashboard. `/` is the public marketing page — signing in and then
     * being sent back out to it is not what a home icon promises.
     */
    home: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard', title: 'Dashboard' };
}
