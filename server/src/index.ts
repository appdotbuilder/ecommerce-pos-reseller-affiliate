import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  createUserInputSchema, 
  updateUserInputSchema, 
  loginInputSchema,
  userFilterSchema,
  userRoleSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getUserById } from './handlers/get_user_by_id';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';
import { loginUser } from './handlers/login_user';
import { seedDemoUsers, getDemoUsers } from './handlers/seed_demo_users';
import { getUsersByRole } from './handlers/get_users_by_role';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management endpoints
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .input(userFilterSchema.optional())
    .query(({ input }) => getUsers(input)),

  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteUser(input)),

  // Authentication endpoints
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Role-based queries
  getUsersByRole: publicProcedure
    .input(userRoleSchema)
    .query(({ input }) => getUsersByRole(input)),

  // Demo data management
  seedDemoUsers: publicProcedure
    .mutation(() => seedDemoUsers()),

  getDemoUsers: publicProcedure
    .query(() => getDemoUsers()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log('Available endpoints:');
  console.log('- healthcheck: GET /healthcheck');
  console.log('- createUser: POST /createUser');
  console.log('- getUsers: GET /getUsers');
  console.log('- getUserById: GET /getUserById');
  console.log('- updateUser: POST /updateUser');
  console.log('- deleteUser: POST /deleteUser');
  console.log('- login: POST /login');
  console.log('- getUsersByRole: GET /getUsersByRole');
  console.log('- seedDemoUsers: POST /seedDemoUsers');
  console.log('- getDemoUsers: GET /getDemoUsers');
  console.log('\nDemo user credentials (for testing):');
  console.log('Admin: admin@demo.com / admin123');
  console.log('Reseller: reseller@demo.com / reseller123');
  console.log('User: user@demo.com / user123');
}

start();