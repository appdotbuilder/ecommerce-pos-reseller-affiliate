import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { deleteUser } from '../handlers/delete_user';
import { eq } from 'drizzle-orm';
// Using a simple hash function instead of bcrypt for tests
const hashPassword = (password: string): string => {
  return `hashed_${password}`;
};

// Test user data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'user'
};

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing user', async () => {
    // Create a test user first
    const hashedPassword = hashPassword(testUser.password);
    const [createdUser] = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .returning()
      .execute();

    // Delete the user
    const result = await deleteUser(createdUser.id);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify user is actually deleted from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users).toHaveLength(0);
  });

  it('should return false when user does not exist', async () => {
    // Try to delete a non-existent user
    const result = await deleteUser(999);

    // Should return false for non-existent user
    expect(result).toBe(false);
  });

  it('should not affect other users when deleting specific user', async () => {
    // Create multiple test users
    const hashedPassword = hashPassword(testUser.password);
    
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: hashedPassword,
        role: 'user'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: hashedPassword,
        role: 'admin'
      })
      .returning()
      .execute();

    // Delete only user1
    const result = await deleteUser(user1.id);

    expect(result).toBe(true);

    // Verify user1 is deleted
    const deletedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user1.id))
      .execute();
    expect(deletedUsers).toHaveLength(0);

    // Verify user2 still exists
    const remainingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user2.id))
      .execute();
    expect(remainingUsers).toHaveLength(1);
    expect(remainingUsers[0].username).toEqual('user2');
  });

  it('should handle deletion of users with different roles', async () => {
    const hashedPassword = hashPassword(testUser.password);
    
    // Create admin user
    const [adminUser] = await db.insert(usersTable)
      .values({
        username: 'admin',
        email: 'admin@example.com',
        password_hash: hashedPassword,
        role: 'admin'
      })
      .returning()
      .execute();

    // Create reseller user
    const [resellerUser] = await db.insert(usersTable)
      .values({
        username: 'reseller',
        email: 'reseller@example.com',
        password_hash: hashedPassword,
        role: 'reseller'
      })
      .returning()
      .execute();

    // Delete admin user
    const adminResult = await deleteUser(adminUser.id);
    expect(adminResult).toBe(true);

    // Delete reseller user
    const resellerResult = await deleteUser(resellerUser.id);
    expect(resellerResult).toBe(true);

    // Verify both users are deleted
    const remainingUsers = await db.select()
      .from(usersTable)
      .execute();
    expect(remainingUsers).toHaveLength(0);
  });

  it('should handle deletion of inactive users', async () => {
    const hashedPassword = hashPassword(testUser.password);
    
    // Create inactive user
    const [inactiveUser] = await db.insert(usersTable)
      .values({
        username: 'inactive',
        email: 'inactive@example.com',
        password_hash: hashedPassword,
        role: 'user',
        is_active: false
      })
      .returning()
      .execute();

    // Delete inactive user
    const result = await deleteUser(inactiveUser.id);

    expect(result).toBe(true);

    // Verify user is deleted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, inactiveUser.id))
      .execute();
    expect(users).toHaveLength(0);
  });
});