import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SafeUser, type UserRole } from '../schema';
import { eq } from 'drizzle-orm';

export const getUsersByRole = async (role: UserRole): Promise<SafeUser[]> => {
  try {
    // Query users with the specified role
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.role, role))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get users by role:', error);
    throw error;
  }
};