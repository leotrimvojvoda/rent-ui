import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { hasErrorCode } from '../errors/api-error';
import { skipErrorToast } from '../http/http-context';
import { CompanyResponse, SaveCompanyRequest } from '../models/company.model';

/**
 * The owner's company, resolved once per session and cached. `GET /companies/me`
 * answers `409 COMPANY_REQUIRED` before a company exists, which is a state — not
 * an error — so it resolves to null rather than failing.
 */
@Injectable({ providedIn: 'root' })
export class CompanyContextService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/companies`;

    private _company = signal<CompanyResponse | null>(null);
    private _resolved = signal(false);
    private inFlight: Observable<CompanyResponse | null> | null = null;

    readonly company = this._company.asReadonly();
    readonly hasCompany = computed(() => this._company() !== null);

    /** Cached lookup used by the owner guards. Hits the API at most once per session. */
    resolve(): Observable<CompanyResponse | null> {
        if (this._resolved()) {
            return of(this._company());
        }
        if (this.inFlight) {
            return this.inFlight;
        }

        this.inFlight = this.http.get<CompanyResponse>(`${this.baseUrl}/me`, { context: skipErrorToast() }).pipe(
            tap((company) => this.set(company)),
            map((company): CompanyResponse | null => company),
            catchError((error) => {
                if (hasErrorCode(error, 'COMPANY_REQUIRED')) {
                    this.markResolved(null);
                    return of(null);
                }
                return throwError(() => error);
            }),
            finalize(() => (this.inFlight = null)),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.inFlight;
    }

    create(request: SaveCompanyRequest): Observable<CompanyResponse> {
        return this.http
            .post<CompanyResponse>(this.baseUrl, request, {
                context: skipErrorToast()
            })
            .pipe(tap((company) => this.set(company)));
    }

    update(request: SaveCompanyRequest): Observable<CompanyResponse> {
        return this.http
            .put<CompanyResponse>(`${this.baseUrl}/me`, request, {
                context: skipErrorToast()
            })
            .pipe(tap((company) => this.set(company)));
    }

    /** Forget the cache so the next guard run asks the server again. */
    invalidate(): void {
        this._resolved.set(false);
        this.inFlight = null;
    }

    clear(): void {
        this._company.set(null);
        this._resolved.set(false);
        this.inFlight = null;
    }

    private set(company: CompanyResponse): void {
        this.markResolved(company);
    }

    private markResolved(company: CompanyResponse | null): void {
        this._company.set(company);
        this._resolved.set(true);
    }
}
