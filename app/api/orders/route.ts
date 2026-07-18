import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json();

  const {
    pickupAddress,
    pickup,
    dropoffAddress,
    dropoff,
    size,
    note,
    recipientName,
    recipientPhone,
    distanceKm,
    price,
  } = body;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Generate the order ID
  const orderId = crypto.randomUUID();

  const { error } = await supabase.from("orders").insert({
    id: orderId,
    customer_id: user?.id ?? null,
    pickup_address: pickupAddress,
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    dropoff_address: dropoffAddress,
    dropoff_lat: dropoff.lat,
    dropoff_lng: dropoff.lng,
    package_size: size,
    package_note: note,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    distance_km: Number(distanceKm.toFixed(2)),
    price: Number(price.toFixed(2)),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: orderId }, { status: 201 });
}
