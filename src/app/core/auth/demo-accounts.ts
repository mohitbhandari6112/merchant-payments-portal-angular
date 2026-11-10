import { UserRole } from '../models/user.model';

export interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  focus: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    role: 'SALES',
    name: 'Maya Shrestha',
    email: 'sales@merchant.test',
    password: 'demo1234',
    focus: 'Create applications and manage drafts',
  },
  {
    role: 'REVIEWER',
    name: 'Ravi Karki',
    email: 'reviewer@merchant.test',
    password: 'demo1234',
    focus: 'Review assigned merchants and record risk decisions',
  },
  {
    role: 'ADMIN',
    name: 'Aarav Patel',
    email: 'admin@merchant.test',
    password: 'demo1234',
    focus: 'View all applications and manage assignments',
  },
];

export const DEMO_PASSWORD = 'demo1234';

export function findDemoAccount(role: UserRole): DemoAccount {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role);

  if (!account) {
    throw new Error(`No demo account configured for ${role}.`);
  }

  return account;
}
