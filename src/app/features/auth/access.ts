import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StatusPage } from '../../shared/components/status-page';

@Component({
    selector: 'app-access',
    standalone: true,
    imports: [RouterModule, StatusPage],
    template: `
        <app-status-page
            [appName]="appName"
            icon="pi pi-lock"
            title="You don't have access to this"
            message="This area belongs to a different kind of account. If you think that's wrong, sign in with the account that owns it."
            actionLabel="Browse cars"
            actionLink="/"
        >
            <a routerLink="/auth/login" class="text-sm text-muted-color no-underline hover:text-color">Sign in with another account</a>
        </app-status-page>
    `
})
export class Access {
    readonly appName = environment.appName;
}
