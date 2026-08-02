import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../http/http-context';
import { CityResponse } from '../models/city.model';

/** Cities are public reference data that barely changes — fetch once, share. */
@Injectable({ providedIn: 'root' })
export class CityService {
    private http = inject(HttpClient);
    private cities$?: Observable<CityResponse[]>;

    /**
     * @param silent pass true where a failure is handled in-page (the landing
     *        search bar simply shows no cities) so the global toast stays quiet.
     */
    list(silent = false): Observable<CityResponse[]> {
        this.cities$ ??= this.http.get<CityResponse[]>(`${environment.apiUrl}/cities`, silent ? { context: skipErrorToast() } : {}).pipe(
            // Without this a single failure would be replayed to every later
            // caller for the rest of the session.
            catchError((error) => {
                this.cities$ = undefined;
                return throwError(() => error);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );
        return this.cities$;
    }
}
