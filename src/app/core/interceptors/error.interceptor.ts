import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { globalToastFor } from '../errors/api-error';
import { SKIP_ERROR_TOAST } from '../http/http-context';
import { ToastService } from '../services/toast.service';

/**
 * The last resort for failures nobody else surfaced. Codes owned by a form or a
 * page (validation, auth branches, business 409s, 404s) stay silent here and are
 * rendered inline by whoever made the call; 401 belongs to the refresh flow in
 * the auth interceptor. Everything left over — network failures, server errors,
 * unknown codes — gets a toast.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const toast = inject(ToastService);

    return next(req).pipe(
        catchError((error: unknown) => {
            if (!req.context.get(SKIP_ERROR_TOAST)) {
                const notice = globalToastFor(error);
                if (notice) {
                    toast.error(notice.summary, notice.detail);
                }
            }
            return throwError(() => error);
        })
    );
};
