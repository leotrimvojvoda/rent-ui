import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginCredentials } from '../../core/models/auth.model';
import { JwtService } from '../../core/services/jwt.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule],
    templateUrl: './login.html'
})
export class Login {
    credentials: LoginCredentials = {
        email: '',
        password: ''
    };

    checked: boolean = false;
    noBackend: boolean = false;

    private authService = inject(AuthService);
    private jwtService = inject(JwtService);
    private toastService = inject(ToastService);
    private router = inject(Router);

    onSignIn() {
        if (this.noBackend) {
            this.authService.loginNoBackend();
            this.router.navigate(['/']);
            return;
        }

        this.authService.login(this.credentials).subscribe({
            next: (response: any) => {
                if (response && response.token) {
                    this.jwtService.saveToken(response.token);
                    this.authService.loadCurrentUser();
                }
                this.router.navigate(['/']);
            },
            error: () => {
                this.toastService.error('Login failed', 'Invalid credentials. Please try again.');
            }
        });
    }
}
