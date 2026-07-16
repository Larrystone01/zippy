"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

type Profile = {
  full_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  application_status: ApplicationStatus;
  role: string;
};

const VEHICLE_TYPES = ["Bicycle", "Motorcycle", "Car", "Van", "Truck"];

const STATUS_INFO: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  none: { label: "Not submitted", className: "bg-gray-100 text-gray-600" },
  pending: {
    label: "Pending review",
    className: "bg-yellow-100 text-yellow-700",
  },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Not approved", className: "bg-red-100 text-red-700" },
};

export default function RiderProfilePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ApplicationStatus>("none");
  const [role, setRole] = useState<string>("customer");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, vehicle_type, application_status, role")
        .eq("id", user.id)
        .single();

      const profile = data as Profile | null;
      setFullName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      setVehicleType(profile?.vehicle_type ?? VEHICLE_TYPES[0]);
      setStatus(profile?.application_status ?? "none");
      setRole(profile?.role ?? "customer");
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!userId) return;
    if (!fullName.trim() || !phone.trim() || !vehicleType) {
      setError("Please fill in your name, phone number, and vehicle type.");
      return;
    }

    setSaving(true);

    const nextStatus: ApplicationStatus =
      role === "rider" || role === "admin" ? status : "pending";

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        vehicle_type: vehicleType,
        application_status: nextStatus,
      })
      .eq("id", userId);

    setSaving(false);
    if (error) return setError(error.message);

    setStatus(nextStatus);
    setSaved(true);
  };

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading…</div>;

  if (!userId) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-gray-500">
          Sign in to manage your rider profile.
        </p>
      </div>
    );
  }

  const isRider = role === "rider" || role === "admin";
  const info = STATUS_INFO[status];

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">Profile & vehicle</h1>
      <p className="mt-1 text-sm text-gray-500">
        {isRider
          ? "Update your details any time — this won't affect your approved status."
          : "Fill this in to submit (or resubmit) your rider application."}
      </p>

      <div className="mt-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${info.className}`}
        >
          {info.label}
        </span>
      </div>

      <form onSubmit={save} className="mt-6 flex flex-col gap-3">
        <input
          required
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="outline-brand-500 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="outline-brand-500 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div>
          <label className="text-sm font-medium text-gray-700">
            Vehicle type
          </label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="outline-brand-500 mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {VEHICLE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-green-600">
            {isRider
              ? "Saved."
              : "Application submitted — an admin will review it soon."}
          </p>
        )}

        <button
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 mt-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : isRider ? "Save changes" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
