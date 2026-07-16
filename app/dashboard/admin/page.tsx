"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  price: number;
  created_at: string;
  rider_id: string | null;
  customer_id: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  is_online: boolean | null;
};

type Applicant = {
  id: string;
  full_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  application_status: string;
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
  Pending: "⏳",
  Active: "🚴",
  Delivered: "✓",
  Revenue: "₦",
};

export default function AdminDashboard() {
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Profile[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [tab, setTab] = useState<"orders" | "riders" | "applications">(
    "orders",
  );

  const load = async () => {
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders(orderData ?? []);

    const { data: riderData } = await supabase
      .from("profiles")
      .select("id, full_name, role, is_online")
      .eq("role", "rider");
    setRiders(riderData ?? []);

    const { data: applicantData } = await supabase
      .from("profiles")
      .select("id, full_name, phone, vehicle_type, application_status")
      .eq("application_status", "pending");
    setApplicants(applicantData ?? []);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setAuthorized(false);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") return setAuthorized(false);
      setAuthorized(true);
      await load();

      const channel = supabase
        .channel("admin-orders")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          load,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          load,
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignRider = async (orderId: string, riderId: string) => {
    await supabase
      .from("orders")
      .update({ rider_id: riderId, status: "assigned" })
      .eq("id", orderId);
    await supabase.from("order_events").insert({
      order_id: orderId,
      status: "assigned",
      note: "Assigned by admin",
    });
    load();
  };

  const cancelOrder = async (orderId: string) => {
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    load();
  };

  const approveApplicant = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ role: "rider", application_status: "approved" })
      .eq("id", id);
    load();
  };

  const rejectApplicant = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ application_status: "rejected" })
      .eq("id", id);
    load();
  };

  if (authorized === null)
    return <div className="lux-shell p-10 text-center lux-muted">Loading…</div>;

  if (authorized === false) {
    return (
      <div className="lux-shell p-10 text-center">
        <div className="lux-card mx-auto max-w-md p-8">
          <h1 className="text-xl font-semibold text-[#17130f]">Admins only</h1>
          <p className="mt-2 lux-muted">
            Your account doesn&apos;t have admin access. Ask an existing admin to
            set your <code className="rounded bg-[#fff4dd] px-1.5 py-0.5 text-[#987033]">role</code> to{" "}
            <code className="rounded bg-[#fff4dd] px-1.5 py-0.5 text-[#987033]">admin</code> in the{" "}
            <code className="rounded bg-[#fff4dd] px-1.5 py-0.5 text-[#987033]">profiles</code> table.
          </p>
        </div>
      </div>
    );
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    active: orders.filter((o) =>
      ["assigned", "picked_up", "in_transit"].includes(o.status),
    ).length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    revenue: orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + Number(o.price), 0),
  };

  return (
    <div className="lux-shell">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="lux-label">Operations</p>
          <h1 className="lux-page-title mt-1">Admin dashboard</h1>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["Total orders", stats.total],
          ["Pending", stats.pending],
          ["Active", stats.active],
          ["Delivered", stats.delivered],
          ["Revenue", `₦${stats.revenue.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label as string} className="lux-stat pl-6">
            <p className="text-lg opacity-60">{STAT_ICONS[label as string]}</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#9a8e7d]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#17130f]">{value}</p>
          </div>
        ))}
      </div>

      <div className="lux-tab-bar mt-8">
        {(["orders", "riders", "applications"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "lux-tab-bar-item-active" : "lux-tab-bar-item"}
          >
            {t}
            {t === "applications" && applicants.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {applicants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="mt-6 overflow-x-auto">
          <table className="lux-table">
            <thead>
              <tr className="border-b border-[#e7dece] bg-[#fbf8f1]/80 text-left text-xs font-semibold uppercase tracking-wide text-[#9a8e7d]">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[#e7dece]/60 transition hover:bg-[#fbf8f1]/50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[#776c5f]">{o.id.slice(0, 8)}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[#2a2118]">
                    {o.pickup_address} → {o.dropoff_address}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`lux-badge capitalize ${STATUS_COLOR[o.status]}`}
                    >
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#987033]">
                    ₦{Number(o.price).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {o.status === "pending" ? (
                      <select
                        onChange={(e) =>
                          e.target.value && assignRider(o.id, e.target.value)
                        }
                        defaultValue=""
                        className="lux-input !py-1.5 !text-xs"
                      >
                        <option value="" disabled>
                          Assign rider…
                        </option>
                        {riders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.full_name} {r.is_online ? "🟢" : "⚪"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      (riders.find((r) => r.id === o.rider_id)?.full_name ??
                      "—")
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!["delivered", "cancelled"].includes(o.status) && (
                      <button
                        onClick={() => cancelOrder(o.id)}
                        className="text-xs font-semibold text-red-600 transition hover:text-red-700 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "riders" && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {riders.map((r) => (
            <div key={r.id} className="lux-card p-5">
              <div className="flex items-center gap-3">
                <div className="lux-avatar !h-10 !w-10 !text-sm">
                  {(r.full_name ?? "R").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[#17130f]">{r.full_name ?? "Unnamed rider"}</p>
                  <p className={`mt-0.5 text-xs font-medium ${r.is_online ? "text-emerald-600" : "text-[#9a8e7d]"}`}>
                    {r.is_online ? "● Online" : "○ Offline"}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {riders.length === 0 && (
            <p className="lux-empty col-span-full">No riders registered yet.</p>
          )}
        </div>
      )}

      {tab === "applications" && (
        <div className="mt-6 flex flex-col gap-4">
          {applicants.length === 0 && (
            <p className="lux-empty">
              No pending rider applications.
            </p>
          )}
          {applicants.map((a) => (
            <div
              key={a.id}
              className="lux-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="lux-avatar !h-10 !w-10 !text-sm">
                  {(a.full_name ?? "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[#17130f]">
                    {a.full_name ?? "Unnamed applicant"}
                  </p>
                  <p className="mt-0.5 text-sm text-[#776c5f]">
                    {a.phone ?? "No phone"} ·{" "}
                    {a.vehicle_type ?? "No vehicle listed"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveApplicant(a.id)}
                  className="lux-button-gold !px-4 !py-2 !text-xs"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectApplicant(a.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
