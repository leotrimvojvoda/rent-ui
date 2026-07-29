import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JwtService } from '../services/jwt.service';

export const authGuard: CanActivateFn = () => {
    const jwtService = inject(JwtService);
    const router = inject(Router);

    if (jwtService.getToken()) {
        return true;
    }

    return router.createUrlTree(['/auth/login']);
};
