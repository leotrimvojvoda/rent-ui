import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../http/http-context';
import { PageQuery, PageResponse } from '../models/api.model';
import { CreateRentalRequest, RentalResponse, RentalStatus } from '../models/rental.model';

/**
 * The client's own rentals. Every endpoint here is CLIENT-only, and a rental
 * that is not the caller's answers 404 rather than 403 — so a 404 means "not
 * yours or not there", never "deleted".
 */
@Injectable({ providedIn: 'root' })
export class RentalService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/rentals`;

    /** Newest first, optionally narrowed to one status (the API takes one at a time). */
    list(options: PageQuery & { status?: RentalStatus | null } = {}): Observable<PageResponse<RentalResponse>> {
        let params = new HttpParams().set('page', options.page ?? 0).set('size', options.size ?? 20);
        if (options.status) {
            params = params.set('status', options.status);
        }
        return this.http.get<PageResponse<RentalResponse>>(this.baseUrl, { params });
    }

    getById(rentalId: string): Observable<RentalResponse> {
        return this.http.get<RentalResponse>(`${this.baseUrl}/${rentalId}`, { context: skipErrorToast() });
    }

    /**
     * The price is never sent: the server computes it from the car's tiers and
     * snapshots it onto the rental, so later repricing cannot change the deal.
     */
    create(request: CreateRentalRequest): Observable<RentalResponse> {
        return this.http.post<RentalResponse>(this.baseUrl, request, { context: skipErrorToast() });
    }

    /** Allowed while PENDING or APPROVED, up until the pickup time. */
    cancel(rentalId: string): Observable<RentalResponse> {
        return this.http.post<RentalResponse>(`${this.baseUrl}/${rentalId}/cancel`, {}, { context: skipErrorToast() });
    }
}
