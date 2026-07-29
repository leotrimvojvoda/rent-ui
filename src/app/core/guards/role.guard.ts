import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JwtService } from '../services/jwt.service';

export function roleGuard(...allowedRoles: string[]): CanActivateFn {
    return () => {
        const jwtService = inject(JwtService);
        const router = inject(Router);

        const roles: string[] = jwtService.getAttribute('roles') || [];
        const hasRole = allowedRoles.some(role => roles.includes(role));

        if (hasRole) {
            return true;
        }

        return router.createUrlTree(['/auth/access']);
    };
}
