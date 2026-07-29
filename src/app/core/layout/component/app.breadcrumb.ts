import { Component, inject } from '@angular/core';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [BreadcrumbModule],
    template: `
        <p-breadcrumb [model]="breadcrumbService.breadcrumbs()" [home]="home" styleClass="mb-4 border-none px-0" />
    `
})
export class AppBreadcrumb {
    breadcrumbService = inject(BreadcrumbService);

    home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
}
