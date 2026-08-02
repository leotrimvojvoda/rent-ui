import { Injectable } from '@angular/core';
import { TokenResponse } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'rent.accessToken';
const REFRESH_TOKEN_KEY = 'rent.refreshToken';

/**
 * Holds the access/refresh pair. Refresh tokens rotate, so both halves are
 * always written together — storing only the access token would strand the
 * session at the next 401.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
    getAccessToken(): string | null {
        return this.read(ACCESS_TOKEN_KEY);
    }

    getRefreshToken(): string | null {
        return this.read(REFRESH_TOKEN_KEY);
    }

    /** True when there is something worth restoring a session from. */
    hasSession(): boolean {
        return this.getAccessToken() !== null || this.getRefreshToken() !== null;
    }

    store(tokens: TokenResponse): void {
        this.write(ACCESS_TOKEN_KEY, tokens.accessToken);
        this.write(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }

    clear(): void {
        this.remove(ACCESS_TOKEN_KEY);
        this.remove(REFRESH_TOKEN_KEY);
    }

    private read(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    private write(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Private browsing or a full quota: the session simply will not survive a reload.
        }
    }

    private remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            // Nothing to do — the key is unreachable either way.
        }
    }
}
