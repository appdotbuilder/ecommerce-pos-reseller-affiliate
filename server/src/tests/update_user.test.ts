import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const hashedPassword = await Bun.password.hash('password123');
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update user username', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'updateduser'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('updateduser');
    expect(result!.email).toEqual(testUser.email);
    expect(result!.role).toEqual(testUser.role);
    expect(result!.is_active).toEqual(testUser.is_active);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > testUser.updated_at).toBe(true);

    // Verify password_hash is not included in response
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should update user email', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'newemail@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('newemail@example.com');
    expect(result!.username).toEqual(testUser.username);
    expect(result!.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user role', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      role: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.role).toEqual('admin');
    expect(result!.username).toEqual(testUser.username);
    expect(result!.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user active status', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.is_active).toBe(false);
    expect(result!.username).toEqual(testUser.username);
    expect(result!.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update user password and hash it', async () => {
    const testUser = await createTestUser();
    const originalPasswordHash = testUser.password_hash;
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      password: 'newpassword456'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual(testUser.username);
    expect(result!.updated_at > testUser.updated_at).toBe(true);

    // Verify password was actually updated in database
    const updatedUserInDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUserInDb[0].password_hash).not.toEqual(originalPasswordHash);
    
    // Verify new password can be verified
    const passwordMatches = await Bun.password.verify('newpassword456', updatedUserInDb[0].password_hash);
    expect(passwordMatches).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'multifielduser',
      email: 'multifield@example.com',
      role: 'reseller',
      is_active: false,
      password: 'multifieldpass'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('multifielduser');
    expect(result!.email).toEqual('multifield@example.com');
    expect(result!.role).toEqual('reseller');
    expect(result!.is_active).toBe(false);
    expect(result!.updated_at > testUser.updated_at).toBe(true);

    // Verify password was updated in database
    const updatedUserInDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    const passwordMatches = await Bun.password.verify('multifieldpass', updatedUserInDb[0].password_hash);
    expect(passwordMatches).toBe(true);
  });

  it('should return null for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      username: 'nonexistent'
    };

    const result = await updateUser(updateInput);

    expect(result).toBeNull();
  });

  it('should save updated user to database', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'dbsavetest',
      email: 'dbsave@example.com'
    };

    const result = await updateUser(updateInput);

    // Verify changes were persisted to database
    const usersInDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(usersInDb).toHaveLength(1);
    expect(usersInDb[0].username).toEqual('dbsavetest');
    expect(usersInDb[0].email).toEqual('dbsave@example.com');
    expect(usersInDb[0].updated_at).toBeInstanceOf(Date);
    expect(usersInDb[0].updated_at > testUser.updated_at).toBe(true);
  });

  it('should preserve unchanged fields', async () => {
    const testUser = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: testUser.id,
      username: 'onlyusername'
    };

    const result = await updateUser(updateInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('onlyusername');
    expect(result!.email).toEqual(testUser.email);
    expect(result!.role).toEqual(testUser.role);
    expect(result!.is_active).toEqual(testUser.is_active);
    expect(result!.created_at).toEqual(testUser.created_at);
  });

  it('should handle unique constraint violations', async () => {
    // Create two test users
    const user1 = await createTestUser();
    
    const hashedPassword = await Bun.password.hash('password456');
    const user2 = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: user2[0].id,
      username: user1.username // Try to use existing username
    };

    // Should throw an error due to unique constraint
    expect(updateUser(updateInput)).rejects.toThrow();
  });
});