import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Set on a request whose errors the caller handles itself, so the error
 * interceptor stays quiet even for codes it would normally toast.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function skipErrorToast(context: HttpContext = new HttpContext()): HttpContext {
    return context.set(SKIP_ERROR_TOAST, true);
}
