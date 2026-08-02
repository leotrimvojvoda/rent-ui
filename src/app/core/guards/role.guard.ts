import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Role comes from `GET /auth/me` via the current-user signal, not from decoded
 * JWT claims. A signed-out user is sent to login (with a return URL); a signed-in
 * user with the wrong role gets the access-denied page.
 */
export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
    return (_route, state) => {
        const auth = inject(AuthService);
        const router = inject(Router);

        const role = auth.role();
        if (!role) {
            return router.createUrlTree(['/auth/login'], {
                queryParams: { returnUrl: state.url }
            });
        }

        return allowedRoles.includes(role) ? true : router.createUrlTree(['/auth/access']);
    };
}
