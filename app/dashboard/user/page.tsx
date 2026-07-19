"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  package_size: string;
  distance_km: number | null;
  price: number;
  created_at: string;
  rider_id: string | null;
};

type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-[#fff4dd] text-[#987033]",
  assigned: "bg-[#f4c76b]/25 text-[#7a5a20]",
  picked_up: "bg-[#17130f]/8 text-[#2a2118]",
  in_transit: "bg-[#b2843a]/15 text-[#987033]",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

const STAT_ICONS: Record<string, string> = {
  "Total orders": "📦",
  Active: "🚴",
  Delivered: "✓",
  "Total spent": "₦",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function UserDashboard() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      console.log("Authenticated user:", user.email);
      console.log(user.email);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", user.id)
        .single();
      setProfile(profileData);
      console.log(profileData);

      const { data: guestOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_email", user.email)
        .is("customer_id", null);

      console.log("Guest orders:", guestOrders);
      if (guestOrders?.length) {
        const { data, error } = await supabase
          .from("orders")
          .update({
            customer_id: user.id,
          })
          .eq("customer_email", user.email)
          .is("customer_id", null);

        console.log("Updated rows:", data);
        console.log("Update error:", error);

        if (error) {
          console.error("Failed to claim guest orders:", error);
        }
      }

      const { data } = await supabase
        .from("orders")
        .select(
          "id, status, pickup_address, dropoff_address, package_size, distance_km, price, created_at, rider_id",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);

      if (!unsubscribe) {
        const channel = supabase
          .channel("user-orders")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `customer_id=eq.${user.id}`,
            },
            () => load(),
          )
          .subscribe();
        unsubscribe = () => supabase.removeChannel(channel);
      }
    };

    load();
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const active = orders.filter((o) =>
      ["pending", "assigned", "picked_up", "in_transit"].includes(o.status),
    ).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const totalSpent = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.price), 0);
    return { total: orders.length, active, delivered, totalSpent };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    switch (filter) {
      case "active":
        return orders.filter((o) =>
          ["pending", "assigned", "picked_up", "in_transit"].includes(o.status),
        );
      case "delivered":
        return orders.filter((o) => o.status === "delivered");
      case "cancelled":
        return orders.filter((o) => o.status === "cancelled");
      default:
        return orders;
    }
  }, [orders, filter]);

  const initials = (profile?.full_name || email || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="lux-shell max-w-4xl">
      {/* Profile header */}
      <div className="lux-profile-header">
        <div className="flex items-center gap-4">
          <div className="lux-avatar">{initials}</div>
          <div>
            <p className="lux-label">Your account</p>
            <h1 className="text-xl font-semibold text-[#17130f]">
              {profile?.full_name ? `Hi ${profile.full_name} 👋` : "Welcome 👋"}
            </h1>
            <p className="text-sm text-[#776c5f]">{email}</p>
            {profile?.phone && (
              <p className="text-sm text-[#776c5f]">{profile.phone}</p>
            )}
          </div>
        </div>
        <Link href="/checkout" className="lux-button-gold !px-5 !py-2.5">
          + New delivery
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Total orders", stats.total],
          ["Active", stats.active],
          ["Delivered", stats.delivered],
          ["Total spent", `₦${stats.totalSpent.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label as string} className="lux-stat pl-6">
            <p className="text-lg opacity-60">{STAT_ICONS[label as string]}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#9a8e7d]">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#17130f]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="lux-section-title">Your orders</h2>
        <div className="lux-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "lux-tab-active" : "lux-tab"}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <p className="lux-muted">Loading…</p>
        ) : filteredOrders.length === 0 ? (
          <div className="lux-empty">
            {orders.length === 0
              ? "No orders yet — book your first delivery!"
              : "No orders match this filter."}
          </div>
        ) : (
          filteredOrders.map((o) => (
            <Link
              key={o.id}
              href={`/track/${o.id}`}
              className="lux-order-card-link"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9a8e7d]">
                  <span className="font-mono">#{o.id.slice(0, 8)}</span>
                  <span>·</span>
                  <span>
                    {new Date(o.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{o.package_size} package</span>
                  {o.distance_km != null && (
                    <>
                      <span>·</span>
                      <span>{Number(o.distance_km).toFixed(1)} km</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#2a2118]">
                  <span className="font-medium">{o.pickup_address}</span>
                  <span className="mx-2 text-[#c4b8a8]">→</span>
                  <span className="font-medium">{o.dropoff_address}</span>
                </p>
                {!o.rider_id && o.status === "pending" && (
                  <p className="mt-1.5 text-xs text-[#9a8e7d]">
                    Waiting for a rider to accept…
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-center">
                <span className={`lux-badge ${STATUS_COLOR[o.status]}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                <p className="text-lg font-semibold text-[#987033]">
                  ₦{Number(o.price).toLocaleString()}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
