import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { CompanyContextService } from '../services/company-context.service';

/**
 * `/cars*` and `/company/rentals*` answer `409 COMPANY_REQUIRED` until the owner
 * has created a company, so every owner route resolves the company once (cached
 * for the session) and bounces to setup when there is none.
 */
export const ownerCompanyGuard: CanActivateFn = () => {
    const companyContext = inject(CompanyContextService);
    const router = inject(Router);

    return companyContext.resolve().pipe(map((company) => (company ? true : router.createUrlTree(['/company/setup']))));
};

/** Setup is only reachable by an owner who has no company yet. */
export const companySetupGuard: CanActivateFn = () => {
    const companyContext = inject(CompanyContextService);
    const router = inject(Router);

    return companyContext.resolve().pipe(map((company) => (company ? router.createUrlTree(['/company']) : true)));
};
