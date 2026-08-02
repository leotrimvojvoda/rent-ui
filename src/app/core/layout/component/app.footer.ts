import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-footer',
    templateUrl: './app.footer.html'
})
export class AppFooter {
    readonly appName = environment.appName;
    readonly year = new Date().getFullYear();
}
