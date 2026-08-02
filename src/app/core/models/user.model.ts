/**
 * ADMIN exists in the contract but has no endpoints — treat it as a role with
 * no workspace rather than crashing.
 */
export type UserRole = 'CLIENT' | 'OWNER' | 'ADMIN';

/** Signup only allows the two product personas. */
export type SignupRole = Extract<UserRole, 'CLIENT' | 'OWNER'>;

export interface UserResponse {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    enabled: boolean;
    createdAt: string;
}
