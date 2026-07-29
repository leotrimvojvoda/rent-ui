import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ProgressBar } from 'primeng/progressbar';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { LoadingService } from './core/services/loading.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, ToastModule, ProgressBar, ConfirmDialog],
    templateUrl: './app.component.html'
})
export class AppComponent {
    loadingService = inject(LoadingService);
}
