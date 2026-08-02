import { FormBuilder, Validators } from '@angular/forms';
import { CompanyResponse, SaveCompanyRequest } from '../../core/models/company.model';
import { CityResponse, cityId, cityName } from '../../core/models/city.model';

/** Field limits come straight from `SaveCompanyRequest` in API.md. */
export function buildCompanyForm(fb: FormBuilder) {
    return fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        description: ['', [Validators.maxLength(2000)]],
        cityId: ['', [Validators.required]],
        address: ['', [Validators.required, Validators.maxLength(255)]],
        contactEmail: ['', [Validators.required, Validators.email]],
        contactPhone: ['', [Validators.required]]
    });
}

export type CompanyFormValue = ReturnType<typeof buildCompanyForm>['value'];

export function toSaveRequest(value: Required<CompanyFormValue>): SaveCompanyRequest {
    return {
        name: value.name.trim(),
        description: value.description?.trim() ? value.description.trim() : null,
        cityId: value.cityId,
        address: value.address.trim(),
        contactEmail: value.contactEmail.trim(),
        contactPhone: value.contactPhone.trim()
    };
}

/**
 * `CompanyResponse` carries a city but no `cityId`, and the documented shape
 * (an object) disagrees with the examples (a plain string) — see PLAN.md §2,
 * ambiguities 1–2. So the edit form resolves the id from the object when it is
 * there, and otherwise matches the city list by name.
 */
export function resolveCityId(company: CompanyResponse, cities: CityResponse[]): string {
    const fromObject = cityId(company.city);
    if (fromObject) {
        return fromObject;
    }

    const name = cityName(company.city).trim().toLowerCase();
    if (!name) {
        return '';
    }
    return cities.find((city) => city.name.trim().toLowerCase() === name)?.id ?? '';
}
