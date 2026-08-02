import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { ToastService } from '../services/toast.service';

/**
 * Endpoints that must go out without a bearer and must never trigger a refresh.
 * `/auth/me` and `/auth/logout` are deliberately absent — those need the token.
 */
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/verify-email', '/auth/resend-verification', '/auth/password-reset/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Assets and anything outside the API are none of this interceptor's business.
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const path = req.url.slice(environment.apiUrl.length);
    if (PUBLIC_AUTH_PATHS.some((publicPath) => path.startsWith(publicPath))) {
        return next(req);
    }

    const tokens = inject(TokenStorageService);
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const sentWith = tokens.getAccessToken();

    return withBearer(req, next, sentWith).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
                return throwError(() => error);
            }

            // Anonymous browsing hitting a protected endpoint: report, never redirect.
            if (!tokens.getRefreshToken()) {
                return throwError(() => error);
            }

            // Another request already refreshed while this one was in flight —
            // replay with the token that landed instead of spending a new one.
            const current = tokens.getAccessToken();
            if (current && current !== sentWith) {
                return withBearer(req, next, current);
            }

            return auth.refresh().pipe(
                switchMap((pair) => withBearer(req, next, pair.accessToken)),
                catchError(() => {
                    // The refresh token was revoked, expired or unknown: the session is over.
                    const returnUrl = router.url;
                    auth.clearSession();
                    toast.info('Session expired', 'Please sign in again to continue.');
                    void router.navigate(['/auth/login'], {
                        queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {}
                    });
                    return throwError(() => error);
                })
            );
        })
    );
};

function withBearer(req: HttpRequest<unknown>, next: (req: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>, token: string | null): Observable<HttpEvent<unknown>> {
    return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
}
