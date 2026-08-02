import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StatusPage } from '../../shared/components/status-page';

@Component({
    selector: 'app-notfound',
    standalone: true,
    imports: [RouterModule, StatusPage],
    template: `
        <app-status-page
            [appName]="appName"
            icon="pi pi-compass"
            code="404"
            title="We can't find that page"
            message="The link may be old, or the car it pointed at is no longer listed. Everything available is in the catalog."
            actionLabel="Browse cars"
            actionLink="/cars"
        >
            <a routerLink="/" class="text-sm text-muted-color no-underline hover:text-color">Back to home</a>
        </app-status-page>
    `
})
export class Notfound {
    readonly appName = environment.appName;
}
