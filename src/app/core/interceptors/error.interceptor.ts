import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { JwtService } from '../services/jwt.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const jwtService = inject(JwtService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        jwtService.destroyToken();
        router.navigate(['/auth/login']);
        toastService.error('Session expired', 'Please log in again.');
      } else if (error.status === 0) {
        toastService.error('Network error', 'Please check your connection.');
      } else if (error.status === 403) {
        toastService.error('Forbidden', 'You do not have permission to perform this action.');
      } else if (error.status === 404) {
        toastService.error('Not found', 'The requested resource was not found.');
      } else if (error.status >= 500) {
        toastService.error('Server error', 'Something went wrong on the server.');
      }

      return throwError(() => error);
    })
  );
};
