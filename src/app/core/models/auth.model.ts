import { SignupRole } from './user.model';

/**
 * Access tokens last ~15 minutes. Refresh tokens rotate — the presented one is
 * revoked on use, so the whole pair must be stored every time.
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresInSeconds: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: SignupRole;
}

/** Body of `/auth/resend-verification` and `/auth/password-reset/request`. */
export interface EmailRequest {
    email: string;
}

export interface VerifyEmailRequest {
    email: string;
    code: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface PasswordResetConfirmRequest {
    email: string;
    code: string;
    newPassword: string;
}
