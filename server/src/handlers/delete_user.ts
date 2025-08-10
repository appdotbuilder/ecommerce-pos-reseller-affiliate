import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    // Delete the user by ID
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    // Return true if a row was deleted, false if no user was found
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};