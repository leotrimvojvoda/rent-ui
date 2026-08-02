import { HttpClient, HttpEvent, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../http/http-context';
import { PageQuery, PageResponse } from '../models/api.model';
import { CarImageResponse, CarResponse, CarSummaryResponse, PriceTierRequest, SaveCarRequest } from '../models/car.model';

/** The API accepts JPEG, PNG and WebP only, at up to 10 MB per file. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type UploadProgress = { kind: 'progress'; percent: number } | { kind: 'done'; image: CarImageResponse };

/**
 * The owner's fleet. Every endpoint here answers `409 COMPANY_REQUIRED` until a
 * company exists, which the owner guards resolve before any of these run.
 */
@Injectable({ providedIn: 'root' })
export class CarService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/cars`;

    list(paging: PageQuery = {}): Observable<PageResponse<CarSummaryResponse>> {
        const params = new HttpParams().set('page', paging.page ?? 0).set('size', paging.size ?? 20);
        return this.http.get<PageResponse<CarSummaryResponse>>(this.baseUrl, { params });
    }

    getById(carId: string): Observable<CarResponse> {
        return this.http.get<CarResponse>(`${this.baseUrl}/${carId}`, { context: skipErrorToast() });
    }

    create(request: SaveCarRequest): Observable<CarResponse> {
        return this.http.post<CarResponse>(this.baseUrl, request, { context: skipErrorToast() });
    }

    update(carId: string, request: SaveCarRequest): Observable<CarResponse> {
        return this.http.put<CarResponse>(`${this.baseUrl}/${carId}`, request, { context: skipErrorToast() });
    }

    /**
     * A car that has never been rented is deleted along with its photos; one with
     * rental history is retired and unpublished instead, so past rentals keep
     * naming a real car. Either way it leaves the catalog.
     */
    delete(carId: string): Observable<unknown> {
        return this.http.delete(`${this.baseUrl}/${carId}`, { context: skipErrorToast() });
    }

    publish(carId: string): Observable<CarResponse> {
        return this.http.put<CarResponse>(`${this.baseUrl}/${carId}/publish`, {}, { context: skipErrorToast() });
    }

    unpublish(carId: string): Observable<CarResponse> {
        return this.http.put<CarResponse>(`${this.baseUrl}/${carId}/unpublish`, {}, { context: skipErrorToast() });
    }

    /** Multipart, one file per request — image bytes never travel inside JSON. */
    uploadImage(carId: string, file: File): Observable<UploadProgress> {
        const body = new FormData();
        body.append('file', file);

        return this.http
            .post<CarImageResponse>(`${this.baseUrl}/${carId}/images`, body, {
                context: skipErrorToast(),
                reportProgress: true,
                observe: 'events'
            })
            .pipe(
                map((event: HttpEvent<CarImageResponse>): UploadProgress | null => {
                    if (event.type === HttpEventType.UploadProgress) {
                        return { kind: 'progress', percent: event.total ? Math.round((event.loaded / event.total) * 100) : 0 };
                    }
                    if (event.type === HttpEventType.Response && event.body) {
                        return { kind: 'done', image: event.body };
                    }
                    // Sent and response-header events carry nothing useful here.
                    return null;
                }),
                filter((progress): progress is UploadProgress => progress !== null)
            );
    }

    deleteImage(carId: string, imageId: string): Observable<unknown> {
        return this.http.delete(`${this.baseUrl}/${carId}/images/${imageId}`, { context: skipErrorToast() });
    }

    /** Replaces the whole set at once; an empty array clears the tiers. */
    replacePriceTiers(carId: string, tiers: PriceTierRequest[]): Observable<CarResponse> {
        return this.http.put<CarResponse>(`${this.baseUrl}/${carId}/price-tiers`, { tiers }, { context: skipErrorToast() });
    }
}
