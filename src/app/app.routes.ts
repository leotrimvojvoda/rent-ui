import { Routes } from '@angular/router';
import { appShellMatch } from './core/guards/app-shell.guard';
import { authGuard } from './core/guards/auth.guard';
import { companySetupGuard, ownerCompanyGuard } from './core/guards/company.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppLayout } from './core/layout/component/app.layout';
import { AppPublicLayout } from './core/layout/component/app.publiclayout';
import { CarDetail } from './features/catalog/car-detail';
import { Catalog } from './features/catalog/catalog';
import { CompanyProfile } from './features/company/company-profile';
import { CompanySetup } from './features/company/company-setup';
import { CarEdit } from './features/fleet/car-edit';
import { Fleet } from './features/fleet/fleet';
import { Booking } from './features/rentals/booking';
import { RentalDetail } from './features/rentals/rental-detail';
import { Rentals } from './features/rentals/rentals';
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
            { path: 'rentals', component: Rentals, canActivate: [roleGuard('CLIENT')], data: { breadcrumb: 'My rentals' } },
            { path: 'rentals/:rentalId', component: RentalDetail, canActivate: [roleGuard('CLIENT')], data: { breadcrumb: 'Rental' } },

            // Owner
            {
                path: 'company/setup',
                component: CompanySetup,
                canActivate: [roleGuard('OWNER'), companySetupGuard],
                data: { breadcrumb: 'Company setup' }
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
                component: CompanyProfile,
                canActivate: [roleGuard('OWNER'), ownerCompanyGuard],
                data: { breadcrumb: 'Company' }
            },
            { path: 'fleet', component: Fleet, canActivate: [roleGuard('OWNER'), ownerCompanyGuard], data: { breadcrumb: 'Fleet' } },
            { path: 'fleet/new', component: CarEdit, canActivate: [roleGuard('OWNER'), ownerCompanyGuard], data: { breadcrumb: 'Add a car' } },
            { path: 'fleet/:carId', component: CarEdit, canActivate: [roleGuard('OWNER'), ownerCompanyGuard], data: { breadcrumb: 'Edit car' } },

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
            { path: 'cars', component: Catalog, data: { breadcrumb: 'Browse cars' } },
            {
                // Booking is CLIENT-only, so this route is guarded even though it
                // sits under the public shell alongside the car it books.
                path: 'cars/:carId/book',
                component: Booking,
                canActivate: [authGuard, roleGuard('CLIENT')],
                data: { breadcrumb: 'Request booking' }
            },
            { path: 'cars/:carId', component: CarDetail, data: { breadcrumb: 'Car' } }
        ]
    },

    { path: '**', redirectTo: '/notfound' }
];
