import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, CreateAccountCredentials, LoginCredentials } from '../models/auth.model';
import { UpdateUserRequest, UserResponse } from '../models/user.model';
import { JwtService } from './jwt.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private jwtService = inject(JwtService);

  private _currentUser = signal<UserResponse | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/sign-in`, credentials);
  }

  register(credentials: CreateAccountCredentials) {
    return this.http.post(`${environment.apiUrl}/users`, credentials);
  }

  loadCurrentUser(): void {
    const id = this.jwtService.getAttribute('id');
    if (!id) return;

    this.http.get<UserResponse>(`${environment.apiUrl}/users/${id}`).subscribe({
      next: (user) => this._currentUser.set(user),
      error: () => this._currentUser.set(null)
    });
  }

  updateCurrentUser(request: UpdateUserRequest): Observable<UserResponse> {
    const id = this.jwtService.getAttribute('id');
    return this.http.put<UserResponse>(`${environment.apiUrl}/users/${id}`, request).pipe(
      tap((user) => this._currentUser.set(user))
    );
  }

  initialize(): void {
    if (this.jwtService.getToken()) {
      this.loadCurrentUser();
    }
  }

  loginNoBackend(): void {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ id: 'mock-user-id', sub: 'dev@local.com', roles: ['USER'], exp: 9999999999 }));
    this.jwtService.saveToken(`${header}.${payload}.mock`);
    this._currentUser.set({
      id: 'mock-user-id',
      firstName: 'Dev',
      lastName: 'User',
      email: 'dev@local.com',
      roles: ['USER'],
      createdAt: new Date().toISOString()
    });
  }

  logout(): void {
    this.jwtService.destroyToken();
    this._currentUser.set(null);
  }
}
