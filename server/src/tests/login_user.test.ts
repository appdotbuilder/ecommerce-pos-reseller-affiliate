import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

// Test user data
const testPassword = 'testpassword123';
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '', // Will be set in beforeEach
  role: 'user' as const,
  is_active: true
};

// Test input
const validLoginInput: LoginInput = {
  email: 'test@example.com',
  password: testPassword
};

describe('loginUser', () => {
  beforeEach(async () => {
    await createDB();
    
    // Hash password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(testPassword);
    
    // Create test user with hashed password
    await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: passwordHash
      })
      .execute();
  });

  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    const result = await loginUser(validLoginInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Login successful');
    expect(result.user).toBeDefined();
    
    if (result.user) {
      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.username).toEqual('testuser');
      expect(result.user.role).toEqual('user');
      expect(result.user.is_active).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);
      // Ensure password_hash is not included in response
      expect((result.user as any).password_hash).toBeUndefined();
    }
  });

  it('should reject login with invalid email', async () => {
    const invalidEmailInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: testPassword
    };

    const result = await loginUser(invalidEmailInput);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Invalid email or password');
    expect(result.user).toBeUndefined();
  });

  it('should reject login with invalid password', async () => {
    const invalidPasswordInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await loginUser(invalidPasswordInput);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Invalid email or password');
    expect(result.user).toBeUndefined();
  });

  it('should reject login for deactivated user', async () => {
    // Deactivate the test user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    const result = await loginUser(validLoginInput);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Account is deactivated');
    expect(result.user).toBeUndefined();
  });

  it('should handle case-sensitive email matching', async () => {
    const uppercaseEmailInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: testPassword
    };

    const result = await loginUser(uppercaseEmailInput);

    // Should fail because email matching is case-sensitive
    expect(result.success).toBe(false);
    expect(result.message).toEqual('Invalid email or password');
    expect(result.user).toBeUndefined();
  });

  it('should work with different user roles', async () => {
    // Create an admin user
    const adminPassword = 'adminpass123';
    const adminPasswordHash = await Bun.password.hash(adminPassword);
    
    await db.insert(usersTable)
      .values({
        username: 'adminuser',
        email: 'admin@example.com',
        password_hash: adminPasswordHash,
        role: 'admin',
        is_active: true
      })
      .execute();

    const adminLoginInput: LoginInput = {
      email: 'admin@example.com',
      password: adminPassword
    };

    const result = await loginUser(adminLoginInput);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Login successful');
    expect(result.user).toBeDefined();
    
    if (result.user) {
      expect(result.user.email).toEqual('admin@example.com');
      expect(result.user.username).toEqual('adminuser');
      expect(result.user.role).toEqual('admin');
      expect(result.user.is_active).toBe(true);
    }
  });

  it('should verify user data is stored correctly in database', async () => {
    const result = await loginUser(validLoginInput);

    expect(result.success).toBe(true);
    
    // Verify user exists in database with correct data
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users).toHaveLength(1);
    const dbUser = users[0];
    
    expect(dbUser.email).toEqual('test@example.com');
    expect(dbUser.username).toEqual('testuser');
    expect(dbUser.role).toEqual('user');
    expect(dbUser.is_active).toBe(true);
    expect(dbUser.password_hash).toBeDefined();
    expect(dbUser.created_at).toBeInstanceOf(Date);
    expect(dbUser.updated_at).toBeInstanceOf(Date);
  });
});