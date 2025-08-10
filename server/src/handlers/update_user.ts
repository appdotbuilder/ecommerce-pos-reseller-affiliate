import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type SafeUser } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<SafeUser | null> => {
  try {
    // First check if user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      return null;
    }

    // Build update values object
    const updateValues: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    // Add fields that are being updated
    if (input.username !== undefined) {
      updateValues.username = input.username;
    }
    
    if (input.email !== undefined) {
      updateValues.email = input.email;
    }
    
    if (input.role !== undefined) {
      updateValues.role = input.role;
    }
    
    if (input.is_active !== undefined) {
      updateValues.is_active = input.is_active;
    }

    // Hash password if provided
    if (input.password !== undefined) {
      const hashedPassword = await Bun.password.hash(input.password);
      updateValues.password_hash = hashedPassword;
    }

    // Update the user
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Return safe user data (without password hash)
    const updatedUser = result[0];
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      is_active: updatedUser.is_active,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};