import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StatusPage } from '../../shared/components/status-page';

@Component({
    selector: 'app-error',
    standalone: true,
    imports: [RouterModule, StatusPage],
    template: `
        <app-status-page
            [appName]="appName"
            icon="pi pi-exclamation-triangle"
            title="Something went wrong"
            message="That request didn't complete. Nothing was changed — try again, and if it keeps happening give it a few minutes."
            actionLabel="Back to Keyway"
            actionLink="/"
        >
            <a routerLink="/dashboard" class="text-sm text-muted-color no-underline hover:text-color">Go to your dashboard</a>
        </app-status-page>
    `
})
export class Error {
    readonly appName = environment.appName;
}
