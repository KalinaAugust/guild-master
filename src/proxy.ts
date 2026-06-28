import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
const supabaseOrigin = supabaseUrl.origin;
const supabaseWsOrigin = `wss://${supabaseUrl.host}`;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Per-request nonce-based CSP. 'strict-dynamic' lets Next.js's nonced bootstrap
 * script vouch for the chunks it loads, so no host allowlist is needed for
 * scripts; 'self'+nonce is the fallback for CSP2 browsers that ignore
 * 'strict-dynamic'. 'unsafe-eval' is dev-only (HMR / React Refresh). Styles
 * keep 'unsafe-inline' since Next.js inlines critical CSS (low XSS risk).
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce);

  // Next.js reads the nonce from the request's CSP header and applies it to its
  // own scripts; x-nonce exposes it to app code via headers().
  const buildRequestHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set('x-nonce', nonce);
    headers.set('Content-Security-Policy', csp);
    return headers;
  };

  let response = NextResponse.next({
    request: {
      headers: buildRequestHeaders(),
    },
  });

  // Resolve the locale cookie up front, but apply it at finalize() time. Setting
  // it here would be lost when Supabase's setAll re-creates `response` below.
  const acceptLanguage = request.headers.get('accept-language');
  const localeToSet = request.cookies.get('NEXT_LOCALE')?.value
    ? null
    : acceptLanguage?.startsWith('ru')
      ? 'ru'
      : 'en';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          response = NextResponse.next({
            request: {
              headers: buildRequestHeaders(),
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Presence heartbeat: refresh last_seen_at at most once per 5 minutes. The
  // `ls_hb` cookie throttles writes so most requests skip the DB entirely.
  const needsHeartbeat = !!user && !request.cookies.get('ls_hb');
  if (needsHeartbeat && user) {
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);
  }

  // Apply the CSP header and pending cookies to whatever response we ultimately
  // return, so none are lost across response re-creation.
  const finalize = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', csp);
    // Carry over any cookies Supabase wrote during a session refresh (setAll
    // sets them on `response`). A redirect returns a brand-new response object,
    // so without this copy the rotated sb-* tokens would be dropped and never
    // reach the browser — breaking the refresh on any request that redirects.
    if (res !== response) {
      response.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
    }
    if (localeToSet) {
      res.cookies.set('NEXT_LOCALE', localeToSet);
    }
    if (needsHeartbeat) {
      res.cookies.set('ls_hb', '1', { maxAge: 300, httpOnly: true, sameSite: 'lax' });
    }
    return res;
  };

  // Protect all routes except the landing (/), /login and /auth/callback
  const isLandingPage = request.nextUrl.pathname === '/';
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isGuildDetailPage = request.nextUrl.pathname.match(/^\/guilds\/[^/]+/) !== null;
  const isPublicProfilePage = request.nextUrl.pathname.match(/^\/profile\/[^/]+/) !== null;

  if (!user && !isLandingPage && !isLoginPage && !isAuthCallback && !isGuildDetailPage && !isPublicProfilePage) {
    return finalize(NextResponse.redirect(new URL('/login', request.url)));
  }

  if (user && (isLoginPage || isLandingPage)) {
    return finalize(NextResponse.redirect(new URL('/home', request.url)));
  }

  return finalize(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
