import { type SafeUser, type SeedUser } from '../schema';

// Demo seed data for the three user roles
const DEMO_USERS: SeedUser[] = [
    {
        username: 'admin_demo',
        email: 'admin@demo.com',
        password: 'admin123',
        role: 'admin'
    },
    {
        username: 'reseller_demo',
        email: 'reseller@demo.com',
        password: 'reseller123',
        role: 'reseller'
    },
    {
        username: 'user_demo',
        email: 'user@demo.com',
        password: 'user123',
        role: 'user'
    }
];

export const seedDemoUsers = async (): Promise<SafeUser[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is seeding the database with demo users for each role.
    // Should create admin, reseller, and regular user accounts with known credentials.
    // Passwords should be hashed before storing in the database.
    // Returns the created users without password hashes.
    return [];
};

export const getDemoUsers = (): SeedUser[] => {
    // Returns the demo user credentials for reference (should be documented somewhere secure)
    return DEMO_USERS;
};