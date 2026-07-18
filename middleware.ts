import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  const isCheckout = pathname.startsWith("/checkout");
  const isDashboard = pathname.startsWith("/dashboard");
  const isProtected = isDashboard;
  const isAuthPage = pathname === "/signin" || pathname === "/signup";
  const shouldCheckAuth = isProtected || isAuthPage;

  if (!shouldCheckAuth) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL("/auth/signin", request.url);

    if (isCheckout) {
      redirectUrl.searchParams.set(
        "next",
        request.nextUrl.pathname + request.nextUrl.search,
      );
    }

    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || error) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  const role = profile.role;
  if (isAuthPage) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }

    if (role === "driver") {
      return NextResponse.redirect(new URL("/dashboard/driver", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard/user", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
