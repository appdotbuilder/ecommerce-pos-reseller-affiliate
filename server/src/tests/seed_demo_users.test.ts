import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { seedDemoUsers, getDemoUsers } from '../handlers/seed_demo_users';

describe('seedDemoUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create all demo users when none exist', async () => {
    const result = await seedDemoUsers();

    // Should return 3 demo users
    expect(result).toHaveLength(3);

    // Check that each user has the expected structure
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      
      // Should NOT include password_hash
      expect((user as any).password_hash).toBeUndefined();
    });

    // Verify specific demo users exist
    const adminUser = result.find(u => u.role === 'admin');
    const resellerUser = result.find(u => u.role === 'reseller');
    const regularUser = result.find(u => u.role === 'user');

    expect(adminUser).toBeDefined();
    expect(adminUser?.username).toBe('admin_demo');
    expect(adminUser?.email).toBe('admin@demo.com');

    expect(resellerUser).toBeDefined();
    expect(resellerUser?.username).toBe('reseller_demo');
    expect(resellerUser?.email).toBe('reseller@demo.com');

    expect(regularUser).toBeDefined();
    expect(regularUser?.username).toBe('user_demo');
    expect(regularUser?.email).toBe('user@demo.com');
  });

  it('should save users to database with hashed passwords', async () => {
    await seedDemoUsers();

    // Query all users from database
    const users = await db.select().from(usersTable).execute();
    expect(users).toHaveLength(3);

    // Check that passwords are hashed (not plain text)
    users.forEach(user => {
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe('admin123');
      expect(user.password_hash).not.toBe('reseller123');
      expect(user.password_hash).not.toBe('user123');
      expect(user.password_hash.length).toBeGreaterThan(10); // Hashed passwords should be longer
    });

    // Verify specific users exist in database
    const adminUser = users.find(u => u.email === 'admin@demo.com');
    const resellerUser = users.find(u => u.email === 'reseller@demo.com');
    const regularUser = users.find(u => u.email === 'user@demo.com');

    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toBe('admin');
    expect(resellerUser).toBeDefined();
    expect(resellerUser?.role).toBe('reseller');
    expect(regularUser).toBeDefined();
    expect(regularUser?.role).toBe('user');
  });

  it('should return existing users if they already exist', async () => {
    // First seeding
    const firstResult = await seedDemoUsers();
    expect(firstResult).toHaveLength(3);

    // Second seeding - should return existing users, not create duplicates
    const secondResult = await seedDemoUsers();
    expect(secondResult).toHaveLength(3);

    // Verify no duplicates were created in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);

    // Results should have the same user IDs
    firstResult.forEach(firstUser => {
      const secondUser = secondResult.find(u => u.email === firstUser.email);
      expect(secondUser).toBeDefined();
      expect(secondUser?.id).toBe(firstUser.id);
    });
  });

  it('should handle partial existing users', async () => {
    // Create only one demo user manually
    await db.insert(usersTable).values({
      username: 'admin_demo',
      email: 'admin@demo.com',
      password_hash: 'existing_hash',
      role: 'admin'
    }).execute();

    const result = await seedDemoUsers();
    expect(result).toHaveLength(3);

    // Verify total users in database (1 existing + 2 new)
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);

    // Check that existing user wasn't modified
    const existingAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@demo.com'))
      .execute();
    
    expect(existingAdmin[0].password_hash).toBe('existing_hash');
  });

  it('should create users with correct default values', async () => {
    const result = await seedDemoUsers();

    // All users should be active by default
    result.forEach(user => {
      expect(user.is_active).toBe(true);
    });

    // Verify in database too
    const dbUsers = await db.select().from(usersTable).execute();
    dbUsers.forEach(user => {
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });
});

describe('getDemoUsers', () => {
  it('should return demo user credentials', () => {
    const demoUsers = getDemoUsers();

    expect(demoUsers).toHaveLength(3);
    
    // Check structure of returned users
    demoUsers.forEach(user => {
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.password).toBeDefined(); // This should include plain password for reference
      expect(user.role).toBeDefined();
    });

    // Check specific demo users
    const adminUser = demoUsers.find(u => u.role === 'admin');
    const resellerUser = demoUsers.find(u => u.role === 'reseller');
    const regularUser = demoUsers.find(u => u.role === 'user');

    expect(adminUser).toBeDefined();
    expect(adminUser?.password).toBe('admin123');
    expect(resellerUser).toBeDefined();
    expect(resellerUser?.password).toBe('reseller123');
    expect(regularUser).toBeDefined();
    expect(regularUser?.password).toBe('user123');
  });

  it('should return consistent data on multiple calls', () => {
    const first = getDemoUsers();
    const second = getDemoUsers();

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
  });
});