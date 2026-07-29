import { Routes } from '@angular/router';
import { AppLayout } from './core/layout/component/app.layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Notfound } from './features/notfound/notfound';
import { Profile } from './features/profile/profile';
import { Settings } from './features/settings/settings';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', component: Dashboard, data: { breadcrumb: 'Home' } },
            { path: 'profile', component: Profile, data: { breadcrumb: 'Profile' } },
            { path: 'settings', component: Settings, data: { breadcrumb: 'Settings' } }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
