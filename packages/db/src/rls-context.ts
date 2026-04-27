/**
 * Per-request RLS context.
 *
 * The API's RlsMiddleware pushes the authenticated user's identity and
 * the bypass flag into AsyncLocalStorage at the start of every request.
 * The Prisma client extension in `client.ts` reads from here and emits
 * a `SET LOCAL app.current_user_id = …` plus a `SET LOCAL app.bypass_rls = …`
 * inside the same transaction as every query, so the row-level security
 * policies in migration `20260427143000_add_rls_policies` see the right
 * scope regardless of how Prisma checks out connections from its pool.
 *
 * Background jobs (BullMQ workers) run without an active context. Their
 * queries pass through unscoped — those workers are trusted system
 * actors. If a worker needs to act on behalf of a specific user (e.g.
 * impersonation for a delayed export), it must wrap its work in
 * `runWithRlsContext({ ... }, async () => { … })`.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RlsContext {
  /** Authenticated user UUID. RLS policies look up the user's org-unit scope from this. */
  userId: string;
  /** True for SUPER_ADMIN / ADMIN — sets `app.bypass_rls = 'on'`. */
  bypassRls: boolean;
}

export const rlsContextStore = new AsyncLocalStorage<RlsContext>();

/**
 * Run `fn` inside an RLS context. Useful for one-off scripted operations
 * (seed scripts, jobs that need to run as a specific user). The middleware
 * is the normal path for HTTP requests.
 */
export function runWithRlsContext<T>(ctx: RlsContext, fn: () => Promise<T>): Promise<T> {
  return rlsContextStore.run(ctx, fn);
}

export function currentRlsContext(): RlsContext | undefined {
  return rlsContextStore.getStore();
}
