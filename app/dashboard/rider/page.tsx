"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { LatLng } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type Order = {
  id: string;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  price: number;
  distance_km: number | null;
  created_at: string;
  rider_id: string | null;
  package_size: string | null;
  package_note: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
};

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

type Profile = {
  full_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  is_online: boolean | null;
  created_at: string;
  role: string;
  application_status: ApplicationStatus;
};

const NEXT_STATUS: Record<string, string> = {
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};
const ACTION_LABEL: Record<string, string> = {
  assigned: "Mark picked up",
  picked_up: "Start delivery",
  in_transit: "Mark delivered",
};

export default function RiderDashboard() {
  const supabase = createClient();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isRider, setIsRider] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [available, setAvailable] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const refresh = async (uid: string) => {
    const { data: avail } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setAvailable(avail ?? []);

    const { data: mine } = await supabase
      .from("orders")
      .select("*")
      .eq("rider_id", uid)
      .in("status", ["assigned", "picked_up", "in_transit"])
      .order("created_at", { ascending: false });
    setMyOrders(mine ?? []);

    const { data: completed } = await supabase
      .from("orders")
      .select("*")
      .eq("rider_id", uid)
      .eq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(10);
    setCompletedOrders(completed ?? []);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCheckingAccess(false);
        return;
      }
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, vehicle_type, is_online, created_at, role, application_status",
        )
        .eq("id", user.id)
        .single();

      setProfile(profileData);
      setIsOnline(!!profileData?.is_online);
      setIsRider(
        profileData?.role === "rider" || profileData?.role === "admin",
      );
      setCheckingAccess(false);

      if (profileData?.role === "rider" || profileData?.role === "admin") {
        await refresh(user.id);

        const channel = supabase
          .channel("rider-orders")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders" },
            () => refresh(user.id),
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOnline || !userId || !isRider || !("geolocation" in navigator))
      return;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(point);
        await supabase
          .from("profiles")
          .update({ current_lat: point.lat, current_lng: point.lng })
          .eq("id", userId);
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 10000 },
    );

    return () => {
      if (watchId.current !== null)
        navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isOnline, userId, isRider, supabase]);

  const toggleOnline = async () => {
    if (!userId) return;
    const next = !isOnline;
    setIsOnline(next);
    await supabase
      .from("profiles")
      .update({ is_online: next })
      .eq("id", userId);
  };

  const acceptOrder = async (order: Order) => {
    if (!userId) return;
    await supabase
      .from("orders")
      .update({ rider_id: userId, status: "assigned" })
      .eq("id", order.id)
      .eq("status", "pending");

    await supabase.from("order_events").insert({
      order_id: order.id,
      status: "assigned",
      note: "Rider accepted the order",
    });
    refresh(userId);
  };

  const advanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
    await supabase.from("order_events").insert({
      order_id: order.id,
      status: next,
      lat: myLocation?.lat,
      lng: myLocation?.lng,
    });
    if (userId) refresh(userId);
  };

  // ---- Access gates ----
  if (checkingAccess) {
    return <div className="p-10 text-center text-gray-500">Loading…</div>;
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-gray-500">
          Sign in to access the rider dashboard.
        </p>
      </div>
    );
  }

  if (!isRider) {
    const status = profile?.application_status ?? "none";

    const COPY: Record<
      ApplicationStatus,
      { title: string; body: string; cta: string }
    > = {
      none: {
        title: "Become a rider",
        body: "Fill in your details in Profile & vehicle to submit your application.",
        cta: "Complete your application",
      },
      pending: {
        title: "Application submitted",
        body: `Thanks${profile?.full_name ? `, ${profile.full_name}` : ""}! Your application is under review. You'll get access to this dashboard once an admin approves it.`,
        cta: "View or edit your application",
      },
      rejected: {
        title: "Application not approved",
        body: "Your previous application wasn't approved. You're welcome to update your details and reapply.",
        cta: "Update and reapply",
      },
      approved: { title: "", body: "", cta: "" }, // unreachable here
    };
    const copy = COPY[status];

    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-xl font-bold">{copy.title}</h1>
        <p className="mt-2 text-gray-500">{copy.body}</p>
        <Link
          href="/dashboard/rider/profile"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {copy.cta}
        </Link>
      </div>
    );
  }

  // ---- Rider stats ----
  const totalEarnings = completedOrders.reduce(
    (sum, o) => sum + Number(o.price),
    0,
  );
  const today = new Date().toDateString();
  const todayEarnings = completedOrders
    .filter((o) => new Date(o.created_at).toDateString() === today)
    .reduce((sum, o) => sum + Number(o.price), 0);
  const initials = (profile?.full_name || "R")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      {/* Profile header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {profile?.full_name || "Rider"}
            </h1>
            <p className="text-sm text-gray-500">
              {profile?.vehicle_type ? `${profile.vehicle_type} · ` : ""}
              {profile?.phone ?? "No phone on file"}
            </p>
            {profile?.created_at && (
              <p className="text-xs text-gray-400">
                Riding since{" "}
                {new Date(profile.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={toggleOnline}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${
            isOnline ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          {isOnline ? "🟢 Online — accepting jobs" : "⚪ Offline"}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Active deliveries", myOrders.length],
          ["Completed", completedOrders.length],
          ["Today's earnings", `₦${todayEarnings.toLocaleString()}`],
          ["Total earnings", `₦${totalEarnings.toLocaleString()}`],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-xl border bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Map rider={myLocation} height={340} />

        <div>
          <h2 className="mb-2 font-semibold">Your active deliveries</h2>
          {myOrders.length === 0 && (
            <p className="text-sm text-gray-500">
              No active deliveries right now.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {myOrders.map((o) => {
              const isExpanded = expandedOrderId === o.id;
              return (
                <div
                  key={o.id}
                  className="rounded-xl border bg-white p-4 shadow-sm"
                >
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm">
                        {o.pickup_address} → {o.dropoff_address}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>₦{Number(o.price).toLocaleString()}</span>
                        {o.distance_km != null && (
                          <>
                            <span>·</span>
                            <span>{Number(o.distance_km).toFixed(1)} km</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`mt-1 shrink-0 text-gray-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 border-t pt-3 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">
                          Package size:
                        </span>{" "}
                        <span className="capitalize">
                          {o.package_size ?? "—"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">
                          Recipient:
                        </span>{" "}
                        {o.recipient_name || "—"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">
                          Recipient phone:
                        </span>{" "}
                        {o.recipient_phone || "—"}
                      </p>
                      {o.package_note && (
                        <p>
                          <span className="font-medium text-gray-800">
                            Notes:
                          </span>{" "}
                          {o.package_note}
                        </p>
                      )}
                      <p>
                        <span className="font-medium text-gray-800">
                          Pickup:
                        </span>{" "}
                        {o.pickup_address}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">
                          Drop-off:
                        </span>{" "}
                        {o.dropoff_address}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium capitalize text-gray-500">
                      {o.status.replace("_", " ")}
                    </span>
                    {NEXT_STATUS[o.status] && (
                      <button
                        onClick={() => advanceStatus(o)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        {ACTION_LABEL[o.status]}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <h2 className="mt-10 mb-3 font-semibold">
        Available jobs {isOnline ? "" : "(go online to accept)"}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {available.length === 0 && (
          <p className="text-sm text-gray-500">No pending orders nearby.</p>
        )}
        {available.map((o) => (
          <div key={o.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm">
              {o.pickup_address} → {o.dropoff_address}
            </p>
            <div className="mt-1 text-xs text-gray-500">
              {o.distance_km != null
                ? `${Number(o.distance_km).toFixed(1)} km`
                : ""}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold">
                ₦{Number(o.price).toLocaleString()}
              </span>
              <button
                disabled={!isOnline}
                onClick={() => acceptOrder(o)}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
              >
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-3 font-semibold">Recent completed deliveries</h2>
      {completedOrders.length === 0 ? (
        <p className="text-sm text-gray-500">No completed deliveries yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {completedOrders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm">
                  {o.pickup_address} → {o.dropoff_address}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(o.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="font-semibold text-green-700">
                +₦{Number(o.price).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
