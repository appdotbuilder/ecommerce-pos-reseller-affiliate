import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type SafeUser } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<SafeUser> => {
  try {
    // Hash the password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        role: input.role,
        is_active: true, // Default value
      })
      .returning()
      .execute();

    // Return user data without password hash
    const user = result[0];
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
    console.error('User creation failed:', error);
    throw error;
  }
};