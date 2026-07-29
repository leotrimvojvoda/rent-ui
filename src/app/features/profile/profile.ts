import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UpdateUserRequest } from '../../core/models/user.model';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PasswordModule],
    templateUrl: './profile.html'
})
export class Profile implements OnInit {
    form: UpdateUserRequest = { firstName: '', lastName: '', email: '' };
    loading = false;
    loaded = false;

    passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    passwordLoading = false;
    passwordSuccess: string | null = null;
    passwordError: string | null = null;

    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    ngOnInit() {
        const user = this.authService.currentUser();
        if (user) {
            this.form = { firstName: user.firstName, lastName: user.lastName, email: user.email };
            this.loaded = true;
        }
    }

    onSave() {
        const user = this.authService.currentUser();
        if (!user) return;

        this.loading = true;

        this.authService.updateCurrentUser(this.form).subscribe({
            next: () => {
                this.toastService.success('Profile updated', 'Your profile has been saved.');
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    onChangePassword() {
        this.passwordSuccess = null;
        this.passwordError = null;

        if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
            this.passwordError = 'New passwords do not match.';
            return;
        }

        this.passwordLoading = true;
        // TODO: wire up to a change-password API endpoint
        setTimeout(() => {
            this.passwordSuccess = 'Password updated successfully.';
            this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
            this.passwordLoading = false;
        }, 500);
    }
}
