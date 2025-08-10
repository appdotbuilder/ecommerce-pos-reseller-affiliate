import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserById } from '../handlers/get_user_by_id';

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by ID without password hash', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user by ID
    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.role).toEqual('user');
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Ensure password hash is not included
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should return null for non-existent user ID', async () => {
    const result = await getUserById(99999);
    
    expect(result).toBeNull();
  });

  it('should handle different user roles correctly', async () => {
    // Create admin user
    const insertResult = await db.insert(usersTable)
      .values({
        username: 'adminuser',
        email: 'admin@example.com',
        password_hash: 'admin_hashed_password',
        role: 'admin',
        is_active: true
      })
      .returning()
      .execute();

    const adminUser = insertResult[0];

    const result = await getUserById(adminUser.id);

    expect(result).not.toBeNull();
    expect(result!.role).toEqual('admin');
    expect(result!.username).toEqual('adminuser');
    expect(result!.email).toEqual('admin@example.com');
  });

  it('should handle inactive users correctly', async () => {
    // Create inactive user
    const insertResult = await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password_hash: 'inactive_hashed_password',
        role: 'user',
        is_active: false
      })
      .returning()
      .execute();

    const inactiveUser = insertResult[0];

    const result = await getUserById(inactiveUser.id);

    expect(result).not.toBeNull();
    expect(result!.is_active).toEqual(false);
    expect(result!.username).toEqual('inactiveuser');
  });

  it('should return correct date types', async () => {
    // Create user with specific timestamp
    const insertResult = await db.insert(usersTable)
      .values({
        username: 'dateuser',
        email: 'date@example.com',
        password_hash: 'date_test_hashed_password',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Verify dates are reasonable (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result!.created_at >= oneMinuteAgo).toBe(true);
    expect(result!.created_at <= now).toBe(true);
    expect(result!.updated_at >= oneMinuteAgo).toBe(true);
    expect(result!.updated_at <= now).toBe(true);
  });
});