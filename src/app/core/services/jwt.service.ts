import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JwtService {
  private readonly tokenKey = 'token';

  constructor() { }

  /**
   * Get the raw token from localStorage
   * @returns The raw token string or null if not found
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Save the JWT token to localStorage
   * @param token - The token string to save
   */
  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Remove the JWT token from localStorage
   */
  destroyToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  /**
   * Get a specific attribute from the JWT token stored in localStorage
   * @param attribute - The attribute name to retrieve from the token payload
   * @returns The attribute value or null if not found or token is invalid
   */
  getAttribute(attribute: string): any {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return null;
    }

    const decodedToken = this.decodeToken(token);
    if (decodedToken && decodedToken[attribute]) {
      return decodedToken[attribute];
    }

    return null;
  }

  /**
   * Get all attributes from the JWT token payload
   * @returns The decoded token payload or null if invalid
   */
  getAllAttributes(): any {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      return null;
    }

    return this.decodeToken(token);
  }

  /**
   * Decode a JWT token and return its payload
   * @param token - The JWT token to decode
   * @returns The decoded payload object or null if decoding fails
   */
  private decodeToken(token: string): any {
    try {
      // JWT has 3 parts separated by dots: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT token format');
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decodedPayload = atob(payload);
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }
}
