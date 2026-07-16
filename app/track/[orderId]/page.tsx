"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { LatLng } from "@/components/Map";
import Button from "@/components/Button";

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
  rider_id: string | null;
  price: number;
  distance_km: number;
};

type OrderEvent = {
  id: number;
  status: string | null;
  note: string | null;
  created_at: string;
};

const STATUS_STEPS = [
  "pending",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
];
const STATUS_LABEL: Record<string, string> = {
  pending: "Order placed",
  assigned: "Rider assigned",
  picked_up: "Package picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function TrackOrderPage({
  params,
}: {
  params: { orderId: string };
}) {
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<{
    full_name: string | null;
    current_lat: number | null;
    current_lng: number | null;
  } | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let riderChannel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.orderId)
        .single();
      setOrder(orderData);

      const { data: eventData } = await supabase
        .from("order_events")
        .select("*")
        .eq("order_id", params.orderId)
        .order("created_at", { ascending: true });
      setEvents(eventData ?? []);

      if (orderData?.rider_id) {
        const { data: riderData } = await supabase
          .from("profiles")
          .select("full_name, current_lat, current_lng")
          .eq("id", orderData.rider_id)
          .single();
        setRider(riderData);
      }
      setLoading(false);
    };

    load();

    // Realtime: order status/location changes
    const orderChannel = supabase
      .channel(`order-${params.orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${params.orderId}`,
        },
        (payload) => setOrder(payload.new as Order),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_events",
          filter: `order_id=eq.${params.orderId}`,
        },
        (payload) => setEvents((prev) => [...prev, payload.new as OrderEvent]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      if (riderChannel) supabase.removeChannel(riderChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.orderId]);

  // Subscribe to rider's live location once we know who the rider is
  useEffect(() => {
    if (!order?.rider_id) return;
    const channel = supabase
      .channel(`rider-${order.rider_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${order.rider_id}`,
        },
        (payload) => {
          const p = payload.new as any;
          setRider({
            full_name: p.full_name,
            current_lat: p.current_lat,
            current_lng: p.current_lng,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.rider_id]);

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading order…</div>;
  if (!order)
    return (
      <div className="p-10 text-center text-gray-500">Order not found.</div>
    );

  const riderPoint: LatLng | null =
    rider?.current_lat && rider?.current_lng
      ? { lat: rider.current_lat, lng: rider.current_lng }
      : null;
  const currentStepIdx = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">Order tracking</h1>
      <p className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</p>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <Map
          pickup={{ lat: order.pickup_lat, lng: order.pickup_lng }}
          dropoff={{ lat: order.dropoff_lat, lng: order.dropoff_lng }}
          rider={riderPoint}
          height={380}
        />

        <div>
          {/* Status progress bar */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex justify-between">
              {STATUS_STEPS.map((step, idx) => (
                <div
                  key={step}
                  className="flex flex-1 flex-col items-center text-center"
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      idx <= currentStepIdx ? "bg-brand-600" : "bg-gray-200"
                    }`}
                  />
                  <span className="mt-1 text-[11px] text-gray-500">
                    {STATUS_LABEL[step]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm text-sm">
            <p>
              <strong>Status:</strong>{" "}
              {STATUS_LABEL[order.status] ?? order.status}
            </p>
            <p className="mt-1">
              <strong>Pickup:</strong> {order.pickup_address}
            </p>
            <p className="mt-1">
              <strong>Drop-off:</strong> {order.dropoff_address}
            </p>
            <p className="mt-1">
              <strong>Distance:</strong> {order.distance_km} km
            </p>
            <p className="mt-1">
              <strong>Price:</strong> ₦{Number(order.price).toLocaleString()}
            </p>
            {rider?.full_name && (
              <p className="mt-1">
                <strong>Rider:</strong> {rider.full_name}
              </p>
            )}
            <div className="flex justify-end">
              <Button label="Cancel Order" onclick={() => {}} />
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-2 font-semibold">Timeline</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {events.length === 0 && (
                <li className="text-gray-400">No updates yet.</li>
              )}
              {events.map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between border-b pb-1 last:border-0"
                >
                  <span>
                    {e.status ? (STATUS_LABEL[e.status] ?? e.status) : e.note}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(e.created_at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
