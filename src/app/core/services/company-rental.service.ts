import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../http/http-context';
import { PageQuery, PageResponse } from '../models/api.model';
import { CompanyRentalResponse, RentalAction, RentalStatus } from '../models/rental.model';

/**
 * Rentals of the current owner's cars. Every endpoint is OWNER-only and scoped
 * to the caller's own company, so a 404 means "not one of your rentals" — the
 * same shape as the client side, just from the other end of the booking.
 *
 * The four actions share one URL pattern and one response, so they share one
 * method: the caller passes the transition it wants and gets the rental back.
 */
@Injectable({ providedIn: 'root' })
export class CompanyRentalService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/company/rentals`;

    /** Newest first, optionally narrowed to one status (the API takes one at a time). */
    list(options: PageQuery & { status?: RentalStatus | null } = {}): Observable<PageResponse<CompanyRentalResponse>> {
        let params = new HttpParams().set('page', options.page ?? 0).set('size', options.size ?? 20);
        if (options.status) {
            params = params.set('status', options.status);
        }
        return this.http.get<PageResponse<CompanyRentalResponse>>(this.baseUrl, { params });
    }

    getById(rentalId: string): Observable<CompanyRentalResponse> {
        return this.http.get<CompanyRentalResponse>(`${this.baseUrl}/${rentalId}`, { context: skipErrorToast() });
    }

    /**
     * `approve` | `reject` | `activate` | `complete`. Errors stay untoasted
     * because a rejected transition means the caller's copy is stale, and the
     * page that asked is the only place that can say so usefully and refetch.
     */
    act(rentalId: string, action: RentalAction): Observable<CompanyRentalResponse> {
        return this.http.post<CompanyRentalResponse>(`${this.baseUrl}/${rentalId}/${action}`, {}, { context: skipErrorToast() });
    }
}
