import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UpdateUserRequest, UserResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  getById(id: string) {
    return this.http.get<UserResponse>(`${environment.apiUrl}/users/${id}`);
  }

  update(id: string, request: UpdateUserRequest) {
    return this.http.put<UserResponse>(`${environment.apiUrl}/users/${id}`, request);
  }
}
