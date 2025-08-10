import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SafeUser, type SeedUser } from '../schema';
import { eq } from 'drizzle-orm';

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

// Simple hash function for demo purposes (in production, use bcrypt or similar)
const hashPassword = async (password: string): Promise<string> => {
    // Using Bun's built-in hashing for demo purposes
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(password + 'salt_demo_2024'); // Add salt for basic security
    return hasher.digest('hex');
};

export const seedDemoUsers = async (): Promise<SafeUser[]> => {
    try {
        const createdUsers: SafeUser[] = [];

        for (const demoUser of DEMO_USERS) {
            // Check if user already exists
            const existingUser = await db.select()
                .from(usersTable)
                .where(eq(usersTable.email, demoUser.email))
                .execute();

            if (existingUser.length > 0) {
                // User already exists, return the existing user (without password)
                const { password_hash, ...safeUser } = existingUser[0];
                createdUsers.push(safeUser);
                continue;
            }

            // Hash the password
            const password_hash = await hashPassword(demoUser.password);

            // Insert the new user
            const result = await db.insert(usersTable)
                .values({
                    username: demoUser.username,
                    email: demoUser.email,
                    password_hash,
                    role: demoUser.role
                })
                .returning()
                .execute();

            // Remove password hash before returning
            const newUser = result[0];
            const { password_hash: _, ...safeUser } = newUser;
            createdUsers.push(safeUser);
        }

        return createdUsers;
    } catch (error) {
        console.error('Demo user seeding failed:', error);
        throw error;
    }
};

export const getDemoUsers = (): SeedUser[] => {
    // Returns the demo user credentials for reference (should be documented somewhere secure)
    return DEMO_USERS;
};