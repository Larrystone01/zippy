"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

type Role = "customer" | "rider";
const VEHICLE_TYPES = ["Bicycle", "Motorcycle", "Car", "Van", "Truck"];

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const supabase = createClient();
  const router = useRouter();
  const { saveUser } = useAuth();

  // "role" -> pick customer/rider, "form" -> role-specific fields,
  // "verify" -> 6-digit code entry (only reached if "Confirm email" is on)
  const [step, setStep] = useState<"role" | "form" | "verify">("role");
  const [role, setRole] = useState<Role | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const chooseRole = (r: Role) => {
    setRole(r);
    setStep("form");
  };

  const signInWithProvider = async (provider: "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const completeSignupAs = async (userId: string) => {
    if (role === "rider") {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone.trim(),
          vehicle_type: vehicleType,
          application_status: "pending",
        })
        .eq("id", userId);
      if (error) throw error;
      router.push("/dashboard/rider");
    } else {
      router.push("/dashboard/user");
    }
    // router.refresh();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlreadyRegistered(false);

    if (role === "rider" && (!phone.trim() || !vehicleType)) {
      setError("Please add your phone number and vehicle type.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          setAlreadyRegistered(true);
        } else {
          setError(error.message);
        }
        return;
      }
      if (!data.user) {
        setError("No new user found");
        setLoading(false);
        return;
      }
      if (!data.session) {
        setLoading(false);
        setStep("verify");
        return;
      }
      if (!role) {
        throw new Error("No role selected");
      }
      saveUser({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name ?? fullName,
        email: data.user.email,
        role,
      });

      await completeSignupAs(data.user.id);
      switch (role) {
        case "rider":
          router.push("/dashboard/rider");
        default:
          router.push("/dashboard/user");
      }
      // setStep("verify");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    if (code.trim().length !== 6) {
      setVerifyError("Enter the 6-digit code from your email.");
      return;
    }

    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "signup",
    });
    setVerifying(false);

    if (error) return setVerifyError(error.message);
    if (data.user) await completeSignupAs(data.user.id);
  };

  const resendCode = async () => {
    setResending(true);
    setResendMessage(null);
    setVerifyError(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) return setVerifyError(error.message);
    setResendMessage("A new code has been sent to your email.");
  };

  if (step === "role") {
    return (
      <div className="lux-shell flex min-h-[calc(100vh-72px)] max-w-lg flex-col justify-center">
        <div className="lux-card p-6 sm:p-8">
          <p className="lux-label">Join Zippy</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#17130f]">
            Choose your lane
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6f6253]">
            Start as a sender or apply to join the rider network.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => chooseRole("customer")}
              className="rounded-2xl border border-[#e7dece] bg-white/80 p-5 text-left shadow-sm transition hover:border-[#b2843a] hover:bg-[#fffaf0]"
            >
              <p className="font-semibold text-[#17130f]">Send packages</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6253]">
                Book riders to pick up and drop off deliveries.
              </p>
            </button>
            <button
              onClick={() => chooseRole("rider")}
              className="rounded-2xl border border-[#e7dece] bg-white/80 p-5 text-left shadow-sm transition hover:border-[#b2843a] hover:bg-[#fffaf0]"
            >
              <p className="font-semibold text-[#17130f]">Ride & earn</p>
              <p className="mt-2 text-sm leading-6 text-[#6f6253]">
                Apply as a courier and accept nearby deliveries. Requires admin
                approval.
              </p>
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8e7d]">
            <div className="h-px flex-1 bg-[#e7dece]" />
            OR
            <div className="h-px flex-1 bg-[#e7dece]" />
          </div>

          <button
            onClick={() => signInWithProvider("google")}
            className="lux-button-soft flex w-full items-center justify-center"
          >
            Continue with Google
          </button>
          <p className="mt-3 text-center text-xs text-[#8b7f70]">
            Signs you up as a customer. You can apply to ride later from your
            dashboard.
          </p>

          <p className="mt-6 text-center text-sm text-[#6f6253]">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-semibold text-[#b2843a]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="lux-shell flex min-h-[calc(100vh-72px)] max-w-md flex-col justify-center text-center">
        <div className="lux-card p-6 sm:p-8">
          <p className="lux-label">Verification</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#17130f]">
            Check your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6f6253]">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below
            to activate your account.
          </p>

          <form
            onSubmit={verifyCode}
            className="mx-auto mt-6 flex max-w-xs flex-col gap-3"
          >
            <input
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="lux-input text-center text-lg tracking-[0.4em]"
            />
            {verifyError && (
              <p className="text-sm text-red-600">{verifyError}</p>
            )}
            {resendMessage && (
              <p className="text-sm text-emerald-700">{resendMessage}</p>
            )}
            <button disabled={verifying} className="lux-button-gold">
              {verifying ? "Verifying…" : "Verify & continue"}
            </button>
          </form>

          <button
            onClick={resendCode}
            disabled={resending}
            className="mt-4 text-sm font-semibold text-[#b2843a] hover:underline disabled:opacity-60"
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lux-shell flex min-h-[calc(100vh-72px)] max-w-md flex-col justify-center">
      <div className="lux-card p-6 sm:p-8">
        <button
          onClick={() => setStep("role")}
          className="mb-5 text-sm font-semibold text-[#8b7f70] hover:text-[#17130f]"
        >
          ← Back
        </button>

        <p className="lux-label">
          {role === "rider" ? "Rider application" : "Customer account"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#17130f]">
          {role === "rider" ? "Apply to ride" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6f6253]">
          {role === "rider"
            ? "Add your details below. An admin will review your application before you can accept deliveries."
            : "Send packages in minutes."}
        </p>

        <form onSubmit={signUp} className="mt-6 flex flex-col gap-3">
          <input
            required
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="lux-input"
          />
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
            minLength={6}
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="lux-input"
          />

          {role === "rider" && (
            <>
              <input
                required
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="lux-input"
              />
              <div>
                <label className="lux-label">Vehicle type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="lux-input mt-2"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {alreadyRegistered && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              An account with this email already exists.{" "}
              <Link
                href={`/auth/signin?next=${encodeURIComponent(
                  role === "rider"
                    ? "/dashboard/rider/profile"
                    : "/dashboard/user",
                )}`}
                className="font-semibold underline"
              >
                Sign in instead
              </Link>
              {role === "rider" &&
                " — you can apply to ride from your dashboard once you're in."}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="lux-button-gold">
            {loading
              ? "Creating account…"
              : role === "rider"
                ? "Submit application"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-semibold text-[#b2843a]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
