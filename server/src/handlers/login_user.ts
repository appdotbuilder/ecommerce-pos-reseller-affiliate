import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type LoginResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const loginUser = async (input: LoginInput): Promise<LoginResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return {
        success: false,
        message: "Invalid email or password"
      };
    }

    const user = users[0];

    // Check if user account is active
    if (!user.is_active) {
      return {
        success: false,
        message: "Account is deactivated"
      };
    }

    // Verify password using Bun's built-in password verification
    const passwordMatch = await Bun.password.verify(input.password, user.password_hash);

    if (!passwordMatch) {
      return {
        success: false,
        message: "Invalid email or password"
      };
    }

    // Return success response with user data (excluding password_hash)
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      message: "Login successful"
    };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      message: "Login failed due to server error"
    };
  }
};