import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // Do not use getSession() - it doesn't validate the token
    // getUser() makes a request to Supabase Auth server to revalidate the token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Token is invalid or expired - user needs to re-authenticate
      console.error('Auth error in middleware:', error.message);
      return { user: null, supabaseResponse };
    }

    return { user, supabaseResponse };
  } catch (error) {
    // Handle any unexpected errors gracefully
    console.error('Middleware auth error:', error);
    return { user: null, supabaseResponse };
  }
}
