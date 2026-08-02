import { Routes } from '@angular/router';
import { appShellMatch } from './core/guards/app-shell.guard';
import { authGuard } from './core/guards/auth.guard';
import { companySetupGuard, ownerCompanyGuard } from './core/guards/company.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppLayout } from './core/layout/component/app.layout';
import { AppPublicLayout } from './core/layout/component/app.publiclayout';
import { Dashboard } from './features/dashboard/dashboard';
import { Home } from './features/home/home';
import { Notfound } from './features/notfound/notfound';
import { Settings } from './features/settings/settings';
import { PlaceholderPage } from './shared/components/placeholder-page';

/** Pages later phases replace; the routes, menu and breadcrumbs are real today. */
const soon = (title: string, message: string, icon: string) => ({
    placeholder: { title, message, icon }
});

export const appRoutes: Routes = [
    {
        // Authenticated workspace. `canMatch` claims only its own top-level
        // segments so the public site below can own everything else.
        path: '',
        component: AppLayout,
        canMatch: [appShellMatch],
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: Dashboard,
                data: { breadcrumb: 'Dashboard' }
            },

            // Client
            {
                path: 'rentals',
                component: PlaceholderPage,
                canActivate: [roleGuard('CLIENT')],
                data: {
                    breadcrumb: 'My rentals',
                    ...soon('My rentals', 'Your bookings and their status will appear here.', 'pi pi-calendar')
                }
            },

            // Owner
            {
                path: 'company/setup',
                component: PlaceholderPage,
                canActivate: [roleGuard('OWNER'), companySetupGuard],
                data: {
                    breadcrumb: 'Company setup',
                    ...soon('Create your company', 'Set up your company to start listing cars.', 'pi pi-building')
                }
            },
            {
                path: 'company/rentals',
                component: PlaceholderPage,
                canActivate: [roleGuard('OWNER'), ownerCompanyGuard],
                data: {
                    breadcrumb: 'Rental requests',
                    ...soon('Rental requests', 'Requests for your cars will be reviewed here.', 'pi pi-inbox')
                }
            },
            {
                path: 'company',
                component: PlaceholderPage,
                canActivate: [roleGuard('OWNER'), ownerCompanyGuard],
                data: {
                    breadcrumb: 'Company',
                    ...soon('Company profile', 'Your company details will be editable here.', 'pi pi-building')
                }
            },
            {
                path: 'fleet',
                component: PlaceholderPage,
                canActivate: [roleGuard('OWNER'), ownerCompanyGuard],
                data: {
                    breadcrumb: 'Fleet',
                    ...soon('Your fleet', 'Cars, photos, price tiers and publishing will live here.', 'pi pi-car')
                }
            },

            // Shared
            {
                path: 'notifications',
                component: PlaceholderPage,
                data: {
                    breadcrumb: 'Notifications',
                    ...soon('Notifications', 'Everything that happened to your rentals, in one list.', 'pi pi-bell')
                }
            },
            {
                path: 'settings',
                component: Settings,
                data: { breadcrumb: 'Settings' }
            }
        ]
    },

    { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
    { path: 'notfound', component: Notfound },

    {
        // Public site — no auth, no guard.
        path: '',
        component: AppPublicLayout,
        children: [
            { path: '', component: Home, data: { breadcrumb: 'Home' } },
            {
                path: 'cars',
                component: PlaceholderPage,
                data: {
                    breadcrumb: 'Browse cars',
                    ...soon('Browse cars', 'The public catalog with search, filters and availability lands in Phase 3.', 'pi pi-search')
                }
            },
            {
                path: 'cars/:carId',
                component: PlaceholderPage,
                data: {
                    breadcrumb: 'Car',
                    ...soon('Car detail', 'Photos, pricing tiers and booking land in Phase 3.', 'pi pi-car')
                }
            }
        ]
    },

    { path: '**', redirectTo: '/notfound' }
];
