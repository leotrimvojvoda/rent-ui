import { CityRef } from './city.model';

/** Owner's own company — `GET/POST/PUT /companies*`. */
export interface CompanyResponse {
    id: string;
    name: string;
    description: string | null;
    city: CityRef;
    address: string;
    contactEmail: string;
    contactPhone: string;
    createdAt: string;
}

/**
 * Body of `POST /companies` and `PUT /companies/me`. Note the asymmetry:
 * responses carry a city (name or object), requests require a `cityId`, so the
 * edit form resolves the current city against `GET /cities`.
 */
export interface SaveCompanyRequest {
    name: string;
    description?: string | null;
    cityId: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
}

/** Company block on public catalog DTOs — never carries contact details. */
export interface PublicCompanyResponse {
    id: string;
    name: string;
    description: string | null;
    city: CityRef;
    address: string;
}

/** Company block on a client's own rental — this is where contact details appear. */
export interface RentalCompanyResponse {
    id: string;
    name: string;
    city: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
}
