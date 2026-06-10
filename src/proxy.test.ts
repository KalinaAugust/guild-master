import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Module-level code in proxy.ts parses NEXT_PUBLIC_SUPABASE_URL at import time,
// so the env must be set (via vi.hoisted, which runs before imports). The same
// holder exposes the supabase mock and captures the cookie adapter so tests can
// simulate a session refresh (setAll).
const h = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  return {
    getUser: vi.fn(),
    cookies: null as null | {
      setAll: (c: { name: string; value: string; options?: object }[]) => void;
    },
  };
});

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: NonNullable<typeof h.cookies> }
  ) => {
    h.cookies = options.cookies;
    return { auth: { getUser: h.getUser } };
  },
}));

import { proxy } from './proxy';

const makeRequest = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), { headers });

const authed = () => h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
const anon = () => h.getUser.mockResolvedValue({ data: { user: null } });

beforeEach(() => {
  vi.clearAllMocks();
  h.cookies = null;
});

describe('proxy CSP headers', () => {
  it('sets a nonce-based, strict-dynamic CSP on the response', async () => {
    authed();
    const res = await proxy(makeRequest('/'));
    const csp = res.headers.get('content-security-policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src [^;]*'strict-dynamic'/);
    expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=-]+'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('whitelists the Supabase origin for img-src and connect-src', async () => {
    authed();
    const res = await proxy(makeRequest('/'));
    const csp = res.headers.get('content-security-policy')!;

    expect(csp).toMatch(/img-src [^;]*https:\/\/test\.supabase\.co/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/test\.supabase\.co/);
    expect(csp).toMatch(/connect-src [^;]*wss:\/\/test\.supabase\.co/);
  });

  it('generates a fresh nonce on every request', async () => {
    authed();
    const nonceOf = (res: { headers: Headers }) =>
      res.headers.get('content-security-policy')!.match(/'nonce-([^']+)'/)![1];

    const a = nonceOf(await proxy(makeRequest('/')));
    const b = nonceOf(await proxy(makeRequest('/')));

    expect(a).not.toEqual(b);
  });

  it('exposes the nonce to downstream via the x-nonce request header', async () => {
    authed();
    const res = await proxy(makeRequest('/'));
    const csp = res.headers.get('content-security-policy')!;
    const nonce = csp.match(/'nonce-([^']+)'/)![1];

    // NextResponse.next({ request: { headers } }) encodes overridden request
    // headers as x-middleware-request-* on the response.
    expect(res.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
  });
});

describe('proxy route protection', () => {
  it('redirects an unauthenticated user from a protected route to /login', async () => {
    anon();
    const res = await proxy(makeRequest('/guild-chat'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    // CSP must still be present on redirects.
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('redirects an authenticated user away from /login to /', async () => {
    authed();
    const res = await proxy(makeRequest('/login'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('lets an unauthenticated user reach /login without redirect', async () => {
    anon();
    const res = await proxy(makeRequest('/login'));

    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('lets an unauthenticated user reach public guild/profile pages', async () => {
    anon();
    const guild = await proxy(makeRequest('/guilds/abc'));
    const profile = await proxy(makeRequest('/profile/abcd1234'));

    expect(guild.headers.get('location')).toBeNull();
    expect(profile.headers.get('location')).toBeNull();
  });
});

describe('proxy locale cookie', () => {
  it('sets NEXT_LOCALE from accept-language when the cookie is absent', async () => {
    authed();
    const res = await proxy(
      makeRequest('/', { 'accept-language': 'ru-RU,ru;q=0.9' })
    );

    expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('ru');
  });

  it('defaults NEXT_LOCALE to en for non-ru accept-language', async () => {
    authed();
    const res = await proxy(makeRequest('/', { 'accept-language': 'en-US' }));

    expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('en');
  });

  it('does not overwrite an existing NEXT_LOCALE cookie', async () => {
    authed();
    const res = await proxy(
      makeRequest('/', { cookie: 'NEXT_LOCALE=en', 'accept-language': 'ru' })
    );

    expect(res.cookies.get('NEXT_LOCALE')).toBeUndefined();
  });

  it('preserves NEXT_LOCALE even when Supabase refreshes the session (setAll)', async () => {
    // Simulate a token refresh: getUser triggers setAll, which re-creates the
    // internal response. The locale cookie must survive (regression guard).
    h.getUser.mockImplementation(async () => {
      h.cookies?.setAll([
        { name: 'sb-access-token', value: 'fresh', options: {} },
      ]);
      return { data: { user: { id: 'u1' } } };
    });

    const res = await proxy(makeRequest('/', { 'accept-language': 'ru' }));

    expect(res.cookies.get('NEXT_LOCALE')?.value).toBe('ru');
    expect(res.cookies.get('sb-access-token')?.value).toBe('fresh');
  });
});
