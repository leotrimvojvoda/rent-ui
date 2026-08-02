import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * The session is restored before the first navigation (see the app initializer),
 * so the signal is authoritative by the time any guard runs. The attempted URL
 * rides along as `returnUrl` so login can send the user back.
 */
export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn()) {
        return true;
    }

    return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
    });
};
