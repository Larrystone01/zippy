"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const supabase = createClient();
  const pathname = usePathname();
  const onDashboard = pathname?.startsWith("/dashboard") ?? false;
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#e6dccb] bg-[#fbf8f1]/88 shadow-[0_8px_30px_rgba(23,19,15,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-bold text-[#17130f]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#17130f] text-sm text-[#f4c76b] shadow-[0_14px_30px_rgba(23,19,15,0.18)]">
            Z
          </span>
          <span className="tracking-wide">Zippy</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[#6f6253] md:flex">
          <Link href="/#how-it-works" className="transition hover:text-[#17130f]">
            How it works
          </Link>
          <Link href="/#pricing" className="transition hover:text-[#17130f]">
            Pricing
          </Link>
          {!user && (
            <Link href="/dashboard/rider" className="transition hover:text-[#17130f]">
              Become a rider
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {!onDashboard && (
                <Link
                  href="/dashboard/user"
                  className="text-sm font-semibold text-[#2a2118] transition hover:text-[#b2843a]"
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={signOut}
                className="rounded-xl border border-[#ded3c2] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2a2118] transition hover:border-[#b2843a] hover:bg-[#fffaf0]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm font-semibold text-[#2a2118] transition hover:text-[#b2843a]"
              >
                Sign in
              </Link>
              <Link
                href="/checkout"
                className="rounded-xl bg-[#17130f] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(23,19,15,0.16)] transition hover:bg-[#2a2118]"
              >
                Send a package
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
