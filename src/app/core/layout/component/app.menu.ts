import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    templateUrl: './app.menu.html'
})
export class AppMenu {
    private auth = inject(AuthService);

    /** The two personas get different workspaces; ADMIN has no endpoints at all. */
    readonly model = computed<MenuItem[]>(() => {
        const account: MenuItem[] = [
            {
                label: 'Notifications',
                icon: 'pi pi-fw pi-bell',
                routerLink: ['/notifications']
            },
            { label: 'Settings', icon: 'pi pi-fw pi-cog', routerLink: ['/settings'] }
        ];

        switch (this.auth.role()) {
            case 'CLIENT':
                return [
                    {
                        label: 'Renting',
                        items: [
                            {
                                label: 'Dashboard',
                                icon: 'pi pi-fw pi-home',
                                routerLink: ['/dashboard']
                            },
                            {
                                label: 'Browse cars',
                                icon: 'pi pi-fw pi-search',
                                routerLink: ['/cars']
                            },
                            {
                                label: 'My rentals',
                                icon: 'pi pi-fw pi-calendar',
                                routerLink: ['/rentals']
                            }
                        ]
                    },
                    { label: 'Account', items: account }
                ];
            case 'OWNER':
                return [
                    {
                        label: 'Business',
                        items: [
                            {
                                label: 'Dashboard',
                                icon: 'pi pi-fw pi-home',
                                routerLink: ['/dashboard']
                            },
                            {
                                label: 'Company',
                                icon: 'pi pi-fw pi-building',
                                routerLink: ['/company']
                            },
                            {
                                label: 'Fleet',
                                icon: 'pi pi-fw pi-car',
                                routerLink: ['/fleet']
                            },
                            {
                                label: 'Rental requests',
                                icon: 'pi pi-fw pi-inbox',
                                routerLink: ['/company/rentals']
                            }
                        ]
                    },
                    { label: 'Account', items: account }
                ];
            default:
                return [{ label: 'Account', items: account }];
        }
    });
}
