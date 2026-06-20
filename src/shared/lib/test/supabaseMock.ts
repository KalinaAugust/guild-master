import { vi } from 'vitest';

/**
 * Chainable Supabase query-builder mock. Every filter/modifier method returns
 * the same builder; the terminal methods (`single`/`maybeSingle`) and a direct
 * `await` (via `then`) all resolve to `result`.
 *
 * Configure one per `.from()` call with `from.mockReturnValueOnce(query(...))`.
 */
export function query(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'gt', 'lt', 'limit', 'delete', 'insert', 'update', 'upsert', 'in', 'order']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => void) => resolve(result);
  return builder;
}

/**
 * A mock user-session Supabase client: `auth.getUser()` resolves to `user`
 * (pass `null` to simulate an unauthenticated request) and `from` is the
 * provided query-builder factory.
 */
export function mockClient(opts: {
  user?: { id: string } | null;
  from?: ReturnType<typeof vi.fn>;
} = {}) {
  const user = opts.user === undefined ? { id: 'u1' } : opts.user;
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: opts.from ?? vi.fn(),
  };
}

/** A mock admin client whose `from(...).insert(...)` resolves successfully. */
export function mockAdminClient() {
  return { from: vi.fn(() => query({ error: null })) };
}
