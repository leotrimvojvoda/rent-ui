import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../http/http-context';
import { MessageResponse } from '../models/api.model';
import { EmailRequest, LoginRequest, PasswordResetConfirmRequest, SignupRequest, TokenResponse, VerifyEmailRequest } from '../models/auth.model';
import { UserResponse } from '../models/user.model';
import { CompanyContextService } from './company-context.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private tokens = inject(TokenStorageService);
    private companyContext = inject(CompanyContextService);
    private readonly baseUrl = `${environment.apiUrl}/auth`;

    private _currentUser = signal<UserResponse | null>(null);

    /**
     * Identity comes from `GET /auth/me`, never from decoded JWT claims — claim
     * names are not part of the documented contract.
     */
    readonly currentUser = this._currentUser.asReadonly();
    readonly isLoggedIn = computed(() => this._currentUser() !== null);
    readonly role = computed(() => this._currentUser()?.role ?? null);
    readonly isClient = computed(() => this.role() === 'CLIENT');
    readonly isOwner = computed(() => this.role() === 'OWNER');
    readonly displayName = computed(() => {
        const user = this._currentUser();
        return user ? `${user.firstName} ${user.lastName}`.trim() : '';
    });

    /** Guards the single-flight refresh: concurrent 401s all wait on this one call. */
    private refreshInFlight: Observable<TokenResponse> | null = null;

    /**
     * Runs before the first navigation. A stored pair restores the session; a
     * dead one is discarded quietly so the app still boots logged out.
     */
    async initialize(): Promise<void> {
        if (!this.tokens.hasSession()) {
            return;
        }
        try {
            await firstValueFrom(this.loadCurrentUser());
        } catch {
            this.clearSession();
        }
    }

    loadCurrentUser(): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${this.baseUrl}/me`, { context: skipErrorToast() }).pipe(tap((user) => this._currentUser.set(user)));
    }

    /** Stores the token pair, then resolves the identity behind it. */
    login(request: LoginRequest): Observable<UserResponse> {
        return this.http
            .post<TokenResponse>(`${this.baseUrl}/login`, request, {
                context: skipErrorToast()
            })
            .pipe(
                tap((tokens) => this.tokens.store(tokens)),
                switchMap(() => this.loadCurrentUser())
            );
    }

    /** Always 202 with an identical body — the response cannot reveal whether the email was new. */
    signup(request: SignupRequest): Observable<MessageResponse> {
        return this.http.post<MessageResponse>(`${this.baseUrl}/signup`, request, {
            context: skipErrorToast()
        });
    }

    /** Verification does not sign the user in; the caller routes to login afterwards. */
    verifyEmail(request: VerifyEmailRequest): Observable<MessageResponse> {
        return this.http.post<MessageResponse>(`${this.baseUrl}/verify-email`, request, { context: skipErrorToast() });
    }

    /** Sending a fresh code invalidates the previous one. */
    resendVerification(email: string): Observable<MessageResponse> {
        const body: EmailRequest = { email };
        return this.http.post<MessageResponse>(`${this.baseUrl}/resend-verification`, body, { context: skipErrorToast() });
    }

    requestPasswordReset(email: string): Observable<MessageResponse> {
        const body: EmailRequest = { email };
        return this.http.post<MessageResponse>(`${this.baseUrl}/password-reset/request`, body, { context: skipErrorToast() });
    }

    /** Confirming revokes every refresh token, so the user must sign in again. */
    confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<MessageResponse> {
        return this.http.post<MessageResponse>(`${this.baseUrl}/password-reset/confirm`, request, { context: skipErrorToast() });
    }

    /**
     * One refresh per burst: every caller that arrives while a refresh is in
     * flight gets the same observable, so a rotating token is never spent twice.
     */
    refresh(): Observable<TokenResponse> {
        if (this.refreshInFlight) {
            return this.refreshInFlight;
        }

        const refreshToken = this.tokens.getRefreshToken();
        if (!refreshToken) {
            return throwError(
                () =>
                    new HttpErrorResponse({
                        status: 401,
                        statusText: 'No refresh token'
                    })
            );
        }

        this.refreshInFlight = this.http.post<TokenResponse>(`${this.baseUrl}/refresh`, { refreshToken }, { context: skipErrorToast() }).pipe(
            tap((tokens) => this.tokens.store(tokens)),
            finalize(() => (this.refreshInFlight = null)),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.refreshInFlight;
    }

    /**
     * Best-effort: `POST /auth/logout` revokes every refresh token server-side,
     * but the local session is cleared either way.
     */
    logout(): Observable<void> {
        const request = this.tokens.getAccessToken() ? this.http.post<void>(`${this.baseUrl}/logout`, {}, { context: skipErrorToast() }).pipe(catchError(() => of(void 0))) : of(void 0);

        return request.pipe(tap(() => this.clearSession()));
    }

    /** Drops tokens and every piece of session-scoped state. */
    clearSession(): void {
        this.tokens.clear();
        this._currentUser.set(null);
        this.companyContext.clear();
        this.refreshInFlight = null;
    }
}
