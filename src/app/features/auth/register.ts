import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { CreateAccountCredentials } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule],
    templateUrl: './register.html'
})
export class Register {
    credentials: CreateAccountCredentials = {
        firstName: '',
        lastName: '',
        email: '',
        password: ''
    };

    loading: boolean = false;

    private authService = inject(AuthService);
    private toastService = inject(ToastService);
    private router = inject(Router);

    onRegister() {
        this.loading = true;
        this.authService.register(this.credentials).subscribe({
            next: () => {
                this.toastService.success('Account created', 'You can now sign in.');
                this.router.navigate(['/auth/login']);
            },
            error: () => {
                this.loading = false;
            }
        });
    }
}
