"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth, User } from "@/app/context/AuthContext";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = params.get("next"); // null unless the caller specified one (e.g. /checkout)

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user } = useAuth();

  useEffect(() => {
    const errParam = params.get("error");
    if (errParam === "auth_failed") {
      setError(
        "Google sign-in didn't complete. This is usually a provider configuration issue (redirect URI or credentials) rather than something wrong with your account — check Supabase's Authentication → Logs for the exact reason, or try again.",
      );
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the caller asked for a specific destination (e.g. checkout after
  // booking, or a deep link), always honor that. Otherwise, send riders and
  // admins straight to their own dashboard instead of defaulting everyone
  // to the customer dashboard regardless of role.
  const resolveDestination = (role: string) => {
    if (explicitNext) return explicitNext;
    console.log("User's Role:", role);
    switch (role) {
      case "admin":
        return "/dashboard/admin";
      case "rider":
        return "/dashboard/rider";
      default:
        return "/dashboard/user";
    }
  };

  const signInWithProvider = async (provider: "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Only forward an explicit next — if there isn't one, the callback
        // route resolves the role-based destination itself after exchanging
        // the OAuth code (it doesn't have a userId to work with until then).
        redirectTo: explicitNext
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(explicitNext)}`
          : `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const loggedInUser = await login(email, password);
    router.push(resolveDestination(loggedInUser.role));
    router.refresh();
  };

  // const signInWithEmail = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError(null);
  //   const { data, error } = await supabase.auth.signInWithPassword({
  //     email,
  //     password,
  //   });
  //   setLoading(false);
  //   if (error) return setError(error.message);
  //   if (data.user) {
  //     router.push(await resolveDestination(data.user.id));
  //     router.refresh();
  //   }
  // };

  return (
    <div className="lux-shell flex min-h-[calc(100vh-72px)] max-w-md flex-col justify-center">
      <div className="lux-card p-6 sm:p-8">
        <p className="lux-label">Secure access</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#17130f]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6f6253]">
          Sign in to track deliveries, manage orders, and keep every handoff in
          view.
        </p>

        {error && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => signInWithProvider("google")}
            className="lux-button-soft flex items-center justify-center gap-2"
          >
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8e7d]">
          <div className="h-px flex-1 bg-[#e7dece]" />
          OR
          <div className="h-px flex-1 bg-[#e7dece]" />
        </div>

        <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="lux-input"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="lux-input"
          />
          <button disabled={loading} className="lux-button-gold">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6f6253]">
          No account?{" "}
          <Link href="/auth/signup" className="font-semibold text-[#b2843a]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 15.9 3 8.9 7.6 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 36.4 26.9 37 24 37c-5.2 0-9.6-3.3-11.2-7.9l-6.6 5.1C8.9 40.4 15.9 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.8 36.1 45 30.6 45 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
