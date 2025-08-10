import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UserRole } from '../schema';
import { getUsersByRole } from '../handlers/get_users_by_role';

const testUsers = [
  {
    username: 'admin_user',
    email: 'admin@test.com',
    password_hash: '$2b$10$hashedpassword1',
    role: 'admin' as UserRole,
    is_active: true
  },
  {
    username: 'reseller_user',
    email: 'reseller@test.com',
    password_hash: '$2b$10$hashedpassword2',
    role: 'reseller' as UserRole,
    is_active: true
  },
  {
    username: 'regular_user1',
    email: 'user1@test.com',
    password_hash: '$2b$10$hashedpassword3',
    role: 'user' as UserRole,
    is_active: true
  },
  {
    username: 'regular_user2',
    email: 'user2@test.com',
    password_hash: '$2b$10$hashedpassword4',
    role: 'user' as UserRole,
    is_active: false
  },
  {
    username: 'inactive_admin',
    email: 'inactive.admin@test.com',
    password_hash: '$2b$10$hashedpassword5',
    role: 'admin' as UserRole,
    is_active: false
  }
];

describe('getUsersByRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return users with admin role', async () => {
    // Insert test users
    await db.insert(usersTable).values(testUsers).execute();

    const result = await getUsersByRole('admin');

    expect(result).toHaveLength(2);
    expect(result.every(user => user.role === 'admin')).toBe(true);
    
    // Verify it includes both active and inactive admin users
    const usernames = result.map(user => user.username);
    expect(usernames).toContain('admin_user');
    expect(usernames).toContain('inactive_admin');

    // Verify password_hash is not included in the result
    result.forEach(user => {
      expect(user).not.toHaveProperty('password_hash');
    });
  });

  it('should return users with reseller role', async () => {
    // Insert test users
    await db.insert(usersTable).values(testUsers).execute();

    const result = await getUsersByRole('reseller');

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('reseller');
    expect(result[0].username).toBe('reseller_user');
    expect(result[0].email).toBe('reseller@test.com');
    expect(result[0].is_active).toBe(true);
  });

  it('should return users with user role', async () => {
    // Insert test users
    await db.insert(usersTable).values(testUsers).execute();

    const result = await getUsersByRole('user');

    expect(result).toHaveLength(2);
    expect(result.every(user => user.role === 'user')).toBe(true);

    // Verify it includes both active and inactive regular users
    const usernames = result.map(user => user.username);
    expect(usernames).toContain('regular_user1');
    expect(usernames).toContain('regular_user2');
  });

  it('should return empty array when no users have the specified role', async () => {
    // Insert only admin users
    await db.insert(usersTable).values([testUsers[0]]).execute();

    const result = await getUsersByRole('reseller');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return users with all required fields', async () => {
    // Insert one test user
    await db.insert(usersTable).values([testUsers[0]]).execute();

    const result = await getUsersByRole('admin');

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required SafeUser fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.username).toBe('admin_user');
    expect(user.email).toBe('admin@test.com');
    expect(user.role).toBe('admin');
    expect(user.is_active).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);

    // Verify password_hash is excluded
    expect(user).not.toHaveProperty('password_hash');
  });

  it('should return empty array when database is empty', async () => {
    const result = await getUsersByRole('admin');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});