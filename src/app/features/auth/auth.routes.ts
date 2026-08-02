import { Routes } from '@angular/router';
import { Access } from './access';
import { Error } from './error';
import { ForgotPassword } from './forgot-password';
import { Login } from './login';
import { Register } from './register';
import { ResetPassword } from './reset-password';
import { VerifyEmail } from './verify-email';

/**
 * Auth screens live outside `AppLayout` and carry their own full-page shell.
 * `email` is handed between them as a query param so nobody retypes it:
 * register → verify-email, login (unverified) → verify-email,
 * forgot-password → reset-password, and both endings → login.
 */
export default [
    { path: 'login', component: Login, data: { breadcrumb: 'Sign in' } },
    { path: 'register', component: Register, data: { breadcrumb: 'Create account' } },
    { path: 'verify-email', component: VerifyEmail, data: { breadcrumb: 'Verify email' } },
    { path: 'forgot-password', component: ForgotPassword, data: { breadcrumb: 'Reset password' } },
    { path: 'reset-password', component: ResetPassword, data: { breadcrumb: 'Set a new password' } },
    { path: 'access', component: Access, data: { breadcrumb: 'Access denied' } },
    { path: 'error', component: Error, data: { breadcrumb: 'Error' } },
    { path: '', pathMatch: 'full', redirectTo: 'login' }
] as Routes;
