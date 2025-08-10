import { z } from 'zod';

// User role enum schema
export const userRoleSchema = z.enum(['admin', 'reseller', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Safe user schema (without password hash for API responses)
export const safeUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SafeUser = z.infer<typeof safeUserSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Login input schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Login response schema
export const loginResponseSchema = z.object({
  success: z.boolean(),
  user: safeUserSchema.optional(),
  message: z.string()
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// User query filter schema
export const userFilterSchema = z.object({
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional() // For searching by username or email
});

export type UserFilter = z.infer<typeof userFilterSchema>;

// Seed data schema for demo users
export const seedUserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: userRoleSchema
});

export type SeedUser = z.infer<typeof seedUserSchema>;