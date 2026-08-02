export interface CityResponse {
    id: string;
    name: string;
    /** ISO country code, e.g. `XK`. */
    country: string;
}

/**
 * `CompanyResponse.city` and `PublicCompanyResponse.city` are documented as a
 * `CityResponse` object, but the API.md examples show a plain string. Model both
 * until a live response settles it (see PLAN.md §2, ambiguity 1).
 */
export type CityRef = CityResponse | string;

/** Safe display name for either shape of `CityRef`. */
export function cityName(city: CityRef | null | undefined): string {
    if (!city) {
        return '';
    }
    return typeof city === 'string' ? city : (city.name ?? '');
}

/** `"Prishtinë (XK)"` — the label used in city dropdowns. */
export function cityLabel(city: CityResponse): string {
    return city.country ? `${city.name} (${city.country})` : city.name;
}

/** The city id, when the payload carried the object shape rather than a string. */
export function cityId(city: CityRef | null | undefined): string | null {
    return city && typeof city !== 'string' ? (city.id ?? null) : null;
}
