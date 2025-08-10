import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SafeUser } from '../schema';

export const getUserById = async (id: number): Promise<SafeUser | null> => {
  try {
    // Query user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    const user = result[0];

    // Return safe user object (without password_hash)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get user by ID failed:', error);
    throw error;
  }
};