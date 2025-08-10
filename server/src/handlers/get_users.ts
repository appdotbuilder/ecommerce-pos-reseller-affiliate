import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SafeUser, type UserFilter } from '../schema';
import { eq, and, or, ilike, SQL } from 'drizzle-orm';

export const getUsers = async (filter?: UserFilter): Promise<SafeUser[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter) {
      // Filter by role if provided
      if (filter.role) {
        conditions.push(eq(usersTable.role, filter.role));
      }

      // Filter by active status if provided
      if (filter.is_active !== undefined) {
        conditions.push(eq(usersTable.is_active, filter.is_active));
      }

      // Search by username or email if provided (case-insensitive)
      if (filter.search) {
        const searchTerm = `%${filter.search}%`;
        conditions.push(
          or(
            ilike(usersTable.username, searchTerm),
            ilike(usersTable.email, searchTerm)
          )!
        );
      }
    }

    // Build query with conditional where clause
    const baseQuery = db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    }).from(usersTable);

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await baseQuery.execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};