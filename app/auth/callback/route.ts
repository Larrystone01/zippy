import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { claimGuestOrders } from "@/lib/order/claimGuestOrders";

export async function GET(request: Request) {
  console.log("OAuth callback reached");
  const { searchParams, origin } = new URL(request.url);
  // Gets code to convert into session tokens
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
  }

  const supabase = createClient();

  // Exchange the OAuth code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  // Or like this
  // const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // const user = data.user;

  if (error) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
  }

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`);
  }

  // Check if this user already has a profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  console.log("User ID:", user.id);
  console.log("Profile:", profile);
  // First-time Google login
  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata.full_name,
      avatar_url: user.user_metadata.avatar_url,
      role: "customer",
    });

    if (insertError) {
      return NextResponse.redirect(
        `${origin}/auth/signin?error=profile_creation_failed`,
      );
    }

    // return NextResponse.redirect(`${origin}/dashboard/customer`);
  }

  if (user.email) {
    try {
      console.log("About to claim guest orders");
      await claimGuestOrders(user.email, user.id);
      console.log("Finished claiming guest orders");
    } catch (error) {
      console.error("Failed to claim guest orders:", error);
    }
  }

  // Existing user
  switch (profile?.role) {
    case "admin":
      return NextResponse.redirect(`${origin}/dashboard/admin`);

    case "rider":
      return NextResponse.redirect(`${origin}/dashboard/rider`);

    default:
      return NextResponse.redirect(`${origin}/dashboard/customer`);
  }
}
