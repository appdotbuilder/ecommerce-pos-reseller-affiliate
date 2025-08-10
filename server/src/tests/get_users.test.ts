import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UserFilter } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers = [
  {
    username: 'admin_user',
    email: 'admin@test.com',
    role: 'admin' as const
  },
  {
    username: 'reseller_user',
    email: 'reseller@test.com',
    role: 'reseller' as const
  },
  {
    username: 'regular_user',
    email: 'user@test.com',
    role: 'user' as const
  },
  {
    username: 'inactive_user',
    email: 'inactive@test.com',
    role: 'user' as const
  }
];

const createTestUsers = async () => {
  const hashedPassword = 'hashed_password_123';
  
  // Create three active users and one inactive
  await db.insert(usersTable).values([
    {
      username: testUsers[0].username,
      email: testUsers[0].email,
      password_hash: hashedPassword,
      role: testUsers[0].role,
      is_active: true
    },
    {
      username: testUsers[1].username,
      email: testUsers[1].email,
      password_hash: hashedPassword,
      role: testUsers[1].role,
      is_active: true
    },
    {
      username: testUsers[2].username,
      email: testUsers[2].email,
      password_hash: hashedPassword,
      role: testUsers[2].role,
      is_active: true
    },
    {
      username: testUsers[3].username,
      email: testUsers[3].email,
      password_hash: hashedPassword,
      role: testUsers[3].role,
      is_active: false
    }
  ]).execute();
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all users without filters', async () => {
    await createTestUsers();

    const result = await getUsers();

    expect(result).toHaveLength(4);
    
    // Verify structure and that password_hash is not included
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.is_active).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
      expect((user as any).password_hash).toBeUndefined();
    });

    // Verify all test users are present
    const usernames = result.map(u => u.username);
    expect(usernames).toContain('admin_user');
    expect(usernames).toContain('reseller_user');
    expect(usernames).toContain('regular_user');
    expect(usernames).toContain('inactive_user');
  });

  it('should filter users by role', async () => {
    await createTestUsers();

    const adminFilter: UserFilter = { role: 'admin' };
    const adminResult = await getUsers(adminFilter);

    expect(adminResult).toHaveLength(1);
    expect(adminResult[0].username).toEqual('admin_user');
    expect(adminResult[0].role).toEqual('admin');

    const userFilter: UserFilter = { role: 'user' };
    const userResult = await getUsers(userFilter);

    expect(userResult).toHaveLength(2);
    userResult.forEach(user => {
      expect(user.role).toEqual('user');
    });
  });

  it('should filter users by active status', async () => {
    await createTestUsers();

    const activeFilter: UserFilter = { is_active: true };
    const activeResult = await getUsers(activeFilter);

    expect(activeResult).toHaveLength(3);
    activeResult.forEach(user => {
      expect(user.is_active).toBe(true);
    });

    const inactiveFilter: UserFilter = { is_active: false };
    const inactiveResult = await getUsers(inactiveFilter);

    expect(inactiveResult).toHaveLength(1);
    expect(inactiveResult[0].username).toEqual('inactive_user');
    expect(inactiveResult[0].is_active).toBe(false);
  });

  it('should search users by username', async () => {
    await createTestUsers();

    const searchFilter: UserFilter = { search: 'admin' };
    const result = await getUsers(searchFilter);

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('admin_user');

    const partialSearchFilter: UserFilter = { search: 'user' };
    const partialResult = await getUsers(partialSearchFilter);

    expect(partialResult).toHaveLength(4); // admin_user, reseller_user, regular_user, inactive_user
  });

  it('should search users by email', async () => {
    await createTestUsers();

    const emailSearchFilter: UserFilter = { search: 'reseller@test.com' };
    const result = await getUsers(emailSearchFilter);

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('reseller@test.com');

    const domainSearchFilter: UserFilter = { search: 'test.com' };
    const domainResult = await getUsers(domainSearchFilter);

    expect(domainResult).toHaveLength(4); // All users have test.com domain
  });

  it('should combine multiple filters', async () => {
    await createTestUsers();

    const combinedFilter: UserFilter = { 
      role: 'user', 
      is_active: true 
    };
    const result = await getUsers(combinedFilter);

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('regular_user');
    expect(result[0].role).toEqual('user');
    expect(result[0].is_active).toBe(true);

    const searchAndRoleFilter: UserFilter = { 
      role: 'user', 
      search: 'inactive' 
    };
    const searchResult = await getUsers(searchAndRoleFilter);

    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].username).toEqual('inactive_user');
  });

  it('should return empty array when no users match filters', async () => {
    await createTestUsers();

    const noMatchFilter: UserFilter = { role: 'admin', search: 'nonexistent' };
    const result = await getUsers(noMatchFilter);

    expect(result).toHaveLength(0);

    const impossibleFilter: UserFilter = { 
      role: 'admin', 
      is_active: false 
    };
    const impossibleResult = await getUsers(impossibleFilter);

    expect(impossibleResult).toHaveLength(0);
  });

  it('should return empty array when database is empty', async () => {
    const result = await getUsers();

    expect(result).toHaveLength(0);
  });

  it('should handle case-insensitive search', async () => {
    await createTestUsers();

    const upperCaseFilter: UserFilter = { search: 'ADMIN' };
    const result = await getUsers(upperCaseFilter);

    expect(result).toHaveLength(1);
    expect(result[0].username).toEqual('admin_user');

    const mixedCaseFilter: UserFilter = { search: 'RESELLER' };
    const mixedResult = await getUsers(mixedCaseFilter);

    expect(mixedResult).toHaveLength(1);
    expect(mixedResult[0].username).toEqual('reseller_user');
  });
});