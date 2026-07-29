import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
    constructor(private readonly title: Title) {
        super();
    }

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const breadcrumb = this.findDeepestBreadcrumb(snapshot.root);
        const appName = environment.appName;

        if (breadcrumb && breadcrumb !== 'Home') {
            this.title.setTitle(`${breadcrumb} | ${appName}`);
        } else {
            this.title.setTitle(appName);
        }
    }

    private findDeepestBreadcrumb(route: ActivatedRouteSnapshot): string | null {
        let deepest: string | null = route.data['breadcrumb'] ?? null;

        for (const child of route.children) {
            const childBreadcrumb = this.findDeepestBreadcrumb(child);
            if (childBreadcrumb) {
                deepest = childBreadcrumb;
            }
        }

        return deepest;
    }
}
