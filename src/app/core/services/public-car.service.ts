import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../http/http-context';
import { PageQuery, PageResponse } from '../models/api.model';
import { PublicCarDetailResponse, PublicCarFilterRequest, PublicCarSummaryResponse } from '../models/car.model';

/**
 * The public catalog: no auth required. Only cars that are both published and
 * ACTIVE are visible, so anything hidden reads as a 404 rather than a 403.
 */
@Injectable({ providedIn: 'root' })
export class PublicCarService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/public/cars`;

    /**
     * Filters travel in the body, paging in the query string.
     *
     * @param silent pass true where a failure is handled in-page (the landing
     *        page just hides its "popular" band) so the global toast stays quiet.
     */
    search(filter: PublicCarFilterRequest = {}, paging: PageQuery = {}, silent = false): Observable<PageResponse<PublicCarSummaryResponse>> {
        const params = new HttpParams().set('page', paging.page ?? 0).set('size', paging.size ?? 20);
        return this.http.post<PageResponse<PublicCarSummaryResponse>>(`${this.baseUrl}/filter`, pruneFilter(filter), {
            params,
            ...(silent ? { context: skipErrorToast() } : {})
        });
    }

    getById(carId: string): Observable<PublicCarDetailResponse> {
        return this.http.get<PublicCarDetailResponse>(`${this.baseUrl}/${carId}`);
    }
}

/** Empty values must be dropped, not sent as nulls the server would reject. */
function pruneFilter(filter: PublicCarFilterRequest): PublicCarFilterRequest {
    return Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== null && value !== undefined && value !== ''));
}
