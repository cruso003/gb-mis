import { PrismaClient } from './generated';
import { currentRlsContext } from './rls-context';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

/**
 * Wraps every Prisma operation in a transaction that first sets the RLS
 * session variables. The migration in
 * `20260427143000_add_rls_policies` has policies that read these vars:
 *
 *   app.current_user_id  — the authenticated user's UUID
 *   app.bypass_rls       — 'on' for SUPER_ADMIN / ADMIN, absent otherwise
 *
 * `SET LOCAL` scopes the value to the surrounding transaction, which is
 * the only safe way to use session settings under transaction-mode
 * pgBouncer (per docs/runbooks/deploy.md): the connection is returned
 * to the pool the moment the transaction commits, with no leak.
 *
 * Background jobs and CLI scripts that run outside an HTTP request have
 * no RLS context. Their queries pass through unwrapped and run as the
 * connecting role — which in production is a non-owner role with RLS
 * applied, so empty-scope queries are visible only when the operator
 * deliberately uses `runWithRlsContext` to impersonate a user.
 */
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query, model, operation }) {
      const ctx = currentRlsContext();
      if (!ctx) return query(args);

      // Use an interactive transaction. SET LOCAL persists for the
      // duration of the transaction; Prisma re-issues the operation on
      // the tx client so it runs against the same connection that holds
      // the session variables.
      return basePrisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.current_user_id', $1, true), set_config('app.bypass_rls', $2, true)`,
          ctx.userId,
          ctx.bypassRls ? 'on' : 'off',
        );
        if (model) {
          // Standard CRUD operation on a model.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (tx as any)[model][operation](args);
        }
        // Raw SQL ops ($queryRaw, $executeRaw, …) live directly on tx.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (tx as any)[operation](args);
      });
    },
  },
});

export { PrismaClient } from './generated';
export type { Prisma } from './generated';
