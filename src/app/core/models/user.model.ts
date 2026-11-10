export type UserRole = 'SALES' | 'REVIEWER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ReviewerOption extends User {
  openReviews: number;
}

export const USER_ROLES: readonly UserRole[] = ['SALES', 'REVIEWER', 'ADMIN'];

export const ROLE_LABELS: Record<UserRole, string> = {
  SALES: 'Sales',
  REVIEWER: 'Reviewer',
  ADMIN: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SALES: 'Create merchant applications, manage drafts, and follow submission progress.',
  REVIEWER: 'Review assigned applications and record risk decisions.',
  ADMIN: 'View every application, manage reviewer assignments, and oversee risk decisions.',
};
