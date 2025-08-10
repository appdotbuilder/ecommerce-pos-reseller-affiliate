import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UserRole } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user roles
const adminUserInput: CreateUserInput = {
  username: 'admin_user',
  email: 'admin@example.com',
  password: 'securepass123',
  role: 'admin' as UserRole
};

const resellerUserInput: CreateUserInput = {
  username: 'reseller_user',
  email: 'reseller@example.com',
  password: 'resellerpass456',
  role: 'reseller' as UserRole
};

const regularUserInput: CreateUserInput = {
  username: 'regular_user',
  email: 'user@example.com',
  password: 'userpass789',
  role: 'user' as UserRole
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with admin role', async () => {
    const result = await createUser(adminUserInput);

    // Basic field validation
    expect(result.username).toEqual('admin_user');
    expect(result.email).toEqual('admin@example.com');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Ensure password hash is not included in response
    expect('password_hash' in result).toBe(false);
    expect('password' in result).toBe(false);
  });

  it('should create a user with reseller role', async () => {
    const result = await createUser(resellerUserInput);

    expect(result.username).toEqual('reseller_user');
    expect(result.email).toEqual('reseller@example.com');
    expect(result.role).toEqual('reseller');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
  });

  it('should create a user with regular user role', async () => {
    const result = await createUser(regularUserInput);

    expect(result.username).toEqual('regular_user');
    expect(result.email).toEqual('user@example.com');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(adminUserInput);

    // Query database directly to verify user was created
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];

    expect(savedUser.username).toEqual('admin_user');
    expect(savedUser.email).toEqual('admin@example.com');
    expect(savedUser.role).toEqual('admin');
    expect(savedUser.is_active).toEqual(true);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);

    // Verify password was hashed (not stored as plain text)
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('securepass123');
    expect(savedUser.password_hash.length).toBeGreaterThan(20); // Hashed passwords are much longer
  });

  it('should verify password hash is correctly generated', async () => {
    const result = await createUser(regularUserInput);

    // Get the stored password hash from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    const storedPasswordHash = users[0].password_hash;

    // Verify the original password matches the stored hash
    const isValidPassword = await Bun.password.verify('userpass789', storedPasswordHash);
    expect(isValidPassword).toBe(true);

    // Verify an incorrect password doesn't match
    const isInvalidPassword = await Bun.password.verify('wrongpassword', storedPasswordHash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(adminUserInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      username: 'admin_user', // Same username
      email: 'different@example.com',
      password: 'differentpass',
      role: 'user'
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(resellerUserInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      username: 'different_user',
      email: 'reseller@example.com', // Same email
      password: 'differentpass',
      role: 'user'
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should set default is_active to true', async () => {
    const result = await createUser(regularUserInput);

    expect(result.is_active).toBe(true);

    // Verify in database as well
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].is_active).toBe(true);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(adminUserInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});